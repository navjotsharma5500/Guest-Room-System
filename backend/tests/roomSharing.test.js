import { jest } from "@jest/globals";
import "./helpers/noEmail.js";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Booking from "../models/Booking.js";
import Hostel from "../models/Hostel.js";
import User from "../models/User.js";
import Log from "../models/Log.js";
import Bill from "../models/Bill.js";
import RoomCleaningLog from "../models/RoomCleaningLog.js";
import GuestFlag from "../models/GuestFlag.js";
import ExtensionRequest from "../models/ExtensionRequest.js";
import { validateSharingIntervals } from "../utils/roomSharing.js";
import { getIndiaDateKey } from "../utils/bookingTransfer.js";

const router = (await import("../routes/bookingRoutes.js")).default;
const { autoCheckoutOverdueGuests, autoCancelNoShows } = await import("../controllers/bookingController.js");
const { safeSend } = await import("../emails/sendEmail.js");
const { requestIdMiddleware, requestTraceMiddleware } = await import("../middleware/logMiddleware.js");
const app = express();
app.use(express.json(), requestIdMiddleware, requestTraceMiddleware);
app.use("/api/bookings", router);
process.env.JWT_SECRET = "room-sharing-tests-only";
let mongo, tokens, actor;
const day = (offset = 0) => getIndiaDateKey(new Date(Date.now() + offset * 86400000));
const data = (overrides = {}) => ({ guest: "Guest B", email: "b@example.com", contact: "9999999992",
  hostel: "Sharing Hostel", roomNo: "101", from: day(), to: day(1), checkInTime: "10:00", checkOutTime: "10:00",
  numGuests: 1, paymentType: "Paid", totalAmount: 1000, files: ["https://example.com/b-proof.pdf"], ...overrides });
const source = (overrides = {}) => Booking.create(data({ guest: "Guest A", email: "a@example.com", contact: "9999999991",
  totalAmount: 0, balanceAmount: 0, files: ["https://example.com/a-proof.pdf"], ...overrides }));
const api = (method, path, body = {}, role = "admin") => request(app)[method](`/api/bookings${path}`)
  .set("Authorization", `Bearer ${tokens[role]}`).send(body);
const share = (a, overrides = {}, role = "admin") => api("post", `/${a._id}/share-room`, data(overrides), role);
const pair = async (aOverrides = {}, bOverrides = {}) => {
  const a = await source(aOverrides);
  const response = await share(a, bOverrides);
  expect(response.status).toBe(201);
  return [await Booking.findById(a._id), await Booking.findById(response.body.booking._id)];
};
const report = b => api("put", `/${b._id}/reported`, { actualCheckInDate: day(), actualCheckInTime: "10:00", idVerified: true });
const extension = b => api("put", `/${b._id}/extend`, { newTo: day(2), remarks: "Stay longer" });
const capacity = async n => Hostel.updateOne({ name: "Sharing Hostel" }, { $set: { "rooms.0.guestCapacity": n } });
const drain = () => new Promise(resolve => setTimeout(resolve, 30));

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});
beforeEach(async () => {
  await drain();
  safeSend.mockClear();
  for (const collection of Object.values(mongoose.connection.collections)) await collection.deleteMany({});
  tokens = {};
  for (const role of ["admin", "caretaker", "Warden", "student"]) {
    const user = await User.create({ name: role, role, email: `${role}@example.com`, password: "test-password", assignedHostel: "Sharing Hostel" });
    tokens[role] = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET);
    if (role === "admin") actor = user;
  }
  await Hostel.create({ name: "Sharing Hostel", code: "SH", caretakerEmail: "caretaker@example.com", wardenEmail: "warden@example.com",
    rooms: [{ roomNo: "101", guestCapacity: 2 }, { roomNo: "102", guestCapacity: 2 }] });
});
afterAll(async () => { await drain(); jest.restoreAllMocks(); await mongoose.disconnect(); await mongo.stop(); });

test("normal overlapping creation rejects every client overlap/sharing flag", async () => {
  const a = await source();
  const result = await api("post", "/", data({ allowOverlap: true, isSharing: true, ignoreConflict: true, sharingGroupId: a._id }));
  expect(result.status).toBe(409);
  expect(await Booking.countDocuments()).toBe(1);
});
test("A(1) + B(1) fit capacity 2, retain separate identity, proof, payment, bill and balance", async () => {
  const [a, b] = await pair();
  expect(String(a.sharingGroupId)).toBe(String(b.sharingGroupId));
  expect(a.bookingId).not.toBe(b.bookingId);
  expect(String(b.sharedFromBookingId)).toBe(String(a._id));
  expect(a.balanceAmount).toBe(0);
  expect(b.balanceAmount).toBe(1000);
  expect(a.files).toEqual(["https://example.com/a-proof.pdf"]);
  expect(b.files).toEqual(["https://example.com/b-proof.pdf"]);
  await Bill.create({ bookingId: b._id, billNumber: "B-ONLY", paymentType: "PARTIAL", amountPaid: 100 });
  expect(await Bill.countDocuments({ bookingId: a._id })).toBe(0);
  expect(a.to.toISOString()).toBe(b.to.toISOString());
});
test("A(2) + B(1) rejects with structured capacity information and no source metadata", async () => {
  const a = await source({ numGuests: 2 });
  const result = await share(a);
  expect(result.status).toBe(409);
  expect(result.body).toMatchObject({ code: "ROOM_SHARING_CAPACITY_EXCEEDED", capacity: 2, occupiedGuests: 2, requestedGuests: 1 });
  expect((await Booking.findById(a._id)).sharingGroupId).toBeUndefined();
});
test("unrelated overlap rejects even when capacity permits", async () => {
  await capacity(3);
  const a = await source();
  await source({ guest: "C", email: "c@example.com" });
  expect((await share(a)).status).toBe(409);
});
test("B may continue beyond A into a free interval", async () => {
  const [a, b] = await pair({}, { to: day(2) });
  expect(b.to > a.to).toBe(true);
});
test("B continuing beyond A rejects a later unrelated C reservation", async () => {
  const a = await source();
  await source({ guest: "C", email: "c@example.com", from: day(1), to: day(2) });
  expect((await share(a, { to: day(2) })).status).toBe(409);
});
test("positive overlap required; touching source checkout is insufficient", async () => {
  const a = await source();
  const result = await share(a, { from: day(1), to: day(2) });
  expect(result.status).toBe(400);
  expect(result.body.code).toBe("ROOM_SHARING_NO_OVERLAP");
});
test("third member joins existing group at capacity 3", async () => {
  await capacity(3);
  const [a, b] = await pair();
  const result = await share(b, { guest: "C", email: "c@example.com", contact: "9999999993" });
  expect(result.status).toBe(201);
  expect(result.body.booking.sharingGroupId).toBe(String(a.sharingGroupId));
});
test("source financial and operational fields are unchanged by creation", async () => {
  const a = await source({ paymentStatus: "PAID", paidAmount: 700, totalAmount: 700, transactionId: "SOURCE-TXN" });
  const before = a.toObject();
  const response = await share(a);
  expect(response.status).toBe(201);
  const after = (await Booking.findById(a._id)).toObject();
  for (const key of Object.keys(before).filter(k => k !== "updatedAt")) expect(after[key]).toEqual(before[key]);
  expect(response.body.booking.transactionId).toBe("");
  expect(response.body.booking.paidAmount).toBe(0);
});
test.each(["cancelled", "no_show", "checked_out"])("terminal source %s rejects", async status => {
  const a = await source({ status });
  expect((await share(a)).status).toBe(400);
});
test.each(["under_review", "rejected"])("source approval %s rejects", async approvalStatus => {
  expect((await share(await source({ approvalStatus }))).status).toBe(400);
});
test("B cancellation affects only B and its bill", async () => {
  const [a, b] = await pair();
  expect((await api("put", `/${b._id}/cancel`, { remarks: "Cancelled B" })).status).toBe(200);
  expect((await Booking.findById(a._id)).status).toBe("booked");
  expect((await Booking.findById(a._id)).balanceAmount).toBe(0);
  expect((await Booking.findById(b._id)).status).toBe("cancelled");
  expect(await Bill.countDocuments({ bookingId: a._id })).toBe(0);
});
test("B no-show does not affect reported A", async () => {
  const [a, b] = await pair({ from: day(-2), to: day(1), status: "checked_in", reportedStatus: "reported" }, { from: day(-2), to: day(1) });
  expect((await api("put", `/${b._id}/not-reported`, { remarks: "No show" })).status).toBe(200);
  expect((await Booking.findById(b._id)).status).toBe("no_show");
  expect((await Booking.findById(a._id)).status).toBe("checked_in");
});
test("report B while A is checked in, occupancy API signals authorized sharing", async () => {
  const [a, b] = await pair({ status: "checked_in", reportedStatus: "reported" });
  const occupancy = await api("post", "/check-room-occupancy", { hostel: b.hostel, roomNo: b.roomNo, checkInDate: day(), excludeBookingId: b._id });
  expect(occupancy.body).toMatchObject({ occupied: false, sharingAllowed: true, capacity: 2, occupiedGuests: 1 });
  expect(occupancy.body.occupants).toHaveLength(1);
  expect((await report(b)).status).toBe(200);
  expect((await Booking.findById(a._id)).status).toBe("checked_in");
});
test("report unrelated booking fails and changes no payment fields", async () => {
  await source({ status: "checked_in", reportedStatus: "reported" });
  const b = await source({ guest: "B", email: "b@example.com" });
  expect((await report(b)).status).toBe(409);
  expect((await Booking.findById(b._id)).status).toBe("booked");
});
test("report B fails when room capacity has decreased", async () => {
  const [, b] = await pair({ status: "checked_in", reportedStatus: "reported" });
  await capacity(1);
  expect((await report(b)).status).toBe(409);
});
test.each(["NORMAL", "EARLY"])("%s checkout cleans only after final occupant; B debt never makes A a defaulter", async checkoutType => {
  const [a, b] = await pair({ status: "checked_in", reportedStatus: "reported" });
  expect((await report(b)).status).toBe(200);
  const first = await api("put", `/${a._id}/checkout`, { checkoutType });
  expect(first.status).toBe(200);
  expect(await RoomCleaningLog.countDocuments()).toBe(0);
  expect((await Hostel.findOne({ name: a.hostel })).rooms[0].roomState).toBe("occupied");
  expect((await Booking.findById(b._id)).status).toBe("checked_in");
  expect((await Booking.findById(a._id)).balanceAmount).toBe(0);
  const last = await api("put", `/${b._id}/checkout`, { checkoutType: "NORMAL" });
  expect(last.status).toBe(200);
  expect(await RoomCleaningLog.countDocuments()).toBe(1);
  expect((await Hostel.findOne({ name: b.hostel })).rooms[0].roomState).toBe("cleaning_pending");
});
test("automatic checkout preserves room until last actual occupant leaves", async () => {
  const [a, b] = await pair({ from: day(-2), to: day(-1), status: "checked_in", reportedStatus: "reported" }, { from: day(-2), to: day(1) });
  await Booking.updateOne({ _id: b._id }, { $set: { status: "checked_in", reportedStatus: "reported" } });
  await autoCheckoutOverdueGuests();
  expect((await Booking.findById(a._id)).status).toBe("checked_out");
  expect(await RoomCleaningLog.countDocuments()).toBe(0);
  await Booking.updateOne({ _id: b._id }, { $set: { to: new Date(day(-1)) } });
  await autoCheckoutOverdueGuests();
  expect(await RoomCleaningLog.countDocuments()).toBe(1);
});
test("B extension into free period succeeds without changing A dates", async () => {
  const [a, b] = await pair();
  expect((await extension(b)).status).toBe(200);
  expect((await Booking.findById(a._id)).to).toEqual(a.to);
  expect(getIndiaDateKey((await Booking.findById(b._id)).to)).toBe(day(2));
});
test("B extension rejects later unrelated C and preserves group and dates", async () => {
  const [, b] = await pair();
  await source({ guest: "C", email: "c@example.com", from: day(1), to: day(2) });
  const result = await extension(b);
  expect(result.status).toBe(409);
  expect((await Booking.findById(b._id)).to).toEqual(b.to);
});
test.each(["creation", "extension"])("maintenance blocks shared %s", async mode => {
  const [a, b] = mode === "creation" ? [await source(), null] : await pair();
  await Hostel.updateOne({ name: a.hostel }, { $set: { "rooms.0.isBlocked": true, "rooms.0.blockedTill": new Date(day(2)) } });
  expect((await (mode === "creation" ? share(a) : extension(b))).status).toBe(400);
});
test("long direct shared stay receives normal approval review", async () => {
  const result = await share(await source(), { to: day(5) });
  expect(result.status).toBe(201);
  expect(result.body.booking.approvalStatus).toBe("under_review");
});
test("shared creation preserves continuous-stay review for the new guest", async () => {
  await source({ guest: "Prior B", email: "b@example.com", contact: "9999999992", from: day(-3), to: day(), status: "checked_out" });
  const result = await share(await source());
  expect(result.status).toBe(201);
  expect(result.body.booking.approvalStatus).toBe("under_review");
  expect(result.body.booking.continuousStay.isContinuous).toBe(true);
});
test("blocked new guest cannot use sharing to bypass protection", async () => {
  const a = await source();
  await GuestFlag.create({ bookingId: a._id, email: "b@example.com", contact: "9999999992", flagType: "red",
    remarks: "Blocked guest", attachments: ["https://example.com/flag-proof.pdf"], flaggedBy: actor._id });
  const result = await share(a);
  expect(result.status).toBe(403);
  expect(await Booking.countDocuments()).toBe(1);
});
test("automatic no-show cancellation leaves the other occupant untouched", async () => {
  const [a, b] = await pair({ from: day(-2), to: day(1), status: "checked_in", reportedStatus: "reported" }, { from: day(-2), to: day(1) });
  await autoCancelNoShows();
  expect((await Booking.findById(b._id)).status).toBe("cancelled");
  expect((await Booking.findById(a._id)).status).toBe("checked_in");
});
test.each([0, -1, 1.5, "invalid"])("invalid shared guest count %s rejects", async numGuests => {
  expect((await share(await source(), { numGuests })).status).toBe(400);
});
test("direct extension validates sharing capacity and retains A dates", async () => {
  const [a, b] = await pair();
  const result = await api("post", `/${b._id}/direct-extension`, { newTo: day(2), remarks: "Extend B",
    attachments: ["https://example.com/extension.pdf"], paymentType: "Paid", amount: 500 });
  expect(result.status).toBe(200);
  expect((await Booking.findById(a._id)).to).toEqual(a.to);
});
test("direct extension rejects unrelated C and does not create payment records", async () => {
  const [, b] = await pair();
  await source({ guest: "C", email: "c@example.com", from: day(1), to: day(2) });
  const result = await api("post", `/${b._id}/direct-extension`, { newTo: day(2), remarks: "Extend B",
    attachments: ["https://example.com/extension.pdf"], paymentType: "Paid", amount: 500 });
  expect(result.status).toBe(409);
  expect(await Bill.countDocuments()).toBe(0);
});
test.each([false, true])("approval rechecks current reservations (conflict=%s)", async conflict => {
  const [a, b] = await pair();
  const pending = await ExtensionRequest.create({ bookingId: b._id, oldCheckout: b.to, requestedCheckout: new Date(day(2)),
    hostel: b.hostel, requiredApprovalLevel: "admin", remarks: "Extend B" });
  if (conflict) await source({ guest: "C", email: "c@example.com", from: day(1), to: day(2) });
  const result = await api("post", "/extension-requests/approve", { requestId: pending._id });
  if (result.status === 500) throw new Error(JSON.stringify(result.body));
  expect(result.status).toBe(conflict ? 409 : 200);
  expect((await Booking.findById(a._id)).to).toEqual(a.to);
  expect(getIndiaDateKey((await Booking.findById(b._id)).to)).toBe(day(conflict ? 1 : 2));
});
test("new guest email uses B public ID and never source payment or attachment details", async () => {
  const [a, b] = await pair({ transactionId: "SOURCE-SECRET-TXN", paidAmount: 9876 });
  await drain();
  const messages = safeSend.mock.calls.map(call => call[0]).filter(message => message.to === b.email);
  expect(messages.length).toBeGreaterThan(0);
  const serialized = JSON.stringify(messages);
  expect(serialized).toContain(b.bookingId);
  expect(serialized).not.toContain(a.bookingId);
  expect(serialized).not.toContain("SOURCE-SECRET-TXN");
  expect(serialized).not.toContain("a-proof.pdf");
});
test("sharing rejection has one failed request trace and no successful sharing event", async () => {
  const a = await source({ numGuests: 2 });
  const response = await share(a);
  await drain();
  const events = await Log.find({ requestId: response.headers["x-request-id"] }).lean();
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ kind: "REQUEST_TRACE", result: "FAILED", httpStatus: 409 });
  expect(JSON.stringify(events)).not.toContain("proof.pdf");
});
test("group read is safe, correct, and includes historical terminal members", async () => {
  const [a, b] = await pair();
  await Booking.updateOne({ _id: a._id }, { status: "checked_out" });
  const result = await api("get", `/${b._id}/sharing-group`);
  expect(result.status).toBe(200);
  expect(result.body.roomCapacity).toBe(2);
  expect(result.body.members).toHaveLength(2);
  expect(JSON.stringify(result.body)).not.toMatch(/example.com|transactionId|balanceAmount|files/);
  const joined = await share(b, { email: "c@example.com", contact: "9999999993" });
  expect(joined.status).toBe(201);
});
test.each(["caretaker", "Warden"])("%s creation/read enforce assigned hostel", async role => {
  const a = await source();
  expect((await share(a, {}, role)).status).toBe(201);
  await User.updateOne({ role }, { assignedHostel: "Other Hostel" });
  expect((await share(a, { email: "c@example.com" }, role)).status).toBe(403);
  expect((await api("get", `/${a._id}/sharing-group`, {}, role)).status).toBe(403);
});
test("unauthenticated and student access cannot share or read group", async () => {
  const a = await source();
  expect((await request(app).post(`/api/bookings/${a._id}/share-room`).send(data())).status).toBe(401);
  expect((await share(a, {}, "student")).status).toBe(403);
  expect((await api("get", `/${a._id}/sharing-group`, {}, "student")).status).toBe(403);
});
test("sharing audit occurs once, includes both IDs and excludes attachment URLs", async () => {
  const a = await source();
  const result = await share(a);
  await drain();
  const events = await Log.find({ action: "ROOM_SHARED_BOOKING_CREATED" }).lean();
  expect(events).toHaveLength(1);
  expect(events[0].details).toMatchObject({ sourcePublicBookingId: a.bookingId, newPublicBookingId: result.body.booking.bookingId, capacity: 2 });
  expect(String(events[0].userId)).toBe(String(actor._id));
  expect(JSON.stringify(events)).not.toContain("proof.pdf");
  expect(await Log.countDocuments({ action: "BOOKING_CREATED" })).toBe(0);
});
test("creation save failure leaves source unconverted", async () => {
  const a = await source();
  const spy = jest.spyOn(Booking.prototype, "save").mockRejectedValueOnce(new Error("Injected save failure"));
  expect((await share(a)).status).toBe(500);
  spy.mockRestore();
  expect((await Booking.findById(a._id)).sharingGroupId).toBeUndefined();
  expect(await Booking.countDocuments()).toBe(1);
});
test("source update failure rolls back newly saved child", async () => {
  const a = await source();
  const spy = jest.spyOn(Booking, "updateOne").mockRejectedValueOnce(new Error("Injected source failure"));
  expect((await share(a)).status).toBe(500);
  spy.mockRestore();
  expect(await Booking.countDocuments()).toBe(1);
  expect((await Booking.findById(a._id)).sharingGroupId).toBeUndefined();
});
test("transfer leaves old group and retains history, with no cleaning while A remains", async () => {
  const [a, b] = await pair({ from: day(-1), status: "checked_in", reportedStatus: "reported" }, { from: day(-1) });
  await Booking.updateOne({ _id: b._id }, { status: "checked_in", reportedStatus: "reported" });
  const result = await api("put", `/${b._id}/transfer`, { toHostel: b.hostel, toRoomNo: "102", transferDate: day(), transferTime: "00:00" });
  expect(result.status).toBe(200);
  const saved = await Booking.findById(b._id);
  expect(saved.sharingGroupId).toBeUndefined();
  expect(String(saved.transferHistory[0].sharingGroupId)).toBe(String(a.sharingGroupId));
  expect(saved.reportedStatus).toBe("pending");
  expect(await RoomCleaningLog.countDocuments()).toBe(0);
});
test("shared transfer cannot join occupied destination group", async () => {
  const [, b] = await pair({ from: day(-1) }, { from: day(-1) });
  await source({ roomNo: "102", from: day(-1), sharingGroupId: new mongoose.Types.ObjectId() });
  expect((await api("put", `/${b._id}/transfer`, { toHostel: b.hostel, toRoomNo: "102", transferDate: day(), transferTime: "00:00" })).status).toBe(409);
});
test("concurrent sharing cannot exceed capacity", async () => {
  const a = await source();
  const responses = await Promise.all([share(a), share(a, { guest: "C", email: "c@example.com", contact: "9999999993" })]);
  expect(responses.filter(r => r.status === 201)).toHaveLength(1);
  expect(responses.filter(r => r.status === 409)).toHaveLength(1);
  expect(await Booking.countDocuments()).toBe(2);
});
test("editing guest count cannot overfill existing shared room", async () => {
  const [, b] = await pair();
  expect((await api("put", `/${b._id}/details`, { numGuests: 2 })).status).toBe(409);
  expect((await Booking.findById(b._id)).numGuests).toBe(1);
});
test("capacity uses peak segments rather than sum of non-simultaneous guests", () => {
  const group = new mongoose.Types.ObjectId();
  const b = data({ from: "2026-09-10", to: "2026-09-13", sharingGroupId: group });
  const members = [
    { ...b, _id: "a", status: "booked", to: "2026-09-11" },
    { ...b, _id: "c", status: "booked", from: "2026-09-11" },
  ];
  expect(() => validateSharingIntervals(b, members, 2, { requireOverlap: true })).not.toThrow();
});
