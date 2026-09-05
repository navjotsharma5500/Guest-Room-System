import request from "supertest";
import app from "../index.js";
import Booking from "../models/Booking.js";
import Enquiry from "../models/Enquiry.js";
import User from "../models/User.js";
import Log from "../models/Log.js";
import * as db from "./db-handler.js";

const proof = "https://example.com/address-proof.pdf";
const tokens = {};
let caretaker;
const today = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const createBooking = (overrides = {}) => Booking.create({
  guest: "Proof Guest", email: "proof@example.com", contact: "9999999999",
  hostel: "Agira", roomNo: "101", from: new Date(`${today()}T00:00:00Z`),
  to: new Date(Date.now() + 3 * 86400000), ...overrides,
});
const createEnquiry = (files = []) => Enquiry.create({
  name: "Proof Guest", email: "proof@example.com", contact: "9999999999",
  from: new Date(), to: new Date(Date.now() + 86400000), files,
});
const report = (booking, role = "caretaker", body = {}) => request(app)
  .put(`/api/bookings/${booking._id}/reported`)
  .set("Authorization", `Bearer ${tokens[role]}`)
  .send({ actualCheckInDate: today(), actualCheckInTime: "12:00", ...body });
const attach = (booking, type, url) => request(app)
  .post(`/api/bookings/${booking._id}/attachments`)
  .set("Authorization", `Bearer ${tokens.caretaker}`)
  .send({ type, attachments: [url] });

beforeAll(async () => {
  await db.connect();
  for (const role of ["caretaker", "Warden", "admin"]) {
    const email = `proof-${role.toLowerCase()}@test.com`;
    const user = await User.create({ name: role, email, password: "password123", role, assignedHostel: "Agira" });
    if (role === "caretaker") caretaker = user;
    const response = await request(app).post("/api/auth/login").send({ email, password: "password123" });
    expect(response.status).toBe(200);
    tokens[role] = response.body.token;
  }
});
afterAll(() => db.closeDatabase());

describe("Add Attachments routing", () => {
  test("each POST appends only to its category and preserves the linked enquiry", async () => {
    const mapping = { enquiry: "files", approval: "approvalDocuments", paid: "paymentAttachments", extension: "extensionAttachments" };
    const enquiry = await createEnquiry([proof]);
    const expected = Object.fromEntries(Object.values(mapping).map(field => [field, [`https://example.com/existing-${field}.pdf`]]));
    const booking = await createBooking({ ...expected, enquiryId: enquiry._id });
    for (const [type, field] of Object.entries(mapping)) {
      const url = `https://example.com/new-${type}.pdf`;
      const response = await attach(booking, type, url);
      expect(response.status).toBe(200);
      expected[field].push(url);
      const saved = await Booking.findById(booking._id).lean();
      for (const category of Object.values(mapping)) expect(saved[category]).toEqual(expected[category]);
      expect((await Enquiry.findById(enquiry._id).lean()).files).toEqual([proof]);
    }
  });
});

describe("caretaker address proof before reporting", () => {
  test.each(["booking", "enquiry", "both"])("accepts proof from %s", async (source) => {
    const enquiry = await createEnquiry(source !== "booking" ? [proof] : []);
    const booking = await createBooking({ files: source !== "enquiry" ? [proof] : [], enquiryId: enquiry._id });
    const response = await report(booking);
    expect(response.status).toBe(200);
    const saved = await Booking.findById(booking._id).lean();
    expect(saved.status).toBe("checked_in");
    expect(saved.reportedStatus).toBe("reported");
    expect(String(saved.reportedBy)).toBe(String(caretaker._id));
    expect(saved.reportedAt).toBeInstanceOf(Date);
  });

  test.each([
    ["empty", {}],
    ["approval only", { approvalDocuments: [proof] }],
    ["payment only", { paymentAttachments: [proof] }],
    ["extension only", { extensionAttachments: [proof] }],
    ["cancel only", { cancelAttachments: [proof] }],
    ["early check-in only", { earlyCheckIn: { attachments: [proof] } }],
    ["invalid URLs", { files: ["", "  ", "not-a-url", "javascript:alert(1)"] }],
  ])("rejects %s without changing the booking", async (_name, overrides) => {
    const enquiry = await createEnquiry(["", " "]);
    const booking = await createBooking({ enquiryId: enquiry._id, ...overrides });
    const before = await Booking.findById(booking._id).lean();
    const response = await report(booking, "caretaker", { adminOverride: true });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false, code: "GUEST_ADDRESS_PROOF_REQUIRED",
      message: "Kindly attach the guest address proof under Enquiry Attachments before reporting the guest.",
    });
    expect(await Booking.findById(booking._id).lean()).toEqual(before);
  });

  test("later enquiry upload enables reporting without changing original enquiry", async () => {
    const enquiry = await createEnquiry();
    const booking = await createBooking({ enquiryId: enquiry._id });
    expect((await report(booking)).status).toBe(400);
    expect((await attach(booking, "enquiry", proof)).status).toBe(200);
    expect((await report(booking)).status).toBe(200);
    expect((await Enquiry.findById(enquiry._id)).files).toEqual([]);
  });

  test("missing linked enquiry is safe; Booking.files still suffices", async () => {
    const enquiry = await createEnquiry();
    await Enquiry.deleteOne({ _id: enquiry._id });
    const booking = await createBooking({ enquiryId: enquiry._id });
    expect((await report(booking)).status).toBe(400);
    await attach(booking, "enquiry", proof);
    expect((await report(booking)).status).toBe(200);
  });

  test("rejection is one FAILED request trace with no business event or URLs", async () => {
    const booking = await createBooking({ approvalDocuments: [proof] });
    const response = await report(booking);
    expect(response.status).toBe(400);
    let logs = [];
    for (let attempt = 0; attempt < 40; attempt++) {
      logs = await Log.find({ requestId: response.headers["x-request-id"] }).lean();
      if (logs.length) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ kind: "REQUEST_TRACE", result: "FAILED", httpStatus: 400, method: "PUT", route: `/api/bookings/${booking._id}/reported` });
    expect(JSON.stringify(logs)).not.toContain(proof);
  });

  test.each(["Warden", "admin"])("preserves existing %s reporting scope", async (role) => {
    expect((await report(await createBooking(), role)).status).toBe(200);
  });

  test("proof does not bypass existing reporting date validation", async () => {
    const booking = await createBooking({ files: [proof] });
    expect((await report(booking, "caretaker", { actualCheckInDate: "2099-01-01" })).status).toBe(400);
    expect((await Booking.findById(booking._id)).status).toBe("booked");
  });
});
