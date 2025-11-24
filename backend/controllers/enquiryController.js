import Enquiry from "../models/Enquiry.js";
import { createLog } from "../middleware/logMiddleware.js";
import { sendEnquiryEmail } from "../emails/enquiryEmail.js";

// ================================
// CREATE ENQUIRY (Supports File Uploads via Multer)
// ================================
export const createEnquiry = async (req, res) => {
  console.log("BODY RECEIVED:", req.body);

  try {
    let {
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
      department,
    } = req.body;

    // Clean undefined / empty strings from mobile browsers
    from = from?.trim() || null;
    to = to?.trim() || null;

    // Safari/mobile fix: convert ISO strings → YYYY-MM-DD
    if (from && from.includes("T")) {
      from = from.split("T")[0];
    }
    if (to && to.includes("T")) {
      to = to.split("T")[0];
    }

    // Required fields (looser validation to avoid 400 issues)
    if (!name || !email || !contact) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Convert uploaded files to base64
    const uploadedFiles =
      req.files?.map((file) => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        data: file.buffer.toString("base64"),
      })) || [];

    // Save enquiry
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
      files: uploadedFiles,
      department,
      status: "pending",
    });

    createLog("enquiry_created", null, { enquiryId: enquiry._id });

    // Optional email
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
