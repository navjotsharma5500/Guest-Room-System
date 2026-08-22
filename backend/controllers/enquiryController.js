// controllers/enquiryController.js - PRODUCTION READY WITH EVENT-DRIVEN EMAILS
import Enquiry from "../models/Enquiry.js";
import Hostel from "../models/Hostel.js";
import Booking from "../models/Booking.js";
import { OAuth2Client } from "google-auth-library";
import { parseDateOnlyToUtcDate } from "../utils/billingDates.js";
import { sendEmail, safeSend as baseSafeSend } from "../emails/sendEmail.js";
import EmailLog from "../models/EmailLog.js";
import { createLog } from "../middleware/logMiddleware.js";
import enquiryNotification from "../emails/templates/enquiryNotification.js";
import guestEnquiryReceived from "../emails/templates/guestEnquiryReceived.js";
import { asyncSendEmails } from "../utils/asyncEmail.js";
import { getSystemSettings } from "../utils/systemSettings.js";

// ✅ Import event-driven email function
import { sendBookingEmails } from "./bookingController.js";

// ======================================================
// WRAPPER: Use centralized safeSend with EmailLog
// ======================================================
const safeSend = (emailPayload) => {
  return baseSafeSend(emailPayload, EmailLog);
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const ACTIVE_PARENT_STUDENT_ENQUIRY_STATUSES = ["pending", "pending-approval"];
const ACTIVE_PARENT_STUDENT_ENQUIRY_MESSAGE =
  "Your previous guest room request is still under process. Please wait for its approval or rejection before submitting another request.";

const normalizeEmail = (email = "") => String(email || "").trim().toLowerCase();

const verifyParentStudentGoogleEmail = async (credential) => {
  if (!credential) throw new Error("Google authentication is required");

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const payload = ticket.getPayload();
  const email = normalizeEmail(payload?.email);

  if (!email || payload?.email_verified === false) {
    throw new Error("A verified Google email is required");
  }

  return email;
};

const normalizeRole = (role = "") => String(role).toLowerCase();

const buildRestrictedEnquiryQuery = async (user) => {
  const role = normalizeRole(user?.role);
  // Guest room managers handle only Faculty / Staff requests. Parent / Student
  // requests remain available to the hostel and administrative approval flows.
  if (role === "manager") return { bookingCategory: "FacultyStaff" };
  if (!["caretaker", "warden"].includes(role)) return {};

  const assignedHostel = user?.assignedHostel || user?.hostel || "";
  if (!assignedHostel) return { _id: null };

  const hostel = await Hostel.findOne({ name: assignedHostel }).select("_id name").lean();
  if (!hostel) return { hostelName: assignedHostel };

  return {
    $or: [
      { hostelId: hostel._id },
      { hostelName: hostel.name },
    ],
  };
};

const canAccessEnquiry = async (user, enquiry) => {
  if (
    normalizeRole(user?.role) === "manager" &&
    enquiry?.bookingCategory !== "FacultyStaff"
  ) {
    return false;
  }

  const query = await buildRestrictedEnquiryQuery(user);
  if (!query || Object.keys(query).length === 0) return true;
  if (query._id === null) return false;
  if (query.bookingCategory) {
    return query.bookingCategory === enquiry.bookingCategory;
  }
  if (query.hostelName && query.hostelName === enquiry.hostelName) return true;
  if (Array.isArray(query.$or)) {
    return query.$or.some((condition) => {
      if (condition.hostelName && condition.hostelName === enquiry.hostelName) return true;
      if (condition.hostelId && String(condition.hostelId) === String(enquiry.hostelId)) return true;
      return false;
    });
  }
  return false;
};

const buildRequestedRoomConflictQuery = (enquiry) => ({
  hostel: enquiry.hostelName,
  roomNo: enquiry.roomName,
  status: { $in: ["booked", "checked_in"] },
  from: { $lt: enquiry.to },
  to: { $gt: enquiry.from },
});

// ======================================================
//  CREATE ENQUIRY
// ======================================================
export const createEnquiry = async (req, res) => {
  try {
    const settings = await getSystemSettings();
    console.log("📩 ========== ENQUIRY CREATE STARTED ==========");
    const body = req.body;
    console.log("📦 RAW req.body:", JSON.stringify({
      ...body,
      ...(body.googleCredential ? { googleCredential: "[REDACTED]" } : {}),
    }, null, 2));
    
    let fullData = body.fullData;
    
    if (typeof fullData === "string") {
      console.log("🔄 fullData is STRING, parsing...");
      fullData = JSON.parse(fullData);
    }

    console.log("✅ fullData after parse:", fullData);

    const bookingCategory = fullData.bookingCategory || "";
    let authenticatedParentStudentEmail = "";

    if (bookingCategory === "ParentStudent") {
      try {
        authenticatedParentStudentEmail = await verifyParentStudentGoogleEmail(body.googleCredential);
      } catch (error) {
        console.warn("⚠️ Parent / Student Google verification failed:", error.message);
        return res.status(401).json({
          success: false,
          code: "PARENT_STUDENT_GOOGLE_AUTH_REQUIRED",
          message: "Please sign in with Google again before submitting your guest room request.",
        });
      }
    }

    const fileUrls = Array.isArray(fullData.files) ? fullData.files : [];
    console.log("📂 File URLs:", fileUrls);

    const guests = Number(fullData.guests) || 1;
    const females = Number(fullData.females) || 0;
    const males = Number(fullData.males) || 0;

    const checkInTime = fullData.checkInTime || "00:00";
    const checkOutTime = fullData.checkOutTime || "23:59";
    let selectedHostel = null;
    let selectedRoom = null;

    if (fullData.hostelId) {
      selectedHostel = await Hostel.findById(fullData.hostelId).lean();
      if (!selectedHostel) {
        return res.status(400).json({
          success: false,
          message: "Selected hostel was not found",
        });
      }

      selectedRoom = (selectedHostel.rooms || []).find((room) => String(room._id) === String(fullData.roomId));
      if (fullData.roomId && !selectedRoom) {
        return res.status(400).json({
          success: false,
          message: "Selected guest room was not found in this hostel",
        });
      }
    }

    console.log("🕐 EXTRACTED TIMES:", { checkInTime, checkOutTime });

    const enquiryData = {
      name: body.guestName || "",
      email: bookingCategory === "ParentStudent"
        ? authenticatedParentStudentEmail
        : body.guestEmail || "",
      contact: body.guestPhone || "",
      purpose: body.message || "",

      rollno: fullData.rollno || "",
      department: fullData.department || "",
      gender: fullData.gender || "",
      
      from: new Date(fullData.from),
      to: new Date(fullData.to),
      
      checkInTime: checkInTime,
      checkOutTime: checkOutTime,
      
      guests: guests,
      females: females,
      males: males,
      
      state: fullData.state || "",
      city: fullData.city || "",
      reference: fullData.reference || "",
      hostelId: selectedHostel?._id || fullData.hostelId || null,
      roomId: selectedRoom?._id || fullData.roomId || null,
      hostelName: selectedHostel?.name || fullData.hostelName || "",
      roomName: selectedRoom?.roomNo || fullData.roomName || "",
      bookingCategory,
      
      files: fileUrls,
      status: "pending",
    };

    const enquiryStayDays = Math.max(
      1,
      Math.round(
        (new Date(enquiryData.to).setHours(0, 0, 0, 0) -
          new Date(enquiryData.from).setHours(0, 0, 0, 0)) /
          (1000 * 60 * 60 * 24)
      )
    );
    const isParentStudentRequest = enquiryData.bookingCategory === "ParentStudent";
    const maxGuestRequestDays = Number(
      isParentStudentRequest
        ? settings?.bookingDays?.parentStudentMaxRequestDays || 4
        : settings?.bookingDays?.facultyStaffMaxRequestDays || settings?.bookingDays?.guestMaxRequestDays || 7
    );

    if (enquiryStayDays > maxGuestRequestDays) {
      return res.status(400).json({
        success: false,
        message: `${isParentStudentRequest ? "Parent / Student" : "Faculty / Staff"} enquiry cannot exceed ${maxGuestRequestDays} day(s)`,
      });
    }

    if (isParentStudentRequest) {
      const activeEnquiry = await Enquiry.findOne({
        bookingCategory: "ParentStudent",
        status: { $in: ACTIVE_PARENT_STUDENT_ENQUIRY_STATUSES },
        $expr: {
          $eq: [
            {
              $toLower: {
                $trim: { input: { $ifNull: ["$email", ""] } },
              },
            },
            authenticatedParentStudentEmail,
          ],
        },
      })
        .select("_id status")
        .lean();

      if (activeEnquiry) {
        return res.status(409).json({
          success: false,
          code: "ACTIVE_PARENT_STUDENT_ENQUIRY_EXISTS",
          message: ACTIVE_PARENT_STUDENT_ENQUIRY_MESSAGE,
        });
      }
    }

    console.log("📋 ENQUIRY DATA TO SAVE:", enquiryData);

    const enquiry = await Enquiry.create(enquiryData);

    console.log("✅ ========== ENQUIRY CREATED SUCCESSFULLY ==========");
    console.log("✅ Enquiry ID:", enquiry._id);
    console.log("✅ SAVED checkInTime:", enquiry.checkInTime);
    console.log("✅ SAVED checkOutTime:", enquiry.checkOutTime);

    // ======================================================
    // 📧 ENQUIRY EMAILS (NON-BLOCKING)
    // ======================================================

    const hostelNotificationRecipients = selectedHostel
      ? [selectedHostel.caretakerEmail, selectedHostel.wardenEmail].filter(Boolean)
      : [];

    if (hostelNotificationRecipients.length > 0) {
      asyncSendEmails(() => safeSend({
        to: hostelNotificationRecipients,
        subject: `New Guest Enquiry Received - ${selectedHostel.name}`,
        html: enquiryNotification(enquiry),
        meta: {
          type: "new-enquiry-hostel",
          enquiryId: enquiry._id,
          hostelId: selectedHostel._id,
        },
      }));
    } else if (process.env.ADMIN_NOTIFICATION_EMAIL) {
      asyncSendEmails(() => safeSend({
        to: process.env.ADMIN_NOTIFICATION_EMAIL,
        subject: "New Guest Enquiry Received",
        html: enquiryNotification(enquiry),
        meta: {
          type: "new-enquiry-admin",
          enquiryId: enquiry._id,
        },
      }));
    } else {
      console.warn("⚠️ ADMIN_NOTIFICATION_EMAIL not set - skipping admin notification");
    }

    asyncSendEmails(() => safeSend({
      to: enquiry.email,
      subject: "We have received your enquiry",
      html: guestEnquiryReceived(enquiry),
      meta: {
        type: "guest-enquiry-received",
        enquiryId: enquiry._id,
      },
    }));

    console.log("📧 Enquiry emails dispatched (non-blocking)");

    const response = {
      success: true,
      enquiry: {
        ...enquiry.toJSON(),
        checkInTime: enquiry.checkInTime,
        checkOutTime: enquiry.checkOutTime,
      }
    };

    res.status(201).json(response);

    if (req.app) {
      const io = req.app.get('io');
      if (io) {
        io.to('dashboard-room').emit('enquiry-created', { 
          enquiry: enquiry.toJSON(),
          hostelId: enquiry.hostelId,
          hostelName: enquiry.hostelName,
          timestamp: Date.now()
        });
        if (enquiry.hostelId) {
          io.to(`hostel-${enquiry.hostelId}`).emit('enquiry-created', {
            enquiry: enquiry.toJSON(),
            timestamp: Date.now(),
          });
        }
        console.log('📡 Emitted enquiry-created event');
      }
    }

  } catch (err) {
    console.error("❌ CREATE ENQUIRY ERROR:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: err.message,
    });
  }
};

// ======================================================
//  GET ALL ENQUIRIES
// ======================================================
export const getAllEnquiries = async (req, res) => {
  try {
    console.log("🔍 GET /api/enquiry called");
    const query = await buildRestrictedEnquiryQuery(req.user);
    const enquiries = await Enquiry.find(query).sort({ createdAt: -1 }).lean();

    console.log("✅ Found enquiries:", enquiries.length);
    
    const normalizedEnquiries = enquiries.map(e => ({
      ...e,
      checkInTime: e.checkInTime || "00:00",
      checkOutTime: e.checkOutTime || "23:59",
    }));

    res.json({ success: true, enquiries: normalizedEnquiries });

  } catch (error) {
    console.error("❌ Error fetching enquiries:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching enquiries",
      error: error.message,
    });
  }
};

// ======================================================
//  GET SINGLE ENQUIRY
// ======================================================
export const getEnquiryById = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id).lean();

    if (!enquiry) {
      return res.status(404).json({ 
        success: false, 
        message: "Enquiry not found" 
      });
    }

    const allowed = await canAccessEnquiry(req.user, enquiry);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not allowed to view this enquiry" });
    }

    const normalized = {
      ...enquiry,
      checkInTime: enquiry.checkInTime || "00:00",
      checkOutTime: enquiry.checkOutTime || "23:59",
    };

    res.json({ success: true, enquiry: normalized });

  } catch (error) {
    console.error("❌ Error fetching enquiry:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error fetching enquiry",
      error: error.message 
    });
  }
};

const resolveEnquiryRoom = async (enquiry, roomId) => {
  const hostel = enquiry.hostelId
    ? await Hostel.findById(enquiry.hostelId).lean()
    : await Hostel.findOne({ name: enquiry.hostelName }).lean();

  if (!hostel || hostel.active === false) {
    throw new Error("Selected hostel is not active or was not found");
  }

  const selectedRoom = (hostel.rooms || []).find((room) => String(room._id) === String(roomId));
  if (!selectedRoom) {
    throw new Error("Selected guest room does not belong to this hostel");
  }
  if (selectedRoom.guestRoom === false) {
    throw new Error("Selected room is not enabled as a guest room");
  }
  if (selectedRoom.isBlocked || selectedRoom.roomState === "maintenance_blocked") {
    throw new Error("Selected guest room is blocked");
  }

  return { hostel, room: selectedRoom };
};

// ======================================================
//  UPDATE ENQUIRY SCHEDULE / ROOM ONLY
// ======================================================
export const updateEnquirySchedule = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    const allowed = await canAccessEnquiry(req.user, enquiry);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not allowed to edit this enquiry" });
    }

    if (!["pending", "pending-approval"].includes(enquiry.status || "pending")) {
      return res.status(400).json({ success: false, message: "Finalized enquiries cannot be edited" });
    }

    const { from, to, checkInTime, checkOutTime, roomId } = req.body;
    if (!from || !to) {
      return res.status(400).json({ success: false, message: "Check-in and check-out dates are required" });
    }

    const nextFrom = new Date(from);
    const nextTo = new Date(to);
    if (Number.isNaN(nextFrom.getTime()) || Number.isNaN(nextTo.getTime()) || nextTo < nextFrom) {
      return res.status(400).json({ success: false, message: "Invalid enquiry date range" });
    }

    enquiry.from = nextFrom;
    enquiry.to = nextTo;
    enquiry.checkInTime = checkInTime || enquiry.checkInTime || "00:00";
    enquiry.checkOutTime = checkOutTime || enquiry.checkOutTime || "23:59";

    if (roomId && String(roomId) !== String(enquiry.roomId || "")) {
      const { room } = await resolveEnquiryRoom(enquiry, roomId);
      enquiry.roomId = room._id;
      enquiry.roomName = room.roomNo;
    }

    await enquiry.save();

    res.json({ success: true, message: "Enquiry updated", enquiry: enquiry.toJSON() });

    const io = req.app.get("io");
    if (io) {
      io.to("dashboard-room").emit("enquiry-updated", { enquiry: enquiry.toJSON(), timestamp: Date.now() });
    }
  } catch (error) {
    console.error("❌ Update enquiry schedule error:", error);
    res.status(500).json({ success: false, message: "Failed to update enquiry schedule", error: error.message });
  }
};

// ======================================================
//  CHECK REQUESTED ROOM AVAILABILITY BEFORE APPROVAL
// ======================================================
export const checkEnquiryRoomAvailability = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id).lean();
    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    const allowed = await canAccessEnquiry(req.user, enquiry);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not allowed to view this enquiry" });
    }

    if (!enquiry.hostelName || !enquiry.roomName) {
      return res.json({ success: true, available: true, skipped: true });
    }

    const conflictingBooking = await Booking.findOne(buildRequestedRoomConflictQuery(enquiry))
      .select("_id guest status from to")
      .lean();

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        available: false,
        message: "Selected Guest Room is already occupied during requested dates. Please edit the enquiry dates or choose another room.",
        conflict: conflictingBooking,
      });
    }

    res.json({ success: true, available: true });
  } catch (error) {
    console.error("❌ Check enquiry availability error:", error);
    res.status(500).json({ success: false, message: "Failed to check room availability", error: error.message });
  }
};

// ======================================================
//  APPROVE ENQUIRY (CREATE BOOKING)
// ======================================================
export const approveEnquiry = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      hostel,
      roomNo,
      checkInTime,
      checkOutTime,
      paymentType,
      totalAmount,
      approvalDocuments,
      freeRemarks,
    } = req.body;

    console.log("✅ APPROVE ENQUIRY REQUEST:", {
      enquiryId: id,
      hostel,
      roomNo,
      paymentType
    });

    const enquiry = await Enquiry.findById(id);
    if (!enquiry) {
      return res.status(404).json({ 
        success: false, 
        message: "Enquiry not found" 
      });
    }

    const allowed = await canAccessEnquiry(req.user, enquiry);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not allowed to approve this enquiry" });
    }

    if (["booked", "rejected", "approved"].includes(enquiry.status)) {
      return res.status(400).json({
        success: false,
        message: "This enquiry is already finalized",
      });
    }

    const resolvedHostelName = hostel || enquiry.hostelName;
    const resolvedRoomNo = roomNo || enquiry.roomName;

    // ✅ Fetch hostel emails from database
    console.log("🔍 Looking up hostel:", resolvedHostelName || enquiry.hostelId);
    const hostelDoc = enquiry.hostelId
      ? await Hostel.findById(enquiry.hostelId).lean()
      : await Hostel.findOne({ name: resolvedHostelName }).lean();

    if (!hostelDoc) {
      return res.status(400).json({
        success: false,
        message: `Hostel not found in database: ${resolvedHostelName || enquiry.hostelId}`
      });
    }

    const selectedRoom = (hostelDoc.rooms || []).find((room) => room.roomNo === resolvedRoomNo);
    if (!selectedRoom || selectedRoom.guestRoom === false) {
      return res.status(400).json({
        success: false,
        message: "Selected guest room is not valid for this hostel",
      });
    }
    if (selectedRoom.isBlocked || selectedRoom.roomState === "maintenance_blocked") {
      return res.status(400).json({
        success: false,
        message: "Selected guest room is blocked",
      });
    }

    const availabilityEnquiry = {
      ...enquiry.toObject(),
      hostelName: resolvedHostelName || hostelDoc.name,
      roomName: resolvedRoomNo,
    };
    const conflictingBooking = await Booking.findOne(buildRequestedRoomConflictQuery(availabilityEnquiry))
      .select("_id guest status from to")
      .lean();
    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        available: false,
        message: "Selected Guest Room is already occupied during requested dates. Please edit the enquiry dates or choose another room.",
        conflict: conflictingBooking,
      });
    }

    const caretakerEmail = hostelDoc.caretakerEmail;
    const wardenEmail = hostelDoc.wardenEmail;

    console.log("✅ Hostel emails fetched for approval:", {
      hostel: hostelDoc.name,
      caretakerEmail: caretakerEmail,
      wardenEmail: wardenEmail
    });

    if (!caretakerEmail || !wardenEmail) {
      console.error("❌ CRITICAL: Hostel missing required emails:", {
        hostel: hostelDoc.name,
        caretakerEmail,
        wardenEmail
      });
    }

    // Create booking from enquiry
    const bookingData = {
      guest: enquiry.name,
      email: enquiry.email,
      contact: enquiry.contact,
      rollno: enquiry.rollno || "",
      department: enquiry.department || "",
      gender: enquiry.gender || "",
      hostel: resolvedHostelName || hostelDoc.name,
      roomNo: resolvedRoomNo,
      from: parseDateOnlyToUtcDate(enquiry.from),
      to: parseDateOnlyToUtcDate(enquiry.to),
      checkInTime: checkInTime || enquiry.checkInTime || "00:00",
      checkOutTime: checkOutTime || enquiry.checkOutTime || "23:59",
      numGuests: enquiry.guests || 1,
      males: enquiry.males || 0,
      females: enquiry.females || 0,
      purpose: enquiry.purpose || "",
      city: enquiry.city || "",
      state: enquiry.state || "",
      reference: enquiry.reference || "",
      
      paymentType: paymentType || "Paid",
      totalAmount: paymentType === "Paid" ? Number(totalAmount || 0) : 0,
      paidAmount: 0,
      balanceAmount: paymentType === "Paid" ? Number(totalAmount || 0) : 0,
      paymentStatus: "UNPAID",
      
      amount: paymentType === "Paid" ? Number(totalAmount || 0) : 0,
      amountToBePaid: paymentType === "Paid" ? Number(totalAmount || 0) : 0,
      
      freeRemarks: paymentType === "Free" ? freeRemarks || "" : "",
      remarks: freeRemarks || "",
      
      approvalDocuments: Array.isArray(approvalDocuments) ? approvalDocuments : [],
      
      enquiryId: enquiry._id,
      status: "booked",
      createdBy: req.user?._id || null,
      
      // ✅ Use emails from database (NO fallback)
      caretakerEmail: caretakerEmail,
      wardenEmail: wardenEmail,
    };

    console.log("✅ Creating booking from enquiry with database emails:", {
      caretakerEmail: bookingData.caretakerEmail,
      wardenEmail: bookingData.wardenEmail
    });

    const freshEnquiry = await Enquiry.findById(id);
    if (!freshEnquiry) {
      const error = new Error("Enquiry not found");
      error.statusCode = 404;
      throw error;
    }
    if (["booked", "rejected", "approved"].includes(freshEnquiry.status)) {
      const error = new Error("This enquiry is already finalized");
      error.statusCode = 400;
      throw error;
    }

    const finalAvailabilityEnquiry = {
      ...freshEnquiry.toObject(),
      hostelName: resolvedHostelName || hostelDoc.name,
      roomName: resolvedRoomNo,
    };
    const finalConflict = await Booking.findOne(buildRequestedRoomConflictQuery(finalAvailabilityEnquiry))
      .select("_id guest status from to")
      .lean();
    if (finalConflict) {
      const error = new Error("Selected Guest Room is already occupied during requested dates. Please edit the enquiry dates or choose another room.");
      error.statusCode = 409;
      error.conflict = finalConflict;
      throw error;
    }

    const booking = await Booking.create(bookingData);

    freshEnquiry.status = "booked";
    freshEnquiry.approvedAt = new Date();
    freshEnquiry.approvedBy = req.user?._id || null;
    await freshEnquiry.save();

    enquiry.status = freshEnquiry.status;
    enquiry.approvedAt = freshEnquiry.approvedAt;
    enquiry.approvedBy = freshEnquiry.approvedBy;

    console.log("✅ Enquiry approved, sending emails...");
    console.log("📧 Email recipients for approval:", {
      guest: booking.email,
      caretaker: booking.caretakerEmail,
      warden: booking.wardenEmail,
      manager: process.env.MANAGER_EMAIL
    });

    if (req.user?._id) {
      createLog("enquiry_approved", req.user._id, { 
        enquiryId: enquiry._id,
        bookingId: booking._id 
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('enquiry-approved', { 
        enquiryId: enquiry._id,
        bookingId: booking._id,
        displayBookingId: booking.bookingId || booking._id.toString(),
        hostel: booking.hostel,
        roomNo: booking.roomNo,
        timestamp: Date.now()
      });
      console.log('📡 Emitted enquiry-approved event');
    }

    const response = res.json({ 
      success: true, 
      message: "Enquiry approved and booking created",
      booking,
      enquiry 
    });

    asyncSendEmails(() => sendBookingEmails(booking, "approved"));

    return response;

  } catch (err) {
    console.error("❌ APPROVE ENQUIRY ERROR:", err.message);
    console.error("Stack:", err.stack);
    
    res.status(err.statusCode || 500).json({ 
      success: false, 
      message: err.message,
      error: err.message,
      conflict: err.conflict,
    });
  }
};

// ======================================================
//  MARK ENQUIRY AS FULLY BOOKED
// ======================================================
export const bookEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    const allowed = await canAccessEnquiry(req.user, enquiry);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not allowed to book this enquiry" });
    }

    enquiry.status = "booked";
    await enquiry.save();

    console.log("✅ Enquiry marked as booked:", {
      enquiryId: enquiry._id,
      checkInTime: enquiry.checkInTime,
      checkOutTime: enquiry.checkOutTime,
    });

    asyncSendEmails(() => safeSend({
      to: enquiry.email,
      subject: "Your Room Booking is Confirmed",
      html: guestEnquiryReceived(enquiry),
      meta: {
        type: "enquiry-booked",
        enquiryId: enquiry._id,
      },
    }));

    res.json({ success: true, message: "Enquiry fully booked", enquiry });

    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('enquiry-booked', { 
        enquiry,
        timestamp: Date.now()
      });
      console.log('📡 Emitted enquiry-booked event');
    }

  } catch (error) {
    console.error("❌ Book Enquiry Error:", error);
    res.status(500).json({ success: false, message: "Failed to book enquiry" });
  }
};

// ======================================================
//  REJECT ENQUIRY
// ======================================================
export const rejectEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    const allowed = await canAccessEnquiry(req.user, enquiry);
    if (!allowed) {
      return res.status(403).json({ success: false, message: "Not allowed to reject this enquiry" });
    }

    enquiry.status = "rejected";
    await enquiry.save();

    console.log("✅ Enquiry rejected:", enquiry._id);

    asyncSendEmails(() => safeSend({
      to: enquiry.email,
      subject: "Guest Room Booking Request - Update",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Enquiry Status Update</h2>
          <p>Dear ${enquiry.name || 'Guest'},</p>
          <p>We regret to inform you that your guest room enquiry has been declined.</p>
          <p>If you have any questions or would like to discuss alternative arrangements, please contact the hostel office.</p>
          <p>We appreciate your understanding.</p>
        </div>
      `,
      meta: {
        type: "enquiry-rejected",
        enquiryId: enquiry._id,
      },
    }));

    res.json({ success: true, message: "Enquiry rejected", enquiry });

    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('enquiry-rejected', { 
        enquiry,
        timestamp: Date.now()
      });
      console.log('📡 Emitted enquiry-rejected event');
    }

  } catch (error) {
    console.error("❌ Reject Enquiry Error:", error);
    res.status(500).json({ success: false, message: "Failed to reject enquiry" });
  }
};
