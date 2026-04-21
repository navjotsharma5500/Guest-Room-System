// bookingController.js
import Booking from "../models/Booking.js";
import { parseDateOnlyToUtcDate } from "../utils/billingDates.js";
import { Parser } from "json2csv";
import Hostel from "../models/Hostel.js";
import { createLog } from "../middleware/logMiddleware.js";
import { sendEmail, safeSend as baseSafeSend } from "../emails/sendEmail.js";
import Enquiry from "../models/Enquiry.js";
import EmailLog from "../models/EmailLog.js";
import Feedback from "../models/Feedback.js";
import ExtensionRequest from "../models/ExtensionRequest.js";
import { isRebookingWithin24hrs, setupRebookingApproval } from "../utils/rebookingUtils.js";
import User from "../models/User.js";
import { asyncSendEmails } from "../utils/asyncEmail.js";

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
import guestCheckoutFeedback from "../emails/templates/guestCheckoutFeedback.js"; // ✅ NEW


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
// WRAPPER: Use centralized safeSend with EmailLog
// ======================================================
const safeSend = (emailPayload) => {
  return baseSafeSend(emailPayload, EmailLog);
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
    guestEmail: booking.email,
    societyEmail: booking.societyEmail,
    presidentEmail: booking.presidentEmail
  });

  const isPaid =
    booking.paymentType?.toUpperCase() === "PAID" ||
    booking.amountToBePaid > 0;

  const caretakerEmail = booking.caretakerEmail;
  const wardenEmail = booking.wardenEmail;
  const guestEmail = booking.email;
  const societyEmail = booking.societyEmail;
  const presidentEmail = booking.presidentEmail;

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

      // Society email - if provided
      if (societyEmail) {
        safeSend({
          to: societyEmail,
          subject: isPaid 
            ? "Guest Room Booking Notification"
            : "Guest Room Booking Notification (Complimentary)",
          html: isPaid
            ? guestDirectBooking(booking)
            : guestDirectBookingFree(booking),
          meta: {
            bookingId: booking._id,
            type: isPaid ? "society-direct-booking-paid" : "society-direct-booking-free",
          },
        });
      }

      // President email - if provided
      if (presidentEmail) {
        safeSend({
          to: presidentEmail,
          subject: isPaid 
            ? "Guest Room Booking Notification"
            : "Guest Room Booking Notification (Complimentary)",
          html: isPaid
            ? guestDirectBooking(booking)
            : guestDirectBookingFree(booking),
          meta: {
            bookingId: booking._id,
            type: isPaid ? "president-direct-booking-paid" : "president-direct-booking-free",
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
      societyEmail: payload.societyEmail || "",
      presidentEmail: payload.presidentEmail || "",
      contact: payload.contact || payload.guestPhone || "",
      idType: payload.idType || "",
      rollno: payload.rollno || "",
      department: payload.department || "",
      gender: payload.gender || "",
      hostel: payload.hostel,
      roomNo: payload.roomNo,
      from: payload.from ? parseDateOnlyToUtcDate(payload.from) : new Date(),
      to: payload.to ? parseDateOnlyToUtcDate(payload.to) : new Date(),
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

    // =========================
    // DUPLICATE BOOKING GUARD
    // =========================
    const existingDuplicate = await Booking.findOne({
      hostel: bookingData.hostel,
      roomNo: bookingData.roomNo,
      from: bookingData.from,
      to: bookingData.to,
      checkInTime: bookingData.checkInTime,
      checkOutTime: bookingData.checkOutTime,
      status: { $in: ["booked", "checked_in"] },
      $or: [
        {
          email: bookingData.email,
          contact: bookingData.contact,
        },
        {
          guest: bookingData.guest,
          contact: bookingData.contact,
        }
      ]
    });

    if (existingDuplicate) {
      console.log("⚠️ Duplicate booking prevented:", {
        existingBookingId: existingDuplicate._id,
        guest: existingDuplicate.guest,
        hostel: existingDuplicate.hostel,
        roomNo: existingDuplicate.roomNo,
      });

      return res.json({
        success: true,
        duplicatePrevented: true,
        message: "Duplicate booking prevented",
        booking: existingDuplicate,
      });
    }

    // =========================
    // REBOOKING DETECTION LOGIC
    // =========================
    const isRebooking = await isRebookingWithin24hrs(
      bookingData.email,
      bookingData.contact,
      bookingData.hostel
    );

    console.log("🔍 Rebooking Check Result:", {
      email: bookingData.email,
      contact: bookingData.contact,
      hostel: bookingData.hostel,
      isRebooking: isRebooking
    });

    // Setup approval status based on rebooking detection
    const setupBooking = new Booking(bookingData);
    setupRebookingApproval(setupBooking, isRebooking);

    // If rebooking requires review, send email to manager
    if (setupBooking.approvalStatus === "under_review") {
      console.log("⏰ UNDER REVIEW: Sending approval request email...");
      
      try {
        const managerEmail = process.env.MANAGER_EMAIL || "navjot.sharma@thapar.edu";
        
        const rebookingEmailContent = {
          to: managerEmail,
          subject: "Guest Rebooking Approval Required",
          html: `
            <h2>Rebooking Approval Request</h2>
            <p><strong>Guest Name:</strong> ${setupBooking.guest}</p>
            <p><strong>Email:</strong> ${setupBooking.email}</p>
            <p><strong>Contact:</strong> ${setupBooking.contact}</p>
            <p><strong>Hostel:</strong> ${setupBooking.hostel}</p>
            <p><strong>Room:</strong> ${setupBooking.roomNo}</p>
            <p><strong>New Booking Time:</strong> ${setupBooking.from.toLocaleDateString()} to ${setupBooking.to.toLocaleDateString()}</p>
            <p><strong>Review Deadline:</strong> ${setupBooking.reviewDeadline.toLocaleString()}</p>
            <p>Please review and approve/reject this rebooking request.</p>
          `
        };

        asyncSendEmails(() => safeSend(rebookingEmailContent));
        console.log("✅ Rebooking approval email queued for:", managerEmail);
      } catch (emailErr) {
        console.error("⚠️ Failed to send rebooking email:", emailErr.message);
        // Don't fail the booking creation if email fails
      }
    }

    const booking = await setupBooking.save();

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

    const response = res.status(201).json({ success: true, booking });

    asyncSendEmails(() => {
      console.log("📨 Background email dispatch started for booking:", booking._id);
      return sendBookingEmails(booking, "created");
    });

    return response;

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

// ======================================================
// GET EXTENSION REQUESTS
// ======================================================
export const getExtensionRequests = async (req, res) => {
  try {
    const ExtensionRequest = (await import("../models/ExtensionRequest.js")).default;
    let query = {};
    
    // Filter by hostel for caretaker/warden
    if (["caretaker", "Warden"].includes(req.user.role)) {
      query.hostel = req.user.hostel;
    }
    
    const requests = await ExtensionRequest.find(query)
      .sort({ createdAt: -1 })
      .populate("approvedBy", "name")
      .populate("rejectedBy", "name");
      
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
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
      earlyCheckInPayment,
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

    const isEarlyCheckIn = reportDate < scheduledDate;

    console.log("📋… Check-in Date Comparison:", {
      reportDate: reportDate.toISOString(),
      scheduledDate: scheduledDate.toISOString(),
      isEarlyCheckIn
    });

    if (isEarlyCheckIn) {
      const paymentPayload = earlyCheckInPayment || {};
      const paymentType = paymentPayload.paymentType || "Paid";
      const earlyAmount = Number(paymentPayload.amount || 0);
      const earlyRemarks = (paymentPayload.remarks || "").trim();
      const earlyAttachments = Array.isArray(paymentPayload.attachments)
        ? paymentPayload.attachments
        : [];

      if (!earlyCheckInPayment) {
        return res.status(400).json({
          success: false,
          message: "Early check-in payment details are required",
        });
      }

      if (paymentType === "Paid" && earlyAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Early check-in amount is required for paid check-in",
        });
      }

      if (paymentType === "Free" && (!earlyRemarks || earlyAttachments.length === 0)) {
        return res.status(400).json({
          success: false,
          message: "Remarks and attachment are required for free early check-in",
        });
      }

      booking.earlyCheckIn = {
        isEarly: true,
        amount: paymentType === "Paid" ? earlyAmount : 0,
        paymentType,
        remarks: earlyRemarks,
        attachments: earlyAttachments,
      };

      if (paymentType === "Paid") {
        booking.totalAmount = Number(booking.totalAmount || 0) + earlyAmount;
        booking.balanceAmount = Number(booking.balanceAmount || 0) + earlyAmount;
        booking.amount = Number(booking.amount || booking.totalAmount || 0) + earlyAmount;
        booking.amountToBePaid = Number(booking.balanceAmount || 0);
      }

      const earlyAudit = [
        "[EARLY CHECK-IN]",
        `Extra Amount: ₹${paymentType === "Paid" ? earlyAmount : 0}`,
        `Type: ${paymentType}`,
        `Remarks: ${earlyRemarks || "—"}`,
      ].join("\n");

      booking.remarks = booking.remarks
        ? `${booking.remarks}\n${earlyAudit}`
        : earlyAudit;
    } else {
      booking.earlyCheckIn = booking.earlyCheckIn || {
        isEarly: false,
        amount: 0,
        paymentType: "Paid",
        remarks: "",
        attachments: [],
      };
    }

    // Update reporting fields
    booking.reportedStatus = "reported";
    booking.reportedAt = new Date();
    booking.actualCheckInDate = actualCheckInDate ? new Date(actualCheckInDate) : new Date(booking.from);
    booking.actualCheckInTime = actualCheckInTime || booking.checkInTime || "00:00";
    booking.idVerified = Boolean(idVerified);
    booking.status = "checked_in";
    
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
      wasEarlyCheckIn: isEarlyCheckIn
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
      message: isEarlyCheckIn 
        ? "Guest checked in early - payment captured successfully" 
        : "Guest marked as reported",
      booking,
      earlyCheckIn: isEarlyCheckIn
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

const toDateOnly = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
};

const calculateStayDays = (checkInDate, checkoutDate) => {
  const start = toDateOnly(checkInDate);
  const end = toDateOnly(checkoutDate);
  if (!start || !end) return 1;
  const diff = (end - start) / (1000 * 60 * 60 * 24);
  return Math.max(1, diff);
};

const roundCurrency = (value) => Math.round((Number(value) || 0) * 100) / 100;

// ================================
// CHECK OUT GUEST
// ================================
export const checkOutGuest = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      checkOutComment,
      actualCheckOutTime,
      actualCheckoutDate,
      actualCheckoutTime,
      checkoutType: requestedCheckoutType,
    } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // ✅ Keep department-pay informational logging, but do not block unpaid checkout.
    // The defaulter workflow is allowed to proceed after the caretaker confirms.
    const isDepartmentResponsibility = booking.paymentResponsibility === "DEPARTMENT";
    if (isDepartmentResponsibility && booking.balanceAmount > 0) {
      console.log("✅ Checkout allowed - Department will pay later");
    }

    // ✅ UPDATED: Allow checkout for department-paid bookings even if not reported
    if (booking.reportedStatus !== "reported" && booking.paymentResponsibility !== "DEPARTMENT") {
      return res.status(400).json({ 
        success: false, 
        message: "Guest must be reported before checkout" 
      });
    }

    const checkoutTimestamp = actualCheckOutTime ? new Date(actualCheckOutTime) : new Date();
    const effectiveActualCheckoutDate = toDateOnly(actualCheckoutDate) || toDateOnly(checkoutTimestamp) || new Date();
    const plannedCheckoutDate = toDateOnly(booking.to);
    const effectiveActualCheckInDate = toDateOnly(booking.actualCheckInDate || booking.from) || toDateOnly(booking.from) || effectiveActualCheckoutDate;

    let resolvedCheckoutType = requestedCheckoutType || "NORMAL";
    if (plannedCheckoutDate && effectiveActualCheckoutDate < plannedCheckoutDate) {
      resolvedCheckoutType = "EARLY";
    } else if (requestedCheckoutType !== "AUTO") {
      resolvedCheckoutType = "NORMAL";
    }

    const originalAmount = Number(booking.totalAmount || 0);
    const paidAmount = Number(booking.paidAmount || 0);
    const discount = Number(booking.discount || 0);
    let adjustedAmount = originalAmount;

    if (resolvedCheckoutType === "EARLY" && booking.paymentType === "Paid") {
      const plannedDays = calculateStayDays(booking.from, booking.to);
      const actualDays = calculateStayDays(effectiveActualCheckInDate, effectiveActualCheckoutDate);
      const perDayRate = plannedDays > 0 ? originalAmount / plannedDays : 0;
      const actualAmount = roundCurrency(perDayRate * actualDays);

      if (paidAmount < actualAmount) {
        booking.totalAmount = actualAmount;
      } else {
        booking.totalAmount = paidAmount;
      }

      adjustedAmount = roundCurrency(booking.totalAmount || 0);
      booking.totalAmount = adjustedAmount;
      booking.balanceAmount = roundCurrency(Math.max(0, adjustedAmount - paidAmount - discount));
      booking.amount = adjustedAmount;
      booking.amountToBePaid = booking.balanceAmount;

      const earlyCheckoutAudit = [
        "[EARLY CHECKOUT]",
        `Planned Days: ${plannedDays}`,
        `Actual Days: ${actualDays}`,
        `Original Amount: ₹${originalAmount}`,
        `Adjusted Amount: ₹${actualAmount}`,
        `Paid: ₹${paidAmount}`,
        `Final: ₹${adjustedAmount}`,
      ].join("\n");

      booking.checkOutComment = checkOutComment
        ? `${earlyCheckoutAudit}\n${checkOutComment}`
        : earlyCheckoutAudit;
    } else {
      booking.checkOutComment = checkOutComment || "";
    }

    booking.status = "checked_out";
    booking.checkedOutAt = checkoutTimestamp;
    booking.checkoutType = resolvedCheckoutType;
    booking.actualCheckoutDate = checkoutTimestamp;
    if (actualCheckoutTime) {
      booking.actualCheckoutTime = actualCheckoutTime;
    } else {
      booking.actualCheckoutTime = booking.checkedOutAt.toTimeString().slice(0, 5);
    }

    await booking.save();

    createLog("guest_checked_out", req.user._id, {
      bookingId: booking._id,
    });

    res.json({
      success: true,
      message: "Guest checked out successfully",
      booking,
    });

    // ✅ SEND FEEDBACK EMAIL TO GUEST (After checkout)
    if (booking.email) {
       console.log("📨 Sending checkout feedback email to:", booking.email);
       asyncSendEmails(() => safeSend({
         to: booking.email,
         subject: "Thank you for staying with us! - Feedback",
         html: guestCheckoutFeedback(booking),
         meta: {
           bookingId: booking._id,
           type: "guest-checkout-feedback"
         }
       }));
    }

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
// REQUEST EXTENSION (NEW)
// ======================================================
export const requestExtension = async (req, res) => {
  try {
    const {
      bookingId: bodyBookingId,
      newTo,
      remarks,
      attachments,
      paymentType,
      amount,
      paymentRemarks,
      paymentAttachments
    } = req.body;
    const bookingId = req.params.id || bodyBookingId;

    if (!Array.isArray(attachments) || attachments.length === 0) {
      return res.status(400).json({ success: false, message: "Extension attachment is mandatory" });
    }

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    const currentCheckOut = new Date(booking.to);
    const newCheckOut = new Date(newTo);
    const toDateOnly = (d) => {
      const dt = new Date(d);
      return Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate());
    };
    const diffDays = Math.round(
      (toDateOnly(newCheckOut) - toDateOnly(currentCheckOut)) / 86400000
    );

    // ✅ Routing decision
    const requiredApprovalLevel = diffDays <= 2 ? "co_warden" : "adosa";

    const ExtensionRequest = (await import("../models/ExtensionRequest.js")).default;
    const request = new ExtensionRequest({
      bookingId,
      oldCheckout: booking.to,
      requestedCheckout: newCheckOut,
      remarks: remarks || "",
      hostel: booking.hostel,
      requiredApprovalLevel,
      createdBy: req.user?._id,
      status: "pending",
      extensionPaymentType: paymentType || "Paid",
      extensionAmount: Number(amount) || 0,
      extensionPaymentRemarks: paymentRemarks || "",
      extensionPaymentAttachments: Array.isArray(paymentAttachments) ? paymentAttachments : [],
      extensionAttachments: Array.isArray(attachments) ? attachments : [],
    });

    await request.save();

    const io = req.app.get("io");
    if (io) {
      io.to("dashboard-room").emit("extension-requested", {
        requestId: request._id,
        bookingId: booking._id,
        hostel: booking.hostel,
        days: diffDays,
        requiredApprovalLevel,
      });
    }

    // ✅ EMAIL: Notify correct approver
    try {
      const dashboardUrl = process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL}/approvals`
        : "https://your-dashboard-url.com/approvals";

      const emailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 20px;">📋 Extension Request Requires Your Approval</h2>
            <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">
              ${diffDays} day${diffDays !== 1 ? "s" : ""} extension —
              ${requiredApprovalLevel === "co_warden" ? "≤ 2 days (Co-Warden level)" : "> 2 days (ADOSA level)"}
            </p>
          </div>
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px;width:140px;">Guest Name</td><td style="padding:8px 0;font-weight:600;font-size:14px;">${booking.guest}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Hostel / Room</td><td style="padding:8px 0;font-size:14px;">${booking.hostel} — Room ${booking.roomNo}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Current Checkout</td><td style="padding:8px 0;font-size:14px;">${new Date(booking.to).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Requested Checkout</td><td style="padding:8px 0;font-size:14px;font-weight:600;color:#1e40af;">${newCheckOut.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Extension Days</td><td style="padding:8px 0;font-weight:700;font-size:16px;color:#059669;">${diffDays} day${diffDays !== 1 ? "s" : ""}</td></tr>
              <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">Payment</td><td style="padding:8px 0;font-size:14px;">${paymentType || "Not specified"}${amount ? ` — ₹${amount}` : ""}</td></tr>
              ${remarks ? `<tr><td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top;">Remarks</td><td style="padding:8px 0;font-size:14px;font-style:italic;">"${remarks}"</td></tr>` : ""}
            </table>
            <div style="margin-top:24px;text-align:center;">
              <a href="${dashboardUrl}" style="display:inline-block;background:#1e40af;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
                View on Dashboard →
              </a>
            </div>
            <p style="margin-top:16px;font-size:12px;color:#94a3b8;text-align:center;">
              Log in to the dashboard to Approve or Reject this request.
            </p>
          </div>
        </div>
      `;

      if (requiredApprovalLevel === "co_warden") {
        safeSend({
          to: ["cowarden@thapar.edu", "cowarden2@thapar.edu"],
          subject: `🔔 Extension Request: ${booking.guest} — ${diffDays} Day(s) [Co-Warden Approval]`,
          html: masterTemplate({ title: "Extension Request — Co-Warden Action Required", content: emailContent }),
          meta: { bookingId: booking._id, type: "extension-request-co-warden" },
        });
        console.log(`📧 Extension notification → co_warden (${diffDays} day(s))`);
      } else {
        // > 2 days → adosa1 + adosa2 only (NOT adosa3)
        safeSend({
          to: ["adosa1@thapar.edu", "adosa2@thapar.edu"],
          subject: `🔔 Extension Request: ${booking.guest} — ${diffDays} Day(s) [ADOSA Approval Required]`,
          html: masterTemplate({ title: "Extension Request — ADOSA Action Required", content: emailContent }),
          meta: { bookingId: booking._id, type: "extension-request-adosa" },
        });
        console.log(`📧 Extension notification → adosa (${diffDays} day(s))`);
      }
    } catch (emailErr) {
      console.error("❌ Extension request email error (non-critical):", emailErr);
    }

    res.status(201).json({
      success: true,
      message: "Extension request submitted for approval",
      request,
    });
  } catch (err) {
    console.error("❌ Extension request error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// ✅ EXTEND BOOKING (Controller) — FINAL APPROVAL
// ======================================================
export const approveExtension = async (req, res) => {
  try {
    const { requestId, updatedAmount, updatedCheckOutDate } = req.body;

    const ExtensionRequest = (await import("../models/ExtensionRequest.js")).default;
    const request = await ExtensionRequest.findById(requestId);

    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    // ✅ BACKEND GUARD: co_warden can only approve ≤2 day extensions
    if (req.user.role === "co_warden" && request.days > 2) {
      return res.status(403).json({
        success: false,
        message: "Co-Warden can only approve extensions of 2 days or less. This requires ADOSA approval.",
      });
    }

    const booking = await Booking.findById(request.bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Original booking not found" });
    }

    booking.to = parseDateOnlyToUtcDate(updatedCheckOutDate || request.newCheckOutDate);
    booking.extensionDate = parseDateOnlyToUtcDate(updatedCheckOutDate || request.newCheckOutDate);
    booking.extendRemarks = request.remarks;

    if (request.attachments?.length > 0) {
      booking.extensionAttachments = [
        ...(booking.extensionAttachments || []),
        ...request.attachments,
      ];
    }

    const finalAmount = Number(updatedAmount !== undefined ? updatedAmount : request.amount) || 0;

    if (request.paymentType === "Paid" && finalAmount > 0) {
      booking.extensionPaymentType = "Paid";
      booking.extensionAmount = finalAmount;
      booking.totalAmount = (booking.totalAmount || 0) + finalAmount;
      booking.balanceAmount = Math.max(
        0,
        booking.totalAmount - (booking.paidAmount || 0) - (booking.discount || 0)
      );
      if (booking.balanceAmount > 0) booking.paymentStatus = "PARTIALLY_PAID";
    } else if (request.paymentType === "Free") {
      booking.extensionPaymentType = "Free";
      booking.extensionAmount = 0;
    }

    // Push extension history entry
    if (!booking.extensionHistory) booking.extensionHistory = [];
    booking.extensionHistory.push({
      oldCheckout: request.currentCheckOutDate,
      newCheckout: booking.to,
      days: request.days,
      approvedBy: req.user._id,
      approvedAt: new Date(),
      paymentType: request.paymentType,
      amount: finalAmount,
      remarks: request.remarks,
    });

    await booking.save();

    // Mark request approved
    request.status = "APPROVED";
    request.approvedBy = req.user._id;
    request.reviewedAt = new Date();
    request.finalAmount = finalAmount;
    request.finalCheckOutDate = booking.to;
    await request.save();

    // Approval emails
    try {
      const hostelDoc = await Hostel.findOne({ name: booking.hostel }).lean();
      const managerEmails = ["admin_dev@thapar.edu"];

      const emailContent = `
        <p>Dear ${booking.guest},</p>
        <p>Your booking extension request has been <strong style="color:#22c55e;">APPROVED</strong>.</p>
        <div style="background:#dcfce7;border-left:4px solid #22c55e;padding:15px;margin:20px 0;border-radius:6px;">
          <strong>New Checkout Date:</strong> ${new Date(booking.to).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}<br/>
          ${finalAmount > 0 ? `<strong>Extension Amount:</strong> ₹${finalAmount}` : "<strong>Extension:</strong> Free of charge"}
        </div>
        <p><strong>Hostel:</strong> ${booking.hostel} | <strong>Room:</strong> ${booking.roomNo}</p>
      `;

      safeSend({
        to: booking.email,
        subject: "✅ Booking Extension Approved",
        html: masterTemplate({ title: "Extension Approved", content: emailContent }),
        meta: { bookingId: booking._id, type: "extension-approved" },
      });

      const staffEmails = [
        hostelDoc?.caretakerEmail,
        hostelDoc?.wardenEmail,
        ...managerEmails,
      ].filter(Boolean);

      safeSend({
        to: staffEmails,
        subject: `Extension Approved — ${booking.guest} — ${booking.hostel}`,
        html: masterTemplate({ title: "Staff: Extension Approved", content: emailContent }),
        meta: { bookingId: booking._id, type: "extension-approved-staff" },
      });
    } catch (emailErr) {
      console.error("❌ Extension approval email error:", emailErr);
    }

    const io = req.app.get("io");
    if (io) {
      io.to("dashboard-room").emit("booking-extended", {
        bookingId: booking._id,
        hostel: booking.hostel,
        roomNo: booking.roomNo,
        newTo: booking.to,
        timestamp: Date.now(),
      });
    }

    res.json({ success: true, message: "Extension approved and applied", booking });
  } catch (err) {
    console.error("❌ Approve extension error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

export const rejectExtension = async (req, res) => {
  try {
    const { requestId, reason } = req.body;
    
    const ExtensionRequest = (await import("../models/ExtensionRequest.js")).default;
    const request = await ExtensionRequest.findById(requestId);
    
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    request.status = "REJECTED";
    request.rejectedBy = req.user._id;
    request.rejectionReason = reason || "No reason provided";
    request.reviewedAt = new Date();
    await request.save();

    // ✅ Email Automation logic for rejection
    const booking = await Booking.findById(request.bookingId);
    if (booking) {
      try {
        const hostelDoc = await Hostel.findOne({ name: booking.hostel }).lean();
        const managerEmails = ["admin_dev@thapar.edu"];

        const emailContent = `
          <p>Dear ${booking.guest},</p>
          <p>Your booking extension request has been <strong>REJECTED</strong>.</p>
          <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
            <strong>Reason:</strong> ${reason || "No reason provided"}
          </div>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <strong>Original Booking Details:</strong><br/>
            Hostel: ${booking.hostel}<br/>
            Room: ${booking.roomNo}<br/>
            Original Checkout: ${new Date(booking.to).toLocaleDateString()}
          </div>
        `;

        // Email to Guest
        safeSend({
          to: booking.email,
          subject: "Booking Extension Request Update",
          html: masterTemplate({ title: "Extension Request Rejected", content: emailContent }),
          meta: { bookingId: booking._id, type: "extension-rejected" }
        });

        // Email to Staff
        const staffEmails = [hostelDoc?.caretakerEmail, hostelDoc?.wardenEmail, ...managerEmails].filter(Boolean);
        safeSend({
          to: staffEmails,
          subject: `Extension REJECTED - ${booking.guest} - ${booking.hostel}`,
          html: masterTemplate({ title: "Staff Notification: Extension Rejected", content: emailContent }),
          meta: { bookingId: booking._id, type: "extension-rejected-staff" }
        });
      } catch (emailErr) {
        console.error("❌ Extension rejection email error:", emailErr);
      }
    }

    res.json({ success: true, message: "Extension request rejected" });

  } catch (err) {
    console.error("❌ Reject extension error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ======================================================
// ✅ EXTEND BOOKING (Controller) — LEGACY / DIRECT
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

    asyncSendEmails(() => sendBookingEmails(booking, "extended"));

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
    const { remarks, attachments } = req.body;

    let booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    console.log("🚫 CANCEL BOOKING:", { bookingId: booking._id, hostel: booking.hostel });
    booking = await refreshBookingEmails(booking);

    booking.status = "cancelled";
    booking.cancelDate = new Date();
    if (remarks) booking.cancelRemarks = remarks;
    if (Array.isArray(attachments)) booking.cancelAttachments = attachments;

    // ✅ UNIVERSAL RULE: Never cancel a PAID bill
    const Bill = (await import("../models/Bill.js")).default;

    let allBills = await Bill.find({
      bookingId: booking._id,
      paymentType: { $nin: ["CANCELLED", "WAIVER"] },
    });

    // ✅ If no bills exist, CREATE ONE so it appears in "Cancelled Bills"
    if (allBills.length === 0) {
      console.log("📝 Creating cancelled bill record for tracking");
      const newBill = new Bill({
        bookingId: booking._id,
        hostel: booking.hostel,
        roomNo: booking.roomNo,
        guestName: booking.guest,
        guestEmail: booking.email,
        guestPhone: booking.contact,
        totalAmount: booking.totalAmount,
        paidAmount: 0,
        balanceAfterPayment: 0,
        paymentType: "CANCELLED",
        status: "cancelled",
        billNumber: `CNL-${Date.now()}`, // Unique ID
        cancelMeta: {
          reason: remarks || "Booking cancelled (No prior bill)",
          cancelledBy: req.user?._id || null,
          cancelledByName: req.user?.name || "System",
          attachments: Array.isArray(attachments) ? attachments : [],
          cancelledAt: new Date(),
        },
        remarks: `Booking cancelled. ${remarks || ""}`.trim(),
        createdAt: new Date()
      });
      await newBill.save();
    } else {
      // Update existing bills
      for (const bill of allBills) {
        // Skip fully paid bills — universal rule
        const isFullyPaid =
          (bill.paymentType === "FULL" || bill.paymentType === "FULL_PAYMENT") &&
          Number(bill.balanceAfterPayment) <= 0;

        if (isFullyPaid) {
          console.log(`⚠️ Skipping PAID bill ${bill._id} (universal rule: paid bills cannot be cancelled)`);
          continue;
        }

        bill.status = "cancelled";
        bill.paymentType = "CANCELLED";
        bill.balanceAfterPayment = 0;
        bill.cancelMeta = {
          reason: remarks || "Booking cancelled",
          cancelledBy: req.user?._id || null,
          cancelledByName: req.user?.name || "System",
          attachments: Array.isArray(attachments) ? attachments : [],
          cancelledAt: new Date(),
        };
        bill.remarks = `Booking cancelled. ${remarks || ""}`.trim();
        await bill.save();
      }
    }

    // Only zero out balance if the booking wasn't already paid
    if (booking.paymentStatus !== "PAID") {
      booking.balanceAmount = 0;
      booking.paymentStatus = "CANCELLED"; // ✅ Explicitly mark as CANCELLED
    }

    await booking.save();

    await ExtensionRequest.updateMany(
      {
        bookingId: booking._id,
        status: "pending",
      },
      {
        $set: {
          status: "rejected",
          rejectionReason: "Auto-rejected: Booking was cancelled",
        },
      }
    );

    asyncSendEmails(() => sendBookingEmails(booking, "cancelled"));

    const io = req.app.get("io");
    if (io) {
      io.to("dashboard-room").emit("booking-cancelled", {
        bookingId: booking._id,
        hostel: booking.hostel,
        roomNo: booking.roomNo,
        timestamp: Date.now(),
      });
    }

    res.json({ success: true, message: "Booking cancelled and bills updated", booking });
  } catch (err) {
    console.error("❌ Cancel booking error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================================
// APPROVE REBOOKING
// ================================
export const approveRebooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Only approve if currently under review
    if (booking.approvalStatus !== "under_review") {
      return res.status(400).json({
        success: false,
        message: `Booking approval status is ${booking.approvalStatus}, cannot approve`
      });
    }

    // Update approval fields
    booking.approvalStatus = "auto_approved";
    booking.reviewedBy = req.user?._id || null;
    booking.reviewedAt = new Date();

    await booking.save();

    console.log("✅ Rebooking approved:", {
      bookingId: booking._id,
      approvedBy: req.user?.name,
      approvedAt: booking.reviewedAt
    });

    if (req.user?._id) {
      createLog("booking_approved", req.user._id, { bookingId: booking._id });
    }

    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('booking-approved', {
        bookingId: booking._id,
        hostel: booking.hostel,
        roomNo: booking.roomNo,
        timestamp: Date.now()
      });
    }

    res.json({ success: true, message: "Rebooking approved", booking });
  } catch (err) {
    console.error("❌ Approve rebooking error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ================================
// REJECT REBOOKING
// ================================
export const rejectRebooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    // Only reject if currently under review
    if (booking.approvalStatus !== "under_review") {
      return res.status(400).json({
        success: false,
        message: `Booking approval status is ${booking.approvalStatus}, cannot reject`
      });
    }

    // Update approval and booking status
    booking.approvalStatus = "rejected";
    booking.status = "cancelled";
    booking.reviewedBy = req.user?._id || null;
    booking.reviewedAt = new Date();
    booking.cancelDate = new Date();
    booking.cancelRemarks = "Rebooking rejected by admin";

    await booking.save();

    console.log("❌ Rebooking rejected:", {
      bookingId: booking._id,
      rejectedBy: req.user?.name,
      rejectedAt: booking.reviewedAt
    });

    if (req.user?._id) {
      createLog("booking_rejected", req.user._id, { bookingId: booking._id });
    }

    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('booking-rejected', {
        bookingId: booking._id,
        hostel: booking.hostel,
        roomNo: booking.roomNo,
        timestamp: Date.now()
      });
    }

    res.json({ success: true, message: "Rebooking rejected", booking });
  } catch (err) {
    console.error("❌ Reject rebooking error:", err);
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

    console.log("📋 Fetching booking history:", { contact, email });

    if (!contact && !email) {
      return res.status(400).json({ 
        success: false, 
        message: "Please provide contact number or email" 
      });
    }

    const query = { $or: [] };
    
    if (contact) query.$or.push({ contact: contact });
    if (email) query.$or.push({ email: { $regex: new RegExp(`^${email}$`, "i") } });

    // Fetch bookings
    const bookings = await Booking.find(query)
      .sort({ from: -1 })
      .lean();

    console.log(`✅ Found ${bookings.length} bookings`);

    // ✅ CRITICAL FIX: Manually fetch feedback for each booking
    const bookingIds = bookings.map(b => b._id);
    
    const feedbacks = await Feedback.find({ 
      bookingId: { $in: bookingIds } 
    })
    .select('bookingId rating remarks attachments ratingLabel')
    .lean();

    console.log(`✅ Found ${feedbacks.length} feedbacks`);

    // Create a map for quick lookup
    const feedbackMap = {};
    feedbacks.forEach(fb => {
      feedbackMap[fb.bookingId.toString()] = {
        rating: fb.rating,
        remarks: fb.remarks,
        attachments: fb.attachments || [],
        ratingLabel: fb.ratingLabel
      };
    });

    // ✅ Attach feedback to each booking
    const bookingsWithFeedback = bookings.map(booking => ({
      ...booking,
      feedback: feedbackMap[booking._id.toString()] || null
    }));

    console.log(`✅ Returning ${bookingsWithFeedback.length} bookings with feedback attached`);

    res.json({
      success: true,
      bookings: bookingsWithFeedback,
    });

  } catch (error) {
    console.error("❌ Fetch history error:", error);
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
    const twentyThreeHoursAgo = new Date(now.getTime() - (23 * 60 * 60 * 1000));

    console.log("🔍 Checking for no-show bookings...");
    console.log("⏰ Current time:", now.toISOString());
    console.log("⏰ 23 hours ago:", twentyThreeHoursAgo.toISOString());

    // Find bookings that:
    // 1. Are still "booked" status
    // 2. Have reportedStatus "pending"
    // 3. Check-in time was more than 10 hours ago
    const noShowBookings = await Booking.find({
      status: "booked",
      reportedStatus: "pending",
      from: { $lte: twentyThreeHoursAgo }
    });

    console.log(`📋 Found ${noShowBookings.length} no-show bookings`);

    for (const booking of noShowBookings) {
      // Calculate exact check-in datetime
      const checkInDateTime = new Date(booking.from);
      const [hours, minutes] = (booking.checkInTime || "00:00").split(":");
      checkInDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Check if 10 hours have passed since check-in time
      if (checkInDateTime < twentyThreeHoursAgo) {
        booking.status = "cancelled";
        booking.reportedStatus = "not_reported";
        booking.cancelDate = new Date();
        booking.cancelRemarks = "Auto-cancelled: Guest did not report within 23 hours of check-in time";

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

          // ✅ SEND FEEDBACK EMAIL TO GUEST (After no-show cancellation)
          safeSend({
            to: booking.email,
            subject: "Thank you for staying with us! - Feedback",
            html: guestCheckoutFeedback(booking),
            meta: {
              bookingId: booking._id,
              type: "guest-no-show-feedback"
            }
          });

          console.log(`📧 Cancellation emails sent for booking ${booking._id}`);
          console.log(`📧 Feedback email sent for guest: ${booking.guest}`);
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

// ================================
// AUTO-CHECKOUT OVERDUE GUESTS WITH DEFAULTER INTEGRATION
// ================================
export const autoCheckoutOverdueGuests = async () => {
  try {
    const now = new Date();
    console.log("🔍 Checking for overdue checkouts...");
    console.log("⏰ Current time:", now.toISOString());

    // Find all checked-in guests (that haven't been checked out yet)
    const overdueBookings = await Booking.find({
      status: "checked_in",
      reportedStatus: "reported",
      checkedOutAt: null
    });

    console.log(`📋 Found ${overdueBookings.length} checked-in bookings to evaluate`);

    let checkedOutCount = 0;
    let movedToDefaultersCount = 0;
    const checkedOutBookings = []; // ✅ Array to collect checked-out bookings for socket emission

    for (const booking of overdueBookings) {
      // Calculate exact checkout datetime
      const finalCheckoutDate = booking.extensionDate || booking.to;
      const checkoutDateTime = new Date(finalCheckoutDate);
      const [hours, minutes] = (booking.checkOutTime || "12:00").split(":");
      checkoutDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Check if checkout time has passed (includes exact time match)
      if (now >= checkoutDateTime) {
        // ✅ UPDATE STATUS - Same as manual checkout
        booking.status = "checked_out";
        booking.reportedStatus = "reported"; // ✅ FIX: SAME as manual checkout
        booking.checkedOutAt = now;
        booking.checkoutType = "AUTO";

        // ✅ Store actual checkout info (DO NOT touch planned dates)
        booking.actualCheckoutDate = now;
        booking.actualCheckoutTime = now.toTimeString().slice(0, 5);

        // ✅ Calculate payment balance
        const totalAmount = booking.totalAmount || 0;
        const paidAmount = booking.paidAmount || 0;
        const discount = booking.discount || 0;
        const balanceAmount = totalAmount - paidAmount - discount;

        // ✅ Check if payment is pending (with exemptions for DEPARTMENT and FREE)
        const hasPendingPayment = 
          booking.paymentResponsibility !== "DEPARTMENT" &&
          booking.paymentType?.toUpperCase() !== "FREE" &&
          balanceAmount > 0;

        // Set checkout comment based on payment status
        if (hasPendingPayment) {
          booking.checkOutComment = `Auto checked-out (Payment Pending: ₹${balanceAmount.toFixed(2)})`;
          movedToDefaultersCount++;
          
          console.log(`⚠️ Auto checked-out (DEFAULTER): ${booking.guest} from ${booking.hostel} Room ${booking.roomNo} - Pending: ₹${balanceAmount}`);
        } else {
          booking.checkOutComment = "Auto checked-out (on-time departure)";
          console.log(`✅ Auto checked-out (PAID): ${booking.guest} from ${booking.hostel} Room ${booking.roomNo}`);
        }

        await booking.save();
        checkedOutCount++;

        // ✅ COLLECT BOOKING DATA FOR SOCKET EMISSION
        checkedOutBookings.push({
          _id: booking._id,
          hostel: booking.hostel,
          roomNo: booking.roomNo,
          guest: booking.guest,
          paymentResponsibility: booking.paymentResponsibility
        });

        // ✅ Send notification emails
        try {
          // Refresh booking emails from database
          const hostelDoc = await Hostel.findOne({ name: booking.hostel }).lean();
          if (hostelDoc) {
            booking.caretakerEmail = hostelDoc.caretakerEmail;
            booking.wardenEmail = hostelDoc.wardenEmail;
          }

          // Email to guest
          safeSend({
            to: booking.email,
            subject: hasPendingPayment 
              ? "Automatic Checkout - Payment Pending"
              : "Automatic Checkout Completed",
            html: masterTemplate({
              title: "Automatic Checkout",
              content: `
                <p>Dear ${booking.guest},</p>
                <p>Your checkout has been automatically processed as your stay period has ended.</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <strong>Booking Details:</strong><br/>
                  Hostel: ${booking.hostel}<br/>
                  Room: ${booking.roomNo}<br/>
                  Checkout Date: ${now.toLocaleDateString()}<br/>
                  Checkout Time: ${now.toLocaleTimeString()}
                </div>
                
                ${hasPendingPayment ? `
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <strong>⚠️ Payment Pending:</strong><br/>
                    Outstanding Amount: ₹${balanceAmount.toFixed(2)}<br/>
                    Please contact the caretaker to settle the payment immediately.
                  </div>
                ` : ''}
                
                <p>Thank you for your stay!</p>
              `
            }),
            meta: {
              bookingId: booking._id,
              type: "guest-auto-checkout",
            },
          });

          // ✅ Send feedback request only when no balance is pending
          if (!hasPendingPayment && booking.email) {
            safeSend({
              to: booking.email,
              subject: "Thank you for staying with us! - Feedback",
              html: guestCheckoutFeedback(booking),
              meta: {
                bookingId: booking._id,
                type: "guest-auto-checkout-feedback",
              },
            });
          }

          // Email to caretaker
          safeSend({
            to: booking.caretakerEmail,
            subject: hasPendingPayment 
              ? `⚠️ Auto-Checkout - PAYMENT PENDING - ${booking.guest}`
              : `Auto-Checkout Completed - ${booking.guest}`,
            html: masterTemplate({
              title: hasPendingPayment ? "Auto-Checkout - Payment Follow-up Required" : "Auto-Checkout Completed",
              content: `
                <p>Guest has been automatically checked out.</p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <strong>Guest Details:</strong><br/>
                  Name: ${booking.guest}<br/>
                  Hostel: ${booking.hostel}<br/>
                  Room: ${booking.roomNo}<br/>
                  Contact: ${booking.contact}<br/>
                  Email: ${booking.email}<br/>
                  Checkout: ${now.toLocaleDateString()} ${now.toLocaleTimeString()}
                </div>
                
                ${hasPendingPayment ? `
                  <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                    <strong>⚠️ PAYMENT PENDING - MOVED TO DEFAULTERS</strong><br/><br/>
                    Total Amount: ₹${totalAmount.toFixed(2)}<br/>
                    Paid Amount: ₹${paidAmount.toFixed(2)}<br/>
                    Discount: ₹${discount.toFixed(2)}<br/>
                    <strong style="color: #dc2626; font-size: 16px;">Outstanding Balance: ₹${balanceAmount.toFixed(2)}</strong><br/><br/>
                    <strong>⚡ Action Required:</strong> Guest has been added to the Defaulter Management system. Please follow up immediately for payment collection.
                  </div>
                ` : `
                  <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                    ✅ Payment Status: Fully Paid
                  </div>
                `}
              `
            }),
            meta: {
              bookingId: booking._id,
              type: "caretaker-auto-checkout",
            },
          });

          // Email to warden
          safeSend({
            to: booking.wardenEmail,
            subject: hasPendingPayment 
              ? `⚠️ DEFAULTER ALERT - Auto-Checkout: ${booking.guest}`
              : `Auto-Checkout Completed - ${booking.guest}`,
            html: masterTemplate({
              title: hasPendingPayment ? "Defaulter Alert - Payment Follow-up Required" : "Auto-Checkout Completed",
              content: `
                <p>Automatic checkout notification for your review.</p>
                
                ${hasPendingPayment ? `
                  <div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0;">
                    <strong style="color: #dc2626; font-size: 18px;">⚠️ DEFAULTER - PAYMENT PENDING</strong><br/><br/>
                    <strong>Guest:</strong> ${booking.guest}<br/>
                    <strong>Hostel:</strong> ${booking.hostel}<br/>
                    <strong>Room:</strong> ${booking.roomNo}<br/>
                    <strong>Contact:</strong> ${booking.contact}<br/>
                    <strong>Email:</strong> ${booking.email}<br/>
                    <strong>Department:</strong> ${booking.department || 'N/A'}<br/>
                    <strong>Roll No:</strong> ${booking.rollno || 'N/A'}<br/><br/>
                    <strong style="color: #dc2626; font-size: 16px;">Outstanding Amount: ₹${balanceAmount.toFixed(2)}</strong><br/><br/>
                    Guest has been added to the <strong>Defaulter Management System</strong>.
                  </div>
                ` : `
                  <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                    <strong>✅ Payment Completed</strong><br/><br/>
                    Guest: ${booking.guest}<br/>
                    Hostel: ${booking.hostel}<br/>
                    Room: ${booking.roomNo}<br/>
                    All payments cleared successfully.
                  </div>
                `}
                
                <p>Please coordinate with the caretaker ${hasPendingPayment ? 'to ensure payment collection' : 'if any follow-up is needed'}.</p>
              `
            }),
            meta: {
              bookingId: booking._id,
              type: hasPendingPayment ? "warden-auto-checkout-defaulter" : "warden-auto-checkout",
            },
          });

          console.log(`📧 Checkout notification emails sent for booking ${booking._id}`);
        } catch (emailErr) {
          console.error(`❌ Email error for booking ${booking._id}:`, emailErr);
        }
      }
    }

    console.log("\n📊 Auto-Checkout Summary:");
    console.log(`   ✅ Total Checked Out: ${checkedOutCount}`);
    console.log(`   ⚠️ Moved to Defaulters: ${movedToDefaultersCount}`);
    console.log(`   ✓ Fully Paid: ${checkedOutCount - movedToDefaultersCount}`);

    return {
      success: true,
      checkedOut: checkedOutCount,
      movedToDefaulters: movedToDefaultersCount,
      fullyPaid: checkedOutCount - movedToDefaultersCount,
      checkedOutBookings: checkedOutBookings // ✅ Return for socket emission
    };

  } catch (err) {
    console.error("❌ Auto-checkout error:", err);
    return {
      success: false,
      error: err.message
    };
  }
};

// GET ALL BOOKINGS (FLAT) – For Bookings Page ONLY
export const getAllBookingsFlat = async (req, res) => {
  try {
    const userRole = req.user?.role;
    const assignedHostel = req.user?.assignedHostel || req.user?.hostel;

    let query = {};

    if (["caretaker", "warden"].includes(userRole)) {
      if (!assignedHostel) {
        return res.status(403).json({
          success: false,
          message: "No hostel assigned"
        });
      }
      query.hostel = assignedHostel;
    }

    const bookings = await Booking.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      bookings
    });

  } catch (error) {
    console.error("❌ getAllBookingsFlat error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch bookings"
    });
  }
};
