// bookingRoutes.js - FIXED VERSION
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js"; 
import Booking from "../models/Booking.js";
import { sendBookingEmails } from "../controllers/bookingController.js";
import Enquiry from "../models/Enquiry.js";
import Hostel from "../models/Hostel.js";
import { recalculatePaymentStatus } from "../controllers/paymentController.js";

const router = express.Router();

// Health check - isolated from hall system
router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    system: 'guest-room',
    isolated: true,
    timestamp: new Date().toISOString()
  });
});

import {
  createBooking,
  cancelBooking,
  markReported,
  markNotReported,
  downloadBookingsCSV,
  updatePaymentDetails,
  getBookingHistory,
  checkOutGuest,
  updateBookingDetails
} from "../controllers/bookingController.js";

router.get("/history", protect, getBookingHistory);
router.put("/:id/details", protect, updateBookingDetails);
router.get("/download/csv", protect, downloadBookingsCSV);  
router.put("/:id/reported", protect, markReported);
router.put("/:id/not-reported", protect, markNotReported);
router.put("/:id/checkout", protect, checkOutGuest);

/* =============================================================
   HELPER: NORMALIZE BOOKING (CRITICAL FIX)
============================================================= */
const normalizeBooking = (b) => ({
  id: b._id,

  // 👤 Guest identity (GUARANTEED)
  guest: b.guest || b.guestName || "",
  rollno: typeof b.rollno === "string" ? b.rollno : "",
  department: typeof b.department === "string" ? b.department : "",
  gender: typeof b.gender === "string" ? b.gender : "",
  reference: typeof b.reference === "string" ? b.reference : "",

  // 📞 Contact
  contact: b.contact || "",
  email: b.email || "",

  // 📅 Dates & Times
  from: b.from,
  to: b.to,
  checkInTime: b.checkInTime || "00:00",
  checkOutTime: b.checkOutTime || "23:59",

  // 👥 Counts
  numGuests: b.numGuests || 1,
  males: b.males || 0,
  females: b.females || 0,

  // 📝 Meta
  purpose: b.purpose || "",
  city: b.city || "",
  state: b.state || "",

  // 💳 Payment - COMPLETE STRUCTURE WITH TRANSACTION DETAILS
  status: b.status || "booked",
  paymentType: b.paymentType || "Paid",
  
  // ✅ Total amounts
  totalAmount: b.totalAmount || 0,
  paidAmount: b.paidAmount || 0,
  balanceAmount: b.balanceAmount || 0,
  
  // ✅ Discount/Wave Off
  discount: b.discount || 0,
  waveOff: b.discount || 0,
  
  // Old fields (backward compatibility)
  amount: b.amount || 0,
  amountToBePaid: b.amountToBePaid || 0,
  
  paymentStatus: b.paymentStatus || "UNPAID",
  
  // ✅ CRITICAL FIX: Include ALL payment transaction details
  paymentMode: b.paymentMode || "",
  paymentMethod: b.paymentMode || "", // Alternative field name
  transactionId: b.transactionId || "",
  transactionDate: b.transactionDate || null,
  paymentRemarks: b.paymentRemarks || "",
  paymentAttachments: Array.isArray(b.paymentAttachments) ? b.paymentAttachments : [],
  billId: b.billId || "",

  // 🆓 Free booking remarks
  remarks: b.remarks || "",
  freeRemarks: b.freeRemarks || b.remarks || "",
  cancelRemarks: b.cancelRemarks || "",

  // 🔎 Attachments
  files: Array.isArray(b.files) ? b.files : [], 
  approvalDocuments: Array.isArray(b.approvalDocuments) ? b.approvalDocuments : [],

  // ✅ Timestamps
  createdAt: b.createdAt,
  updatedAt: b.updatedAt,

  // ⏳ Extension
  extensionDate: b.extensionDate || null,
  extendRemarks: b.extendRemarks || "",
  extensionAttachments: Array.isArray(b.extensionAttachments)
    ? b.extensionAttachments
    : [],

  // 💰 Extension Payment (NEW – CRITICAL)
  extensionPaymentType: b.extensionPaymentType || "",
  extensionAmount: b.extensionAmount || 0,
  extensionPaymentRemarks: b.extensionPaymentRemarks || "",
  extensionPaymentAttachments: Array.isArray(b.extensionPaymentAttachments)
    ? b.extensionPaymentAttachments
    : [],

  // 🚫 Cancellation
  cancelDate: b.status === "cancelled" ? b.updatedAt : null,

  // 🚶 Reporting (Caretaker)
  reportedStatus: b.reportedStatus || "pending",
  reportedAt: b.reportedAt || null,
  reportedBy: b.reportedBy || null,
  actualCheckInDate: b.actualCheckInDate || null,
  actualCheckInTime: b.actualCheckInTime || null,
  idVerified: b.idVerified ?? false,

  // 🚪 Check Out
  checkedOutAt: b.checkedOutAt || null,
  checkOutComment: b.checkOutComment || "",

  // 📸 Profile
  profilePicture: b.profilePicture || "",
});

/* =============================================================
   BASIC ROUTES
============================================================= */

// Create a single booking (direct or enquiry approval)
router.post("/", protect, createBooking);



// =============================================================
// MARK PAYMENT AS COMPLETED (Caretaker / Admin)
// =============================================================
router.put("/:id/mark-paid", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.paymentStatus = "PAID";
    booking.paidAmount = req.body.paidAmount ?? booking.paidAmount;
    booking.paymentMode = req.body.paymentMode || booking.paymentMode;
    booking.transactionId = req.body.transactionId || booking.transactionId;
    booking.transactionDate = req.body.transactionDate || new Date();
    booking.paymentRemarks = req.body.paymentRemarks || booking.paymentRemarks;

    if (Array.isArray(req.body.paymentAttachments)) {
      booking.paymentAttachments = req.body.paymentAttachments;
    }

    await booking.save();

    res.json({ success: true, booking });
    
    // ✅ Socket.IO event AFTER response
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('payment-updated', { 
        booking,
        timestamp: Date.now()
      });
      console.log('📡 Emitted payment-updated event');
    }
  } catch (err) {
    console.error("Mark paid error:", err);
    res.status(500).json({ message: "Failed to mark payment" });
  }
});

// =============================================================
// GET ALL BOOKINGS – ACTIVE ONLY (DASHBOARD)
// =============================================================
router.get("/all", protect, async (req, res) => {
  try {
    console.log("📡 Fetching ACTIVE bookings only for dashboard...");

    // ✅ CRITICAL FIX: Only fetch ACTIVE bookings
    // Active = booked (not yet arrived) OR checked_in (currently staying)
    const all = await Booking.find({
      status: { $in: ["booked", "checked_in"] } // ✅ ONLY these two statuses
    }).lean();

    console.log(`📊 Found ${all.length} ACTIVE bookings (excluding checked_out, cancelled, no_show)`);

    const hostels = {};

    all.forEach((b) => {
      // Additional safety check: skip if reportedStatus indicates inactive
      if (b.reportedStatus === "not_reported" && b.status === "no_show") {
        console.log(`⏭️ Skipping no-show booking: ${b.guest}`);
        return; // Skip this booking
      }

      if (!hostels[b.hostel]) {
        hostels[b.hostel] = { name: b.hostel, rooms: [] };
      }

      let room = hostels[b.hostel].rooms.find(
        (r) => r.roomNo === b.roomNo
      );

      if (!room) {
        room = { roomNo: b.roomNo, bookings: [] };
        hostels[b.hostel].rooms.push(room);
      }

      room.bookings.push(normalizeBooking(b));
    });

    console.log("✅ Active bookings grouped by hostel/room");

    res.json({
      success: true,
      hostels: Object.values(hostels),
    });

  } catch (err) {
    console.error("❌ Get bookings error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =============================================================
// GET ALL BOOKINGS – INCLUDING CANCELLED (DOWNLOAD)
// =============================================================
router.get("/all-for-download", protect, async (req, res) => {
  try {
    const all = await Booking.find({}).lean();

    const hostels = {};

    all.forEach((b) => {
      if (!hostels[b.hostel]) {
        hostels[b.hostel] = { name: b.hostel, rooms: [] };
      }

      let room = hostels[b.hostel].rooms.find(
        (r) => r.roomNo === b.roomNo
      );

      if (!room) {
        room = { roomNo: b.roomNo, bookings: [] };
        hostels[b.hostel].rooms.push(room);
      }

      room.bookings.push(normalizeBooking(b));
    });

    res.json({
      success: true,
      hostels: Object.values(hostels),
    });

  } catch (err) {
    console.error("Get bookings for download error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =============================================================
// GET SINGLE BOOKING BY ID
// =============================================================
router.get("/:id", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).lean();

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.json({
      success: true,
      booking: {
        ...booking,
        rollno: booking.rollno || "",
        department: booking.department || "",
        gender: booking.gender || "",
        reference: booking.reference || "",
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      },
    });

  } catch (error) {
    console.error("❌ Error fetching booking:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});


// =============================================================
// EXTEND BOOKING - UPDATED FOR EXTENSION PAYMENT + EMAIL
// =============================================================
router.put("/:id/extend", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      newTo,
      remarks,
      extensionAttachments,
      extensionPaymentType, // "Paid" | "Free"
      extensionAmount,
      extensionPaymentRemarks,
      extensionPaymentAttachments
    } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: "Booking not found" 
      });
    }

    // ✅ Date validation
    const currentTo = new Date(booking.to);
    const newToDate = new Date(newTo);

    currentTo.setHours(0, 0, 0, 0);
    newToDate.setHours(0, 0, 0, 0);

    if (newToDate <= currentTo) {
      return res.status(400).json({
        success: false,
        message: "New checkout date must be after current checkout date"
      });
    }

    // ✅ Core extension updates (NO payment math here)
    booking.to = newToDate;
    booking.extensionDate = newToDate;
    booking.extendRemarks = remarks || "";
    booking.extensionPaymentType = extensionPaymentType || "Paid";
    booking.extensionAmount = Number(extensionAmount) || 0;
    booking.extensionPaymentRemarks = extensionPaymentRemarks || "";

    if (extensionPaymentType === "Paid") {
      booking.totalAmount += extensionAmount;
    }

    if (Array.isArray(extensionAttachments)) {
      booking.extensionAttachments = extensionAttachments;
    }

    if (Array.isArray(extensionPaymentAttachments)) {
      booking.extensionPaymentAttachments = extensionPaymentAttachments;
    }

    // ✅ ONLY update totalAmount (if paid extension)
    // DO NOT touch: paidAmount, balanceAmount, paymentStatus
    if (extensionPaymentType === "Paid" && booking.extensionAmount > 0) {
      booking.totalAmount = (booking.totalAmount || 0) + booking.extensionAmount;
    }

    // ✅ CRITICAL: Single source of truth
    // This ONE LINE handles ALL payment status logic:
    // - Recalculates balanceAmount
    // - Derives correct paymentStatus
    // - Ensures "Pay Now" button shows correctly
    recalculatePaymentStatus(booking);

    await booking.save();

    console.log("✅ Booking extended successfully:", {
      bookingId: booking._id,
      oldTo: currentTo,
      newTo: newToDate,
      extensionAmount: booking.extensionAmount,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      balanceAmount: booking.balanceAmount,
      paymentStatus: booking.paymentStatus
    });

    // ✅ Socket.IO event (if you have real-time updates)
    const io = req.app.get("io");
    if (io) {
      io.to("dashboard-room").emit("booking-extended", {
        bookingId: booking._id,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: "Booking extended successfully",
      booking
    });

  } catch (error) {
    console.error("❌ Extension error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extend booking",
      error: error.message
    });
  }
});

// =============================================================
// CANCEL BOOKING - ✅ FIXED: Socket.IO inside route handler
// =============================================================
router.put("/:id/cancel", protect, async (req, res) => {
  try {
    await cancelBooking(req, res);
    
    // ✅ Socket.IO event AFTER successful cancellation
    if (req.app) {
      const io = req.app.get('io');
      if (io) {
        const booking = await Booking.findById(req.params.id);
        io.to('dashboard-room').emit('booking-cancelled', { 
          bookingId: req.params.id,
          hostel: booking?.hostel,
          roomNo: booking?.roomNo,
          timestamp: Date.now()
        });
        console.log('📡 Emitted booking-cancelled event');
      }
    }
  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ message: "Failed to cancel booking" });
  }
});

// =============================================================
// PROFILE PICTURE
// =============================================================
router.put("/:id/profile-picture", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { profilePicture } = req.body;
    
    if (!profilePicture) {
      return res.status(400).json({ message: "Profile picture URL is required" });
    }
    
    const booking = await Booking.findByIdAndUpdate(
      id,
      { profilePicture },
      { new: true }
    );
    
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    
    res.json({
      success: true,
      message: "Profile picture updated successfully",
      booking,
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    res.status(500).json({ message: "Failed to update profile picture" });
  }
});

// =============================================================
// TEMP TEST ROUTE
// =============================================================
router.get("/test-enquiry", protect, async (req, res) => {
  try {
    const count = await Enquiry.countDocuments();
    res.json({ success: true, enquiryCount: count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// Check Out Guest
// =============================================================
router.put("/:id/checkout", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { checkOutComment, actualCheckOutTime } = req.body;
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    booking.status = "checked_out";
    booking.checkedOutAt = actualCheckOutTime ? new Date(actualCheckOutTime) : new Date();
    
    if (checkOutComment) {
      booking.checkOutComment = checkOutComment;
    }

    await booking.save();

    res.json({
      success: true,
      message: "Guest checked out successfully",
      booking,
    });

    // ✅ Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('guest-checked-out', { 
        booking,
        timestamp: Date.now()
      });
      console.log('📡 Emitted guest-checked-out event');
    }

  } catch (error) {
    console.error("Check out error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to check out guest",
      error: error.message 
    });
  }
});

// =============================================================
// CARETAKER – MARK REPORTED / NOT REPORTED
// =============================================================
router.put("/:id/report-status", protect, async (req, res) => {
  try {
    const { reported, actualCheckIn, idVerified } = req.body;

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.reported = reported;

    if (reported) {
      booking.actualCheckIn = actualCheckIn || new Date();
      booking.reportedAt = new Date();
      booking.idVerified = idVerified ?? false;
      booking.status = "checked-in";
    }

    await booking.save();

    res.json({
      success: true,
      message: reported
        ? "Guest marked as reported"
        : "Guest marked as not reported",
      booking,
    });

    // ✅ Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('guest-reported', { 
        booking,
        timestamp: Date.now()
      });
      console.log('📡 Emitted guest-reported event');
    }
  } catch (err) {
    console.error("Report status error:", err);
    res.status(500).json({ message: "Failed to update report status" });
  }
});

// =============================================================
// CHECK ROOM OCCUPANCY (For preventing double booking)
// =============================================================
router.post("/check-room-occupancy", protect, async (req, res) => {
  try {
    const { hostel, roomNo, checkInDate, excludeBookingId } = req.body;

    console.log("🔍 Checking room occupancy:", { hostel, roomNo, checkInDate, excludeBookingId });

    if (!hostel || !roomNo || !checkInDate) {
      return res.status(400).json({
        success: false,
        message: "Hostel, room number, and check-in date are required"
      });
    }

    // Convert checkInDate to Date object
    const targetDate = new Date(checkInDate);
    targetDate.setHours(0, 0, 0, 0);

    console.log("📅 Target date:", targetDate.toISOString());

    // Build query to find overlapping bookings
    const query = {
      hostel: hostel,
      roomNo: roomNo,
      status: "checked_in", // Only check currently staying guests
    };

    // Exclude the current booking if provided
    if (excludeBookingId) {
      query._id = { $ne: excludeBookingId };
    }

    console.log("🔎 Query:", JSON.stringify(query, null, 2));

    // Find all checked-in bookings in this room
    const occupiedBookings = await Booking.find(query).lean();

    console.log(`📋 Found ${occupiedBookings.length} checked-in bookings in this room`);

    // Check if any of these bookings overlap with the target date
    for (const booking of occupiedBookings) {
      const bookingStart = new Date(booking.actualCheckInDate || booking.from);
      const bookingEnd = new Date(booking.to);
      
      bookingStart.setHours(0, 0, 0, 0);
      bookingEnd.setHours(23, 59, 59, 999);

      console.log(`📊 Checking booking ${booking._id}:`, {
        guest: booking.guest,
        start: bookingStart.toISOString(),
        end: bookingEnd.toISOString(),
        targetDate: targetDate.toISOString()
      });

      // Check if target date falls within this booking's stay period
      if (targetDate >= bookingStart && targetDate <= bookingEnd) {
        console.log(`✅ Room IS occupied by ${booking.guest}`);
        
        return res.status(200).json({
          success: true,
          occupied: true,
          occupant: {
            _id: booking._id,
            guest: booking.guest,
            contact: booking.contact,
            email: booking.email,
            from: booking.from,
            to: booking.to,
            actualCheckInDate: booking.actualCheckInDate,
            actualCheckInTime: booking.actualCheckInTime,
            hostel: booking.hostel,
            roomNo: booking.roomNo,
            status: booking.status
          }
        });
      }
    }

    // Room is vacant
    console.log("✅ Room is VACANT");
    
    return res.status(200).json({
      success: true,
      occupied: false,
      occupant: null
    });

  } catch (error) {
    console.error("❌ Check room occupancy error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to check room occupancy",
      error: error.message
    });
  }
});

// =============================================================
// Verify booking creation after approval
// =============================================================
router.post("/verify-creation", protect, async (req, res) => {
  try {
    const { enquiryId } = req.body;
    
    if (!enquiryId) {
      return res.status(400).json({
        success: false,
        message: "Enquiry ID required"
      });
    }

    // Check if booking exists for this enquiry
    const booking = await Booking.findOne({ enquiryId });
    
    if (booking) {
      return res.json({
        success: true,
        bookingExists: true,
        booking: {
          _id: booking._id,
          guest: booking.guest,
          hostel: booking.hostel,
          roomNo: booking.roomNo,
          status: booking.status
        }
      });
    }

    // Check enquiry status
    const enquiry = await Enquiry.findById(enquiryId);
    
    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found"
      });
    }

    return res.json({
      success: true,
      bookingExists: false,
      enquiryStatus: enquiry.status,
      warning: enquiry.status === "booked" 
        ? "Enquiry marked as booked but no booking record found"
        : null
    });

  } catch (err) {
    console.error("Verification error:", err);
    res.status(500).json({
      success: false,
      message: "Verification failed",
      error: err.message
    });
  }
});

// =============================================================
// 🔍 DEBUG ROUTE - Check Payment Fields in Database
// =============================================================
router.get("/debug/payment-fields/:id", protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .select('+paymentMode +transactionId +transactionDate +paymentRemarks')
      .lean();

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    console.log("🔍 DEBUG - Payment Fields from DB:", {
      _id: booking._id,
      guest: booking.guest,
      paymentMode: booking.paymentMode,
      transactionId: booking.transactionId,
      transactionDate: booking.transactionDate,
      paymentRemarks: booking.paymentRemarks,
      paymentStatus: booking.paymentStatus,
      paidAmount: booking.paidAmount,
      totalAmount: booking.totalAmount,
    });

    res.json({
      success: true,
      debug: {
        bookingId: booking._id,
        guest: booking.guest,
        paymentMode: booking.paymentMode,
        transactionId: booking.transactionId,
        transactionDate: booking.transactionDate,
        paymentRemarks: booking.paymentRemarks,
        paymentStatus: booking.paymentStatus,
        hasPaymentMode: !!booking.paymentMode,
        hasTransactionId: !!booking.transactionId,
        hasTransactionDate: !!booking.transactionDate,
      }
    });

  } catch (err) {
    console.error("Debug route error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ NEW: Mark booking as Department Pay Later (NO payment, just marking)
router.patch(
  "/:id/mark-department-pay",
  protect,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { remarks } = req.body;

      console.log("🏢 Marking booking as Department Pay Later:", id);

      const booking = await Booking.findById(id);
      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found"
        });
      }

      // ✅ ONLY mark responsibility - NO payment processing
      booking.paymentResponsibility = "DEPARTMENT";
      booking.paymentMode = "DEPARTMENT";
      
      // Save remarks if provided
      if (remarks) {
        booking.paymentRemarks = remarks;
      }

      await booking.save();

      console.log("✅ Booking marked as department responsibility:", {
        bookingId: booking._id,
        guest: booking.guest,
        totalAmount: booking.totalAmount,
        balanceAmount: booking.balanceAmount
      });

      // ✅ Emit Socket.IO event
      const io = req.app.get('io');
      if (io) {
        io.to('dashboard-room').emit('department-pay-marked', {
          bookingId: booking._id,
          guest: booking.guest,
          hostel: booking.hostel,
          timestamp: Date.now()
        });
        console.log('📡 Emitted department-pay-marked event');
      }

      res.json({
        success: true,
        message: "✅ Marked as Department Pay Later - Guest can checkout",
        booking
      });

    } catch (error) {
      console.error("❌ Mark department pay error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to mark department payment",
        error: error.message
      });
    }
  }
);

export default router;