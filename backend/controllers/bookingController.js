// bookingController.js
import Booking from "../models/Booking.js";
import { Parser } from "json2csv";
import Hostel from "../models/Hostel.js";
import { createLog } from "../middleware/logMiddleware.js";
import { sendEmail } from "../emails/sendEmail.js";
import Enquiry from "../models/Enquiry.js";
import EmailLog from "../models/EmailLog.js";

// ================================
// EMAIL TEMPLATE IMPORTS
// ================================
import caretakerBookingApprovedFree from "../emails/templates/caretakerBookingApprovedFree.js";
import caretakerBookingApprovedPaid from "../emails/templates/caretakerBookingApprovedPaid.js";
import caretakerBookingCancelled from "../emails/templates/caretakerBookingCancelled.js";
import caretakerBookingExtended from "../emails/templates/caretakerBookingExtended.js";
import caretakerBookingExtendedPaid from "../emails/templates/caretakerBookingExtendedPaid.js";
import caretakerDirectBooking from "../emails/templates/caretakerDirectBooking.js";
import caretakerDirectBookingFree from "../emails/templates/caretakerDirectBookingFree.js";

import enquiryNotification from "../emails/templates/enquiryNotification.js";

import guestBookingApprovedFree from "../emails/templates/guestBookingApprovedFree.js";
import guestBookingApprovedPaid from "../emails/templates/guestBookingApprovedPaid.js";
import guestBookingCancelled from "../emails/templates/guestBookingCancelled.js";
import guestBookingExtended from "../emails/templates/guestBookingExtended.js";
import guestBookingExtendedPaid from "../emails/templates/guestBookingExtendedPaid.js";
import guestBookingRejected from "../emails/templates/guestBookingRejected.js";
import guestEnquiryReceived from "../emails/templates/guestEnquiryReceived.js";
import guestDirectBooking from "../emails/templates/guestDirectBooking.js";
import guestDirectBookingFree from "../emails/templates/guestDirectBookingFree.js";

import managerBookingApprovedFree from "../emails/templates/managerBookingApprovedFree.js";
import managerBookingApprovedPaid from "../emails/templates/managerBookingApprovedPaid.js";
import managerBookingCancelled from "../emails/templates/managerBookingCancelled.js";
import managerBookingExtended from "../emails/templates/managerBookingExtended.js";
import managerBookingExtendedPaid from "../emails/templates/managerBookingExtendedPaid.js";
import managerDirectBooking from "../emails/templates/managerDirectBooking.js";
import managerDirectBookingFree from "../emails/templates/managerDirectBookingFree.js";

import masterTemplate from "../emails/templates/masterTemplate.js";

import wardenBookingApprovedFree from "../emails/templates/wardenBookingApprovedFree.js";
import wardenBookingApprovedPaid from "../emails/templates/wardenBookingApprovedPaid.js";
import wardenBookingCancelled from "../emails/templates/wardenBookingCancelled.js";
import wardenBookingExtended from "../emails/templates/wardenBookingExtended.js";
import wardenBookingExtendedPaid from "../emails/templates/wardenBookingExtendedPaid.js";
import wardenDirectBooking from "../emails/templates/wardenDirectBooking.js";
import wardenDirectBookingFree from "../emails/templates/wardenDirectBookingFree.js";


// ======================================================
// HELPER: SELECT EMAIL TEMPLATE
// ======================================================
const MANAGER_EMAIL = process.env.MANAGER_EMAIL;

if (!MANAGER_EMAIL) {
  console.warn("⚠️ MANAGER_EMAIL not set — manager emails will be skipped");
}

// ======================================================
// HELPER: Fetch and update booking with latest hostel emails
// ======================================================
const refreshBookingEmails = async (booking) => {
  try {
    console.log("🔓 Refreshing emails from database for hostel:", booking.hostel);
    
    const hostelDoc = await Hostel.findOne({ name: booking.hostel }).lean();
    
    if (!hostelDoc) {
      console.error("❌ Hostel not found in database:", booking.hostel);
      return booking;
    }

    console.log("✅ Fetched fresh hostel emails:", {
      hostel: hostelDoc.name,
      caretakerEmail: hostelDoc.caretakerEmail,
      wardenEmail: hostelDoc.wardenEmail
    });

    booking.caretakerEmail = hostelDoc.caretakerEmail;
    booking.wardenEmail = hostelDoc.wardenEmail;

    return booking;
  } catch (error) {
    console.error("❌ Error refreshing booking emails:", error);
    return booking;
  }
};

// ======================================================
// ENHANCED safeSend with validation logging
// ======================================================
const safeSend = (emailPayload) => {
  console.log("📧 safeSend called:", {
    to: emailPayload?.to,
    subject: emailPayload?.subject,
    type: emailPayload?.meta?.type,
    bookingId: emailPayload?.meta?.bookingId
  });

  if (!emailPayload?.to || String(emailPayload.to).trim() === "") {
    console.warn("⚠️ safeSend SKIPPED - No recipient email:", {
      type: emailPayload?.meta?.type,
      bookingId: emailPayload?.meta?.bookingId
    });
    return;
  }

  sendEmail(emailPayload)
    .then(() => {
      console.log("✅ Email sent successfully:", emailPayload.to);
      try {
        EmailLog.create({
          to: emailPayload.to,
          subject: emailPayload.subject,
          type: emailPayload.meta?.type,
          bookingId: emailPayload.meta?.bookingId,
          status: "sent",
        });
      } catch (e) {
        console.error("EmailLog write failed:", e.message);
      }
    })
    .catch((err) => {
      console.error("❌ Email send failed:", emailPayload.to, err.message);
      try {
        EmailLog.create({
          to: emailPayload.to,
          subject: emailPayload.subject,
          type: emailPayload.meta?.type,
          bookingId: emailPayload.meta?.bookingId,
          status: "failed",
          error: err.message,
        });
      } catch (e) {
        console.error("EmailLog write failed:", e.message);
      }
    });
};

// ======================================================
// ✅ UPDATED - Event-driven email dispatcher
// ======================================================
export const sendBookingEmails = (booking, statusType) => {
  console.log("📋 sendBookingEmails called:", {
    bookingId: booking._id,
    statusType,
    caretakerEmail: booking.caretakerEmail,
    wardenEmail: booking.wardenEmail,
    guestEmail: booking.email
  });

  const isPaid =
    booking.paymentType?.toUpperCase() === "PAID" ||
    booking.amountToBePaid > 0;

  const caretakerEmail = booking.caretakerEmail;
  const wardenEmail = booking.wardenEmail;
  const guestEmail = booking.email;

  if (!caretakerEmail) {
    console.error("❌ CRITICAL: Caretaker email missing for booking:", {
      bookingId: booking._id,
      hostel: booking.hostel
    });
  }
  if (!wardenEmail) {
    console.error("❌ CRITICAL: Warden email missing for booking:", booking._id);
  }
  if (!guestEmail) {
    console.error("❌ CRITICAL: Guest email missing for booking:", booking._id);
  }

  try {
    // DIRECT BOOKING
    if (statusType === "created") {
      console.log("📋 Sending DIRECT BOOKING emails to all recipients...");
      
      // Guest email - use paid or free template
      safeSend({
        to: guestEmail,
        subject: isPaid 
          ? "Guest Room Booking Confirmation"
          : "Guest Room Booking Confirmation (Complimentary)",
        html: isPaid
          ? guestDirectBooking(booking)
          : guestDirectBookingFree(booking),
        meta: {
          bookingId: booking._id,
          type: isPaid ? "guest-direct-booking-paid" : "guest-direct-booking-free",
        },
      });

      // Caretaker email - use paid or free template
      safeSend({
        to: caretakerEmail,
        subject: isPaid 
          ? "New Direct Booking Created"
          : "New Direct Booking Created (Free)",
        html: isPaid
          ? caretakerDirectBooking(booking)
          : caretakerDirectBookingFree(booking),
        meta: {
          bookingId: booking._id,
          type: isPaid ? "caretaker-direct-booking-paid" : "caretaker-direct-booking-free",
        },
      });

      // Warden email - use paid or free template
      safeSend({
        to: wardenEmail,
        subject: isPaid 
          ? "Caretaker Direct Booking"
          : "Caretaker Direct Booking (Free)",
        html: isPaid
          ? wardenDirectBooking(booking)
          : wardenDirectBookingFree(booking),
        meta: {
          bookingId: booking._id,
          type: isPaid ? "warden-direct-booking-paid" : "warden-direct-booking-free",
        },
      });

      // Manager email - use paid or free template
      if (MANAGER_EMAIL) {
        safeSend({
          to: MANAGER_EMAIL,
          subject: isPaid 
            ? "Caretaker Direct Booking Notification"
            : "Caretaker Direct Booking Notification (Free)",
          html: isPaid
            ? managerDirectBooking(booking)
            : managerDirectBookingFree(booking),
          meta: {
            bookingId: booking._id,
            type: isPaid ? "manager-direct-booking-paid" : "manager-direct-booking-free",
          },
        });
      }
      return;
    }

    // APPROVED BOOKING
    if (statusType === "approved") {
      console.log("📋 Sending APPROVAL emails to all recipients...");
      
      safeSend({
        to: guestEmail,
        subject: isPaid
          ? "Paid Guest Room Booking Approved"
          : "Guest Room Booking Approved",
        html: isPaid
          ? guestBookingApprovedPaid(booking)
          : guestBookingApprovedFree(booking),
        meta: {
          bookingId: booking._id,
          type: isPaid ? "guest-approved-paid" : "guest-approved-free",
        },
      });

      safeSend({
        to: caretakerEmail,
        subject: "New Guest Booking Approved",
        html: isPaid
          ? caretakerBookingApprovedPaid(booking)
          : caretakerBookingApprovedFree(booking),
        meta: {
          bookingId: booking._id,
          type: isPaid ? "caretaker-approved-paid" : "caretaker-approved-free",
        },
      });

      safeSend({
        to: wardenEmail,
        subject: "Guest Booking Approved",
        html: isPaid
          ? wardenBookingApprovedPaid(booking)
          : wardenBookingApprovedFree(booking),
        meta: {
          bookingId: booking._id,
          type: isPaid ? "warden-approved-paid" : "warden-approved-free",
        },
      });

      if (MANAGER_EMAIL) {
        safeSend({
          to: MANAGER_EMAIL,
          subject: "Booking Approved Notification",
          html: isPaid
            ? managerBookingApprovedPaid(booking)
            : managerBookingApprovedFree(booking),
          meta: {
            bookingId: booking._id,
            type: isPaid ? "manager-approved-paid" : "manager-approved-free",
          },
        });
      }
      return;
    }

    // CANCELLED BOOKING
    if (statusType === "cancelled") {
      console.log("📋 Sending CANCELLATION emails to all recipients...");
      
      safeSend({
        to: guestEmail,
        subject: "Guest Room Booking Cancelled",
        html: guestBookingCancelled(booking),
        meta: {
          bookingId: booking._id,
          type: "guest-booking-cancelled",
        },
      });

      safeSend({
        to: caretakerEmail,
        subject: "Guest Booking Cancelled",
        html: caretakerBookingCancelled(booking),
        meta: {
          bookingId: booking._id,
          type: "caretaker-booking-cancelled",
        },
      });

      safeSend({
        to: wardenEmail,
        subject: "Guest Booking Cancelled",
        html: wardenBookingCancelled(booking),
        meta: {
          bookingId: booking._id,
          type: "warden-booking-cancelled",
        },
      });

      if (MANAGER_EMAIL) {
        safeSend({
          to: MANAGER_EMAIL,
          subject: "Guest Booking Cancelled",
          html: managerBookingCancelled(booking),
          meta: {
            bookingId: booking._id,
            type: "manager-booking-cancelled",
          },
        });
      }
      return;
    }

    // EXTENDED BOOKING
    if (statusType === "extended") {
      console.log("📋 Sending EXTENSION emails to all recipients...");
      
      // Check if extension is paid
      const isExtensionPaid = 
        booking.extensionPaymentType?.toUpperCase() === "PAID" ||
        (booking.extensionAmount && booking.extensionAmount > 0);

      // Guest email - use paid or free extension template
      safeSend({
        to: guestEmail,
        subject: isExtensionPaid 
          ? "Guest Booking Extended (Payment Required)"
          : "Guest Booking Extended",
        html: isExtensionPaid
          ? guestBookingExtendedPaid(booking)
          : guestBookingExtended(booking),
        meta: {
          bookingId: booking._id,
          type: isExtensionPaid ? "guest-booking-extended-paid" : "guest-booking-extended-free",
        },
      });

      // Caretaker email - use paid or free extension template
      safeSend({
        to: caretakerEmail,
        subject: isExtensionPaid 
          ? "Booking Extended (Paid)"
          : "Booking Extended",
        html: isExtensionPaid
          ? caretakerBookingExtendedPaid(booking)
          : caretakerBookingExtended(booking),
        meta: {
          bookingId: booking._id,
          type: isExtensionPaid ? "caretaker-booking-extended-paid" : "caretaker-booking-extended-free",
        },
      });

      // Warden email - use paid or free extension template
      safeSend({
        to: wardenEmail,
        subject: isExtensionPaid 
          ? "Booking Extended (Paid)"
          : "Booking Extended",
        html: isExtensionPaid
          ? wardenBookingExtendedPaid(booking)
          : wardenBookingExtended(booking),
        meta: {
          bookingId: booking._id,
          type: isExtensionPaid ? "warden-booking-extended-paid" : "warden-booking-extended-free",
        },
      });

      // Manager email - use paid or free extension template
      if (MANAGER_EMAIL) {
        safeSend({
          to: MANAGER_EMAIL,
          subject: isExtensionPaid 
            ? "Booking Extension Notification (Paid)"
            : "Booking Extension Notification",
          html: isExtensionPaid
            ? managerBookingExtendedPaid(booking)
            : managerBookingExtended(booking),
          meta: {
            bookingId: booking._id,
            type: isExtensionPaid ? "manager-booking-extended-paid" : "manager-booking-extended-free",
          },
        });
      }
      return;
    }

    // ✅ Catch unknown statusType
    console.error("❌ UNKNOWN EMAIL EVENT TYPE:", {
      bookingId: booking._id,
      statusType,
      hostel: booking.hostel,
      roomNo: booking.roomNo
    });

  } catch (err) {
    console.error("❌ EMAIL DISPATCH ERROR:", err);
    console.error("Stack:", err.stack);
  }
};

// ======================================================
// CREATE BOOKING
// ======================================================
export const createBooking = async (req, res) => {
  try {
    console.log("================================================================================");
    console.log("🔓 CREATE BOOKING REQUEST");
    console.log("📋 Body:", JSON.stringify(req.body, null, 2));
    console.log("================================================================================");

    const payload = req.body;

    if (!payload.guest && !payload.guestName) throw new Error("Guest name required");
    if (!payload.email && !payload.guestEmail) throw new Error("Email required");
    if (!payload.contact && !payload.guestPhone) throw new Error("Contact required");
    if (!payload.hostel) throw new Error("Hostel required");
    if (!payload.roomNo) throw new Error("Room number required");

    console.log("🔍 Looking up hostel:", payload.hostel);
    const hostelDoc = await Hostel.findOne({ name: payload.hostel }).lean();

    if (!hostelDoc) {
      throw new Error(`Hostel not found in database: ${payload.hostel}`);
    }

    // ✅ ADD THIS BLOCK CHECK HERE (BEFORE any other validation):
    const targetRoom = hostelDoc.rooms?.find(r => r.roomNo === payload.roomNo);

    if (!targetRoom) {
      throw new Error(`Room ${payload.roomNo} not found in ${payload.hostel}`);
    }

    // ✅ CRITICAL: Check if room is blocked
    if (targetRoom.isBlocked && targetRoom.blockedTill) {
      const now = new Date();
      const blockedUntil = new Date(targetRoom.blockedTill);
      
      if (blockedUntil >= now) {
        console.error("❌ BOOKING BLOCKED:", {
          hostel: payload.hostel,
          room: payload.roomNo,
          blockedTill: targetRoom.blockedTill,
          reason: targetRoom.blockRemarks
        });
        
        return res.status(400).json({
          success: false,
          message: `❌ Room ${payload.roomNo} is currently blocked until ${blockedUntil.toLocaleDateString()}. Reason: ${targetRoom.blockRemarks || 'Not specified'}`,
          blocked: true
        });
      }
    }

    if (!hostelDoc) {
      throw new Error(`Hostel not found in database: ${payload.hostel}`);
    }

    const caretakerEmail = hostelDoc.caretakerEmail;
    const wardenEmail = hostelDoc.wardenEmail;

    console.log("✅ Hostel emails fetched from database:", {
      hostel: hostelDoc.name,
      caretakerEmail: caretakerEmail,
      wardenEmail: wardenEmail
    });

    if (!caretakerEmail || !wardenEmail) {
      console.error("❌ CRITICAL: Hostel missing required emails:", hostelDoc.name);
    }

    const paymentType = payload.paymentType || "Paid";
    let totalAmount = 0;
    let paidAmount = 0;
    let balanceAmount = 0;
    const paymentStatus = "UNPAID";

    if (paymentType === "Paid") {
      totalAmount = Number(payload.totalAmount || payload.amount || 0);
      balanceAmount = totalAmount;
    }

    const bookingData = {
      guest: payload.guest || payload.guestName || "",
      email: payload.email || payload.guestEmail || "",
      contact: payload.contact || payload.guestPhone || "",
      idType: payload.idType || "",
      rollno: payload.rollno || "",
      department: payload.department || "",
      gender: payload.gender || "",
      hostel: payload.hostel,
      roomNo: payload.roomNo,
      from: payload.from ? new Date(payload.from) : new Date(),
      to: payload.to ? new Date(payload.to) : new Date(),
      checkInTime: payload.checkInTime || "00:00",
      checkOutTime: payload.checkOutTime || "23:59",
      numGuests: Number(payload.numGuests || payload.guests || 1),
      females: Number(payload.females || 0),
      males: Number(payload.males || 0),
      purpose: payload.purpose || payload.message || "",
      city: payload.city || "",
      state: payload.state || "",
      reference: payload.reference || "",
      paymentType,
      totalAmount,
      paidAmount,
      balanceAmount,
      paymentStatus,
      amount: totalAmount,
      amountToBePaid: balanceAmount,
      discount: Number(payload.discount || 0),
      paymentMode: payload.paymentMode || "",
      transactionId: payload.transactionId || "",
      transactionDate: payload.transactionDate ? new Date(payload.transactionDate) : null,
      paymentRemarks: payload.paymentRemarks || "",
      billId: payload.billId || "",
      remarks: payload.remarks || "",
      freeRemarks: payload.freeRemarks || payload.remarks || "",
      files: Array.isArray(payload.files) ? payload.files : 
             Array.isArray(payload.addressProof) ? payload.addressProof : [],
      approvalDocuments: Array.isArray(payload.approvalDocuments) 
        ? payload.approvalDocuments 
        : [],
      paymentAttachments: Array.isArray(payload.paymentAttachments)
        ? payload.paymentAttachments
        : [], 
      extensionAttachments: Array.isArray(payload.extensionAttachments) 
        ? payload.extensionAttachments 
        : [],
      enquiryId: payload.enquiryId || null,
      status: "booked",
      createdBy: req.user?._id || null,
      caretakerEmail: caretakerEmail,
      wardenEmail: wardenEmail,
    };

    console.log("✅ Creating booking with database emails:", {
      caretakerEmail: bookingData.caretakerEmail,
      wardenEmail: bookingData.wardenEmail
    });

    const booking = await Booking.create(bookingData);

    console.log("✅ Booking created, sending emails...");
    sendBookingEmails(booking, "created");

    console.log("================================================================================");
    console.log("✅ BOOKING CREATED:", booking._id);
    console.log("💰 Payment Type:", booking.paymentType);
    console.log("💵 Total:", booking.totalAmount);
    console.log("📋 Status:", booking.paymentStatus);
    console.log("📧 Caretaker Email:", booking.caretakerEmail);
    console.log("📧 Warden Email:", booking.wardenEmail);
    console.log("================================================================================");

    if (req.user?._id) {
      createLog("booking_created", req.user._id, { bookingId: booking._id });
    }

    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('booking-created', { 
        bookingId: booking._id,
        hostel: booking.hostel,
        roomNo: booking.roomNo,
        timestamp: Date.now()
      });
      console.log('📋 Emitted booking-created event');
    }

    res.json({ success: true, booking });

  } catch (err) {
    console.error("❌ CREATE BOOKING ERROR:", err.message);
    console.error("Stack:", err.stack);
    
    res.status(500).json({ 
      success: false, 
      message: err.message,
      error: err.message,
      errorName: err.name
    });
  }
};

// ================================
// MARK REPORTED (FIX WITH EARLY CHECK-IN HANDLING)
// ================================
export const markReported = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      actualCheckInDate,
      actualCheckInTime,
      idVerified,
      remarks,
    } = req.body;

    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found" 
      });
    }

    // ✅ CRITICAL FIX: Handle early check-in
    const reportDate = actualCheckInDate ? new Date(actualCheckInDate) : new Date();
    const scheduledDate = new Date(booking.from);
    
    // Set to start of day for comparison
    reportDate.setHours(0, 0, 0, 0);
    scheduledDate.setHours(0, 0, 0, 0);

    console.log("📋… Check-in Date Comparison:", {
      reportDate: reportDate.toISOString(),
      scheduledDate: scheduledDate.toISOString(),
      isEarlyCheckIn: reportDate < scheduledDate
    });

    // Update reporting fields
    booking.reportedStatus = "reported";
    booking.reportedAt = new Date();
    booking.actualCheckInDate = actualCheckInDate ? new Date(actualCheckInDate) : new Date(booking.from);
    booking.actualCheckInTime = actualCheckInTime || booking.checkInTime || "00:00";
    booking.idVerified = Boolean(idVerified);
    booking.status = "checked_in";
    
    // ✅ CRITICAL: If early check-in, update the main 'from' date
    if (reportDate < scheduledDate) {
      console.log("🔓 Early check-in detected! Updating 'from' date...");
      booking.from = new Date(actualCheckInDate);
      console.log("✅ Updated booking.from to:", booking.from.toISOString());
    }
    
    if (req.user && req.user._id) {
      booking.reportedBy = req.user._id;
    }
    
    if (remarks) {
      booking.comments = remarks;
    }

    await booking.save();

    console.log("✅ Guest reported successfully:", {
      bookingId: booking._id,
      guest: booking.guest,
      originalFrom: scheduledDate.toISOString(),
      updatedFrom: booking.from.toISOString(),
      actualCheckInDate: booking.actualCheckInDate.toISOString(),
      wasEarlyCheckIn: reportDate < scheduledDate
    });

    // ✅ EMIT SOCKET.IO EVENT WITH FULL BOOKING DATA
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('guest-reported', { 
        bookingId: booking._id,
        hostel: booking.hostel,
        roomNo: booking.roomNo,
        from: booking.from, // ✅ Include updated dates
        to: booking.to,
        actualCheckInDate: booking.actualCheckInDate,
        actualCheckInTime: booking.actualCheckInTime,
        status: booking.status,
        timestamp: Date.now()
      });
      console.log('📋 Emitted guest-reported event with updated dates');
    }

    res.json({
      success: true,
      message: reportDate < scheduledDate 
        ? "Guest checked in early - dates updated successfully" 
        : "Guest marked as reported",
      booking,
      earlyCheckIn: reportDate < scheduledDate
    });

  } catch (err) {
    console.error("❌ MARK REPORTED ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
};

// ================================
// MARK NOT REPORTED
// ================================
export const markNotReported = async (req, res) => {
  try {
    const { remarks } = req.body;
    
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.reportedStatus = "not_reported";
    booking.status = "no_show";
    booking.noShowMarkedAt = new Date();
    
    if (remarks) {
      booking.comments = remarks;
    }

    await booking.save();

    createLog("guest_not_reported", req.user._id, {
      bookingId: booking._id,
    });

    res.json({
      success: true,
      message: "Guest marked as not reported",
      booking,
    });

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ================================
// CHECK OUT GUEST
// ================================
export const checkOutGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkOutComment, actualCheckOutTime } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    if (booking.reportedStatus !== "reported") {
      return res.status(400).json({ 
        success: false, 
        message: "Guest must be reported before checkout" 
      });
    }

    booking.status = "checked_out";
    booking.checkedOutAt = actualCheckOutTime ? new Date(actualCheckOutTime) : new Date();
    booking.checkOutComment = checkOutComment || "";

    await booking.save();

    createLog("guest_checked_out", req.user._id, {
      bookingId: booking._id,
    });

    res.json({
      success: true,
      message: "Guest checked out successfully",
      booking,
    });

  } catch (err) {
    console.error("❌ CHECK OUT ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      error: err.message 
    });
  }
};

// ================================
// UPDATE PAYMENT DETAILS
// ================================
export const updatePaymentDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      billId,
      amountToBePaid,
      paidAmount,
      discount,
      paymentMode,
      transactionId,
      transactionDate,
      paymentRemarks,
      paymentAttachments,
      paymentStatus,
      paymentType,
    } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Update all payment fields
    if (billId !== undefined) booking.billId = billId;
    if (amountToBePaid !== undefined) booking.amountToBePaid = Number(amountToBePaid);
    if (paidAmount !== undefined) booking.paidAmount = Number(paidAmount);
    if (discount !== undefined) booking.discount = Number(discount);

    booking.paymentMode = paymentMode || booking.paymentMode;
    booking.transactionId = transactionId || booking.transactionId;
    booking.transactionDate = transactionDate ? new Date(transactionDate) : booking.transactionDate;
    booking.paymentRemarks = paymentRemarks || booking.paymentRemarks;
    booking.paymentStatus = paymentStatus || booking.paymentStatus;
    booking.paymentType = paymentType || booking.paymentType;

    if (Array.isArray(paymentAttachments)) {
      booking.paymentAttachments = paymentAttachments;
    }

    await booking.save();

    createLog("payment_updated", req.user._id, {
      bookingId: booking._id,
      paidAmount: booking.paidAmount,
    });

    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('payment-updated', { 
        bookingId: booking._id,
        paidAmount: booking.paidAmount,
        balanceAmount: booking.balanceAmount,
        timestamp: Date.now()
      });
      console.log('📋 Emitted payment-updated event');
    }

    res.json({
      success: true,
      message: "Payment details updated",
      booking,
    });

  } catch (error) {
    console.error("Payment update error:", error);
    res.status(500).json({ message: "Failed to update payment details" });
  }
};

// ======================================================
// ✅ EXTEND BOOKING (Controller) — PAYMENT + EMAIL SAFE
// ======================================================
export const extendBooking = async (req, res) => {
  try {
    const { 
      newTo, 
      remarks, 
      extensionAttachments,
      extensionPaymentType,
      extensionAmount,
      extensionPaymentRemarks,
      extensionPaymentAttachments
    } = req.body;

    console.log("🔓 EXTENSION REQUEST RECEIVED:", {
      bookingId: req.params.id,
      newTo,
      extensionPaymentType,
      extensionAmount
    });

    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      console.error("❌ EXTENSION FAILED: Booking not found", req.params.id);
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // ==================================================
    // REFRESH STAFF EMAILS
    // ==================================================
    console.log("📋 Booking emails BEFORE refresh:", {
      caretakerEmail: booking.caretakerEmail,
      wardenEmail: booking.wardenEmail,
      hostel: booking.hostel
    });

    booking = await refreshBookingEmails(booking);

    console.log("📋 Booking emails AFTER refresh:", {
      caretakerEmail: booking.caretakerEmail,
      wardenEmail: booking.wardenEmail
    });

    // ==================================================
    // UPDATE EXTENSION CORE FIELDS
    // ==================================================
    const previousTo = booking.to;

    booking.to = new Date(newTo);
    booking.extensionDate = new Date(newTo);
    booking.extendRemarks = remarks || booking.extendRemarks || "";

    console.log("📋… Extension applied:", {
      previousTo,
      newTo: booking.to
    });

    // ==================================================
    // EXTENSION ATTACHMENTS
    // ==================================================
    if (Array.isArray(extensionAttachments)) {
      booking.extensionAttachments = extensionAttachments;
    }

    // ==================================================
    // EXTENSION PAYMENT LOGIC
    // ==================================================
    if (extensionPaymentType) {
      booking.extensionPaymentType = extensionPaymentType;

      if (extensionPaymentType === "Paid") {
        const amt = Number(extensionAmount || 0);

        booking.extensionAmount = amt;
        booking.totalAmount = (booking.totalAmount || 0) + amt;
        booking.balanceAmount =
          booking.totalAmount - (booking.paidAmount || 0) - (booking.discount || 0);

      } else if (extensionPaymentType === "Free") {
        booking.extensionAmount = 0;
        booking.extensionPaymentRemarks = extensionPaymentRemarks || "";
      }

      if (Array.isArray(extensionPaymentAttachments)) {
        booking.extensionPaymentAttachments = extensionPaymentAttachments;
      }
    }

    // ==================================================
    // SAVE
    // ==================================================
    await booking.save();

    console.log("✅ Booking extended & saved:", {
      bookingId: booking._id,
      newTo: booking.to,
      extensionPaymentType: booking.extensionPaymentType
    });

    // ==================================================
    // 🔓” EMAIL DISPATCH (EVENT-BASED)
    // ==================================================
    console.log("📋 CALLING sendBookingEmails (EXTENDED EVENT):", {
      bookingId: booking._id,
      guest: booking.email,
      caretaker: booking.caretakerEmail,
      warden: booking.wardenEmail,
      manager: process.env.MANAGER_EMAIL || null
    });

    sendBookingEmails(booking, "extended");

    // ==================================================
    // SOCKET EVENT
    // ==================================================
    const io = req.app.get("io");
    if (io) {
      io.to("dashboard-room").emit("booking-extended", { 
        bookingId: booking._id,
        hostel: booking.hostel,
        roomNo: booking.roomNo,
        newTo: booking.to,
        timestamp: Date.now()
      });
      console.log("📋 Emitted booking-extended socket event");
    }

    return res.json({
      success: true,
      message: "Booking extended successfully",
      booking
    });

  } catch (err) {
    console.error("❌ Extend booking error:", err);
    console.error("Stack:", err.stack);
    return res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


// ======================================================
// CANCEL BOOKING
// ======================================================
export const cancelBooking = async (req, res) => {
  try {
    const { remarks } = req.body;

    let booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    console.log("ðŸš« CANCEL BOOKING:", {
      bookingId: booking._id,
      hostel: booking.hostel
    });

    // ✅ Refresh emails from database
    booking = await refreshBookingEmails(booking);

    booking.status = "cancelled";
    booking.cancelDate = new Date();
    if (remarks) booking.cancelRemarks = remarks;

    await booking.save();

    console.log("✅ Booking cancelled, sending emails...");
    sendBookingEmails(booking, "cancelled");

    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('booking-cancelled', { 
        bookingId: booking._id,
        hostel: booking.hostel,
        roomNo: booking.roomNo,
        timestamp: Date.now()
      });
      console.log('📋 Emitted booking-cancelled event');
    }

    res.json({ success: true, message: "Booking cancelled", booking });

  } catch (err) {
    console.error("❌ Cancel booking error:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================================
// UPDATE BOOKING DETAILS
// ================================
export const updateBookingDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const allowedFields = [
      "guest", "rollno", "department", "gender", 
      "contact", "email", "numGuests", "males", "females", 
      "city", "state", "purpose", "remarks", "reference"
    ];

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        booking[key] = updates[key];
      }
    });

    await booking.save();

    createLog("booking_updated", req.user._id, { bookingId: booking._id });

    res.json({
      success: true,
      message: "Booking details updated successfully",
      booking,
    });

  } catch (error) {
    console.error("Update booking details error:", error);
    res.status(500).json({ success: false, message: "Failed to update details" });
  }
};

// ================================
// GET BOOKING HISTORY
// ================================
export const getBookingHistory = async (req, res) => {
  try {
    const { contact, email } = req.query;

    if (!contact && !email) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide contact number or email" 
      });
    }

    const query = { $or: [] };
    
    if (contact) query.$or.push({ contact: contact });
    if (email) query.$or.push({ email: { $regex: new RegExp(`^${email}$`, "i") } });

    const bookings = await Booking.find(query).sort({ from: -1 }).populate("feedback").lean();

    res.json({
      success: true,
      bookings,
    });

  } catch (error) {
    console.error("Fetch history error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch guest history",
      error: error.message 
    });
  }
};

// ================================
// DOWNLOAD CSV
// ================================
export const downloadBookingsCSV = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .select(`
        guest rollno hostel roomNo contact email department gender
        from to checkInTime checkOutTime
        numGuests males females
        state city reference purpose
        reportedStatus reportedAt
        paymentType paidAmount discount
        paymentMode transactionId transactionDate paymentRemarks
        freeRemarks remarks
        extensionDate extendRemarks
        cancelDate cancelRemarks
        status
        files approvalDocuments paymentAttachments extensionAttachments
        comments
        createdAt updatedAt
      `)
      .lean();

    const rows = bookings.map((b) => ({
      Name: b.guest || "",
      "RollNo/EmpID": b.rollno || "",
      Hostel: b.hostel || "",
      "Room No.": b.roomNo || "",
      Contact: b.contact || "",
      Email: b.email || "",
      Department: b.department || "",
      Gender: b.gender || "",

      "Check in Date": b.from ? new Date(b.from).toISOString().split("T")[0] : "",
      "Check in Time": b.checkInTime || "",

      "Check out Date": b.to ? new Date(b.to).toISOString().split("T")[0] : "",
      "Check out time": b.checkOutTime || "",

      "Total Guest": b.numGuests || 0,
      "Male Count": b.males || 0,
      "Female Count": b.females || 0,

      State: b.state || "",
      City: b.city || "",
      Reference: b.reference || "",
      Purpose: b.purpose || "",

      "Reported Status": b.reportedStatus || "pending",
      "Reported At": b.reportedAt ? new Date(b.reportedAt).toISOString().split("T")[0] : "",

      "Payment Type": b.paymentType || "",
      Discount: b.discount || 0,
      "Paid Amount": b.paidAmount || 0,
      "Payment Mode": b.paymentMode || "",
      "Payment Date": b.transactionDate ? new Date(b.transactionDate).toISOString().split("T")[0] : "",
      "Transaction ID": b.transactionId || "",
      "Payment Remarks": b.paymentRemarks || "",

      "Free Remarks": b.freeRemarks || b.remarks || "",

      "Extension Date": b.extensionDate ? new Date(b.extensionDate).toISOString().split("T")[0] : "",
      "Extension Remarks": b.extendRemarks || "",

      "Cancel Date": b.cancelDate ? new Date(b.cancelDate).toISOString().split("T")[0] : "",
      "Cancel Remarks": b.cancelRemarks || "",

      Status: b.status || "",

      "Address Proof Attachments": (b.files || []).join(" | "),
      "Approval Documents": (b.approvalDocuments || []).join(" | "),
      "Payment Attachments": (b.paymentAttachments || []).join(" | "),
      "Extension Attachments": (b.extensionAttachments || []).join(" | "),

      Comments: b.comments || "",
    }));

    const parser = new Parser({ withBOM: true });
    const csv = parser.parse(rows);

    res.header("Content-Type", "text/csv");
    res.attachment("guest-bookings.csv");
    return res.send(csv);

  } catch (error) {
    console.error("CSV download error:", error);
    res.status(500).json({ message: "CSV generation failed" });
  }
};

// ================================
// AUTO-CANCEL NO-SHOW BOOKINGS (CRON JOB)
// ================================
export const autoCancelNoShows = async () => {
  try {
    const now = new Date();
    const tenHoursAgo = new Date(now.getTime() - (10 * 60 * 60 * 1000));

    console.log("🔍 Checking for no-show bookings...");
    console.log("â° Current time:", now.toISOString());
    console.log("â° 10 hours ago:", tenHoursAgo.toISOString());

    // Find bookings that:
    // 1. Are still "booked" status
    // 2. Have reportedStatus "pending"
    // 3. Check-in time was more than 10 hours ago
    const noShowBookings = await Booking.find({
      status: "booked",
      reportedStatus: "pending",
      from: { $lte: tenHoursAgo }
    });

    console.log(`📋 Found ${noShowBookings.length} no-show bookings`);

    for (const booking of noShowBookings) {
      // Calculate exact check-in datetime
      const checkInDateTime = new Date(booking.from);
      const [hours, minutes] = (booking.checkInTime || "00:00").split(":");
      checkInDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Check if 10 hours have passed since check-in time
      if (checkInDateTime < tenHoursAgo) {
        booking.status = "cancelled";
        booking.reportedStatus = "not_reported";
        booking.cancelDate = new Date();
        booking.cancelRemarks = "Auto-cancelled: Guest did not report within 10 hours of check-in time";

        await booking.save();

        console.log(`✅ Auto-cancelled booking ${booking._id} for ${booking.guest}`);

        // Send emails - NO AWAIT
        try {
          safeSend({
            to: booking.email,
            subject: "Booking Cancelled - No Show",
            html: guestBookingCancelled(booking),
            meta: {
              bookingId: booking._id,
              type: "guest-no-show-cancelled",
            },
          });

          safeSend({
            to: booking.wardenEmail,
            subject: "Guest No-Show - Booking Auto-Cancelled",
            html: wardenBookingCancelled(booking),
            meta: {
              bookingId: booking._id,
              type: "warden-no-show-cancelled",
            },
          });

          if (MANAGER_EMAIL) {
            safeSend({
              to: MANAGER_EMAIL,
              subject: "No-Show Auto-Cancellation",
              html: managerBookingCancelled(booking),
              meta: {
                bookingId: booking._id,
                type: "manager-no-show-cancelled",
              },
            });
          }

          console.log(`📧 Cancellation emails sent for booking ${booking._id}`);
        } catch (emailErr) {
          console.error(`❌ Email error for booking ${booking._id}:`, emailErr);
        }
      }
    }

    return {
      success: true,
      cancelled: noShowBookings.length
    };

  } catch (err) {
    console.error("❌ Auto-cancel error:", err);
    return {
      success: false,
      error: err.message
    };
  }
}