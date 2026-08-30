import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";

const app = (await import("../index.js")).default;
const User = (await import("../models/User.js")).default;
const Hostel = (await import("../models/Hostel.js")).default;
const Enquiry = (await import("../models/Enquiry.js")).default;

let mongoServer;
let adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  await User.create({ name: "Admin User", email: "admin@rbb-test.com", password: "password123", role: "admin" });
  const loginRes = await request(app).post("/api/auth/login").send({
    email: "admin@rbb-test.com",
    password: "password123",
  });
  adminToken = loginRes.body.token;

  await Hostel.create({
    name: "Block Test Hostel",
    code: "BTH",
    caretakerEmail: "caretaker@rbb-test.com",
    wardenEmail: "warden@rbb-test.com",
    rooms: [
      {
        roomNo: "G1",
        isBlocked: true,
        blockedTill: new Date("2026-09-10T18:00:00.000Z"),
        blockRemarks: "Plumbing repair",
      },
      { roomNo: "G2" },
    ],
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

const bookingPayload = (overrides = {}) => ({
  guest: "Test Guest",
  email: "guest@rbb-test.com",
  contact: "9998887776",
  hostel: "Block Test Hostel",
  roomNo: "G1",
  paymentType: "Paid",
  totalAmount: 500,
  ...overrides,
});

describe("Fix 1/2 — blocked room only rejects overlapping dates (Direct Booking)", () => {
  test("booking fully inside the block window is rejected", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(bookingPayload({ from: "2026-09-05", to: "2026-09-08" }));

    expect(res.status).toBe(400);
    expect(res.body.blocked).toBe(true);
  });

  test("booking that starts before and overlaps the block end is rejected", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(bookingPayload({ from: "2026-09-09", to: "2026-09-12" }));

    expect(res.status).toBe(400);
    expect(res.body.blocked).toBe(true);
  });

  test("booking that starts the day after the block ends is allowed", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(bookingPayload({ from: "2026-09-11", to: "2026-09-13" }));

    expect(res.status).toBe(201);
    expect(res.body.booking).toBeTruthy();
    expect(res.body.booking.roomNo).toBe("G1");
  });

  test("unblocked room behavior is unchanged", async () => {
    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(bookingPayload({ roomNo: "G2", from: "2026-09-05", to: "2026-09-08" }));

    expect(res.status).toBe(201);
  });
});

describe("Fix 3 — enquiry room assignment is date-aware", () => {
  test("enquiry dates overlapping the block cannot be assigned to the blocked room", async () => {
    const enquiry = await Enquiry.create({
      name: "Enquiry Guest",
      email: "enquiry1@rbb-test.com",
      contact: "9998887771",
      from: new Date("2026-09-05"),
      to: new Date("2026-09-08"),
      hostelName: "Block Test Hostel",
      roomName: "G1",
    });

    const res = await request(app)
      .put(`/api/enquiry/${enquiry._id}/approved`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        hostel: "Block Test Hostel",
        roomNo: "G1",
        checkInTime: "00:00",
        checkOutTime: "23:59",
        paymentType: "Paid",
        totalAmount: 500,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/blocked/i);
  });

  test("enquiry dates entirely after the block ends can be assigned to the blocked room", async () => {
    const enquiry = await Enquiry.create({
      name: "Enquiry Guest 2",
      email: "enquiry2@rbb-test.com",
      contact: "9998887772",
      from: new Date("2026-09-20"),
      to: new Date("2026-09-22"),
      hostelName: "Block Test Hostel",
      roomName: "G1",
    });

    const res = await request(app)
      .put(`/api/enquiry/${enquiry._id}/approved`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        hostel: "Block Test Hostel",
        roomNo: "G1",
        checkInTime: "00:00",
        checkOutTime: "23:59",
        paymentType: "Paid",
        totalAmount: 500,
      });

    expect(res.status).toBe(200);
  });
});

describe("Bug 2 — Direct Booking max-duration uses inclusive calendar days, stays dynamic", () => {
  // 2026-09-28 -> 2026-10-02 is 5 inclusive calendar days (28,29,30,1,2), but
  // only 4 nights. The old nights-based calculation would wrongly treat this
  // as "4 days" and under-count it against the configured limit.

  test("with the configured limit at 4, a 5-inclusive-day booking is flagged for review (proves inclusive counting, not nights)", async () => {
    // caretakerMaxDirectBookingDays is raised well above the 4-night stay so
    // the separate continuous-stay/rebooking gate (utils/rebookingUtils.js,
    // intentionally left untouched — it counts nights for a different,
    // unrelated purpose) never fires here. That isolates this assertion to
    // the Direct Booking max-duration check this bug fix actually changed.
    const settingsRes = await request(app)
      .put("/api/system-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        bookingDays: { managerMaxDirectBookingDays: 4, caretakerMaxDirectBookingDays: 10 },
        extensionRules: { coWardenLevelDays: 11, adosaLevelDays: 12 },
      });
    expect(settingsRes.status).toBe(200);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(bookingPayload({
        roomNo: "G2",
        email: "duration1@rbb-test.com",
        contact: "9998887773",
        from: "2026-09-28",
        to: "2026-10-02",
      }));

    expect(res.status).toBe(201);
    expect(res.body.booking.approvalStatus).toBe("under_review");
  });

  test("raising the configured limit to 5 (dynamic, not hardcoded) allows the same 5-day booking through", async () => {
    const settingsRes = await request(app)
      .put("/api/system-settings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ bookingDays: { managerMaxDirectBookingDays: 5 } }); // caretakerMaxDirectBookingDays stays 10 from the previous test
    expect(settingsRes.status).toBe(200);

    const res = await request(app)
      .post("/api/bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(bookingPayload({
        roomNo: "G2",
        email: "duration2@rbb-test.com",
        contact: "9998887774",
        from: "2026-09-28",
        to: "2026-10-02",
      }));

    expect(res.status).toBe(201);
    expect(res.body.booking.approvalStatus).toBe("auto_approved");
  });
});
