import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "campus-feedback-test-secret";

const app = (await import("../index.js")).default;
const CampusFeedback = (await import("../models/CampusFeedback.js")).default;
const User = (await import("../models/User.js")).default;

let mongoServer;
let user;
let admin;
let userToken;
let adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
  user = await User.create({ name: "Student User", email: "student@thapar.edu", password: "password", role: "student", profilePicture: "https://example.com/student.jpg" });
  admin = await User.create({ name: "Admin User", email: "admin@thapar.edu", password: "password", role: "admin" });
  userToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
  adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET);
  await CampusFeedback.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

test("requires authentication for feedback submission", async () => {
  const response = await request(app).post("/api/campus-feedback").send({ rating: 5, description: "Excellent portal" });
  expect(response.status).toBe(401);
  expect(response.body.message).toBe("Authentication required");
});

test("creates one pending feedback from verified user identity and deduplicates retry", async () => {
  const payload = { rating: 5, description: " Excellent portal " , userName: "Forged", userEmail: "forged@example.com" };
  const first = await request(app).post("/api/campus-feedback").set("Authorization", `Bearer ${userToken}`).send(payload);
  const retry = await request(app).post("/api/campus-feedback").set("Authorization", `Bearer ${userToken}`).send(payload);
  expect(first.status).toBe(201);
  expect(first.body.feedback.status).toBe("pending");
  expect(retry.status).toBe(200);
  expect(retry.body.duplicate).toBe(true);
  const stored = await CampusFeedback.find();
  expect(stored).toHaveLength(1);
  expect(stored[0].userName).toBe(user.name);
  expect(stored[0].userEmail).toBe(user.email);
  expect(stored[0].description).toBe("Excellent portal");
});

test("denies non-admin moderation and allows admin approve, reject and delete", async () => {
  const item = await CampusFeedback.findOne();
  const denied = await request(app).get("/api/campus-feedback/admin").set("Authorization", `Bearer ${userToken}`);
  expect(denied.status).toBe(403);

  const approved = await request(app).patch(`/api/campus-feedback/${item._id}/approve`).set("Authorization", `Bearer ${adminToken}`);
  expect(approved.status).toBe(200);
  expect(approved.body.feedback.status).toBe("approved");
  expect(approved.body.feedback.approvedAt).toBeTruthy();
  expect(String(approved.body.feedback.approvedBy)).toBe(String(admin._id));

  const publicApproved = await request(app).get("/api/campus-feedback/public");
  expect(publicApproved.body.feedback).toEqual([{ rating: 5, description: "Excellent portal" }]);
  expect(publicApproved.body.feedback[0].userEmail).toBeUndefined();

  const rejected = await request(app).patch(`/api/campus-feedback/${item._id}/reject`).set("Authorization", `Bearer ${adminToken}`);
  expect(rejected.body.feedback.status).toBe("rejected");
  const publicRejected = await request(app).get("/api/campus-feedback/public");
  expect(publicRejected.body.feedback).toEqual([]);

  const deleted = await request(app).delete(`/api/campus-feedback/${item._id}`).set("Authorization", `Bearer ${adminToken}`);
  expect(deleted.status).toBe(200);
  expect(await CampusFeedback.countDocuments()).toBe(0);
});

