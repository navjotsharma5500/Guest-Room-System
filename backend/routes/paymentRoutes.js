//routes/paymentRoutes.js
import express from "express";
import { authorizeRoles } from "../middleware/roleMiddleware.js";
import { protect } from "../middleware/authMiddleware.js";
import { auditBookingAction } from "../middleware/logMiddleware.js";
import {
  processPayment,
  createAdminBill,
  getPaymentHistory,
  downloadBillPDF,
  processWaiver,
  getWaivedBills,
  getCancelledBills,
} from "../controllers/paymentController.js";

const router = express.Router();

// 💳 SINGLE payment entry point
router.post("/bookings/:id/payment", protect, auditBookingAction("PAYMENT_UPDATED", "processPayment"), processPayment);

router.post("/bookings/:id/admin-bill", protect, authorizeRoles("admin"), createAdminBill);

// 📊 History
router.get("/bookings/:id/payment-history", protect, getPaymentHistory);

// 🧾 PDF
router.get("/bills/:billId/pdf", downloadBillPDF);

// 💸 WAIVER (Admin + Manager only)
router.post("/bookings/:id/waiver", protect, auditBookingAction("PAYMENT_WAIVED", "processWaiver"), processWaiver);

// 📋 All waived bills
router.get("/waived-bills", protect, getWaivedBills);

// 📋 All cancelled bills
router.get("/cancelled-bills", protect, getCancelledBills);

export default router;
