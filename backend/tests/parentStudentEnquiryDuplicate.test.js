import { jest } from "@jest/globals";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "parent-student-enquiry-test-secret";
process.env.GOOGLE_CLIENT_ID = "parent-student-enquiry-test-client";

const verifiedEmails = new Map([
  ["token-a-upper", " USER@THAPAR.EDU "],
  ["token-a-lower", "user@thapar.edu"],
  ["token-b", "other@gmail.com"],
]);

const verifyIdToken = jest.fn(async ({ idToken }) => {
  const email = verifiedEmails.get(idToken);
  if (!email) throw new Error("Invalid Google credential");
  return {
    getPayload: () => ({ email, email_verified: true }),
  };
});

jest.unstable_mockModule("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken })),
}));

jest.unstable_mockModule("../utils/asyncEmail.js", () => ({
  asyncSendEmails: jest.fn(),
}));

const app = (await import("../index.js")).default;
const Booking = (await import("../models/Booking.js")).default;
const Enquiry = (await import("../models/Enquiry.js")).default;
const Hostel = (await import("../models/Hostel.js")).default;
const User = (await import("../models/User.js")).default;

let mongoServer;
let adminToken;

const parentStudentPayload = ({
  credential = "token-a-lower",
  guestEmail = "forged@example.com",
  overrides = {},
} = {}) => ({
  guestName: "Guest Person",
  guestEmail,
  googleCredential: credential,
  guestPhone: "9876543210",
  message: "Family visit",
  fullData: {
    bookingCategory: "ParentStudent",
    from: "2026-09-01",
    to: "2026-09-02",
    guests: 1,
    females: 1,
    males: 0,
    ...overrides,
  },
});

const facultyStaffPayload = () => ({
  guestName: "Faculty Guest",
  guestEmail: "USER@THAPAR.EDU",
  guestPhone: "9876543210",
  message: "Official visit",
  fullData: {
    bookingCategory: "FacultyStaff",
    from: "2026-09-01",
    to: "2026-09-02",
    guests: 1,
    females: 0,
    males: 1,
  },
});

const seedParentStudentEnquiry = (overrides = {}) =>
  Enquiry.create({
    name: "Existing Guest",
    email: "user@thapar.edu",
    contact: "9876543210",
    from: new Date("2026-09-01"),
    to: new Date("2026-09-02"),
    bookingCategory: "ParentStudent",
    status: "pending",
    ...overrides,
  });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  const admin = await User.create({
    name: "Admin User",
    email: "admin@thapar.edu",
    password: "password",
    role: "admin",
  });
  adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
});

beforeEach(async () => {
  await Promise.all([
    Booking.deleteMany({}),
    Enquiry.deleteMany({}),
    Hostel.deleteMany({}),
  ]);
  verifyIdToken.mockClear();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test("creates the first ParentStudent enquiry from the verified normalized Google email", async () => {
  const response = await request(app)
    .post("/api/enquiry/create")
    .send(parentStudentPayload({ credential: "token-a-upper" }));

  expect(response.status).toBe(201);
  expect(response.body.success).toBe(true);
  expect(response.body.enquiry.email).toBe("user@thapar.edu");
  expect(await Enquiry.countDocuments()).toBe(1);
});

test.each(["pending", "pending-approval"])(
  "blocks a normalized duplicate while the existing status is %s and creates no document",
  async (status) => {
    await seedParentStudentEnquiry({ email: " USER@THAPAR.EDU ", status });

    const response = await request(app)
      .post("/api/enquiry/create")
      .send(parentStudentPayload({ credential: "token-a-lower" }));

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      success: false,
      code: "ACTIVE_PARENT_STUDENT_ENQUIRY_EXISTS",
      message: "Your previous guest room request is still under process. Please wait for its approval or rejection before submitting another request.",
    });
    expect(await Enquiry.countDocuments()).toBe(1);
  }
);

test("allows a different verified email and leaves FacultyStaff creation unrestricted", async () => {
  await seedParentStudentEnquiry();

  const differentEmail = await request(app)
    .post("/api/enquiry/create")
    .send(parentStudentPayload({ credential: "token-b" }));
  const facultyStaff = await request(app)
    .post("/api/enquiry/create")
    .send(facultyStaffPayload());

  expect(differentEmail.status).toBe(201);
  expect(differentEmail.body.enquiry.email).toBe("other@gmail.com");
  expect(facultyStaff.status).toBe(201);
  expect(facultyStaff.body.enquiry.bookingCategory).toBe("FacultyStaff");
  expect(await Enquiry.countDocuments()).toBe(3);
});

test("allows another ParentStudent enquiry after the existing enquiry is rejected", async () => {
  const existing = await seedParentStudentEnquiry();
  const rejected = await request(app)
    .put(`/api/enquiry/${existing._id}/rejected`)
    .set("Authorization", `Bearer ${adminToken}`);

  expect(rejected.status).toBe(200);
  expect(rejected.body.enquiry.status).toBe("rejected");

  const next = await request(app)
    .post("/api/enquiry/create")
    .send(parentStudentPayload());
  expect(next.status).toBe(201);
  expect(await Enquiry.countDocuments()).toBe(2);
});

test("treats the existing approved status as resolved", async () => {
  await seedParentStudentEnquiry({ status: "approved" });

  const next = await request(app)
    .post("/api/enquiry/create")
    .send(parentStudentPayload());

  expect(next.status).toBe(201);
  expect(await Enquiry.countDocuments()).toBe(2);
});

test("allows another ParentStudent enquiry after approval creates a booking and resolves the first", async () => {
  const hostel = await Hostel.create({
    name: "Test Hostel",
    code: "TH",
    hostelType: "girls",
    caretakerEmail: "caretaker@thapar.edu",
    wardenEmail: "warden@thapar.edu",
    rooms: [{ roomNo: "GR-1", guestRoom: true, guestCapacity: 2 }],
  });
  const room = hostel.rooms[0];
  const existing = await seedParentStudentEnquiry({
    hostelId: hostel._id,
    roomId: room._id,
    hostelName: hostel.name,
    roomName: room.roomNo,
  });

  const approved = await request(app)
    .put(`/api/enquiry/${existing._id}/approved`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      hostel: hostel.name,
      roomNo: room.roomNo,
      paymentType: "Free",
      totalAmount: 0,
      approvalDocuments: [],
      freeRemarks: "Test approval",
    });

  expect(approved.status).toBe(200);
  expect(approved.body.enquiry.status).toBe("booked");
  expect(await Booking.countDocuments({ enquiryId: existing._id })).toBe(1);

  const next = await request(app)
    .post("/api/enquiry/create")
    .send(parentStudentPayload());
  expect(next.status).toBe(201);
  expect(await Enquiry.countDocuments()).toBe(2);
});

test("rejects ParentStudent creation without a valid Google credential", async () => {
  const response = await request(app)
    .post("/api/enquiry/create")
    .send(parentStudentPayload({ credential: "invalid-token" }));

  expect(response.status).toBe(401);
  expect(response.body.code).toBe("PARENT_STUDENT_GOOGLE_AUTH_REQUIRED");
  expect(await Enquiry.countDocuments()).toBe(0);
});
