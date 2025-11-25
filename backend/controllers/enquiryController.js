import Enquiry from "../models/Enquiry.js";
import { createLog } from "../middleware/logMiddleware.js";
import { sendEnquiryEmail } from "../emails/enquiryEmail.js";

// ===================================================================
// CREATE ENQUIRY (Frontend Compatible + Matches Database Schema)
// ===================================================================
export const createEnquiry = async (req, res) => {
  console.log("BODY RECEIVED:", req.body);

  try {
    const {
      guestName,
      guestEmail,
      guestPhone,
      message,
      preferredDate,
      fullData = {},
    } = req.body;

    // Extract nested fields
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
      files = [], // base64 array from mobile
    } = fullData;

    // ---------------------------
    // Build base64 file objects
    // ---------------------------
    let uploadedFiles = [];

    if (Array.isArray(files)) {
      uploadedFiles = files.map((f) =>
        f.replace(/^data:.*;base64,/, "")
      );
    }

    // ---------------------------
    // Save to Mongo EXACTLY as schema wants
    // -----------------------------
    const enquiry = await Enquiry.create({
      guestName,
      guestEmail,
      guestPhone,
      message,
      preferredDate,

      fullData: {
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
        files: uploadedFiles,
      },

      status: "pending",
    });

    createLog("enquiry_created", null, { enquiryId: enquiry._id });

    try {
      await sendEnquiryEmail(guestEmail, enquiry);
    } catch (err) {
      console.warn("Email not sent:", err.message);
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

// ===================================================================
// APPROVE ENQUIRY
// ===================================================================
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

// ===================================================================
// REJECT ENQUIRY
// ===================================================================
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

// ===================================================================
// GET ALL ENQUIRIES
// ===================================================================
export const getEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });

    const processed = enquiries.map((e) => {
      const fixedFiles = (e.fullData?.files || []).map((file) => {
        // Detect JPEG (base64 starts with /9j/)
        if (file.startsWith("/9j/")) {
          return `data:image/jpeg;base64,${file}`;
        }

        // Detect PNG (base64 starts with iVBOR)
        if (file.startsWith("iVBOR")) {
          return `data:image/png;base64,${file}`;
        }

        // Default → PDF
        return `data:application/pdf;base64,${file}`;
      });

      return {
        ...e._doc,
        fullData: {
          ...e.fullData,
          files: fixedFiles,
        },
      };
    });

    res.json(processed);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


