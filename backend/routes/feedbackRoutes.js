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

// Added /caretaker prefix routes
router.post("/caretaker/submit", protect, submitFeedback);
router.get("/caretaker/list", protect, getAllFeedbacks);

// Original routes (keep for backward compatibility)
router.post("/", protect, submitFeedback);
router.get("/", protect, getAllFeedbacks);
router.get("/stats", protect, getFeedbackStats);
router.get("/booking/:bookingId", protect, getFeedbackByBooking);
router.delete("/:id", protect, deleteFeedback);

export default router;