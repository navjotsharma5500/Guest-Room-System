import request from "supertest";
import { jest } from "@jest/globals";
import app from "../index.js";
import Booking from "../models/Booking.js";
import Enquiry from "../models/Enquiry.js";
import Log from "../models/Log.js";
import User from "../models/User.js";
import {
  auditAction,
  auditBookingAction,
  createAuditEvent,
  createCronEvent,
  requestIdMiddleware,
  requestTraceMiddleware,
} from "../middleware/logMiddleware.js";
import { trustImmediateProxy } from "../config/trustedProxy.js";
import * as db from "./db-handler.js";

let adminToken;
const roleTokens = {};

const waitForAuditWrites = () => new Promise((resolve) => setTimeout(resolve, 50));

const createTestBooking = (overrides = {}) => Booking.create({
  guest: "Trace Guest",
  email: "trace-guest@test.com",
  contact: "9999999999",
  hostel: "Agira",
  roomNo: "101",
  from: new Date("2030-01-01T00:00:00.000Z"),
  to: new Date("2030-01-02T00:00:00.000Z"),
  ...overrides,
});

beforeAll(async () => {
  await db.connect();
  const users = [
    ["admin", "Audit Admin"],
    ["caretaker", "Audit Caretaker"],
    ["Warden", "Audit Warden"],
    ["manager", "Audit Manager"],
    ["adosa", "Audit Adosa"],
  ];
  for (const [role, name] of users) {
    const email = `audit-${role.toLowerCase()}@test.com`;
    await User.create({ name, email, password: "password123", role });
    roleTokens[role] = (await request(app).post("/api/auth/login").send({ email, password: "password123" })).body.token;
  }
  adminToken = roleTokens.admin;
});
afterAll(() => db.closeDatabase());
beforeEach(() => Log.deleteMany({}));

describe("structured audit log", () => {
  test("stores actor, metadata, request correlation, source and before/after state", async () => {
    await createAuditEvent({ requestId: "req-1", method: "PUT", path: "/x", user: { _id: (await User.findOne({ role: "admin" }))._id, name: "Audit Admin", email: "audit-admin@test.com", role: "admin" }, get: () => "test-agent", ip: "127.0.0.1" }, {
      action: "BOOKING_UPDATED", module: "GUEST_ROOM", bookingId: "GR-1", guestName: "Guest One", hostel: "Agira", roomNo: "1",
      previousState: { status: "booked" }, newState: { status: "no_show" }, details: { note: "safe", password: "must-not-store" },
    });
    const log = await Log.findOne({ requestId: "req-1" }).lean();
    expect(log.userEmail).toBe("audit-admin@test.com");
    expect(log.source).toBe("USER");
    expect(log.details).toEqual({ note: "safe" });
    expect(log.previousState.status).toBe("booked");
    expect(log.newState.status).toBe("no_show");
  });

  test("stores CRON source and never gives audit events a TTL", async () => {
    await createCronEvent({ action: "AUTO_NO_SHOW_CANCELLED", jobName: "autoCancelNoShows", bookingId: "GR-2" });
    const log = await Log.findOne({ bookingId: "GR-2" }).lean();
    expect(log.source).toBe("CRON");
    expect(log.kind).toBe("CRON_JOB");
    expect(log.expiresAt).toBeUndefined();
  });

  test("traces failed state-changing requests without headers or body", async () => {
    const express = (await import("express")).default;
    const traceApp = express();
    traceApp.use(express.json(), requestIdMiddleware, requestTraceMiddleware);
    traceApp.post("/fail", (_req, res) => res.status(422).json({ ok: false }));
    const response = await request(traceApp).post("/fail").set("Authorization", "Bearer secret").set("Cookie", "token=secret").send({ password: "secret" });
    await waitForAuditWrites();
    const log = await Log.findOne({ kind: "REQUEST_TRACE" }).lean();
    expect(response.headers["x-request-id"]).toBe(log.requestId);
    expect(log.result).toBe("FAILED");
    expect(log.httpStatus).toBe(422);
    expect(JSON.stringify(log)).not.toContain("Bearer secret");
    expect(JSON.stringify(log)).not.toContain("token=secret");
  });

  test("correlates request trace and business audit with one response request ID", async () => {
    const express = (await import("express")).default;
    const traceApp = express();
    traceApp.use(express.json(), requestIdMiddleware, requestTraceMiddleware);
    traceApp.post("/booking-action", auditAction("BOOKING_UPDATED", "testBookingAction", "GUEST_ROOM"), (_req, res) => res.json({ ok: true }));

    const response = await request(traceApp).post("/booking-action").send({ safe: true });
    await waitForAuditWrites();
    const responseRequestId = response.headers["x-request-id"];
    const logs = await Log.find({ requestId: responseRequestId }).lean();

    expect(responseRequestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(logs).toHaveLength(2);
    expect(new Set(logs.map((log) => log.requestId))).toEqual(new Set([responseRequestId]));
    expect(new Set(logs.map((log) => log.kind))).toEqual(new Set(["AUDIT", "REQUEST_TRACE"]));
  });

  test("records the client supplied by one trusted Nginx hop and ignores a spoofed earlier hop", async () => {
    const express = (await import("express")).default;
    const proxyApp = express();
    proxyApp.set("trust proxy", trustImmediateProxy);
    proxyApp.use(requestIdMiddleware, requestTraceMiddleware);
    proxyApp.post("/ip", (_req, res) => res.json({ ok: true }));

    await request(proxyApp).post("/ip").set("X-Forwarded-For", "203.0.113.10, 198.51.100.25");
    await waitForAuditWrites();
    const log = await Log.findOne({ route: "/ip" }).lean();

    expect(log.ipAddress).toBe("198.51.100.25");
    expect(log.ipAddress).not.toBe("203.0.113.10");
    expect(trustImmediateProxy("203.0.113.50", 0)).toBe(false);
    expect(trustImmediateProxy("127.0.0.1", 0)).toBe(true);
    expect(trustImmediateProxy("127.0.0.1", 1)).toBe(false);
  });

  test("audit database failures do not change a successful booking action", async () => {
    const express = (await import("express")).default;
    const booking = await createTestBooking({ guest: "Before Audit Failure" });
    const failureApp = express();
    failureApp.use(express.json(), requestIdMiddleware, requestTraceMiddleware);
    failureApp.patch(
      "/bookings/:id",
      auditBookingAction("BOOKING_UPDATED", "testAuditFailureIsolation"),
      async (req, res) => {
        const updated = await Booking.findByIdAndUpdate(req.params.id, { guest: req.body.guest }, { new: true });
        res.json({ success: true, guest: updated.guest });
      }
    );

    const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
    const createSpy = jest.spyOn(Log, "create").mockRejectedValue(new Error("audit unavailable"));
    const response = await request(failureApp).patch(`/bookings/${booking._id}`).send({ guest: "Business Succeeded" });
    await waitForAuditWrites();

    expect(createSpy).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalledWith(
      "AUDIT_WRITE_FAILED",
      expect.objectContaining({ error: "audit unavailable" })
    );
    createSpy.mockRestore();
    consoleError.mockRestore();

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, guest: "Business Succeeded" });
    expect((await Booking.findById(booking._id).lean()).guest).toBe("Business Succeeded");
  });
});

describe("selective detail read tracing", () => {
  test("GET /api/bookings/:id creates exactly one contextual trace", async () => {
    const booking = await createTestBooking();
    const response = await request(app)
      .get(`/api/bookings/${booking._id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .set("User-Agent", "audit-read-test");
    await waitForAuditWrites();
    const logs = await Log.find({ kind: "REQUEST_TRACE" }).lean();

    expect(response.status).toBe(200);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: "DETAIL_VIEWED",
      functionName: "getBookingById",
      requestId: response.headers["x-request-id"],
      userEmail: "audit-admin@test.com",
      userRole: "admin",
      method: "GET",
      route: "/api/bookings/:id",
      entityId: String(booking._id),
      bookingId: booking.bookingId,
      guestName: "Trace Guest",
      hostel: "Agira",
      roomNo: "101",
      result: "SUCCESS",
      httpStatus: 200,
      userAgent: "audit-read-test",
    });
    expect(logs[0].durationMs).toBeGreaterThanOrEqual(0);
    expect(logs[0].ipAddress).toBeTruthy();
  });

  test("GET /api/enquiry/:id creates one lightweight contextual trace", async () => {
    const enquiry = await Enquiry.create({
      name: "Enquiry Trace Guest",
      email: "enquiry-trace@test.com",
      contact: "8888888888",
      from: new Date("2030-02-01T00:00:00.000Z"),
      to: new Date("2030-02-02T00:00:00.000Z"),
      hostelName: "Kaveri",
      roomName: "202",
    });
    const response = await request(app).get(`/api/enquiry/${enquiry._id}`).set("Authorization", `Bearer ${adminToken}`);
    await waitForAuditWrites();
    const logs = await Log.find({ kind: "REQUEST_TRACE" }).lean();

    expect(response.status).toBe(200);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      action: "DETAIL_VIEWED",
      functionName: "getEnquiryById",
      route: "/api/enquiry/:id",
      entityId: String(enquiry._id),
      guestName: "Enquiry Trace Guest",
      hostel: "Kaveri",
      roomNo: "202",
    });
  });

  test("booking lists and polling GETs do not create request traces", async () => {
    await Promise.all([
      request(app).get("/api/bookings/all").set("Authorization", `Bearer ${adminToken}`),
      request(app).get("/api/bookings/all-for-download").set("Authorization", `Bearer ${adminToken}`),
      request(app).get("/api/enquiry").set("Authorization", `Bearer ${adminToken}`),
      request(app).get("/api/dashboard/stats").set("Authorization", `Bearer ${adminToken}`),
      request(app).get("/api/system-settings/public"),
    ]);
    await waitForAuditWrites();

    expect(await Log.countDocuments({ kind: "REQUEST_TRACE" })).toBe(0);
  });
});

describe("admin audit API", () => {
  beforeEach(async () => {
    await Log.create([
      { timestamp: new Date("2026-09-02T10:00:00Z"), action: "BOOKING_CREATED", module: "GUEST_ROOM", source: "USER", userEmail: "one@test.com", bookingId: "GR-100", guestName: "A Guest", hostel: "Agira", roomNo: "1" },
      { timestamp: new Date("2026-09-03T10:00:00Z"), action: "GUEST_NOT_REPORTED", module: "GUEST_ROOM", source: "USER", userEmail: "two@test.com", bookingId: "GR-200", guestName: "B Guest", hostel: "Kaveri", roomNo: "2" },
    ]);
    await Log.collection.insertOne({ timestamp: new Date("2025-01-01"), action: "old_action" });
  });

  test("allows admin, rejects unauthorized roles, and normalizes legacy rows", async () => {
    for (const role of ["caretaker", "Warden", "manager", "adosa"]) {
      expect((await request(app).get("/api/admin/audit-logs").set("Authorization", `Bearer ${roleTokens[role]}`)).status).toBe(403);
    }
    const response = await request(app).get("/api/admin/audit-logs?kind=AUDIT&limit=10").set("Authorization", `Bearer ${adminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.logs[0].action).toBe("GUEST_NOT_REPORTED");
    expect(response.body.logs.find((row) => row.action === "OLD_ACTION").userName).toBe("Legacy / Unknown");
    const storedLegacy = await Log.collection.findOne({ action: "old_action" });
    expect(storedLegacy.kind).toBeUndefined();
    expect(storedLegacy.userName).toBeUndefined();
  });

  test.each([
    ["user=one@test.com", "GR-100"], ["action=GUEST_NOT_REPORTED", "GR-200"], ["bookingId=GR-100", "GR-100"],
    ["guest=A%20Guest", "GR-100"], ["hostel=Kaveri&room=2", "GR-200"],
    ["dateFrom=2026-09-03T00:00:00.000Z&dateTo=2026-09-03T23:59:59.999Z", "GR-200"],
  ])("filters %s", async (query, bookingId) => {
    const response = await request(app).get(`/api/admin/audit-logs?${query}`).set("Authorization", `Bearer ${adminToken}`);
    expect(response.body.logs).toHaveLength(1);
    expect(response.body.logs[0].bookingId).toBe(bookingId);
  });

  test("paginates newest first", async () => {
    const first = await request(app).get("/api/admin/audit-logs?page=1&limit=1").set("Authorization", `Bearer ${adminToken}`);
    const second = await request(app).get("/api/admin/audit-logs?page=2&limit=1").set("Authorization", `Bearer ${adminToken}`);
    expect(first.body.pagination.total).toBe(3);
    expect(new Date(first.body.logs[0].timestamp) > new Date(second.body.logs[0].timestamp)).toBe(true);
  });
});
