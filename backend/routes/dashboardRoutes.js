import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/dashboard/stats
router.get("/stats", protect, getDashboardStats);

// 🚀 VERY IMPORTANT
// MUST EXPORT DEFAULT IN ESM
export default router;
