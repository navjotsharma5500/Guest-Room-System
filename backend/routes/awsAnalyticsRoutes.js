// routes/awsAnalyticsRoutes.js
// AWS infrastructure analytics — GET /api/analytics/aws
// Mirrors auth pattern from analyticsRoutes.js (admin only)

import express from "express";
import { protect }         from "../middleware/authMiddleware.js";
import { authorizeRoles }  from "../middleware/roleMiddleware.js";
import { getAWSAnalytics } from "../services/awsAnalytics.js";

const router = express.Router();

// GET /api/analytics/aws
// Admin only — returns EC2 CPU, network, status, and month-to-date cost
router.get("/aws", protect, authorizeRoles("admin"), async (req, res) => {
  try {
    const data = await getAWSAnalytics();
    return res.json(data);
  } catch (err) {
    console.error("AWS Analytics error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

export default router;
