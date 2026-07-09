import express from "express";
import {
  createEnquiry,
  getAllEnquiries,
  getEnquiryById,
  updateEnquirySchedule,
  checkEnquiryRoomAvailability,
  approveEnquiry,
  rejectEnquiry,
  bookEnquiry,
} from "../controllers/enquiryController.js";
import { protect } from "../middleware/authMiddleware.js";
import { verifyBookingExists } from "../middleware/bookingSafetyMiddleware.js";

const router = express.Router();

// PUBLIC
router.post("/create", createEnquiry);

// ADMIN
router.get("/", protect, getAllEnquiries);
router.get("/:id", protect, getEnquiryById);
router.get("/:id/availability", protect, checkEnquiryRoomAvailability);
router.patch("/:id/schedule", protect, updateEnquirySchedule);

router.put("/:id/approved", protect, approveEnquiry);
router.put("/:id/rejected", protect, rejectEnquiry);
router.put("/:id/booked", protect, bookEnquiry);

router.put("/:id/booked", protect, verifyBookingExists, async (req, res) => {
  try {
    const { id } = req.params;

    console.log("================================================================================");
    console.log("🎯 Marking enquiry as BOOKED");
    console.log("📋 Enquiry ID:", id);
    console.log("================================================================================");

    const enquiry = await Enquiry.findById(id);

    if (!enquiry) {
      console.error("❌ Enquiry not found:", id);
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    // ✅ Double-check booking exists (belt and suspenders approach)
    const bookings = await Booking.find({ enquiryId: id });
    
    if (!bookings || bookings.length === 0) {
      console.error("================================================================================");
      console.error("❌ CRITICAL SAFETY CHECK FAILED");
      console.error("📋 Enquiry ID:", id);
      console.error("👤 Guest:", enquiry.name);
      console.error("📧 Email:", enquiry.email);
      console.error("⚠️ Attempted to mark as booked without booking record");
      console.error("================================================================================");
      
      return res.status(400).json({
        success: false,
        message: "Cannot mark as booked - booking record not found",
        code: "BOOKING_VERIFICATION_FAILED",
        enquiry: {
          id: enquiry._id,
          name: enquiry.name,
          email: enquiry.email
        }
      });
    }

    // Update enquiry status
    const oldStatus = enquiry.status;
    enquiry.status = "booked";
    await enquiry.save();

    console.log("================================================================================");
    console.log("✅ Enquiry marked as BOOKED successfully");
    console.log("📋 Enquiry ID:", id);
    console.log("👤 Guest:", enquiry.name);
    console.log("🏨 Bookings found:", bookings.length);
    bookings.forEach((b, i) => {
      console.log(`   ${i + 1}. ${b.hostel} - Room ${b.roomNo} (${b._id})`);
    });
    console.log("🔄 Status change:", oldStatus, "→", enquiry.status);
    console.log("================================================================================");

    res.json({
      success: true,
      message: "Enquiry status updated to booked",
      enquiry,
      bookings: bookings.map(b => ({
        _id: b._id,
        guest: b.guest,
        hostel: b.hostel,
        roomNo: b.roomNo,
        from: b.from,
        to: b.to
      }))
    });

  } catch (error) {
    console.error("================================================================================");
    console.error("❌ Error marking enquiry as booked:", error);
    console.error("Stack:", error.stack);
    console.error("================================================================================");
    
    res.status(500).json({
      success: false,
      message: "Failed to update enquiry status",
      error: error.message
    });
  }
});

export default router;
