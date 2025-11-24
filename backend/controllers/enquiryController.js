import Enquiry from "../models/Enquiry.js";
import { createLog } from "../middleware/logMiddleware.js";
import { sendEnquiryEmail } from "../emails/enquiryEmail.js";

// ================================
// CREATE ENQUIRY (Front-end compatible + file upload support)
// ================================
export const createEnquiry = async (req, res) => {
  console.log("BODY RECEIVED:", req.body);

  try {
    // FRONTEND sends:
    // guestName, guestEmail, guestPhone, message, preferredDate, fullData{...}

    const {
      guestName,
      guestEmail,
      guestPhone,
      message,
      preferredDate,
      fullData = {},
    } = req.body;

    // Extract inside fullData object
    const {
      rollno,
      department,
      gender,
      from,
      to,
      guests,
      females,
      males,
      state,
      city,
      reference,
      files, // base64 array
    } = fullData;

    // ===============================
    //  HANDLE FILES  (Base64 + Multer)
    // ===============================

    // 1️⃣ Base64 files (coming from mobile browser upload)
    let uploadedFiles = [];
    if (Array.isArray(files)) {
      uploadedFiles = files.map((fileString, idx) => ({
        originalName: `uploaded_file_${idx + 1}.pdf`,
        mimeType: "application/pdf",
        data: fileString.replace(/^data:.*;base64,/, ""),
        size: Buffer.byteLength(
          fileString.replace(/^data:.*;base64,/, ""),
          "base64"
        ),
      }));
    }

    // 2️⃣ Multer files (if browser supports multipart)
    if (req.files?.length > 0) {
      req.files.forEach((file) => {
        uploadedFiles.push({
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          data: file.buffer.toString("base64"),
        });
      });
    }

    // ===============================
    // Validation
    // ===============================
    if (!guestName || !guestEmail || !guestPhone || !from || !to) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // ===============================
    // SAVE ENQUIRY INTO DATABASE
    // ===============================
    const enquiry = await Enquiry.create({
      name: guestName,
      rollno: rollno || null,
      contact: guestPhone,
      email: guestEmail,
      gender,
      from,
      to,
      guests,
      females,
      males,
      state,
      city,
      reference,
      purpose: message,
      department,
      files: uploadedFiles,
      preferredDate,
      status: "pending",
    });

    createLog("enquiry_created", null, { enquiryId: enquiry._id });

    // ===============================
    // OPTIONAL EMAIL
    // ===============================
    try {
      await sendEnquiryEmail(guestEmail, enquiry);
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
