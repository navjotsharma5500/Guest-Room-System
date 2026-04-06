import VenueEnquiry from "../models/VenueEnquiry.js";
import VenueBooking from "../models/VenueBooking.js";
import { getSocketIO } from "../utils/socket.js";
import { checkVenueConflict, isDailySlotOverlapping } from "../utils/venueConflictChecker.js";
import SocietyNameSuggestion, {
  DEFAULT_SOCIETY_NAMES,
  getDefaultSocietyEmail,
} from "../models/SocietyNameSuggestion.js";
import EventNameSuggestion, { DEFAULT_EVENT_NAMES } from "../models/EventNameSuggestion.js";
import {
  hasVenueDashboardAccess,
  canAccessVenueRoom,
  getVenueRoomFilterForRole,
  mergeRoleRoomFilter,
} from '../utils/venueAccessPolicy.js';
import {
  sendDirectBookingEmail,
  sendBookingExtendedEmail,
  sendBookingCancelledEmail,
  sendEnquirySubmittedEmail,
  sendEnquiryApprovedEmail,
  sendEnquiryRejectedEmail,
} from '../emails/venueEmailService.js';

const adminAssistantOnly = (req, res) => {
  const userRole = req.user?.role || '';
  
  if (!hasVenueDashboardAccess(userRole)) {
    res.status(403).json({ success: false, message: "Access denied" });
    return false;
  }
  return true;
};

const normalizePayload = (body = {}) => {
  const checkInDate = body.checkInDate || body.startDate || "";
  const checkInTime = body.checkInTime || body.startTime || "";
  const checkOutDate = body.checkOutDate || body.endDate || "";
  const checkOutTime = body.checkOutTime || body.endTime || "";

  const societyName = (body.societyName || body.societyClubName || "").trim();
  const eventName = (body.eventName || "").trim();
  const description = (body.description || body.eventDescription || "").trim();

  let hall = (body.hall || "").trim();
  let roomNo = (body.roomNo || "").trim();

  // Frontend may send combined venue selector value: "Hall||Room"
  if ((!hall || !roomNo) && body.venue) {
    const [venueHall, venueRoom] = String(body.venue).split("||");
    hall = (venueHall || "").trim();
    roomNo = (venueRoom || "").trim();
  }

  return {
    name: (body.name || "").trim(),
    email: (body.email || "").trim().toLowerCase(),
    // Feature 3: New email fields
    societyEmail: (body.societyEmail || "").trim().toLowerCase(),
    presidentEmail: (body.presidentEmail || "").trim().toLowerCase(),
    contact: String(body.contact || "").trim(),
    department: (body.department || "").trim(),
    hall,
    roomNo,
    societyName,
    eventName,
    description,
    purpose: (body.purpose || "").trim(),
    checkInDate,
    checkInTime,
    checkOutDate,
    checkOutTime,
    files: Array.isArray(body.files)
      ? body.files
      : Array.isArray(body.attachments)
      ? body.attachments
      : [],
  };
};

const touchSocietySuggestion = async (name = "") => {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) return;
  const email = getDefaultSocietyEmail(normalizedName);

  await SocietyNameSuggestion.findOneAndUpdate(
    { name: normalizedName },
    {
      $setOnInsert: { name: normalizedName, email: email || "" },
      $inc: { usageCount: 1 },
      $set: {
        lastUsed: new Date(),
        ...(email ? { email } : {}),
      },
    },
    { upsert: true, new: true }
  );
};

const touchEventSuggestion = async (name = "") => {
  const normalizedName = String(name || "").trim();
  if (!normalizedName) return;

  await EventNameSuggestion.findOneAndUpdate(
    { name: normalizedName },
    {
      $setOnInsert: { name: normalizedName },
      $inc: { usageCount: 1 },
      $set: { lastUsed: new Date() },
    },
    { upsert: true, new: true }
  );
};

const enrichVenueFromBookings = (enquiryDoc) => {
  const enquiry = enquiryDoc?.toObject ? enquiryDoc.toObject() : enquiryDoc;
  if (!enquiry) return enquiry;

  if (enquiry.hall && enquiry.roomNo) return enquiry;

  const firstBooking = Array.isArray(enquiry.bookingIds) ? enquiry.bookingIds[0] : null;
  if (!firstBooking) return enquiry;

  // bookingIds may be populated docs or raw ObjectIds
  const hall = firstBooking?.hall || "";
  const roomNo = firstBooking?.roomNo || "";
  return {
    ...enquiry,
    hall: enquiry.hall || hall || "",
    roomNo: enquiry.roomNo || roomNo || "",
  };
};

export const createVenueEnquiry = async (req, res) => {
  try {
    const payload = normalizePayload(req.body);

    const requiredFields = [
      "name",
      "email",
      "contact",
      "hall",
      "roomNo",
      "societyName",
      "eventName",
      "description",
      "checkInDate",
      "checkInTime",
      "checkOutDate",
      "checkOutTime",
      "societyEmail",        // Feature 3: New field
      "presidentEmail",      // Feature 3: New field
    ];

    for (const field of requiredFields) {
      if (!payload[field]) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    const enquiry = await VenueEnquiry.create({
      ...payload,
      requestId: req.body.requestId || null,
      status: "pending",
      submittedAt: new Date(),
    });

    // Fire async tasks but don't wait for them
    Promise.all([
      touchSocietySuggestion(payload.societyName),
      touchEventSuggestion(payload.eventName),
    ]).catch(err => console.error("⚠️ Suggestion touch failed:", err.message));

    try {
      const io = getSocketIO();
      io.to("dashboard-room").emit("venue-enquiry-created", { enquiry });
    } catch (socketErr) {
      console.error("⚠️ venue-enquiry-created socket emit failed:", socketErr.message);
    }

    // Send enquiry submitted emails (non-blocking)
    sendEnquirySubmittedEmail(enquiry).catch(emailError => {
      console.error('⚠️ Enquiry submitted email failed (non-critical):', emailError.message);
    });

    // ✅ SINGLE RESPONSE - Success case
    return res.status(201).json({
      success: true,
      message: "Venue enquiry submitted successfully",
      enquiry,
    });

  } catch (error) {
    console.error("❌ createVenueEnquiry error:", error);

    // 🔥 HANDLE DUPLICATE REQUEST
    if (error.code === 11000) {
      console.warn("⚠️ Duplicate requestId detected");
      return res.status(200).json({
        success: true,
        message: "Enquiry already submitted",
        isDuplicate: true,
      });
    }

    // ✅ SINGLE RESPONSE - Error case
    return res.status(500).json({
      success: false,
      message: "Failed to submit venue enquiry",
    });
  }
};

export const getVenueSocietySuggestions = async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 15;

    const filter = query
      ? { name: { $regex: query, $options: "i" } }
      : {};

    const docs = await SocietyNameSuggestion.find(filter)
      .sort(query ? { usageCount: -1, lastUsed: -1, name: 1 } : { name: 1 })
      .limit(limit);

    if (!docs.length && !query) {
      return res.status(200).json({
        success: true,
        suggestions: DEFAULT_SOCIETY_NAMES.slice(0, limit),
      });
    }

    return res.status(200).json({
      success: true,
      suggestions: docs.map((doc) => doc.name),
    });
  } catch (error) {
    console.error("❌ getVenueSocietySuggestions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch society suggestions",
    });
  }
};

export const getVenueEventSuggestions = async (req, res) => {
  try {
    const query = String(req.query.query || "").trim();
    const limitRaw = Number(req.query.limit);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 15;

    const filter = query
      ? { name: { $regex: query, $options: "i" } }
      : {};

    const docs = await EventNameSuggestion.find(filter)
      .sort(query ? { usageCount: -1, lastUsed: -1, name: 1 } : { name: 1 })
      .limit(limit);

    if (!docs.length && !query) {
      return res.status(200).json({
        success: true,
        suggestions: DEFAULT_EVENT_NAMES.slice(0, limit),
      });
    }

    return res.status(200).json({
      success: true,
      suggestions: docs.map((doc) => doc.name),
    });
  } catch (error) {
    console.error("❌ getVenueEventSuggestions error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch event suggestions",
    });
  }
};

export const getAllVenueEnquiries = async (req, res) => {
  try {
    if (!adminAssistantOnly(req, res)) return;

    const userRole = req.user?.role || '';
    
    // Apply role-based room filter
    const roleFilter = getVenueRoomFilterForRole(userRole, 'roomNo');
    const query = Object.keys(roleFilter).length > 0 ? roleFilter : {};

    const enquiries = await VenueEnquiry.find(query)
      .populate("reviewedBy", "name email")
      .populate("bookingIds", "hall roomNo")
      .sort({ submittedAt: -1 });

    return res.status(200).json(enquiries.map(enrichVenueFromBookings));
  } catch (error) {
    console.error("❌ getAllVenueEnquiries error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch enquiries" });
  }
};

export const getVenueEnquiryById = async (req, res) => {
  try {
    if (!adminAssistantOnly(req, res)) return;

    const userRole = req.user?.role || '';

    const enquiry = await VenueEnquiry.findById(req.params.id)
      .populate("reviewedBy", "name email")
      .populate("bookingIds", "hall roomNo");
      
    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    // Check room access
    if (!canAccessVenueRoom(userRole, enquiry.hall, enquiry.roomNo)) {
      return res.status(403).json({ success: false, message: 'Access denied to this room' });
    }

    return res.status(200).json({ success: true, enquiry: enrichVenueFromBookings(enquiry) });
  } catch (error) {
    console.error("❌ getVenueEnquiryById error:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch enquiry" });
  }
};

// Feature 1: Check venue conflict for date modification
export const checkEnquiryConflict = async (req, res) => {
  try {
    if (!adminAssistantOnly(req, res)) return;

    const enquiry = await VenueEnquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    const userRole = req.user?.role || '';
    // Check room access
    if (!canAccessVenueRoom(userRole, enquiry.hall, enquiry.roomNo)) {
      return res.status(403).json({
        success: false,
        message: "Access denied to this room",
      });
    }

    const { checkInDate, checkInTime, checkOutDate, checkOutTime } = req.body;

    // Validate required fields
    if (!checkInDate || !checkInTime || !checkOutDate || !checkOutTime) {
      return res.status(400).json({
        success: false,
        message: "All date/time fields are required",
      });
    }

    // Validate time range
    const start = new Date(`${checkInDate}T${checkInTime}`);
    const end = new Date(`${checkOutDate}T${checkOutTime}`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid date/time format",
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: "Check-out must be after check-in",
      });
    }

    // Check conflicts using the utility function
    const conflict = await checkVenueConflict(
      enquiry.hall,
      enquiry.roomNo,
      checkInDate,
      checkOutDate,
      checkInTime,
      checkOutTime
    );

    if (conflict.hasConflict) {
      return res.status(200).json({
        success: false,
        message: "Booking conflict detected for selected date/time. Please choose another slot.",
        conflict: conflict.conflictWith,
      });
    }

    return res.status(200).json({
      success: true,
      message: "No conflicts detected",
    });
  } catch (error) {
    console.error("❌ checkEnquiryConflict error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check availability",
    });
  }
};

export const approveVenueEnquiry = async (req, res) => {
  try {
    if (!adminAssistantOnly(req, res)) return;

    const enquiry = await VenueEnquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    // Check room access
    if (!canAccessVenueRoom(req.user?.role, enquiry.hall, enquiry.roomNo)) {
      return res.status(403).json({ success: false, message: 'Access denied to this room' });
    }

    if (enquiry.status === "booked") {
      return res.status(400).json({ success: false, message: "Enquiry already booked" });
    }

    // Feature 1: Accept modified dates from request
    const checkInDate = req.body.checkInDate || enquiry.checkInDate;
    const checkInTime = req.body.checkInTime || enquiry.checkInTime;
    const checkOutDate = req.body.checkOutDate || enquiry.checkOutDate;
    const checkOutTime = req.body.checkOutTime || enquiry.checkOutTime;

    // Prevent overlap for the requested room before booking
    const overlappingBookings = await VenueBooking.find({
      hall: enquiry.hall,
      roomNo: enquiry.roomNo,
      status: { $in: ["booked", "checked_in"] },
    });

    for (const existing of overlappingBookings) {
      const hasOverlap = isDailySlotOverlapping(
        checkInDate,
        checkOutDate,
        checkInTime,
        checkOutTime,
        existing.checkInDate,
        existing.checkOutDate,
        existing.checkInTime,
        existing.checkOutTime
      );
      if (hasOverlap) {
        return res.status(400).json({
          success: false,
          message: `Time overlap detected for ${enquiry.hall} - ${enquiry.roomNo}`,
        });
      }
    }

    const booking = await VenueBooking.create({
      hall: enquiry.hall,
      roomNo: enquiry.roomNo,
      name: enquiry.name,
      societyName: enquiry.societyName,
      eventName: enquiry.eventName,
      department: enquiry.department || "",
      contact: enquiry.contact,
      email: enquiry.email,
      checkInDate: checkInDate,      // Use potentially modified date
      checkInTime: checkInTime,
      checkOutDate: checkOutDate,
      checkOutTime: checkOutTime,
      purpose: enquiry.purpose || "",
      description: enquiry.description || "",
      attachments: Array.isArray(enquiry.files) ? enquiry.files : [],
      status: "booked",
      createdBy: req.user?._id || null,
      enquiryId: enquiry._id,
      bookingType: "venue",
      isVenueBooking: true,
      isHallBooking: false,
    });

    // Send approval email
    try {
      await sendEnquiryApprovedEmail(enquiry, booking);
    } catch (emailError) {
      console.error('⚠️ Approval email failed (non-critical):', emailError.message);
    }

    enquiry.status = "booked";
    enquiry.reviewedBy = req.user?._id || null;
    enquiry.reviewedAt = new Date();
    enquiry.rejectionReason = "";
    enquiry.bookingIds = [booking._id];
    await enquiry.save();

    try {
      const io = getSocketIO();
      io.emit("venueBookingCreated", {
        bookings: [booking],
        type: "venue",
        isolated: true,
      });
      io.to("dashboard-room").emit("venue-enquiry-updated", { enquiry });
    } catch (socketErr) {
      console.error("⚠️ venue-enquiry-updated socket emit failed:", socketErr.message);
    }

    return res.status(200).json({
      success: true,
      message: "Enquiry approved and room booked",
      enquiry,
      booking,
    });
  } catch (error) {
    console.error("❌ approveVenueEnquiry error:", error);
    return res.status(500).json({ success: false, message: "Failed to approve enquiry" });
  }
};

export const rejectVenueEnquiry = async (req, res) => {
  try {
    if (!adminAssistantOnly(req, res)) return;

    const enquiry = await VenueEnquiry.findById(req.params.id);
    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    console.log("📋 Found enquiry:", {
      id: enquiry._id,
      hall: enquiry.hall,
      roomNo: enquiry.roomNo,
      email: enquiry.email,
      societyEmail: enquiry.societyEmail,
    });

    // Check room access
    if (!canAccessVenueRoom(req.user?.role, enquiry.hall, enquiry.roomNo)) {
      return res.status(403).json({ success: false, message: 'Access denied to this room' });
    }

    console.log("✅ Room access verified");

    enquiry.status = "rejected";
    enquiry.reviewedBy = req.user?._id || null;
    enquiry.reviewedAt = new Date();
    enquiry.rejectionReason = (req.body?.reason || "").trim();
    
    console.log("📝 Enquiry updated with rejection data:", {
      status: enquiry.status,
      rejectionReason: enquiry.rejectionReason,
    });

    await enquiry.save();
    console.log("✅ Enquiry saved to database");

    try {
      const io = getSocketIO();
      io.to("dashboard-room").emit("venue-enquiry-updated", { enquiry });
      console.log("✅ Socket event emitted");
    } catch (socketErr) {
      console.error("⚠️ venue-enquiry-updated socket emit failed:", socketErr.message);
    }

    // Send rejection email
    try {
      console.log("📧 Attempting to send rejection email...");
      await sendEnquiryRejectedEmail(enquiry);
      console.log("✅ Rejection email sent (or logged as non-critical error)");
    } catch (emailError) {
      console.error('⚠️ Rejection email failed (non-critical):', emailError.message);
    }

    console.log("✅ Enquiry rejected successfully");
    return res.status(200).json({ success: true, message: "Enquiry rejected", enquiry });
  } catch (error) {
    console.error("❌ rejectVenueEnquiry error:", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ success: false, message: "Failed to reject enquiry" });
  }
};
