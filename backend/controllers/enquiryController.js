// controllers/enquiryController.js - PRODUCTION READY WITH EVENT-DRIVEN EMAILS
import Enquiry from "../models/Enquiry.js";
import Hostel from "../models/Hostel.js";
import Booking from "../models/Booking.js";
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

// ======================================================
//  CREATE ENQUIRY
// ======================================================
export const createEnquiry = async (req, res) => {
  try {
    const settings = await getSystemSettings();
    console.log("📩 ========== ENQUIRY CREATE STARTED ==========");
    console.log("📦 RAW req.body:", JSON.stringify(req.body, null, 2));

    const body = req.body;
    
    let fullData = body.fullData;
    
    if (typeof fullData === "string") {
      console.log("🔄 fullData is STRING, parsing...");
      fullData = JSON.parse(fullData);
    }

    console.log("✅ fullData after parse:", fullData);

    const fileUrls = Array.isArray(fullData.files) ? fullData.files : [];
    console.log("📂 File URLs:", fileUrls);

    const guests = Number(fullData.guests) || 1;
    const females = Number(fullData.females) || 0;
    const males = Number(fullData.males) || 0;

    const checkInTime = fullData.checkInTime || "00:00";
    const checkOutTime = fullData.checkOutTime || "23:59";

    console.log("🕐 EXTRACTED TIMES:", { checkInTime, checkOutTime });

    const enquiryData = {
      name: body.guestName || "",
      email: body.guestEmail || "",
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
    const maxGuestRequestDays = Number(settings?.bookingDays?.guestMaxRequestDays || 5);

    if (enquiryStayDays > maxGuestRequestDays) {
      return res.status(400).json({
        success: false,
        message: `Guest enquiry cannot exceed ${maxGuestRequestDays} day(s)`,
      });
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

    if (process.env.ADMIN_NOTIFICATION_EMAIL) {
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
          timestamp: Date.now()
        });
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
    const enquiries = await Enquiry.find().sort({ createdAt: -1 }).lean();

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

    // ✅ Fetch hostel emails from database
    console.log("🔍 Looking up hostel:", hostel);
    const hostelDoc = await Hostel.findOne({ name: hostel }).lean();

    if (!hostelDoc) {
      return res.status(400).json({
        success: false,
        message: `Hostel not found in database: ${hostel}`
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
      hostel: hostel,
      roomNo: roomNo,
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

    const booking = await Booking.create(bookingData);

    // Update enquiry status
    enquiry.status = "approved";
    enquiry.approvedAt = new Date();
    enquiry.approvedBy = req.user?._id || null;
    await enquiry.save();

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
    
    res.status(500).json({ 
      success: false, 
      message: err.message,
      error: err.message
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
