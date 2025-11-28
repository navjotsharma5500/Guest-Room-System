// controllers/enquiryController.js

import Enquiry from "../models/Enquiry.js";
import { createLog } from "../middleware/logMiddleware.js";
import { sendEmail } from "../emails/sendEmail.js";
import enquiryNotification from "../emails/templates/enquiryNotification.js";

/* ======================================================
   CREATE ENQUIRY
====================================================== */
export const createEnquiry = async (req, res) => {
  try {
    const {
      guestName,
      guestEmail,
      guestPhone,
      message,
      fullData = {}
    } = req.body;

    // Save enquiry in database
    const enquiry = await Enquiry.create({
      name: guestName,
      email: guestEmail,
      contact: guestPhone,
      purpose: message,
      ...fullData,
      status: "pending",
    });

    // Log action
    createLog("enquiry_created", req.user?._id || null, {
      enquiryId: enquiry._id,
    });

    // Send email to Admin
    await sendEmail({
      to: "admin@thapar.edu",
      subject: "New Guest Room Enquiry",
      html: enquiryNotification(enquiry),
    });

    // Send email to Manager
    await sendEmail({
      to: "manager@thapar.edu",
      subject: "New Guest Room Enquiry",
      html: enquiryNotification(enquiry),
    });

    res.json({ message: "Enquiry submitted", enquiry });
  } catch (err) {
    console.error("ENQUIRY ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};


/* ======================================================
   APPROVE ENQUIRY
====================================================== */
export const approveEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry)
      return res.status(404).json({ message: "Enquiry not found" });

    enquiry.status = "approved";
    await enquiry.save();

    createLog("enquiry_approved", req.user?._id, {
      enquiryId: enquiry._id,
    });

    res.json({ message: "Enquiry approved", enquiry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* ======================================================
   REJECT ENQUIRY
====================================================== */
export const rejectEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);

    if (!enquiry)
      return res.status(404).json({ message: "Enquiry not found" });

    enquiry.status = "rejected";
    await enquiry.save();

    createLog("enquiry_rejected", req.user?._id, {
      enquiryId: enquiry._id,
    });

    res.json({ message: "Enquiry rejected", enquiry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* ======================================================
   GET ALL ENQUIRIES (admin panel)
====================================================== */
export const getEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


/* ======================================================
   FINAL EXPORTS (Required by enquiryRoutes.js)
====================================================== */
export default {
  createEnquiry,
  approveEnquiry,
  rejectEnquiry,
  getEnquiries
};
