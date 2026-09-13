import { jest } from "@jest/globals";
import express from "express";
import request from "supertest";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import fs from "fs";
import Booking from "../models/Booking.js";
import Bill from "../models/Bill.js";
import User from "../models/User.js";
import Log from "../models/Log.js";
const renderPDF = jest.fn(async () => Buffer.from("%PDF-test receipt"));
jest.unstable_mockModule("../utils/billGenerator.js", () => ({ generateBill: renderPDF }));
const router = (await import("../routes/paymentRoutes.js")).default;
const app = express(); app.use(express.json()); app.use("/api/payments", router);
const emit = jest.fn(); app.set("io", { to: () => ({ emit }) });
let mongo, tokens, admin;
const proof = ["https://example.com/proof.pdf"];
const payload = (overrides = {}) => ({ amount: 150, remarks: " Received correction ", paymentAttachments: proof, ...overrides });
const seed = (overrides = {}) => Booking.create({ guest: "Guest", email: "guest@example.com", contact: "9999999999", hostel: "A", roomNo: "1", from: "2026-09-01", to: "2026-09-03", totalAmount: 1000, amount: 1000, paidAmount: 850, balanceAmount: 150, status: "booked", ...overrides });
const post = (b, body = payload(), role = "admin", key = "admin-test-request-001") => request(app).post(`/api/payments/bookings/${b._id}/admin-bill`).set("Authorization", `Bearer ${tokens[role]}`).set("Idempotency-Key", key).send(body);
beforeAll(async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(mongo.getUri());
  await Promise.all([Booking.init(), Bill.init(), User.init(), Log.init()]);
  process.env.JWT_SECRET = "admin-bill-test-only";
  tokens = {};
  for (const role of ["admin", "manager", "caretaker", "warden", "adosa", "co_warden", "assistant", "student"]) {
    const user = await User.create({ name: role, role: role === "warden" ? "Warden" : role, email: `${role}@example.com`, password: "test-password" });
    tokens[role] = jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET);
    if (role === "admin") admin = user;
  }
}, 60000);
beforeEach(async () => {
  await Promise.all([Booking.deleteMany({}), Bill.deleteMany({}), Log.deleteMany({})]);
  emit.mockClear(); renderPDF.mockClear();
});
afterEach(async () => {
  for (const b of await Bill.find({})) {
    const file = `bills/${b.billNumber}.pdf`; if (fs.existsSync(file)) fs.unlinkSync(file);
  }
});
afterAll(async () => { jest.restoreAllMocks(); await mongoose.disconnect(); await mongo?.stop(); });
test.each(["manager", "caretaker", "warden", "adosa", "co_warden", "assistant", "student"])("%s receives 403", async role => {
  const response = await post(await seed(), payload(), role); expect(response.status).toBe(403); expect(await Bill.countDocuments()).toBe(0);
});
test.each([{ amount: 0 }, { amount: -1 }, { amount: "NaN" }, { amount: true }, { remarks: " " }, { remarks: null }, { paymentAttachments: [] }, { paymentAttachments: [""] }, { paymentAttachments: Array(6).fill(proof[0]) }])("invalid input %j is rejected", async values => {
  expect((await post(await seed(), payload(values))).status).toBe(400); expect(await Bill.countDocuments()).toBe(0);
});
test("admin settles existing balance with snapshot, proof, audit, PDF, history and one event", async () => {
  const booking = await seed(); const res = await post(booking);
  expect(res.status).toBe(200);
  expect(res.body.booking).toMatchObject({ totalAmount: 1000, paidAmount: 1000, balanceAmount: 0, paymentStatus: "PAID" });
  expect(res.body.bill).toMatchObject({ bookingId: String(booking._id), billType: "ADMIN_MANUAL_PAYMENT", amountPaid: 150, balanceBeforePayment: 150, balanceAfterPayment: 0, paymentProof: proof, remarks: "Received correction", createdBy: String(admin._id), paymentType: "FULL", paymentMethod: "Admin Manual Entry", guestName: "Guest", hostel: "A", roomNo: "1" });
  expect(res.body.bill.transactionId).toBeUndefined();
  expect(renderPDF).toHaveBeenCalledTimes(1); expect(renderPDF.mock.calls[0][1].amountPaid).toBe(150);
  expect(emit).toHaveBeenCalledTimes(1); expect(emit.mock.calls[0][0]).toBe("payment-updated");
  expect(await Log.findOne({ action: "ADMIN_BILL_CREATED" }).lean()).toMatchObject({ userId: admin._id, details: { amount: 150, billNumber: res.body.bill.billNumber } });
  const history = await request(app).get(`/api/payments/bookings/${booking._id}/payment-history`).set("Authorization", `Bearer ${tokens.admin}`);
  expect(history.body.bills.map(b => b._id)).toContain(res.body.bill._id);
  const pdf = await request(app).get(`/api/payments/bills/${res.body.bill._id}/pdf`); expect(pdf.status).toBe(200); expect(pdf.headers["content-type"]).toContain("application/pdf");
});
test("partial correction leaves total unchanged", async () => {
  const res = await post(await seed(), payload({ amount: 100 }));
  expect(res.body.booking).toMatchObject({ totalAmount: 1000, paidAmount: 950, balanceAmount: 50, paymentStatus: "PARTIALLY_PAID" });
  expect(res.body.bill.paymentType).toBe("PARTIAL");
});
test("overpayment is rejected with no writes", async () => {
  const b = await seed(); expect((await post(b, payload({ amount: 200 }))).status).toBe(400);
  expect(await Booking.findById(b._id).lean()).toMatchObject({ totalAmount: 1000, paidAmount: 850, balanceAmount: 150 }); expect(await Bill.countDocuments()).toBe(0);
});
test.each(["booked", "checked_in", "checked_out"])("fully paid %s adds paid charge", async status => {
  const res = await post(await seed({ status, paidAmount: 1000, balanceAmount: 0, paymentStatus: "PAID" }), payload({ amount: 200 }));
  expect(res.status).toBe(200);
  expect(res.body.booking).toMatchObject({ totalAmount: 1200, amount: 1200, paidAmount: 1200, balanceAmount: 0, paymentStatus: "PAID" });
  expect(res.body.bill).toMatchObject({ totalAmount: 200, amountPaid: 200, balanceBeforePayment: 200, balanceAfterPayment: 0, paymentType: "FULL" });
  expect(renderPDF.mock.calls[0][1].amountPaid).toBe(200);
});
test.each(["cancelled", "no_show"])("blocks %s", async status => { expect((await post(await seed({ status }))).status).toBe(400); });
test.each([850, 900])("preserves discount with paid=%s", async paidAmount => {
  const res = await post(await seed({ paidAmount, discount: 100 }), payload({ amount: paidAmount === 850 ? 50 : 200 }));
  expect(res.status).toBe(200); expect(res.body.booking.discount).toBe(100); expect(res.body.booking.balanceAmount).toBe(0);
});
test("PDF failure rolls back booking and bill, same key retry succeeds once", async () => {
  const b = await seed(); renderPDF.mockRejectedValueOnce(new Error("PDF failed"));
  expect((await post(b)).status).toBe(503);
  expect(await Booking.findById(b._id).lean()).toMatchObject({ paidAmount: 850, balanceAmount: 150, paymentAttachments: [] });
  expect(await Bill.countDocuments()).toBe(0); expect(emit).not.toHaveBeenCalled();
  expect((await post(b)).status).toBe(200); expect((await post(b)).body.idempotentReplay).toBe(true);
  expect(await Bill.countDocuments()).toBe(1); expect(emit).toHaveBeenCalledTimes(1);
});
test("bill insert failure rolls back booking", async () => {
  const b = await seed(); const spy = jest.spyOn(Bill, "create").mockRejectedValueOnce(new Error("insert failed"));
  expect((await post(b)).status).toBe(503); spy.mockRestore();
  expect((await Booking.findById(b._id)).paidAmount).toBe(850); expect(await Bill.countDocuments()).toBe(0);
});
test("concurrent duplicate request commits exactly once", async () => {
  const b = await seed({ paidAmount: 1000, balanceAmount: 0 });
  const responses = await Promise.all([post(b, payload({ amount: 200 })), post(b, payload({ amount: 200 }))]);
  expect(responses.map(r => r.status)).toEqual([200, 200]); expect(await Bill.countDocuments()).toBe(1);
  expect((await Booking.findById(b._id)).totalAmount).toBe(1200); expect(emit).toHaveBeenCalledTimes(1);
});
test("changed payload cannot reuse a committed key", async () => {
  const b = await seed(); await post(b); expect((await post(b, payload({ amount: 200 }))).status).toBe(409); expect(await Bill.countDocuments()).toBe(1);
});
test("standalone topology fails closed", async () => {
  const b = await seed(); 
  const spy = jest.spyOn(mongoose.connection.db, "admin").mockReturnValue({ command: async () => ({}) });
  expect((await post(b)).status).toBe(503); spy.mockRestore();
  expect(await Bill.countDocuments()).toBe(0); expect((await Booking.findById(b._id)).paidAmount).toBe(850);
});
test.each(["FULL", "PARTIAL"])("normal %s payment still uses shared renderer and original contract", async paymentType => {
  const b = await seed(); const amountPaid = paymentType === "FULL" ? 150 : 100;
  const res = await request(app).post(`/api/payments/bookings/${b._id}/payment`).set("Authorization", `Bearer ${tokens.caretaker}`).send({ paymentType, amountPaid, paymentMethod: "CASH", paymentRemarks: "normal", paymentAttachments: proof });
  expect(res.status).toBe(200); expect(res.body.bill.billType).toBe("PAYMENT"); expect(renderPDF).toHaveBeenCalledTimes(1);
  expect(res.body.booking.paidAmount).toBe(850 + amountPaid);
});

test("database totals override stale balance and client totals", async () => {
  const res = await post(await seed({ balanceAmount: 0 }), payload({ totalAmount: 5000, paidAmount: 5000, discount: 200 }));
  expect(res.body.booking).toMatchObject({ totalAmount: 1000, paidAmount: 1000, discount: 0, balanceAmount: 0 });
});
test("settle then additional bill with a new key creates two correct receipts", async () => {
  const b = await seed(); await post(b);
  const res = await post(b, payload({ amount: 200 }), "admin", "admin-test-request-002");
  expect(res.body.booking).toMatchObject({ totalAmount: 1200, paidAmount: 1200, balanceAmount: 0 });
  expect(await Bill.countDocuments()).toBe(2);
});
test("normal fully paid and overpayment remain rejected", async () => {
  const b = await seed(); const pay = amountPaid => request(app).post(`/api/payments/bookings/${b._id}/payment`).set("Authorization", `Bearer ${tokens.admin}`).send({ paymentType: "FULL", amountPaid });
  expect((await pay(200)).status).toBe(400); await post(b); expect((await pay(200)).status).toBe(400);
});
test("normal waiver still preserves paid amount and creates WAIVER bill", async () => {
  const b = await seed();
  const res = await request(app).post(`/api/payments/bookings/${b._id}/waiver`).set("Authorization", `Bearer ${tokens.admin}`).send({ waiverAmount: 150, remarks: "waiver", attachments: [{ url: proof[0] }] });
  expect(res.status).toBe(200); expect(res.body.booking).toMatchObject({ totalAmount: 1000, paidAmount: 850, discount: 150, balanceAmount: 0, paymentStatus: "PAID" });
  expect(res.body.waiverBill.billType).toBe("WAIVER");
});
test("normal extension receipt keeps existing stay-period resolver", async () => {
  const b = await seed({ extensionHistory: [{ oldTo: new Date("2026-09-03"), newTo: new Date("2026-09-05"), amount: 150 }] });
  const res = await request(app).post(`/api/payments/bookings/${b._id}/payment`).set("Authorization", `Bearer ${tokens.admin}`).send({ paymentType: "FULL", amountPaid: 150, paymentMethod: "CASH" });
  expect(res.status).toBe(200); expect(renderPDF.mock.calls[0][1].from.toISOString()).toBe("2026-09-03T00:00:00.000Z");
});

test("booking save failure creates no bill or event", async () => {
  const b = await seed(); const spy = jest.spyOn(Booking.prototype, "save").mockRejectedValueOnce(new Error("save failed"));
  expect((await post(b)).status).toBe(503); spy.mockRestore();
  expect(await Bill.countDocuments()).toBe(0); expect(emit).not.toHaveBeenCalled();
  expect((await Booking.findById(b._id)).paidAmount).toBe(850);
});
test("currency rounding settles decimal balance without residual", async () => {
  const res = await post(await seed({ totalAmount: 1000.10, paidAmount: 999.80 }), payload({ amount: 0.30 }));
  expect(res.status).toBe(200); expect(res.body.booking).toMatchObject({ paidAmount: 1000.10, balanceAmount: 0, paymentStatus: "PAID" });
});
test("unauthenticated requests are rejected", async () => {
  const b = await seed(); expect((await request(app).post(`/api/payments/bookings/${b._id}/admin-bill`).send(payload())).status).toBe(401);
});
