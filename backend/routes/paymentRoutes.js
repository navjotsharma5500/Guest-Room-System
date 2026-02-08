import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  processPayment,
  getPaymentHistory,
  downloadBillPDF,
} from "../controllers/paymentController.js";

const router = express.Router();

// 💳 SINGLE payment entry point
router.post("/bookings/:id/payment", protect, processPayment);

// 📊 History
router.get("/bookings/:id/payment-history", protect, getPaymentHistory);

// 🧾 PDF
router.get("/bills/:billId/pdf", downloadBillPDF);

export default router;
