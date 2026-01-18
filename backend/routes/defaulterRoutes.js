// backend/routes/defaulterRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getDefaulters, checkGuestHistory } from "../controllers/defaulterController.js";

const router = express.Router();

// Get all defaulters (role-based)
router.get("/", protect, getDefaulters);

// Check guest history for pending bills
router.get("/check-history", protect, checkGuestHistory);

// Check Stats
router.get("/stats", protect, getDefaulterStats);

export default router;