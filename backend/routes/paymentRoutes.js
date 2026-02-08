// routes/paymentRoutes.js
// REPLACE the entire file with this:

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Booking from "../models/Booking.js";
import {
  processPayment,
  getPaymentHistory,
  downloadBillPDF,
  recalculatePaymentStatus, // ✅ Import from controller (single source of truth)
} from "../controllers/paymentController.js";

console.log("✅ Payment routes loaded");
console.log("✅ Payment history route registered");

const router = express.Router();

// 💳 Process Payment (Full / Partial)
router.post("/bookings/:id/payment", protect, processPayment);

// 📊 Get Payment History
router.get("/bookings/:id/payment-history", protect, getPaymentHistory);

// 🧾 Download Bill PDF - NO protect middleware, CORS handled by global middleware
router.get("/bills/:billId/pdf", downloadBillPDF);

// ============================================
// ⚠️ REMOVED: PUT /:id/payment route
// ============================================
// ALL payment processing MUST go through:
// POST /bookings/:id/payment → processPayment() in paymentController.js
//
// This ensures:
// - Single source of truth for payment logic
// - Bill generation
// - PDF creation
// - Proper validation (FULL vs PARTIAL)
// - No duplicate payment bugs
// ============================================

export default router;