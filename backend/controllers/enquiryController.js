import Enquiry from "../models/Enquiry.js";
import { createLog } from "../middleware/logMiddleware.js";
import { sendEnquiryEmail } from "../emails/enquiryEmail.js";

// ================================
// CREATE ENQUIRY
// ================================
export const createEnquiry = async (req, res) => {
  try {
    const { guestName, guestEmail, guestPhone, message, preferredDate } = req.body;

    if (!guestName || !guestEmail || !guestPhone) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const enquiry = await Enquiry.create({
      guestName,
      guestEmail,
      guestPhone,
      message,
      preferredDate,
    });

    // Log the action
    createLog("enquiry_created", null, { enquiryId: enquiry._id });

    // Send confirmation email
    await sendEnquiryEmail(guestEmail, enquiry);

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
// GET ALL ENQUIRIES (ADMIN)
// ================================
export const getEnquiries = async (req, res) => {
  try {
    const enquiries = await Enquiry.find().sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
