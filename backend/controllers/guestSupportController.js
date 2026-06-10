import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import Hostel from "../models/Hostel.js";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import GuestSupportRequest from "../models/GuestSupportRequest.js";
import MedicalRequest, { HEALTH_ISSUES } from "../models/MedicalRequest.js";
import CleaningRequest, { CLEANING_COMPLAINTS } from "../models/CleaningRequest.js";
import MaintenanceRequest, { MAINTENANCE_CATEGORIES, MAINTENANCE_SUBCATEGORIES } from "../models/MaintenanceRequest.js";
import SosAlert from "../models/SosAlert.js";
import { getSystemSettings } from "../utils/systemSettings.js";
import { sendEmailAdvanced } from "../emails/sendEmail.js";
import masterTemplate from "../emails/templates/masterTemplate.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const MODEL_BY_TYPE = {
  medical: MedicalRequest,
  cleaning: CleaningRequest,
  maintenance: MaintenanceRequest,
  sos: SosAlert,
};

const SOCKET_BY_TYPE = {
  medical: "new_medical_request",
  cleaning: "new_cleaning_request",
  maintenance: "new_maintenance_request",
  sos: "new_sos_alert",
};

const getRequestOrigin = (req) => `${req.protocol}://${req.get("host")}`;

const getFrontendBaseUrl = (req) => {
  if (process.env.PUBLIC_APP_URL) return process.env.PUBLIC_APP_URL.replace(/\/$/, "");
  if (process.env.FRONTEND_URL) return process.env.FRONTEND_URL.replace(/\/$/, "");

  const origin = getRequestOrigin(req);
  if (origin.includes("localhost:10000") || origin.includes("127.0.0.1:10000")) {
    return origin.replace(":10000", ":3000");
  }
  if (origin.includes("localhost:10001") || origin.includes("127.0.0.1:10001")) {
    return origin.replace(":10001", ":3000");
  }

  return origin.replace(/\/$/, "");
};

const roleOf = (user) => String(user?.role || "").toLowerCase();
const userHostel = (user) => user?.assignedHostel || user?.hostel || "";

const canAccessHostel = (user, hostelName) => {
  const role = roleOf(user);
  if (["admin", "manager", "adosa", "assistant"].includes(role)) return true;
  if (["caretaker", "warden", "co_warden"].includes(role)) return userHostel(user) === hostelName;
  return false;
};

const canUseSupportDashboard = (user) =>
  ["admin", "manager", "adosa", "assistant", "caretaker", "warden", "co_warden"].includes(roleOf(user));

const findRoom = async (hostelId, roomId) => {
  if (!mongoose.Types.ObjectId.isValid(hostelId)) return null;
  const hostel = await Hostel.findById(hostelId).lean();
  if (!hostel) return null;

  const decodedRoomId = decodeURIComponent(roomId || "");
  const room = (hostel.rooms || []).find((item) => {
    const subdocId = item._id ? String(item._id) : "";
    return subdocId === decodedRoomId || item.roomNo === decodedRoomId;
  });

  if (!room) return null;
  return { hostel, room };
};

const normalizeEmail = (email = "") => String(email || "").trim().toLowerCase();

const findCurrentRoomBooking = async (hostelName, roomNo) => {
  return Booking.findOne({
    hostel: hostelName,
    roomNo,
    status: { $in: ["booked", "checked_in"] },
  })
    .sort({ actualCheckInDate: -1, from: -1, createdAt: -1 })
    .lean();
};

const assertGuestOwnsRoom = async ({ hostel, room, googleUser }) => {
  const booking = await findCurrentRoomBooking(hostel.name, room.roomNo);
  if (!booking) {
    const err = new Error("No active guest booking found for this room.");
    err.statusCode = 403;
    throw err;
  }

  if (normalizeEmail(booking.email) !== normalizeEmail(googleUser.email)) {
    const err = new Error("This QR code is only available for the guest currently booked in this room.");
    err.statusCode = 403;
    throw err;
  }

  return booking;
};

const verifyGoogleCredential = async (credential) => {
  if (!credential) throw new Error("Google authentication is required");

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email) throw new Error("Google account email not found");

  return {
    sub: payload.sub || "",
    name: payload.name || payload.email,
    email: String(payload.email).trim().toLowerCase(),
    picture: payload.picture || "",
  };
};

const assertRequestEnabled = (requestType, settings) => {
  if (settings?.operations?.enableGuestSupportPortal === false) {
    return "Guest support portal is currently disabled.";
  }
  if (requestType === "cleaning" && settings?.cleaning?.enableCleaningRequests === false) {
    return "Cleaning requests are currently disabled.";
  }
  if (requestType === "medical" && settings?.support?.enableMedicalRequests === false) {
    return "Medical requests are currently disabled.";
  }
  if (requestType === "maintenance" && settings?.support?.enableMaintenanceRequests === false) {
    return "Maintenance requests are currently disabled.";
  }
  if (requestType === "sos" && settings?.support?.enableSosAlerts === false) {
    return "SOS alerts are currently disabled.";
  }
  return null;
};

const resolveStaffEmails = async (hostel) => {
  const managerUsers = await User.find({
    role: { $in: ["manager", "admin"] },
    isActive: { $ne: false },
  }).select("email").lean();

  return Array.from(new Set([
    hostel?.caretakerEmail,
    hostel?.wardenEmail,
    process.env.MANAGER_EMAIL,
    ...managerUsers.map((user) => user.email),
  ].filter(Boolean).map((email) => String(email).trim().toLowerCase())));
};

const sendSosEmail = async ({ request, hostel }) => {
  const recipients = await resolveStaffEmails(hostel);
  if (!recipients.length) return;

  const html = masterTemplate({
    title: "🚨 SOS Alert - Guest Room Emergency",
    skipDefaultButton: true,
    content: `
      <h2 style="margin:0 0 12px;color:#dc2626;">SOS Alert Requires Immediate Attention</h2>
      <p><strong>Guest:</strong> ${request.requesterDetails.name}</p>
      <p><strong>Email:</strong> ${request.requesterDetails.email}</p>
      <p><strong>Contact:</strong> ${request.requesterDetails.contact}</p>
      <p><strong>Hostel:</strong> ${request.hostel.name}</p>
      <p><strong>Room:</strong> ${request.room.roomNo}</p>
      <p><strong>Description:</strong> ${request.description || "SOS button clicked. No extra description provided."}</p>
      <p style="color:#dc2626;font-weight:700;">Please acknowledge this emergency from the Support Requests dashboard.</p>
    `,
  });

  await sendEmailAdvanced({
    to: recipients,
    subject: `🚨 SOS Alert: ${request.hostel.name} - ${request.room.roomNo}`,
    html,
    priority: "high",
  });
};

const normalizeTypedRequest = (doc, type) => ({
  _id: doc._id,
  requestId: `${type.toUpperCase()}-${String(doc._id).slice(-8).toUpperCase()}`,
  requestType: type,
  guestName: doc.requesterDetails?.name || "",
  guestEmail: doc.requesterDetails?.email || "",
  contact: doc.requesterDetails?.contact || "",
  hostel: doc.hostel?.name || "",
  room: doc.room?.roomNo || "",
  priority: doc.urgency || (type === "sos" ? "critical" : "medium"),
  createdAt: doc.createdAt,
  status: doc.status,
  description: doc.description || "",
  details: doc,
  sirenActive: doc.sirenActive === true,
});

const syncUnifiedSupportStatus = async (type, doc) => {
  await GuestSupportRequest.findOneAndUpdate(
    { requestType: type, typedRequestId: doc._id },
    { $set: { status: doc.status } }
  );
};

export const getGuestSupportRoom = async (req, res) => {
  const settings = await getSystemSettings({ fresh: true });
  if (settings?.operations?.enableGuestSupportPortal === false) {
    return res.status(403).json({ success: false, message: "Guest support portal is currently disabled." });
  }

  const result = await findRoom(req.params.hostelId, req.params.roomId);
  if (!result) return res.status(404).json({ success: false, message: "Room support link not found." });

  const { hostel, room } = result;
  const currentBooking = await findCurrentRoomBooking(hostel.name, room.roomNo);
  res.json({
    success: true,
    room: {
      hostelId: hostel._id,
      hostelName: hostel.name,
      roomId: room._id,
      roomNo: room.roomNo,
      roomType: room.roomType || "",
      supportUrl: `${getFrontendBaseUrl(req)}/guest-support/${hostel._id}/${room._id}`,
      hasActiveGuest: Boolean(currentBooking),
    },
    settings: {
      operations: settings.operations,
      cleaning: settings.cleaning,
      support: settings.support,
      supportOptions: {
        healthIssues: HEALTH_ISSUES,
        cleaningComplaints: CLEANING_COMPLAINTS,
        maintenanceCategories: MAINTENANCE_CATEGORIES,
        maintenanceSubcategories: MAINTENANCE_SUBCATEGORIES,
      },
    },
  });
};

export const createGuestSupportRequest = async (req, res) => {
  const requestType = String(req.body?.requestType || "").toLowerCase();
  if (!MODEL_BY_TYPE[requestType]) {
    return res.status(400).json({ success: false, message: "Invalid support request type." });
  }

  const settings = await getSystemSettings({ fresh: true });
  const disabledMessage = assertRequestEnabled(requestType, settings);
  if (disabledMessage) return res.status(403).json({ success: false, message: disabledMessage });

  const result = await findRoom(req.params.hostelId, req.params.roomId);
  if (!result) return res.status(404).json({ success: false, message: "Room support link not found." });

  let googleUser;
  try {
    googleUser = await verifyGoogleCredential(req.body?.googleCredential);
  } catch (err) {
    return res.status(401).json({ success: false, message: err.message || "Google authentication failed" });
  }

  const { hostel, room } = result;
  let booking;
  try {
    booking = await assertGuestOwnsRoom({ hostel, room, googleUser });
  } catch (err) {
    return res.status(err.statusCode || 403).json({ success: false, message: err.message });
  }

  const editableEmail = normalizeEmail(req.body?.email || googleUser.email);
  const bookedEmail = normalizeEmail(booking.email);
  if (!editableEmail) return res.status(400).json({ success: false, message: "Email is required." });
  if (editableEmail !== bookedEmail) {
    return res.status(403).json({
      success: false,
      message: "Submitted email must match the guest email booked for this room.",
    });
  }

  const contact = String(req.body?.contact || booking.contact || "").trim();
  if (requestType !== "sos" && !contact) {
    return res.status(400).json({ success: false, message: "Contact number is required." });
  }

  const basePayload = {
    requesterDetails: {
      name: googleUser.name,
      email: bookedEmail,
      contact,
      profilePicture: googleUser.picture,
      googleSub: googleUser.sub,
    },
    hostel: { id: hostel._id, name: hostel.name },
    room: { id: room._id, roomNo: room.roomNo, roomType: room.roomType || "" },
    description: String(req.body?.message || "").trim(),
    urgency: requestType === "sos" ? "critical" : String(req.body?.urgency || "medium").toLowerCase(),
    isEmergency: requestType === "sos" || req.body?.isEmergency === true,
    source: "qr",
    userAgent: req.get("user-agent") || "",
    ipAddress: req.ip || "",
    history: [{ action: "created", remarks: "Submitted from guest QR support portal" }],
  };

  let payload = basePayload;
  if (requestType === "medical") {
    const issueType = HEALTH_ISSUES.includes(req.body?.issueType) ? req.body.issueType : "Other";
    payload = { ...basePayload, issueType };
  }
  if (requestType === "cleaning") {
    const complaintType = CLEANING_COMPLAINTS.includes(req.body?.complaintType) ? req.body.complaintType : "Other";
    payload = { ...basePayload, complaintType };
  }
  if (requestType === "maintenance") {
    const category = MAINTENANCE_CATEGORIES.includes(req.body?.category) ? req.body.category : "Electrical";
    const validSubcategories = MAINTENANCE_SUBCATEGORIES[category] || ["Other"];
    const subcategory = validSubcategories.includes(req.body?.subcategory) ? req.body.subcategory : "Other";
    payload = { ...basePayload, category, subcategory };
  }
  if (requestType === "sos") {
    payload = { ...basePayload, issueType: "SOS", sirenActive: true };
  }

  const Model = MODEL_BY_TYPE[requestType];
  const typedRequest = await Model.create(payload);

  await GuestSupportRequest.create({
    requestType,
    hostelId: hostel._id,
    hostelName: hostel.name,
    roomId: room._id,
    roomNo: room.roomNo,
    roomType: room.roomType || "",
    guestName: googleUser.name,
    typedRequestId: typedRequest._id,
    guestEmail: bookedEmail,
    guestProfilePicture: googleUser.picture,
    contact,
    message: basePayload.description,
    status: typedRequest.status,
    googleSub: googleUser.sub,
    userAgent: req.get("user-agent") || "",
    ipAddress: req.ip || "",
  });

  if (requestType === "sos") {
    sendSosEmail({ request: typedRequest, hostel }).catch((err) =>
      console.error("❌ SOS email failed:", err)
    );
  }

  const io = req.app.get("io") || global.io;
  if (io) {
    const socketPayload = normalizeTypedRequest(typedRequest.toObject(), requestType);
    io.to("dashboard-room").emit(SOCKET_BY_TYPE[requestType], socketPayload);
    io.to("dashboard-room").emit("guest_support_request", socketPayload);
  }

  res.status(201).json({
    success: true,
    message: requestType === "sos"
      ? "SOS alert submitted. Hostel staff has been notified immediately."
      : "Support request submitted successfully.",
    request: typedRequest,
  });
};

export const getGuestSupportMyRequests = async (req, res) => {
  const result = await findRoom(req.params.hostelId, req.params.roomId);
  if (!result) return res.status(404).json({ success: false, message: "Room support link not found." });

  let googleUser;
  try {
    googleUser = await verifyGoogleCredential(req.body?.googleCredential);
  } catch (err) {
    return res.status(401).json({ success: false, message: err.message || "Google authentication failed" });
  }

  const { hostel, room } = result;
  let booking;
  try {
    booking = await assertGuestOwnsRoom({ hostel, room, googleUser });
  } catch (err) {
    return res.status(err.statusCode || 403).json({ success: false, message: err.message });
  }

  const guestEmail = normalizeEmail(booking.email);
  const requests = [];
  for (const [type, Model] of Object.entries(MODEL_BY_TYPE)) {
    const docs = await Model.find({
      "hostel.id": hostel._id,
      "room.id": room._id,
      "requesterDetails.email": guestEmail,
    }).sort({ createdAt: -1 }).limit(25).lean();
    requests.push(...docs.map((doc) => normalizeTypedRequest(doc, type)));
  }

  requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, requests: requests.slice(0, 50) });
};

export const reopenGuestSupportRequest = async (req, res) => {
  const type = String(req.params.type || "").toLowerCase();
  const Model = MODEL_BY_TYPE[type];
  if (!Model) return res.status(400).json({ success: false, message: "Invalid request type." });

  const result = await findRoom(req.params.hostelId, req.params.roomId);
  if (!result) return res.status(404).json({ success: false, message: "Room support link not found." });

  let googleUser;
  try {
    googleUser = await verifyGoogleCredential(req.body?.googleCredential);
  } catch (err) {
    return res.status(401).json({ success: false, message: err.message || "Google authentication failed" });
  }

  const { hostel, room } = result;
  let booking;
  try {
    booking = await assertGuestOwnsRoom({ hostel, room, googleUser });
  } catch (err) {
    return res.status(err.statusCode || 403).json({ success: false, message: err.message });
  }

  const doc = await Model.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Support request not found." });
  if (
    String(doc.hostel?.id) !== String(hostel._id) ||
    String(doc.room?.id) !== String(room._id) ||
    normalizeEmail(doc.requesterDetails?.email) !== normalizeEmail(booking.email)
  ) {
    return res.status(403).json({ success: false, message: "Not allowed to reopen this request." });
  }
  if (doc.status !== "resolved") {
    return res.status(400).json({ success: false, message: "Only resolved requests can be reopened." });
  }

  doc.status = "open";
  doc.history.push({
    action: "reopened_by_guest",
    remarks: String(req.body?.remarks || "Issue not fixed properly").trim(),
    byName: googleUser.name,
    at: new Date(),
  });
  await doc.save();
  await syncUnifiedSupportStatus(type, doc);

  const io = req.app.get("io") || global.io;
  if (io) {
    io.to("dashboard-room").emit("support_request_updated", normalizeTypedRequest(doc.toObject(), type));
  }

  res.json({
    success: true,
    message: "Support request reopened.",
    request: normalizeTypedRequest(doc.toObject(), type),
  });
};

export const getSupportQrRooms = async (req, res) => {
  const role = roleOf(req.user);
  const assignedHostel = userHostel(req.user);
  const filter = ["admin", "manager", "adosa"].includes(role)
    ? {}
    : assignedHostel
      ? { name: assignedHostel }
      : { _id: null };

  const hostels = await Hostel.find(filter).lean();
  const baseUrl = getFrontendBaseUrl(req);
  const rooms = hostels.flatMap((hostel) =>
    (hostel.rooms || []).map((room) => ({
      hostelId: hostel._id,
      hostelName: hostel.name,
      roomId: room._id,
      roomNo: room.roomNo,
      roomType: room.roomType || "",
      supportUrl: `${baseUrl}/guest-support/${hostel._id}/${room._id}`,
    }))
  );

  res.json({ success: true, rooms });
};

export const getSupportRequests = async (req, res) => {
  if (!canUseSupportDashboard(req.user)) {
    return res.status(403).json({ success: false, message: "Not allowed to access support requests." });
  }

  const tab = String(req.query.tab || "medical").toLowerCase();
  const q = String(req.query.q || "").trim();
  const status = String(req.query.status || "").trim();
  const includeResolved = tab === "resolved";
  const role = roleOf(req.user);
  const assignedHostel = userHostel(req.user);

  const types = includeResolved ? ["medical", "cleaning", "maintenance", "sos"] : [tab];
  const results = [];

  for (const type of types) {
    const Model = MODEL_BY_TYPE[type];
    if (!Model) continue;

    const filter = {};
    if (!["admin", "manager", "adosa", "assistant"].includes(role)) {
      if (!assignedHostel) continue;
      filter["hostel.name"] = assignedHostel;
    }

    if (includeResolved) {
      filter.status = "resolved";
    } else if (status && status !== "all") {
      filter.status = status;
    } else {
      filter.status = { $ne: "resolved" };
    }

    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [
        { "requesterDetails.name": regex },
        { "requesterDetails.email": regex },
        { "hostel.name": regex },
        { "room.roomNo": regex },
        { description: regex },
      ];
    }

    const docs = await Model.find(filter).sort({ createdAt: -1 }).limit(100).lean();
    results.push(...docs.map((doc) => normalizeTypedRequest(doc, type)));
  }

  results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ success: true, requests: results.slice(0, 200) });
};

export const getActiveSosAlerts = async (req, res) => {
  if (!canUseSupportDashboard(req.user)) {
    return res.status(403).json({ success: false, message: "Not allowed to access SOS alerts." });
  }

  const role = roleOf(req.user);
  const assignedHostel = userHostel(req.user);
  const filter = { sirenActive: true, status: { $ne: "resolved" } };
  if (!["admin", "manager", "adosa", "assistant"].includes(role)) {
    if (!assignedHostel) return res.json({ success: true, alerts: [] });
    filter["hostel.name"] = assignedHostel;
  }

  const alerts = await SosAlert.find(filter).sort({ createdAt: -1 }).limit(20).lean();
  res.json({ success: true, alerts: alerts.map((alert) => normalizeTypedRequest(alert, "sos")) });
};

export const updateSupportRequest = async (req, res) => {
  if (!canUseSupportDashboard(req.user)) {
    return res.status(403).json({ success: false, message: "Not allowed to update support requests." });
  }

  const type = String(req.params.type || "").toLowerCase();
  const Model = MODEL_BY_TYPE[type];
  if (!Model) return res.status(400).json({ success: false, message: "Invalid request type." });

  const doc = await Model.findById(req.params.id);
  if (!doc) return res.status(404).json({ success: false, message: "Support request not found." });
  if (!canAccessHostel(req.user, doc.hostel?.name)) {
    return res.status(403).json({ success: false, message: "Not allowed for this hostel." });
  }

  const action = String(req.body?.action || "").trim();
  const remarks = String(req.body?.remarks || "").trim();
  const byName = req.user?.name || req.user?.email || "";

  if (action === "mark_in_progress") doc.status = "in_progress";
  else if (action === "mark_resolved") {
    doc.status = "resolved";
    if (type === "sos") doc.sirenActive = false;
  } else if (action === "escalate") {
    doc.status = "escalated";
    if (type === "sos") doc.escalatedAt = new Date();
  } else if (action === "add_remarks") {
    doc.remarks = remarks || doc.remarks;
  } else if (action === "acknowledge_emergency" && type === "sos") {
    doc.status = "acknowledged";
    doc.sirenActive = false;
    doc.acknowledgedAt = new Date();
    doc.acknowledgedBy = req.user?._id || null;
  } else if (action === "stop_siren" && type === "sos") {
    doc.sirenActive = false;
  } else {
    return res.status(400).json({ success: false, message: "Invalid action." });
  }

  doc.history.push({
    action,
    remarks,
    by: req.user?._id || null,
    byName,
    at: new Date(),
  });

  await doc.save();
  await syncUnifiedSupportStatus(type, doc);

  const io = req.app.get("io") || global.io;
  if (io) {
    io.to("dashboard-room").emit("support_request_updated", normalizeTypedRequest(doc.toObject(), type));
  }

  res.json({ success: true, request: normalizeTypedRequest(doc.toObject(), type) });
};
