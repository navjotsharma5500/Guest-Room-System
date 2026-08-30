import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "guest-feedback-test-secret";

const app = (await import("../index.js")).default;
const GuestFeedback = (await import("../models/GuestFeedback.js")).default;
const User = (await import("../models/User.js")).default;

let mongoServer;
let admin;
let manager;
let caretaker;
let adminToken;
let managerToken;
let caretakerToken;

const makeFeedback = (overrides = {}) =>
  GuestFeedback.create({
    name: "Guest User",
    contact: "9876543210",
    email: "guest@example.com",
    rating: 4,
    ratingLabel: "Good",
    description: "Nice stay",
    ...overrides,
  });

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  admin = await User.create({ name: "Admin User", email: "admin@thapar.edu", password: "password", role: "admin" });
  manager = await User.create({ name: "Manager User", email: "manager@thapar.edu", password: "password", role: "manager" });
  caretaker = await User.create({ name: "Caretaker User", email: "caretaker@thapar.edu", password: "password", role: "caretaker" });
  adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
  managerToken = jwt.sign({ id: manager._id }, process.env.JWT_SECRET);
  caretakerToken = jwt.sign({ id: caretaker._id }, process.env.JWT_SECRET);
  await GuestFeedback.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

afterEach(async () => {
  await GuestFeedback.deleteMany({});
});

test("unauthenticated delete request is rejected", async () => {
  const feedback = await makeFeedback();
  const response = await request(app).delete(`/api/guest-feedback/${feedback._id}`);
  expect(response.status).toBe(401);
  expect(await GuestFeedback.findById(feedback._id)).not.toBeNull();
});

test("non-admin role cannot delete feedback", async () => {
  const feedback = await makeFeedback();
  const response = await request(app)
    .delete(`/api/guest-feedback/${feedback._id}`)
    .set("Authorization", `Bearer ${managerToken}`);
  expect(response.status).toBe(403);
  expect(await GuestFeedback.findById(feedback._id)).not.toBeNull();

  const caretakerAttempt = await request(app)
    .delete(`/api/guest-feedback/${feedback._id}`)
    .set("Authorization", `Bearer ${caretakerToken}`);
  expect(caretakerAttempt.status).toBe(403);
});

test("nonexistent feedback id returns 404", async () => {
  const missingId = new mongoose.Types.ObjectId();
  const response = await request(app)
    .delete(`/api/guest-feedback/${missingId}`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(response.status).toBe(404);
});

test("authorized admin deletes feedback and the record no longer exists", async () => {
  const feedback = await makeFeedback();
  const response = await request(app)
    .delete(`/api/guest-feedback/${feedback._id}`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(await GuestFeedback.findById(feedback._id)).toBeNull();
});

test("reviewed feedback can still be deleted", async () => {
  const feedback = await makeFeedback({ status: "reviewed" });
  const response = await request(app)
    .delete(`/api/guest-feedback/${feedback._id}`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(response.status).toBe(200);
  expect(await GuestFeedback.findById(feedback._id)).toBeNull();
});

test("mark as reviewed continues working for admin and manager, unaffected by delete changes", async () => {
  const feedback = await makeFeedback();
  const response = await request(app)
    .patch(`/api/guest-feedback/${feedback._id}/status`)
    .set("Authorization", `Bearer ${managerToken}`)
    .send({ status: "reviewed" });
  expect(response.status).toBe(200);
  expect(response.body.feedback.status).toBe("reviewed");

  const stillThere = await GuestFeedback.findById(feedback._id);
  expect(stillThere.status).toBe("reviewed");
});

test("feedback containing HTML/script-like text is stored and returned verbatim as plain text", async () => {
  const maliciousText = '<script>alert("xss")</script> DROP TABLE users; --';
  const feedback = await makeFeedback({ description: maliciousText });

  const getResponse = await request(app)
    .get(`/api/guest-feedback/${feedback._id}`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(getResponse.status).toBe(200);
  // Stored and returned as an inert string — no server-side HTML transformation
  // or stripping, so the frontend's plain-text rendering is the only place
  // this text is ever displayed (never interpreted as markup).
  expect(getResponse.body.feedback.description).toBe(maliciousText);

  const deleteResponse = await request(app)
    .delete(`/api/guest-feedback/${feedback._id}`)
    .set("Authorization", `Bearer ${adminToken}`);
  expect(deleteResponse.status).toBe(200);
  expect(await GuestFeedback.findById(feedback._id)).toBeNull();
});
