// backend/routes/dashboardRoutes.js

import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// GET /api/dashboard/stats
router.get("/stats", protect, getDashboardStats);

// MUST EXPORT DEFAULT FOR ESM
export default router;
