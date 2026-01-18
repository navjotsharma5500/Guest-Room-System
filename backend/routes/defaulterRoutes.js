// backend/routes/defaulterRoutes.js
import express from "express";
import { 
  getDefaulters, 
  checkGuestHistory, 
  getDefaulterStats,
  resolveDefaulter,
  rollbackPayment 
} from "../controllers/defaulterController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorizeRoles } from "../middleware/roleMiddleware.js";

const router = express.Router();

// Get all defaulters (admin, warden, caretaker)
router.get(
  "/", 
  protect, 
  authorizeRoles("admin", "warden", "caretaker"), 
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
  authorizeRoles("admin", "warden", "caretaker"), 
  getDefaulterStats
);

// Resolve defaulter (record payment) - admin and caretaker
router.patch(
  "/:id/resolve", 
  protect, 
  authorizeRoles("admin", "caretaker"), 
  resolveDefaulter
);

// Rollback payment - admin and caretaker
router.post(
  "/:id/rollback", 
  protect, 
  authorizeRoles("admin", "caretaker"), 
  rollbackPayment
);

export default router;