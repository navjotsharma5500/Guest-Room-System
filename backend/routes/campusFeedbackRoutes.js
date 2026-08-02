import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getApprovedCampusFeedback,
  submitCampusFeedback,
} from "../controllers/campusFeedbackController.js";

const router = express.Router();

router.post("/", protect, submitCampusFeedback);
router.get("/public", getApprovedCampusFeedback);

export default router;
