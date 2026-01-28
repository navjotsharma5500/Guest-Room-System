// backend/routes/emailStatsRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getEmailStats, resetEmailCounters } from "../emails/sendEmail.js";

const router = express.Router();

// ✅ Get Email Sending Statistics
router.get("/stats", protect, async (req, res) => {
  try {
    // Only allow admin/manager to view stats
    if (!["admin", "manager"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Admin or manager access required"
      });
    }

    const stats = getEmailStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Get email stats error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch email stats",
      error: err.message
    });
  }
});

// ✅ Reset Email Counters (Admin only, for testing)
router.post("/reset-counters", protect, async (req, res) => {
  try {
    // Only allow admin to reset
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required"
      });
    }

    resetEmailCounters();
    
    console.log(`🔄 Email counters reset by ${req.user.email}`);
    
    res.json({
      success: true,
      message: "Email counters reset successfully",
      resetBy: req.user.email,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("❌ Reset counters error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to reset counters",
      error: err.message
    });
  }
});

export default router;