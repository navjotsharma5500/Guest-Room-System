// controllers/enquiryController.js - COMPLETE FIXED VERSION WITH PROPER EMAIL HANDLING
import Enquiry from "../models/Enquiry.js";
import { sendEmail } from "../emails/sendEmail.js";
import EmailLog from "../models/EmailLog.js";
import enquiryNotification from "../emails/templates/enquiryNotification.js";
import guestEnquiryReceived from "../emails/templates/guestEnquiryReceived.js";
import enquiryApproved from "../emails/templates/enquiryApproved.js";

// ======================================================
// HELPER: SAFE EMAIL SENDING (NON-BLOCKING)
// ======================================================
const safeSend = (emailPayload) => {
  try {
    if (!emailPayload?.to || String(emailPayload.to).trim() === "") return;

    sendEmail(emailPayload)
      .then(() => {
        EmailLog.create({
          to: emailPayload.to,
          subject: emailPayload.subject,
          type: emailPayload.meta?.type,
          enquiryId: emailPayload.meta?.enquiryId,
          status: "sent",
        }).catch(() => {});
      })
      .catch((err) => {
        EmailLog.create({
          to: emailPayload.to,
          subject: emailPayload.subject,
          type: emailPayload.meta?.type,
          enquiryId: emailPayload.meta?.enquiryId,
          status: "failed",
          error: err.message,
        }).catch(() => {});
      });
  } catch (err) {
    console.error("⚠️ safeSend failed:", err.message);
  }
};

// ======================================================
//  CREATE ENQUIRY
// ======================================================
export const createEnquiry = async (req, res) => {
  try {
    console.log("📩 ========== ENQUIRY CREATE STARTED ==========");
    console.log("📦 RAW req.body:", JSON.stringify(req.body, null, 2));

    const body = req.body;
    
    // Parse fullData if it's stringified
    let fullData = body.fullData;
    
    if (typeof fullData === "string") {
      console.log("📄 fullData is STRING, parsing...");
      fullData = JSON.parse(fullData);
    }

    console.log("✅ fullData after parse:", fullData);

    // ✅ Extract file URLs
    const fileUrls = Array.isArray(fullData.files) ? fullData.files : [];
    console.log("📂 File URLs:", fileUrls);

    // ✅ Guest counts
    const guests = Number(fullData.guests) || 1;
    const females = Number(fullData.females) || 0;
    const males = Number(fullData.males) || 0;

    // ✅ CRITICAL FIX: Extract times with fallback
    const checkInTime = fullData.checkInTime || "00:00";
    const checkOutTime = fullData.checkOutTime || "23:59";

    console.log("🕐 EXTRACTED TIMES:", { checkInTime, checkOutTime });

    // ✅ CREATE ENQUIRY
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
      
      // ✅ DIRECT ASSIGNMENT
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

    console.log("📋 ENQUIRY DATA TO SAVE:", enquiryData);

    const enquiry = await Enquiry.create(enquiryData);

    console.log("✅ ========== ENQUIRY CREATED SUCCESSFULLY ==========");
    console.log("✅ Enquiry ID:", enquiry._id);
    console.log("✅ SAVED checkInTime:", enquiry.checkInTime);
    console.log("✅ SAVED checkOutTime:", enquiry.checkOutTime);

    // ======================================================
    // 📧 ENQUIRY EMAILS (NON-BLOCKING, PRODUCTION SAFE)
    // ======================================================

    // 🔔 Admin / Manager notification (MANDATORY, fully isolated)
    try {
      safeSend({
        to: process.env.ADMIN_NOTIFICATION_EMAIL,
        subject: "New Guest Enquiry Received",
        html: enquiryNotification(enquiry),
        meta: {
          type: "new-enquiry-admin",
          enquiryId: enquiry._id,
        },
      });
    } catch (err) {
      console.error("⚠️ Admin enquiry email template error:", err.message);
    }

    // 📩 Guest acknowledgement (fully isolated)
    try {
      safeSend({
        to: enquiry.email,
        subject: "We have received your enquiry",
        html: guestEnquiryReceived(enquiry),
        meta: {
          type: "guest-enquiry-received",
          enquiryId: enquiry._id,
        },
      });
    } catch (err) {
      console.error("⚠️ Guest enquiry email template error:", err.message);
    }

    console.log("📧 Enquiry emails dispatched (non-blocking)");

    // ✅ Return with explicit time fields
    const response = {
      success: true,
      enquiry: {
        ...enquiry.toJSON(),
        checkInTime: enquiry.checkInTime,
        checkOutTime: enquiry.checkOutTime,
      }
    };

    res.status(201).json(response);

    // ✅ EMIT SOCKET.IO EVENT
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
    
    // ✅ Ensure times are included
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

    // ✅ Ensure times are included
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
//  APPROVE ENQUIRY
// ======================================================
export const approveEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry) {
      return res.status(404).json({ success: false, message: "Enquiry not found" });
    }

    enquiry.status = "pending-approval";
    await enquiry.save();

    // ✅ Enquiry approved email (TEMPLATE-BASED)
    safeSend({
      to: enquiry.email,
      subject: "Guest Room Enquiry Approved",
      html: enquiryApproved(enquiry),
      meta: {
        type: "enquiry-approved",
        enquiryId: enquiry._id,
      },
    });

    console.log("✅ Enquiry approved:", {
      enquiryId: enquiry._id,
      name: enquiry.name,
      checkInTime: enquiry.checkInTime,
      checkOutTime: enquiry.checkOutTime,
    });

    // ✅ NON-BLOCKING EMAIL (fully isolated)
    try {
      safeSend({
        to: enquiry.email,
        subject: "Guest Room Booking Approved",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Your Enquiry Has Been Approved</h2>
            <p>Dear ${enquiry.name},</p>
            <p>We are pleased to inform you that your guest room enquiry has been approved.</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Check-in Time:</strong> ${enquiry.checkInTime}</p>
              <p style="margin: 5px 0;"><strong>Check-out Time:</strong> ${enquiry.checkOutTime}</p>
              <p style="margin: 5px 0;"><strong>Check-in Date:</strong> ${new Date(enquiry.from).toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Check-out Date:</strong> ${new Date(enquiry.to).toLocaleDateString()}</p>
            </div>
            <p>Please proceed with the next steps as communicated by the administration.</p>
            <p>Thank you!</p>
          </div>
        `,
        meta: {
          type: "enquiry-approved",
          enquiryId: enquiry._id,
        },
      });
    } catch (err) {
      console.error("⚠️ Approval email template error:", err.message);
    }

    res.json({ success: true, message: "Enquiry approved", enquiry });

    // ✅ EMIT SOCKET.IO EVENT
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('enquiry-approved', { 
        enquiry,
        timestamp: Date.now()
      });
      console.log('📡 Emitted enquiry-approved event');
    }

  } catch (error) {
    console.error("❌ Approve Enquiry Error:", error);
    res.status(500).json({ success: false, message: "Failed to approve enquiry" });
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

    // ✅ NON-BLOCKING EMAIL (fully isolated)
    try {
      safeSend({
        to: enquiry.email,
        subject: "Your Room Booking is Confirmed",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Room Booking Confirmed</h2>
            <p>Dear ${enquiry.name || 'Guest'},</p>
            <p>Your room booking has been confirmed!</p>
            <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Check-in Time:</strong> ${enquiry.checkInTime}</p>
              <p style="margin: 5px 0;"><strong>Check-out Time:</strong> ${enquiry.checkOutTime}</p>
              <p style="margin: 5px 0;"><strong>Check-in Date:</strong> ${new Date(enquiry.from).toLocaleDateString()}</p>
              <p style="margin: 5px 0;"><strong>Check-out Date:</strong> ${new Date(enquiry.to).toLocaleDateString()}</p>
            </div>
            <p>Please arrive at the specified check-in time with valid identification.</p>
            <p>Thank you for choosing our guest house!</p>
          </div>
        `,
        meta: {
          type: "enquiry-booked",
          enquiryId: enquiry._id,
        },
      });
    } catch (err) {
      console.error("⚠️ Booking confirmation email template error:", err.message);
    }

    res.json({ success: true, message: "Enquiry fully booked", enquiry });

    // ✅ EMIT SOCKET.IO EVENT
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

    // ✅ NON-BLOCKING EMAIL (fully isolated)
    try {
      safeSend({
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
      });
    } catch (err) {
      console.error("⚠️ Rejection email template error:", err.message);
    }

    res.json({ success: true, message: "Enquiry rejected", enquiry });

    // ✅ EMIT SOCKET.IO EVENT
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
