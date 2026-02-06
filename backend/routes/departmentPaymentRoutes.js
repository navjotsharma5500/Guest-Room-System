import express from "express";
import Booking from "../models/Booking.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get all pending department payments
router.get(
  "/", 
  protect, 
  authorizeRoles("admin", "manager", "caretaker", "warden"),
  async (req, res) => {
    try {
      const userRole = req.user.role;
      const assignedHostel = req.user.assignedHostel || req.user.hostel;

      let query = {
        paymentResponsibility: "DEPARTMENT",
        paymentStatus: { $in: ["UNPAID", "PARTIALLY_PAID"] },
        status: "checked_out"
      };

      // ✅ CRITICAL: Role-based filtering
      // Caretakers and wardens only see their assigned hostel
      if ((userRole === "caretaker" || userRole === "warden") && assignedHostel) {
        query.hostel = assignedHostel;
        console.log(`🔒 ${userRole} restricted to hostel: ${assignedHostel}`);
      }

      const pendingPayments = await Booking.find(query)
        .populate("createdBy", "name email")
        .sort({ checkedOutAt: -1 })
        .lean();

      const stats = {
        total: pendingPayments.length,
        totalAmount: pendingPayments.reduce((sum, b) => sum + (b.balanceAmount || 0), 0)
      };

      console.log(`✅ Returning ${pendingPayments.length} department payments for ${userRole}`);

      res.json({
        success: true,
        count: pendingPayments.length,
        stats,
        data: pendingPayments
      });
    } catch (error) {
      console.error("❌ Error fetching department payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch pending department payments",
        error: error.message
      });
    }
  }
);

export default router;