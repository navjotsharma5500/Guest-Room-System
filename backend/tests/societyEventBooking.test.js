import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { jest } from "@jest/globals";
import { MongoMemoryReplSet, MongoMemoryServer } from "mongodb-memory-server";
import integrationRoutes from "../routes/venueIntegrationRoutes.js";
import VenueBooking from "../models/VenueBooking.js";
import VenueConfig from "../models/VenueConfig.js";
import Batch from "../models/SocietyEventBookingBatch.js";
import Lock from "../models/SocietyVenueBookingLock.js";
import { renameVenueRoom, renameVenueSection } from "../controllers/venueConfigController.js";
import { setSocketIO } from "../utils/socket.js";

process.env.NODE_ENV = "test";
const writeKey = "society-write-test-secret";
const readKey = "read-only-test-secret";
const path = "/api/integration/society-events/book";
const app = express();
app.use(express.json());
app.use("/api/integration", integrationRoutes);
const emit = jest.fn();
let replica;
const payload = () => ({
  sourceSystem: "SOCIETY_PORTAL", eventId: "event-internal-904", eventPublicId: "EA904",
  idempotencyKey: "society-portal:event:EA904:final-approval", eventName: "Annual Theatre Night",
  society: { societyId: "society-1", name: "Music and Dramatic Society" },
  requester: { name: "Event Requester", email: "requester@thapar.edu" },
  venue: { venueKey: "rooms:lecture-theatre:lt-202", mainTabId: "rooms", sectionId: "lecture-theatre", roomId: "lt-202" },
  schedule: [{ date: "2026-10-15", startTime: "10:00", endTime: "16:00" }],
});
const post = (body = payload()) => request(app).post(path).set("x-society-portal-venue-key", writeKey).send(body);
const legacy = (overrides = {}) => VenueBooking.create({
  hall: "Lecture Theatre", roomNo: "LT-202", name: "PRIVATE BOOKER", email: "private@thapar.edu",
  eventName: "PRIVATE EVENT", societyName: "PRIVATE SOCIETY", contact: "9876543210",
  checkInDate: "2026-10-15", checkOutDate: "2026-10-15", checkInTime: "12:00", checkOutTime: "13:00", status: "booked", ...overrides,
});
const secondDay = { date: "2026-10-16", startTime: "10:00", endTime: "14:00" };

beforeAll(async () => {
  replica = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replica.getUri());
  await Promise.all([VenueConfig.init(), VenueBooking.init(), Batch.init(), Lock.init()]);
  setSocketIO({ emit, of: () => ({ emit }) });
}, 60000);
afterAll(async () => { await mongoose.disconnect(); await replica?.stop(); });
beforeEach(async () => {
  process.env.VENUE_API_KEY = readKey;
  process.env.VENUE_API_KEYS = "";
  process.env.VENUE_SOCIETY_PORTAL_WRITE_API_KEY = writeKey;
  await Promise.all([VenueBooking.deleteMany({}), VenueConfig.deleteMany({}), Batch.deleteMany({}), Lock.deleteMany({})]);
  await VenueConfig.create({ key: "global", mainTabs: [{ id: "rooms", label: "Rooms", sections: [{ id: "lecture-theatre", label: "Lecture Theatre", rooms: [{ id: "lt-202", name: "LT-202" }, { id: "lt-203", name: "LT-203" }] }] }] });
  emit.mockReset();
});
afterEach(() => jest.restoreAllMocks());

test("missing write key is 401 with no writes", async () => {
  expect((await request(app).post(path).send(payload())).status).toBe(401);
  expect(await VenueBooking.countDocuments()).toBe(0);
});
test("wrong write key is 403", async () => {
  expect((await request(app).post(path).set("x-society-portal-venue-key", "wrong").send(payload())).status).toBe(403);
});
test("read key alone grants no write access, including in the write header", async () => {
  expect((await request(app).post(path).set("x-venue-api-key", readKey).send(payload())).status).toBe(401);
  expect((await request(app).post(path).set("x-society-portal-venue-key", readKey).send(payload())).status).toBe(403);
  expect(await VenueBooking.countDocuments()).toBe(0);
});
test.each(["", readKey])("missing or reused write credential fails closed: %s", async configured => {
  process.env.VENUE_SOCIETY_PORTAL_WRITE_API_KEY = configured;
  expect((await post()).status).toBe(503);
  expect(await VenueBooking.countDocuments()).toBe(0);
});
test("reuse of a rotated read credential also fails closed", async () => {
  process.env.VENUE_API_KEYS = `rotated,${writeKey}`;
  expect((await post()).status).toBe(503);
});

test("single-day creation returns 201, uses authoritative labels, and populates dashboard and provenance fields", async () => {
  const res = await post();
  expect(res.status).toBe(201);
  const [doc] = await VenueBooking.find().lean();
  expect(doc).toMatchObject({
    hall: "Lecture Theatre", roomNo: "LT-202", venueMainTabId: "rooms", venueSectionId: "lecture-theatre", venueRoomId: "lt-202",
    name: "Event Requester", email: "requester@thapar.edu", eventName: "Annual Theatre Night", societyName: "Music and Dramatic Society",
    checkInDate: "2026-10-15", checkOutDate: "2026-10-15", checkInTime: "10:00", checkOutTime: "16:00",
    status: "booked", bookingFor: "student_calendar", sourceSystem: "SOCIETY_PORTAL", sourceEventId: "event-internal-904",
    sourceEventPublicId: "EA904", sourceSocietyId: "society-1", integrationBatchId: res.body.integrationBatchId,
    integrationIdempotencyKey: payload().idempotencyKey, attachments: [], isVenueBooking: true, guest: "Event Requester",
  });
  expect(res.body).toEqual({ success: true, sourceSystem: "SOCIETY_PORTAL", eventId: payload().eventId, eventPublicId: "EA904", venueKey: payload().venue.venueKey, integrationBatchId: expect.any(String), bookings: [{ bookingId: String(doc._id), ...payload().schedule[0] }], idempotentReplay: false });
  expect(emit).toHaveBeenCalledTimes(1);
  expect(emit).toHaveBeenCalledWith("venueBookingCreated", expect.objectContaining({ bookings: res.body.bookings, type: "venue", isolated: true }));
});
test("different-time multi-day schedule produces one record per exact day in one batch", async () => {
  const body = payload(); body.schedule.push(secondDay);
  const res = await post(body);
  expect(res.status).toBe(201);
  const docs = await VenueBooking.find().sort({ checkInDate: 1 }).lean();
  expect(docs.map(d => ({ date: d.checkInDate, startTime: d.checkInTime, endTime: d.checkOutTime }))).toEqual(body.schedule);
  expect(docs.every(d => d.checkInDate === d.checkOutDate && d.integrationBatchId === res.body.integrationBatchId)).toBe(true);
  expect(await Batch.countDocuments()).toBe(1);
  expect(emit).toHaveBeenCalledTimes(1);
});

test.each(["mainTabs.0.enabled", "mainTabs.0.sections.0.enabled", "mainTabs.0.sections.0.rooms.0.enabled"])("disabled %s rejects creation", async field => {
  await VenueConfig.updateOne({}, { $set: { [field]: false } });
  const res = await post();
  expect(res.status).toBe(409); expect(res.body.code).toBe("VENUE_DISABLED");
  expect(await VenueBooking.countDocuments()).toBe(0); expect(await Batch.countDocuments()).toBe(0);
});
test.each(["mainTabId", "sectionId", "roomId"])("unknown %s cannot resolve through display names", async field => {
  const body = payload(); body.venue[field] = "unknown";
  body.venue.venueKey = `${body.venue.mainTabId}:${body.venue.sectionId}:${body.venue.roomId}`;
  const res = await post(body);
  expect(res.status).toBe(404); expect(res.body.code).toBe("VENUE_NOT_FOUND");
  expect(await VenueBooking.countDocuments()).toBe(0);
});
test("missing config cannot create from read-API default catalog", async () => {
  await VenueConfig.deleteMany({});
  expect((await post()).status).toBe(404);
  expect(await VenueConfig.countDocuments()).toBe(0);
});

test.each([["booked", 409], ["checked_in", 409], ["cancelled", 201], ["checked_out", 201], ["completed", 201]])("%s conflict returns %s", async (status, expected) => {
  const original = await legacy({ status });
  const res = await post();
  expect(res.status).toBe(expected);
  expect(await VenueBooking.countDocuments()).toBe(expected === 201 ? 2 : 1);
  if (expected === 409) {
    expect(res.body).toEqual({ success: false, code: "VENUE_NO_LONGER_AVAILABLE", message: "The selected venue is no longer available for the Event schedule." });
    for (const privateValue of [String(original._id), original.name, original.email, original.societyName, original.eventName, original.contact]) expect(JSON.stringify(res.body)).not.toContain(privateValue);
  }
});
test("one conflicting later day creates zero bookings for every requested day", async () => {
  const original = await legacy({ checkInDate: secondDay.date, checkOutDate: secondDay.date });
  const body = payload(); body.schedule.push(secondDay);
  expect((await post(body)).status).toBe(409);
  expect((await VenueBooking.find().lean()).map(d => String(d._id))).toEqual([String(original._id)]);
  expect(await Batch.countDocuments()).toBe(0); expect(emit).not.toHaveBeenCalled();
});
test("adjacent slots and separate dates do not conflict", async () => {
  await legacy({ checkInTime: "16:00", checkOutTime: "18:00" });
  await legacy({ checkInDate: "2026-10-14", checkOutDate: "2026-10-14" });
  expect((await post()).status).toBe(201);
});

for (const [kind, rename, change, field, label] of [
  ["room", renameVenueRoom, { name: "Lecture Theatre 202" }, "roomNo", "Lecture Theatre 202"],
  ["section", renameVenueSection, { label: "Renamed Lecture Section" }, "hall", "Renamed Lecture Section"],
]) {
  const doRename = async () => {
    const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
    await rename({ body: { ...payload().venue, ...change } }, res);
    expect(res.status).not.toHaveBeenCalled();
  };
  test(`${kind} rename preserves venueKey and uses current display labels`, async () => {
    await doRename();
    const res = await post();
    expect(res.status).toBe(201); expect(res.body.venueKey).toBe(payload().venue.venueKey);
    expect((await VenueBooking.findOne().lean())[field]).toBe(label);
  });
  test(`legacy booking under old ${kind} name blocks after real rename`, async () => {
    await legacy(); await doRename();
    expect((await post()).status).toBe(409);
    expect(await VenueBooking.countDocuments()).toBe(1);
  });
}

test("exact replay uses persisted result without new inserts or socket events", async () => {
  const first = await post();
  const insert = jest.spyOn(VenueBooking, "insertMany");
  const replay = await post();
  expect(first.status).toBe(201); expect(replay.status).toBe(200);
  expect(replay.body).toEqual({ ...first.body, idempotentReplay: true });
  expect(insert).not.toHaveBeenCalled(); expect(await VenueBooking.countDocuments()).toBe(1);
  expect(emit).toHaveBeenCalledTimes(1);
});
test("normalized schedule order replays the same persisted batch", async () => {
  const body = payload(); body.schedule.push(secondDay);
  const first = await post(body); body.schedule.reverse();
  expect((await post(body)).body).toEqual({ ...first.body, idempotentReplay: true });
});
test("replay after rename or disable still returns original result", async () => {
  const first = await post();
  await VenueConfig.updateOne({}, { $set: { "mainTabs.0.enabled": false, "mainTabs.0.sections.0.rooms.0.name": "New Label" } });
  expect((await post()).body).toEqual({ ...first.body, idempotentReplay: true });
});
test.each(["eventName", "idempotencyKey", "eventId"])("changed %s cannot reuse an event or idempotency key", async field => {
  await post(); const changed = payload(); changed[field] += "-changed";
  const res = await post(changed);
  expect(res.status).toBe(409); expect(res.body.code).toBe("IDEMPOTENCY_MISMATCH");
  expect(await VenueBooking.countDocuments()).toBe(1);
});
test("concurrent identical approvals commit one batch and return stable replays", async () => {
  const body = payload(); body.schedule.push(secondDay);
  const responses = await Promise.all(Array.from({ length: 6 }, () => post(body)));
  expect(responses.map(r => r.status).sort()).toEqual([200, 200, 200, 200, 200, 201]);
  expect(new Set(responses.map(r => r.body.integrationBatchId)).size).toBe(1);
  expect(new Set(responses.map(r => JSON.stringify(r.body.bookings))).size).toBe(1);
  expect(await VenueBooking.countDocuments()).toBe(2); expect(await Batch.countDocuments()).toBe(1);
  expect(emit).toHaveBeenCalledTimes(1);
});
test("different events concurrently requesting the same slot cannot both commit", async () => {
  const other = payload(); other.eventId = "other"; other.eventPublicId = "EA905"; other.idempotencyKey = "other-key";
  const responses = await Promise.all([post(), post(other)]);
  expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
  expect(await VenueBooking.countDocuments()).toBe(1); expect(await Batch.countDocuments()).toBe(1);
});
test("same event racing across different venues rolls back the losing unique-identity insert", async () => {
  const other = payload(); other.venue.roomId = "lt-203"; other.venue.venueKey = "rooms:lecture-theatre:lt-203";
  const responses = await Promise.all([post(), post(other)]);
  expect(responses.map(r => r.status).sort()).toEqual([201, 409]);
  expect(await VenueBooking.countDocuments()).toBe(1); expect(await Batch.countDocuments()).toBe(1);
});

test.each([
  body => { body.sourceSystem = "NIGHT_PORTAL"; },
  body => { body.venue.venueKey = "rooms:lecture-theatre:other"; },
  body => { body.venue.venueName = "Untrusted Name"; },
  body => { body.schedule = []; },
  body => { body.schedule.push({ ...body.schedule[0] }); },
  body => { body.schedule.push({ ...secondDay, date: "2026-02-30" }); },
  body => { body.schedule[0].startTime = "9:00"; },
  body => { body.schedule[0].endTime = "24:00"; },
  body => { body.schedule[0].endTime = "10:00"; },
  body => { body.schedule[0].endTime = "09:00"; },
  body => { body.requester.email = "outside@example.com"; },
  body => { body.eventId = { $ne: null }; },
  body => { body.eventName = ""; },
  body => { body.extra = true; },
])("invalid payload %# is rejected before writes", async mutate => {
  const body = payload(); mutate(body);
  expect((await post(body)).status).toBe(400);
  expect(await VenueBooking.countDocuments()).toBe(0); expect(await Batch.countDocuments()).toBe(0);
});

test("partial database insert failure rolls back all days and allows a clean retry", async () => {
  const body = payload(); body.schedule.push(secondDay);
  const realInsert = VenueBooking.insertMany.bind(VenueBooking);
  const insert = jest.spyOn(VenueBooking, "insertMany").mockImplementationOnce(async (docs, options) => {
    await realInsert([docs[0]], options);
    throw new Error("simulated failure after day one");
  });
  expect((await post(body)).status).toBe(503);
  expect(await VenueBooking.countDocuments()).toBe(0); expect(await Batch.countDocuments()).toBe(0);
  expect(emit).not.toHaveBeenCalled(); insert.mockRestore();
  expect((await post(body)).status).toBe(201); expect(await VenueBooking.countDocuments()).toBe(2);
});
test("batch persistence failure rolls back already inserted bookings", async () => {
  jest.spyOn(Batch, "create").mockRejectedValueOnce(new Error("simulated batch failure"));
  expect((await post()).status).toBe(503);
  expect(await VenueBooking.countDocuments()).toBe(0); expect(await Batch.countDocuments()).toBe(0);
});
test("socket failure does not fail a committed booking or produce duplicate retry", async () => {
  emit.mockImplementationOnce(() => { throw new Error("socket down"); });
  expect((await post()).status).toBe(201);
  expect((await post()).status).toBe(200);
  expect(await VenueBooking.countDocuments()).toBe(1);
});

test("read endpoints retain read auth and show the committed booking; retired endpoint stays 410", async () => {
  const catalogPath = "/api/integration/venue-catalog", availabilityPath = "/api/integration/venues";
  expect((await request(app).get(catalogPath)).status).toBe(401);
  expect((await request(app).get(catalogPath).set("x-society-portal-venue-key", writeKey)).status).toBe(401);
  const catalog = await request(app).get(catalogPath).set("x-venue-api-key", readKey);
  expect(catalog.status).toBe(200); expect(catalog.body.venues[0].venueKey).toBe(payload().venue.venueKey);
  await post();
  const availability = await request(app).get(availabilityPath).set("x-venue-api-key", readKey).query({ fromDate: "2026-10-15", toDate: "2026-10-15", startTime: "10:00", endTime: "16:00" });
  expect(availability.status).toBe(200); expect(availability.body.venues[0].reason).toBe("BOOKED");
  expect((await request(app).post("/api/integration/book-room").set("x-venue-api-key", readKey).send({})).status).toBe(410);
});

test("standalone MongoDB fails closed with zero booking, batch, or lock writes", async () => {
  await mongoose.disconnect();
  const standalone = await MongoMemoryServer.create();
  try {
    await mongoose.connect(standalone.getUri());
    const res = await post();
    expect(res.status).toBe(503); expect(res.body.code).toBe("TRANSACTIONS_REQUIRED");
    expect(await VenueBooking.countDocuments()).toBe(0); expect(await Batch.countDocuments()).toBe(0); expect(await Lock.countDocuments()).toBe(0);
  } finally {
    await mongoose.disconnect(); await standalone.stop(); await mongoose.connect(replica.getUri());
  }
}, 30000);
