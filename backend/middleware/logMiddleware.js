import crypto from "crypto";
import Log from "../models/Log.js";

const BLOCKED_KEYS = /password|token|authorization|cookie|otp|secret|credential/i;
const MAX_TEXT = 2000;

export const sanitizeAuditValue = (value, depth = 0) => {
  if (depth > 4 || value == null) return value;
  if (typeof value === "string") return value.slice(0, MAX_TEXT);
  if (typeof value !== "object") return value;
  if (value instanceof Date || value?._bsontype === "ObjectId") return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => sanitizeAuditValue(item, depth + 1));
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !BLOCKED_KEYS.test(key))
    .map(([key, item]) => [key, sanitizeAuditValue(item, depth + 1)]));
};

const actorFields = (user) => ({
  userId: user?._id || user?.id || null,
  userName: user?.name || undefined,
  userEmail: user?.email || undefined,
  userRole: user?.originalRole || user?.role || undefined,
});

export const requestContext = (req = {}) => ({
  requestId: req.requestId,
  ...actorFields(req.user),
  method: req.method,
  route: (req.baseUrl || "") + (req.route?.path || req.path || ""),
  ipAddress: req.ip || req.socket?.remoteAddress,
  userAgent: String(req.get?.("user-agent") || "").slice(0, 500) || undefined,
});

export const bookingAuditFields = (booking = {}) => ({
  entityType: "BOOKING",
  entityId: String(booking?._id || booking?.id || "") || undefined,
  bookingId: booking?.bookingId || String(booking?._id || booking?.id || "") || undefined,
  guestName: booking?.guest,
  guestEmail: booking?.email,
  guestContact: booking?.contact,
  hostel: booking?.hostel,
  roomNo: booking?.roomNo,
});

export const enquiryAuditFields = (enquiry = {}) => ({
  entityType: "ENQUIRY",
  entityId: String(enquiry?._id || enquiry?.id || "") || undefined,
  guestName: enquiry?.name,
  guestEmail: enquiry?.email,
  guestContact: enquiry?.contact,
  hostel: enquiry?.hostelName,
  roomNo: enquiry?.roomName,
});

export const bookingState = (booking = {}) => ({
  status: booking?.status,
  reportedStatus: booking?.reportedStatus,
  paymentStatus: booking?.paymentStatus,
  paymentType: booking?.paymentType,
  paymentResponsibility: booking?.paymentResponsibility,
  totalAmount: booking?.totalAmount,
  paidAmount: booking?.paidAmount,
  balanceAmount: booking?.balanceAmount,
  hostel: booking?.hostel,
  roomNo: booking?.roomNo,
  from: booking?.from,
  to: booking?.to,
  actualCheckInDate: booking?.actualCheckInDate,
  actualCheckInTime: booking?.actualCheckInTime,
});

export const writeAuditLog = async (event) => {
  try {
    return await Log.create(sanitizeAuditValue(event));
  } catch (error) {
    console.error("AUDIT_WRITE_FAILED", { action: event?.action, requestId: event?.requestId, error: error.message });
    return null;
  }
};

// Backward-compatible signature. Existing callers now persist correctly while
// historical malformed rows remain untouched and are normalized by the read API.
export const createLog = async (action, userId, meta = {}) => {
  try {
    return await writeAuditLog({
      kind: "AUDIT",
      action: String(action || "UNKNOWN").toUpperCase(),
      userId: userId || null,
      source: userId ? "USER" : "SYSTEM",
      details: meta,
      ...meta,
    });
  } catch (error) {
    console.error("AUDIT_CAPTURE_FAILED", error);
    return null;
  }
};

export const createAuditEvent = async (req, event = {}) => {
  try {
    return await writeAuditLog({
      kind: "AUDIT",
      source: req?.user ? "USER" : "SYSTEM",
      result: "SUCCESS",
      ...requestContext(req),
      ...event,
      action: String(event.action || "UNKNOWN").toUpperCase(),
    });
  } catch (error) {
    console.error("AUDIT_CAPTURE_FAILED", error);
    return null;
  }
};

export const createCronEvent = async (event = {}) => {
  try {
    return await writeAuditLog({ kind: "CRON_JOB", source: "CRON", module: "GUEST_ROOM", result: "SUCCESS", ...event });
  } catch (error) {
    console.error("AUDIT_CAPTURE_FAILED", error);
    return null;
  }
};

export const requestIdMiddleware = (req, res, next) => {
  req.requestId ||= String(req.get("x-request-id") || crypto.randomUUID()).slice(0, 100);
  res.setHeader("X-Request-Id", req.requestId);
  next();
};

export const requestTraceMiddleware = (req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const started = Date.now();
  res.on("finish", () => {
    try {
      const status = res.statusCode;
      const path = req.originalUrl?.split("?")[0] || "";
      const module = path.includes("system-settings") ? "SYSTEM_SETTINGS"
        : path.includes("payment") ? "PAYMENT"
        : path.includes("enquiry") ? "ENQUIRY"
        : path.includes("booking") || path.includes("hostel") || path.includes("extension") || path.includes("cleaning") ? "GUEST_ROOM"
        : path.includes("auth") ? "AUTH" : "SYSTEM";
      void writeAuditLog({
        kind: "REQUEST_TRACE",
        action: "API_REQUEST",
        functionName: "httpRequest",
        module,
        source: req.user ? "USER" : "SYSTEM",
        ...requestContext(req),
        route: path,
        result: status >= 400 ? "FAILED" : "SUCCESS",
        httpStatus: status,
        durationMs: Date.now() - started,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      });
    } catch (error) {
      console.error("AUDIT_CAPTURE_FAILED", error);
    }
  });
  next();
};

// Opt-in only: route-level tracing for high-value detail views. Global GET
// tracing stays disabled so list, analytics, settings and dashboard polling do
// not create audit noise.
export const selectiveReadTrace = (module, functionName, fields = () => ({})) =>
  (req, res, next) => {
    if (req.method !== "GET") return next();
    const started = Date.now();
    res.once("finish", () => {
      try {
        const status = res.statusCode;
        void writeAuditLog({
          kind: "REQUEST_TRACE",
          action: "DETAIL_VIEWED",
          functionName,
          module,
          source: req.user ? "USER" : "SYSTEM",
          ...requestContext(req),
          ...fields(req, res),
          result: status >= 400 ? "FAILED" : "SUCCESS",
          httpStatus: status,
          durationMs: Date.now() - started,
          expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        });
      } catch (error) {
        console.error("AUDIT_CAPTURE_FAILED", error);
      }
    });
    next();
  };

// Captures compact before/after state without changing controller transaction flow.
export const auditBookingAction = (action, functionName) => async (req, res, next) => {
  try {
    const resolvedAction = typeof action === "function" ? action(req) : action;
    const Booking = (await import("../models/Booking.js")).default;
    let id = req.params?.id || req.body?.bookingId;
    if (!id && req.body?.requestId && functionName.toLowerCase().includes("extension")) {
      const ExtensionRequest = (await import("../models/ExtensionRequest.js")).default;
      const extension = await ExtensionRequest.findById(req.body.requestId).select("bookingId").lean();
      id = extension?.bookingId;
    }
    const before = id ? await Booking.findById(id).lean() : null;
    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      void (async () => {
        const after = id ? await Booking.findById(id).lean() : null;
        const booking = after || before || {};
        await createAuditEvent(req, {
          module: "GUEST_ROOM",
          action: resolvedAction,
          functionName,
          ...bookingAuditFields(booking),
          previousState: before ? bookingState(before) : undefined,
          newState: after ? bookingState(after) : undefined,
          remarks: req.body?.remarks || req.body?.reason,
          httpStatus: res.statusCode,
        });
      })().catch((error) => console.error("AUDIT_CAPTURE_FAILED", error));
    });
  } catch (error) {
    console.error("AUDIT_CAPTURE_SETUP_FAILED", error);
  }
  next();
};

export const auditAction = (action, functionName, module = "SYSTEM", fields = () => ({})) =>
  (req, res, next) => {
    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      try {
        void createAuditEvent(req, {
          module,
          action,
          functionName,
          httpStatus: res.statusCode,
          ...fields(req),
        });
      } catch (error) {
        console.error("AUDIT_CAPTURE_FAILED", error);
      }
    });
    next();
  };
