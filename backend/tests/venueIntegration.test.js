import mongoose from "mongoose";
import request from "supertest";
import { jest } from "@jest/globals";
import { MongoMemoryServer } from "mongodb-memory-server";
import crypto from "crypto";

process.env.NODE_ENV = "test";
process.env.VENUE_API_KEY = "venue-integration-test-key";

const app = (await import("../index.js")).default;
const VenueEnquiry = (await import("../models/VenueEnquiry.js")).default;

let mongoServer;

const payload = {
  venueName: "Main Auditorium",
  fromDate: "2026-08-05",
  toDate: "2026-08-05",
  startTime: "18:00",
  endTime: "22:00",
  societyName: "Creative Computing Society",
  eventName: "Night Coding Session",
  studentName: "Student Name",
  studentEmail: "student@thapar.edu",
  contactNumber: "9876543210",
};

const submitEnquiry = () =>
  request(app)
    .post("/api/integration/book-room")
    .set("x-venue-api-key", process.env.VENUE_API_KEY)
    .send(payload);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  await VenueEnquiry.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test("integration enquiries receive unique non-null requestIds", async () => {
  const first = await submitEnquiry();
  const second = await submitEnquiry();

  expect(first.status).toBe(201);
  expect(second.status).toBe(201);
  expect(first.body.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  expect(second.body.requestId).toMatch(/^[0-9a-f-]{36}$/i);
  expect(second.body.requestId).not.toBe(first.body.requestId);

  const stored = await VenueEnquiry.find().sort({ createdAt: 1 }).lean();
  expect(stored).toHaveLength(2);
  expect(stored.every((enquiry) => typeof enquiry.requestId === "string" && enquiry.requestId.length > 0)).toBe(true);
  expect(new Set(stored.map((enquiry) => enquiry.requestId)).size).toBe(2);
});

test("integration validation errors remain explicit and do not create an enquiry", async () => {
  const response = await request(app)
    .post("/api/integration/book-room")
    .set("x-venue-api-key", process.env.VENUE_API_KEY)
    .send({ ...payload, contactNumber: "123" });

  expect(response.status).toBe(400);
  expect(response.body).toEqual({
    success: false,
    message: "contactNumber must contain exactly 10 digits",
  });
  expect(await VenueEnquiry.countDocuments()).toBe(2);
});

test("requestId index conflicts return 409 instead of 500", async () => {
  const fixedRequestId = "550e8400-e29b-41d4-a716-446655440000";
  const randomUUID = jest.spyOn(crypto, "randomUUID").mockReturnValue(fixedRequestId);

  try {
    const first = await submitEnquiry();
    const duplicate = await submitEnquiry();

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({
      success: false,
      message: "Could not allocate a unique requestId. Please retry the request.",
    });
  } finally {
    randomUUID.mockRestore();
  }
});

test("model validation failures return 400 instead of 500", async () => {
  const response = await request(app)
    .post("/api/integration/book-room")
    .set("x-venue-api-key", process.env.VENUE_API_KEY)
    .send({ ...payload, studentName: "A".repeat(101) });

  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.message).toMatch(/maximum allowed length/i);
});
