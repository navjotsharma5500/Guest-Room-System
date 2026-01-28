// backend/routes/defaulterRoutes.js
import express from "express";
import { 
  getDefaulters, 
  checkGuestHistory, 
  getDefaulterStats,
  resolveDefaulter,
  rollbackPayment,
  sendBulkPaymentReminders
} from "../controllers/defaulterController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get all defaulters (admin, warden, caretaker)
router.get(
  "/", 
  protect, 
  authorizeRoles("admin", "manager", "caretaker"), 
  getDefaulters
);

// Check guest history before check-in (all authenticated users)
router.get(
  "/check-history", 
  protect, 
  checkGuestHistory
);

// Get defaulter statistics (admin, warden, caretaker)
router.get(
  "/stats", 
  protect, 
  authorizeRoles("admin", "manager", "caretaker"), 
  getDefaulterStats
);

// Resolve defaulter (record payment) - admin and caretaker
router.patch(
  "/:id/resolve", 
  protect, 
  authorizeRoles("admin", "manager", "caretaker"), 
  resolveDefaulter
);

// Rollback payment - admin and caretaker
router.post(
  "/:id/rollback", 
  protect, 
  authorizeRoles("admin", "manager"), 
  rollbackPayment
);

// Send bulk payment reminders
router.post(
  "/bulk-email",
  protect,
  authorizeRoles("admin", "manager", "caretaker"),
  sendBulkPaymentReminders
);

export default router;