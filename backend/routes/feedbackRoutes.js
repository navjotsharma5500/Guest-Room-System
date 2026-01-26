// routes/feedbackRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  submitFeedback,
  getAllFeedbacks,
  getFeedbackByBooking,
  deleteFeedback,
  getFeedbackStats,
} from "../controllers/feedbackController.js";

const router = express.Router();

// Submit or update feedback
router.post("/", protect, submitFeedback);

// Get all feedbacks (with filters & pagination)
router.get("/", protect, getAllFeedbacks);

// Get feedback statistics
router.get("/stats", protect, getFeedbackStats);

// Get feedback for a specific booking
router.get("/booking/:bookingId", protect, getFeedbackByBooking);

// Delete feedback (admin only)
router.delete("/:id", protect, deleteFeedback);

export default router;