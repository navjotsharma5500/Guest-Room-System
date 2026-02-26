//routes/paymentRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  processPayment,
  getPaymentHistory,
  downloadBillPDF,
  processWaiver,
  getWaivedBills,
} from "../controllers/paymentController.js";

const router = express.Router();

// 💳 SINGLE payment entry point
router.post("/bookings/:id/payment", protect, processPayment);

// 📊 History
router.get("/bookings/:id/payment-history", protect, getPaymentHistory);

// 🧾 PDF
router.get("/bills/:billId/pdf", downloadBillPDF);

// 💸 WAIVER (Admin + Manager only)
router.post("/bookings/:id/waiver", protect, processWaiver);

// 📋 All waived bills
router.get("/waived-bills", protect, getWaivedBills);

export default router;