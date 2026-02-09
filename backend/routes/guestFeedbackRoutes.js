// routes/guestFeedbackRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  submitGuestFeedback,
  getAllGuestFeedbacks,
  getGuestFeedbackById,
  updateGuestFeedbackStatus,
  deleteGuestFeedback,
  getGuestFeedbackStats,
} from "../controllers/guestFeedbackController.js";

const router = express.Router();

// Public route - Submit guest feedback (no authentication required)
router.post("/submit", submitGuestFeedback);

// Protected routes (require authentication)
router.get("/", protect, getAllGuestFeedbacks);
router.get("/stats", protect, getGuestFeedbackStats);
router.get("/:id", protect, getGuestFeedbackById);
router.patch("/:id/status", protect, updateGuestFeedbackStatus);
router.delete("/:id", protect, deleteGuestFeedback);

export default router;