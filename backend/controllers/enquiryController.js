import Enquiry from "../models/Enquiry.js";
import { createLog } from "../middleware/logMiddleware.js";
import { sendEnquiryEmail } from "../emails/enquiryEmail.js";

// ================================
// CREATE ENQUIRY (Frontend → Backend Mapping)
// ================================
export const createEnquiry = async (req, res) => {
  try {
    const {
      name,
      rollno,
      contact,
      email,
      gender,
      from,
      to,
      guests,
      females,
      males,
      state,
      city,
      reference,
      purpose,
      files,
      department,
    } = req.body;

    if (!name || !email || !contact || !from || !to) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const enquiry = await Enquiry.create({
      name,
      rollno,
      contact,
      email,
      gender,
      from,
      to,
      guests,
      females,
      males,
      state,
      city,
      reference,
      purpose,
      files,
      department,
      status: "pending",
    });

    createLog("enquiry_created", null, { enquiryId: enquiry._id });

    // Optional email function — keep if configured
    try {
      await sendEnquiryEmail(email, enquiry);
    } catch (emailErr) {
      console.warn("Email not sent:", emailErr.message);
    }

    res.json({
      message: "Enquiry submitted successfully",
      enquiry,
    });

  } catch (err) {
    console.error("Enquiry Error:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

// ================================
// APPROVE ENQUIRY
// ================================
export const approveEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ message: "Not found" });

    enquiry.status = "approved";
    await enquiry.save();

    res.json({ message: "Enquiry approved", enquiry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================
// REJECT ENQUIRY
// ================================
export const rejectEnquiry = async (req, res) => {
  try {
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ message: "Not found" });

    enquiry.status = "rejected";
    await enquiry.save();

    res.json({ message: "Enquiry rejected", enquiry });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ================================
// GET ALL ENQUIRIES
// ================================
export const getEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
