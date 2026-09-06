import mongoose from "mongoose";
import request from "supertest";
import { jest } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.VENUE_API_KEY = "venue-integration-test-key";
const app = (await import("../index.js")).default;
const VenueBooking = (await import("../models/VenueBooking.js")).default;
const VenueConfig = (await import("../models/VenueConfig.js")).default;
const { renameVenueRoom, renameVenueSection, renameVenueMainTab } = await import("../controllers/venueConfigController.js");
let mongoServer;
const catalogPath = "/api/integration/venue-catalog";
const availabilityPath = "/api/integration/venues";
const slot = { fromDate: "2026-09-10", toDate: "2026-09-10", startTime: "10:00", endTime: "14:00" };
const get = (path, query = {}) => request(app).get(path).set("x-venue-api-key", process.env.VENUE_API_KEY).query(query);
const expectedVenue = { venueKey: "rooms:lecture-theatre:lt-101", mainTabId: "rooms", mainTabLabel: "Rooms", sectionId: "lecture-theatre", sectionLabel: "Lecture Theatre", roomId: "lt-101", venueName: "LT-101", enabled: true };
const booking = (overrides = {}) => VenueBooking.create({ hall: "Lecture Theatre", roomNo: "LT-101", name: "Private Booker", email: "private@thapar.edu", eventName: "Private Event", societyName: "Private Society", contact: "9876543210", attachments: ["private-file"], checkInDate: slot.fromDate, checkOutDate: slot.toDate, checkInTime: "11:00", checkOutTime: "13:00", status: "booked", ...overrides });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});
afterAll(async () => { await mongoose.disconnect(); await mongoServer?.stop(); });
beforeEach(async () => {
  await VenueConfig.deleteMany({});
  await VenueBooking.deleteMany({});
  await VenueConfig.create({ key: "global", mainTabs: [{ id: "rooms", label: "Rooms", sections: [{ id: "lecture-theatre", label: "Lecture Theatre", rooms: [{ id: "lt-101", name: "LT-101" }, { id: "lt-102", name: "LT-102" }] }] }] });
});

for (const path of [catalogPath, availabilityPath]) {
  test(`${path} requires an API key`, async () => { expect((await request(app).get(path).query(slot)).status).toBe(401); });
  test(`${path} rejects an invalid API key`, async () => { expect((await request(app).get(path).query(slot).set("x-venue-api-key", "invalid")).status).toBe(403); });
  test(`${path} accepts a valid API key`, async () => { expect((await get(path, slot)).status).toBe(200); });
}

test("catalog exposes every configured room with exact stable identity and public fields", async () => {
  const res = await get(catalogPath);
  expect(res.body).toEqual({ success: true, venues: [expectedVenue, { ...expectedVenue, venueKey: "rooms:lecture-theatre:lt-102", roomId: "lt-102", venueName: "LT-102" }] });
  await VenueConfig.updateOne({}, { $push: { "mainTabs.0.sections.0.rooms": { id: "new-room", name: "New Room" } } });
  expect((await get(catalogPath)).body.venues.map(v => v.venueKey)).toContain("rooms:lecture-theatre:new-room");
});

test.each(["mainTabs.0.enabled", "mainTabs.0.sections.0.enabled", "mainTabs.0.sections.0.rooms.0.enabled"])("disabled config at %s remains visible and overrides conflicts", async (field) => {
  await booking();
  await VenueConfig.updateOne({}, { $set: { [field]: false } });
  expect((await get(catalogPath)).body.venues[0]).toEqual({ ...expectedVenue, enabled: false });
  expect((await get(availabilityPath, slot)).body.venues[0]).toEqual({ ...expectedVenue, enabled: false, available: false, reason: "DISABLED" });
});

test.each([
  ["room", renameVenueRoom, { name: "Lecture Theatre 101" }, "venueName", "Lecture Theatre 101"],
  ["section", renameVenueSection, { label: "New Section" }, "sectionLabel", "New Section"],
  ["tab", renameVenueMainTab, { label: "New Tab" }, "mainTabLabel", "New Tab"],
])("real %s rename preserves identity and legacy conflict", async (_name, rename, change, labelField, label) => {
  await booking(); // Legacy record has no stable IDs.
  const before = (await get(catalogPath)).body.venues[0];
  const res = { json: jest.fn(), status: jest.fn().mockReturnThis() };
  await rename({ body: { mainTabId: "rooms", sectionId: "lecture-theatre", roomId: "lt-101", ...change } }, res);
  expect(res.status).not.toHaveBeenCalled();
  const after = (await get(catalogPath)).body.venues[0];
  expect(after).toEqual({ ...before, [labelField]: label });
  expect((await get(availabilityPath, slot)).body.venues[0]).toEqual({ ...after, available: false, reason: "BOOKED" });
});

test("availability returns catalog identities and normalized slot for free venues", async () => {
  const catalog = (await get(catalogPath)).body;
  expect((await get(availabilityPath, slot)).body).toEqual({ success: true, slot, venues: catalog.venues.map(v => ({ ...v, available: true, reason: null })) });
});

test.each([["booked", true], ["checked_in", true], ["cancelled", false], ["checked_out", false], ["completed", false]])("%s booking blocking state is %s", async (status, blocks) => {
  await booking({ status });
  expect((await get(availabilityPath, slot)).body.venues[0]).toEqual({ ...expectedVenue, available: !blocks, reason: blocks ? "BOOKED" : null });
});

test.each([
  { checkInDate: "2026-09-11", checkOutDate: "2026-09-11" },
  { checkInDate: "2026-09-09", checkOutDate: "2026-09-09" },
  { checkInTime: "14:00", checkOutTime: "15:00" },
  { checkInTime: "09:00", checkOutTime: "10:00" },
])("non-overlapping booking does not block: %j", async (dates) => {
  await booking(dates);
  expect((await get(availabilityPath, slot)).body.venues[0].available).toBe(true);
});

test.each([
  { fromDate: "2026-9-10" }, { toDate: "2026-02-30" }, { fromDate: "" },
  { startTime: "9:00" }, { endTime: "24:00" }, { endTime: "10:00" },
  { endTime: "09:00" }, { toDate: "2026-09-09" },
])("rejects invalid slot %j", async (invalid) => {
  expect((await get(availabilityPath, { ...slot, ...invalid })).status).toBe(400);
});

test("availability exposes no private booking data or alias history", async () => {
  await booking();
  await VenueConfig.updateOne({}, { $set: { "mainTabs.0.sections.0.previousNames": ["Old Hall"], "mainTabs.0.sections.0.rooms.0.previousNames": ["Old Room"] } });
  const res = await get(availabilityPath, slot);
  expect(res.body.venues[0]).toEqual({ ...expectedVenue, available: false, reason: "BOOKED" });
  expect(Object.keys(res.body).sort()).toEqual(["slot", "success", "venues"]);
});

const snapshot = async () => {
  const collections = await mongoose.connection.db.listCollections().toArray();
  const result = {};
  for (const { name } of collections) result[name] = await mongoose.connection.db.collection(name).find({}).sort({ _id: 1 }).toArray();
  return result;
};
for (const path of [catalogPath, availabilityPath]) {
  test(`${path} leaves every database collection unchanged`, async () => {
    await booking();
    const before = await snapshot();
    expect((await get(path, slot)).status).toBe(200);
    expect(await snapshot()).toEqual(before);
  });
}

test("both endpoints use one read-only config query and availability uses one bounded booking read", async () => {
  const configSpy = jest.spyOn(VenueConfig, "aggregate");
  const bookingSpy = jest.spyOn(VenueBooking, "find");
  try {
    await get(catalogPath);
    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(configSpy.mock.calls[0][0].some(stage => stage.$out || stage.$merge)).toBe(false);
    expect(bookingSpy).not.toHaveBeenCalled();
    configSpy.mockClear();
    await get(availabilityPath, slot);
    expect(configSpy).toHaveBeenCalledTimes(1);
    expect(bookingSpy).toHaveBeenCalledTimes(1);
    expect(bookingSpy).toHaveBeenCalledWith({ status: { $in: ["booked", "checked_in"] }, checkInDate: { $lte: slot.toDate }, checkOutDate: { $gte: slot.fromDate } });
    expect(bookingSpy.mock.results[0].value.mongooseOptions().lean).toBe(true);
  } finally { configSpy.mockRestore(); bookingSpy.mockRestore(); }
});

test("global config takes precedence over legacy config without adopting or mutating it", async () => {
  await VenueConfig.collection.insertOne({ mainTabs: [{ id: "legacy", label: "Legacy", sections: [] }], updatedAt: new Date("2099-01-01") });
  const before = await snapshot();
  expect((await get(catalogPath)).body.venues[0]).toEqual(expectedVenue);
  expect(await snapshot()).toEqual(before);
  await VenueConfig.updateOne({ key: "global" }, { $unset: { key: "" } });
  await VenueConfig.deleteOne({ "mainTabs.id": "legacy" });
  expect((await get(catalogPath)).body.venues[0]).toEqual(expectedVenue);
});

test("POST book-room remains 410 and leaves application data unchanged", async () => {
  const before = await snapshot();
  const res = await request(app).post("/api/integration/book-room").set("x-venue-api-key", process.env.VENUE_API_KEY).send({ venueName: "LT-101" });
  expect(res.status).toBe(410);
  expect(res.body.success).toBe(false);
  const after = await snapshot();
  // Existing request tracing records rejected POSTs; it is not a booking write.
  delete before.logs;
  delete after.logs;
  expect(after).toEqual(before);
});
