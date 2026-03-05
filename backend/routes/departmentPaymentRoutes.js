import express from "express";
import Booking from "../models/Booking.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get all pending department payments
router.get(
  "/", 
  protect, 
  authorizeRoles("admin", "manager", "caretaker", "warden", "co_warden", "adosa"), // ✅ Added co_warden
  async (req, res) => {
    try {
      const userRole = req.user.role;
      const assignedHostel = req.user.assignedHostel || req.user.hostel;

      let query = {
        paymentResponsibility: "DEPARTMENT",
        paymentStatus: { $in: ["UNPAID", "PARTIALLY_PAID"] },
        status: "checked_out"
      };

      // âœ… CRITICAL: Role-based filtering
      // Caretakers and wardens only see their assigned hostel
      if ((userRole === "caretaker" || userRole === "warden") && assignedHostel) {
        query.hostel = assignedHostel;
        console.log(`ðŸ”’ ${userRole} restricted to hostel: ${assignedHostel}`);
      }

      const pendingPayments = await Booking.find(query)
        .populate("createdBy", "name email")
        .select('+totalAmount +paidAmount +balanceAmount +discount') // âœ… Ensure all payment fields are returned
        .sort({ checkedOutAt: -1 })
        .lean();

      // âœ… DEBUG: Log first booking to verify data structure
      if (pendingPayments.length > 0) {
        console.log("ðŸ“‹ Sample department payment data:", {
          _id: pendingPayments[0]._id,
          guest: pendingPayments[0].guest,
          totalAmount: pendingPayments[0].totalAmount,
          paidAmount: pendingPayments[0].paidAmount,
          balanceAmount: pendingPayments[0].balanceAmount,
          discount: pendingPayments[0].discount
        });
      }

      const stats = {
        total: pendingPayments.length,
        totalAmount: pendingPayments.reduce((sum, b) => sum + (b.balanceAmount || 0), 0)
      };

      console.log(`âœ… Returning ${pendingPayments.length} department payments for ${userRole}`);

      res.json({
        success: true,
        count: pendingPayments.length,
        stats,
        data: pendingPayments
      });
    } catch (error) {
      console.error("âŒ Error fetching department payments:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch pending department payments",
        error: error.message
      });
    }
  }
);

export default router;