// routes/paymentRoutes.js
// REPLACE the entire file with this:

import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Booking from "../models/Booking.js"; // ← ADD THIS
import {
  processPayment,
  getPaymentHistory,
  downloadBillPDF,
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

// =============================================================
// PAYMENT UPDATE - ✅ FIXED: Only updates paymentAttachments
// =============================================================
router.put("/:id/payment", protect, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      amountPaid,
      paymentMethod,
      transactionId,
      transactionDate,
      paymentRemarks,
      paymentAttachments, // ✅ This field
      discount,
      discountPercent,
      paymentType, // "FULL" or "PARTIAL"
    } = req.body;

    console.log("💳 Processing payment for booking:", id);
    console.log("📎 Payment attachments:", paymentAttachments?.length || 0);

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found" 
      });
    }

    // Calculate new amounts
    const discountAmount = discount || 0;
    const totalAmount = booking.totalAmount || 0;
    const currentPaid = booking.paidAmount || 0;
    const newPaidAmount = currentPaid + Number(amountPaid || 0);
    const newBalance = Math.max(0, totalAmount - discountAmount - newPaidAmount);

    // Update payment fields
    booking.paidAmount = newPaidAmount;
    booking.balanceAmount = newBalance;
    booking.discount = discountAmount;

    // Determine payment status
    if (newBalance === 0) {
      booking.paymentStatus = "PAID";
    } else if (newPaidAmount > 0) {
      booking.paymentStatus = "PARTIALLY_PAID";
    }

    // Update payment details
    if (paymentMethod) booking.paymentMode = paymentMethod;
    if (transactionId) booking.transactionId = transactionId;
    if (transactionDate) booking.transactionDate = new Date(transactionDate);
    if (paymentRemarks) booking.paymentRemarks = paymentRemarks;

    // ✅ CRITICAL: Append payment attachments (don't overwrite)
    if (Array.isArray(paymentAttachments) && paymentAttachments.length > 0) {
      const currentPayments = Array.isArray(booking.paymentAttachments) 
        ? booking.paymentAttachments 
        : [];
      booking.paymentAttachments = [...currentPayments, ...paymentAttachments];
      
      console.log("✅ Added payment attachments:", {
        previous: currentPayments.length,
        new: paymentAttachments.length,
        total: booking.paymentAttachments.length
      });
    }

    await booking.save();

    console.log("✅ Payment processed successfully:", {
      bookingId: booking._id,
      paidAmount: booking.paidAmount,
      balanceAmount: booking.balanceAmount,
      paymentStatus: booking.paymentStatus,
      paymentAttachments: booking.paymentAttachments.length,
    });

    res.json({
      success: true,
      message: "Payment processed successfully",
      booking,
    });

    // ✅ Socket.IO event
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('payment-updated', { 
        bookingId: id,
        timestamp: Date.now()
      });
      console.log('📡 Emitted payment-updated event');
    }

  } catch (error) {
    console.error("❌ Payment update error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to process payment",
      error: error.message 
    });
  }
});

export default router;