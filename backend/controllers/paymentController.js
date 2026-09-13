import { resumeAdminBill } from "../utils/adminBillRecovery.js";
import AdminBillOperation from "../models/AdminBillOperation.js";
import mongoose from "mongoose";
import crypto from "crypto";
import { createAuditEvent, bookingAuditFields } from "../middleware/logMiddleware.js";
// controllers/paymentController.js - COMPLETE FIXED VERSION
import Booking from "../models/Booking.js";
import Bill from "../models/Bill.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { generateBill } from "../utils/billGenerator.js";
import { resolveBillStayPeriod } from "../utils/billingDates.js";
import FormData from 'form-data';
import fetch from 'node-fetch';
console.log("🔥 PAYMENT CONTROLLER LOADED");
console.log("✅ Booking model imported:", typeof Booking !== 'undefined');
console.log("✅ Bill model imported:", typeof Bill !== 'undefined');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BILLS_DIR = path.join(process.cwd(), "bills");

if (!fs.existsSync(BILLS_DIR)) {
  fs.mkdirSync(BILLS_DIR, { recursive: true });
}

const hostelScopedBillQuery = (user, baseQuery = {}) => {
  const role = String(user?.role || "").toLowerCase();
  const hostel = user?.assignedHostel || user?.hostel;

  if (role === "caretaker" || role === "warden") {
    if (!hostel) {
      return { ...baseQuery, _id: { $exists: false } };
    }

    return {
      ...baseQuery,
      hostel,
    };
  }

  return baseQuery;
};

// ============================================
// 🔥 SINGLE SOURCE OF TRUTH – PAYMENT STATUS
// ============================================
export const recalculatePaymentStatus = (booking) => {
  const totalAmount = Number(booking.totalAmount) || 0;
  const paidAmount = Number(booking.paidAmount) || 0;
  const discount = Number(booking.discount) || 0;

  booking.balanceAmount = Math.max(0, totalAmount - paidAmount - discount);

  if (booking.balanceAmount <= 0) {
    booking.paymentStatus = "PAID";
  } else if (paidAmount > 0) {
    booking.paymentStatus = "PARTIALLY_PAID";
  } else {
    booking.paymentStatus = "UNPAID";
  }

  return booking;
};
 
// ✅ Generate unique bill number (single source of truth)
export const generateBillNumber = async () => {
  const prefix = "BILL";
  const date = new Date();

  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const count = await Bill.countDocuments({
    createdAt: { $gte: startOfDay, $lte: endOfDay },
  });

  const sequence = String(count + 1).padStart(4, "0");

  return `${prefix}-${year}${month}${day}-${sequence}`;
};

// ============================================
// Upload PDF buffer to ImageKit
// ============================================
const uploadPDFToImageKit = async (pdfBuffer, fileName, folder = 'billpdf') => {
  try {
    const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY;
    const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY;
    const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT;

    if (!IMAGEKIT_PRIVATE_KEY || !IMAGEKIT_PUBLIC_KEY || !IMAGEKIT_URL_ENDPOINT) {
      throw new Error("ImageKit credentials missing in environment variables");
    }

    // Create form data
    const formData = new FormData();
    formData.append('file', pdfBuffer, {
      filename: fileName,
      contentType: 'application/pdf'
    });
    formData.append('fileName', fileName);
    formData.append('folder', folder);
    formData.append('useUniqueFileName', 'false'); // Keep original filename

    // Create authentication header
    const authHeader = 'Basic ' + Buffer.from(IMAGEKIT_PRIVATE_KEY + ':').toString('base64');

    // ✅ FIXED: Upload to ImageKit using the correct fixed URL
    const uploadUrl = 'https://upload.imagekit.io/api/v1/files/upload';
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        ...formData.getHeaders(),
        'Authorization': authHeader
      },
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'ImageKit upload failed');
    }

    return {
      success: true,
      url: data.url,
      fileId: data.fileId,
      filePath: data.filePath
    };

  } catch (error) {
    console.error("ImageKit upload error:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Shared receipt rendering/upload path for normal and admin payments.
const saveBillPDF = async (booking, bill, { session, strict = false } = {}) => {
  try {
    console.log("📄 Generating PDF bill...");

    const pdfBuffer = await generateBill(booking, {
      billNumber: bill.billNumber,
      amountPaid: bill.amountPaid,
      from: bill.from,
      to: bill.to,
      paidAt: bill.createdAt,
      paymentMethod: bill.paymentMethod,
      balanceBeforePayment: bill.balanceBeforePayment,
      balanceAfterPayment: bill.balanceAfterPayment,
      discountPercent: bill.discountPercent,
      discountAmount: bill.discountAmount
    });

    console.log("📤 Uploading PDF to ImageKit...");

    const uploadResponse = await uploadPDFToImageKit(
      pdfBuffer,
      `${bill.billNumber}.pdf`,
      'billpdf'
    );

    if (uploadResponse.success) {
      bill.pdfUrl = uploadResponse.url;
      console.log("✅ PDF uploaded to ImageKit:", uploadResponse.url);
    } else {
      console.error("❌ ImageKit upload failed:", uploadResponse.error);
      const pdfPath = path.join(BILLS_DIR, `${bill.billNumber}.pdf`);
      fs.writeFileSync(pdfPath, pdfBuffer);
      bill.pdfUrl = `/api/payments/bills/${bill._id}/pdf`;
      console.log("⚠️ PDF saved locally as fallback");
    }

    await bill.save(session ? { session } : {});

  } catch (error) {
    if (strict) throw error;
    console.error("❌ PDF generation/upload failed:", error);
  }
};

// 🔥 PROCESS PAYMENT (FULL OR PARTIAL) - COMPLETE FIX
export const processPayment = async (req, res) => {
  try {
    console.log("🔥 processPayment called");
    console.log("📦 Request body:", JSON.stringify(req.body, null, 2));
    console.log("🎯 Booking ID:", req.params.id);
    console.log("👤 User:", req.user?.email || "No user");
    
    const { id } = req.params;
    const {
      paymentType,
      amountPaid,
      paymentMethod,
      transactionId,
      transactionDate,
      paymentRemarks,
      paymentAttachments,
      discount,
      discountPercent
    } = req.body;

    console.log("💳 Payment Request:", {
      bookingId: id,
      paymentType,
      amountPaid,
      discount,
      discountPercent
    });

    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ 
        success: false, 
        message: "Booking not found" 
      });
    }

    // 🔍 DEBUG: Log the actual booking data
    console.log("📋 BOOKING DATA FROM DB:", {
      _id: booking._id,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      discount: booking.discount,
      balanceAmount: booking.balanceAmount
    });

    const isFreeBedding = booking.paymentType === "Free";
    
    if (isFreeBedding) {
      booking.paymentRemarks = paymentRemarks || "Free booking";
      await booking.save();
      
      return res.json({
        success: true,
        message: "✅ Free booking details updated",
        booking
      });
    }

    // ✅ SAFE NUMBER CONVERSION
    const safeTotalAmount = Number(booking.totalAmount) || 0;
    const safePreviousPaid = Number(booking.paidAmount) || 0;
    const safePreviousDiscount = Number(booking.discount) || 0;
    const safeNewPayment = Number(amountPaid) || 0;
    const safeNewDiscount = Number(discount) || 0;

    // ✅ CALCULATE BALANCES SAFELY
    const balanceBeforeThisPayment = safeTotalAmount - safePreviousPaid - safePreviousDiscount;
    const totalNewDiscount = safePreviousDiscount + safeNewDiscount;
    const totalNewPaid = safePreviousPaid + safeNewPayment;
    const balanceAfterThisPayment = safeTotalAmount - totalNewPaid - totalNewDiscount;

    console.log("💰 Payment Calculation:", {
      totalAmount: safeTotalAmount,
      previouslyPaid: safePreviousPaid,
      previousDiscount: safePreviousDiscount,
      newPayment: safeNewPayment,
      newDiscount: safeNewDiscount,
      balanceBeforePayment: balanceBeforeThisPayment,
      balanceAfterPayment: balanceAfterThisPayment
    });

    // ✅ VALIDATION
    if (balanceBeforeThisPayment <= 0) {
      return res.status(400).json({
        success: false,
        message: "Booking is already fully paid"
      });
    }

    if (safeNewPayment <= 0) {
      return res.status(400).json({
        success: false,
        message: "Payment amount must be greater than zero"
      });
    }

    if (safeNewPayment > balanceBeforeThisPayment) {
      return res.status(400).json({
        success: false,
        message: `Payment amount (₹${safeNewPayment}) exceeds current balance (₹${balanceBeforeThisPayment.toFixed(2)})`
      });
    }

    // ✅ FULL PAYMENT VALIDATION
    if (paymentType === "FULL" && Math.abs(safeNewPayment - balanceBeforeThisPayment) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Full payment requires exact balance amount: ₹${balanceBeforeThisPayment.toFixed(2)}`
      });
    }

    // ✅ NaN PROTECTION FOR BILL
    if (isNaN(balanceBeforeThisPayment) || isNaN(balanceAfterThisPayment)) {
      throw new Error("Invalid payment calculation - NaN detected");
    }

    // ✅ VALIDATE THAT BALANCE AFTER PAYMENT IS NOT NEGATIVE
    if (balanceAfterThisPayment < -0.01) {
      throw new Error(`Invalid calculation: balance would be negative (${balanceAfterThisPayment})`);
    }

    // ✅ CREATE BILL
    const billNumber = await generateBillNumber();
    
    const billingPeriod = resolveBillStayPeriod(booking, {
      previousPaidAmount: safePreviousPaid,
      previousDiscount: safePreviousDiscount,
    });

    const bill = await Bill.create({
      bookingId: booking._id,
      guestName: booking.guest,
      guestEmail: booking.email,
      guestContact: booking.contact,
      department: booking.department || "",
      rollno: booking.rollno || "",
      hostel: booking.hostel,
      roomNo: booking.roomNo,
      from: billingPeriod.from,
      to: billingPeriod.to,
      billNumber,
      amountPaid: safeNewPayment,
      paymentType,
      paymentMethod,
      transactionId: transactionId || "",
      balanceBeforePayment: Math.max(0, balanceBeforeThisPayment),
      balanceAfterPayment: Math.max(0, balanceAfterThisPayment),
      discountPercent: Number(discountPercent) || 0,
      discountAmount: safeNewDiscount,
      paymentProof: paymentAttachments || [],
      remarks: paymentRemarks || "",
      createdBy: req.user._id
    });

    console.log("✅ Bill created:", bill.billNumber);

    await saveBillPDF(booking, bill);

    // ✅ UPDATE BOOKING (CRITICAL - DO THIS ONLY ONCE!)
    booking.paidAmount = totalNewPaid;
    booking.discount = totalNewDiscount;
    booking.balanceAmount = Math.max(0, balanceAfterThisPayment);
    
    recalculatePaymentStatus(booking);

    // Update payment transaction details
    booking.paymentMode = paymentMethod || booking.paymentMode;
    booking.transactionId = transactionId || booking.transactionId;
    booking.transactionDate = transactionDate ? new Date(transactionDate) : booking.transactionDate;
    booking.paymentRemarks = paymentRemarks || booking.paymentRemarks;

    // ✅ Append payment attachments
    if (Array.isArray(paymentAttachments) && paymentAttachments.length > 0) {
      const currentPayments = Array.isArray(booking.paymentAttachments) 
        ? booking.paymentAttachments 
        : [];
      booking.paymentAttachments = [...currentPayments, ...paymentAttachments];
    }

    await booking.save();

    console.log("✅ Booking updated:", {
      paidAmount: booking.paidAmount,
      discount: booking.discount,
      balanceAmount: booking.balanceAmount,
      paymentStatus: booking.paymentStatus
    });

    // ✅ Socket.IO - Emit payment-updated event
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('payment-updated', {
        bookingId: booking._id,
        billId: bill._id,
        amountPaid: safeNewPayment,
        newBalance: booking.balanceAmount,
        timestamp: Date.now()
      });
      console.log('📡 Emitted payment-updated event');
    }

    res.json({
      success: true,
      message: paymentType === "FULL" 
        ? "✅ Full payment received successfully" 
        : `✅ Partial payment of ₹${safeNewPayment} received`,
      booking,
      bill,
      remainingBalance: booking.balanceAmount
    });

  } catch (err) {
    console.error("❌ Payment processing error:", err);
    console.error("Stack:", err.stack);
    res.status(500).json({
      success: false,
      message: "Payment processing failed",
      error: err.message
    });
  }
};

// Capable deployments retain transactions; standalone uses durable recovery.
export const createAdminBill = async (req, res) => {
  let session;
  const fail = (status, message) => { throw Object.assign(new Error(message), { status }); };
  const round = value => Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  try {
    if (req.user?.role !== "admin") fail(403, "Permission denied");
    const { amount, remarks, paymentAttachments } = req.body;
    if (!["number", "string"].includes(typeof amount) || !Number.isFinite(Number(amount)) || round(amount) <= 0
      || !Number.isSafeInteger(Math.round(Number(amount) * 100))) fail(400, "Amount must be greater than zero and a valid currency amount");
    if (typeof remarks !== "string" || !remarks.trim()) fail(400, "Remarks are required");
    if (!Array.isArray(paymentAttachments) || paymentAttachments.length < 1 || paymentAttachments.length > 5
      || paymentAttachments.some(url => typeof url !== "string" || !/^https?:\/\/[^\s]+$/i.test(url))) {
      fail(400, "Provide between 1 and 5 valid payment proof attachments");
    }
    if (!mongoose.isValidObjectId(req.params.id)) fail(400, "Invalid booking ID");
    const key = req.get("Idempotency-Key");
    if (!key || !/^[a-zA-Z0-9_-]{16,128}$/.test(key)) fail(400, "A valid Idempotency-Key header is required");
    const payment = round(amount);
    const hash = value => crypto.createHash("sha256").update(value).digest("hex");
    const billId = new mongoose.Types.ObjectId(hash(key).slice(0, 24));
    const requestHash = hash(JSON.stringify({ bookingId: req.params.id, admin: String(req.user._id), amount: payment, remarks: remarks.trim(), paymentAttachments }));
    // Honor receipts issued by the previous scoped-key implementation.
    const legacyBillId = new mongoose.Types.ObjectId(hash(`${req.params.id}:${req.user._id}:${key}`).slice(0, 24));
    const legacyHash = hash(JSON.stringify({ amount: payment, remarks: remarks.trim(), paymentAttachments }));
    const replay = async (bill, activeSession) => {
      if (bill.adminRequestHash !== requestHash && !(String(bill._id) === String(legacyBillId) && bill.adminRequestHash === legacyHash)) throw Object.assign(new Error("This retry key was already used with different bill details"), { status: 409, code: "IDEMPOTENCY_MISMATCH" });
      const booking = await Booking.findById(req.params.id).session(activeSession || null);
      return { success: true, message: "Bill already created", booking, bill, remainingBalance: booking?.balanceAmount, idempotentReplay: true };
    };
    const existing = await Bill.findById(billId) || await Bill.findById(legacyBillId);
    const recovery = await AdminBillOperation.exists({ idempotencyKey: key });
    if (existing && !recovery) return res.json(await replay(existing));

    const topology = await mongoose.connection.db.admin().command({ hello: 1 });
    let result;
    if (recovery || (!topology.setName && topology.msg !== "isdbgrid")) {
      result = await resumeAdminBill({ key, requestHash, billId, bookingId: req.params.id,
        userId: req.user._id, payment, remarks: remarks.trim(), paymentAttachments, saveBillPDF });
    } else {
      session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const previous = await Bill.findById(billId).session(session);
          if (previous) { result = await replay(previous, session); return; }
          const booking = await Booking.findById(req.params.id).session(session);
          if (!booking) fail(404, "Booking not found");
          if (!["active", "booked", "checked_in", "checked_out"].includes(booking.status)) {
            fail(400, "Bills cannot be created for cancelled, no-show or inactive bookings");
          }
          const total = round(booking.totalAmount || 0);
          const paid = round(booking.paidAmount || 0);
          const discount = Number(booking.discount) || 0;
          const balance = round(Math.max(0, total - paid - discount));
          if (balance > 0 && payment > balance) {
            fail(400, `Amount exceeds the pending balance of ₹${balance.toFixed(2)}. Settle this balance before creating an additional bill.`);
          }
          const additionalCharge = balance === 0;
          if (additionalCharge) {
            booking.totalAmount = round(total + payment);
            booking.amount = booking.totalAmount; // Existing legacy total mirror.
          }
          booking.paidAmount = round(paid + payment);
          recalculatePaymentStatus(booking);
          booking.balanceAmount = round(booking.balanceAmount);
          if (booking.balanceAmount === 0) booking.paymentStatus = "PAID";
          booking.paymentRemarks = remarks.trim();
          booking.paymentAttachments = [...(booking.paymentAttachments || []), ...paymentAttachments];
          // Write first to serialize competing updates to this booking. A later
          // bill/PDF failure aborts this write, including attachments and remarks.
          await booking.save({ session });
          const period = resolveBillStayPeriod(booking, { previousPaidAmount: paid, previousDiscount: discount });
          const [bill] = await Bill.create([{
            _id: billId, adminRequestHash: requestHash,
            billNumber: (await generateBillNumber()).replace("BILL-", "ADM-"),
            bookingId: booking._id, guestName: booking.guest, guestEmail: booking.email,
            guestContact: booking.contact, department: booking.department || "", rollno: booking.rollno || "",
            hostel: booking.hostel, roomNo: booking.roomNo, from: period.from, to: period.to,
            billType: "ADMIN_MANUAL_PAYMENT", totalAmount: additionalCharge ? payment : balance,
            amountPaid: payment, paymentType: booking.balanceAmount === 0 ? "FULL" : "PARTIAL",
            paymentMethod: "Admin Manual Entry", paymentProof: paymentAttachments,
            remarks: remarks.trim(), balanceBeforePayment: additionalCharge ? payment : balance,
            balanceAfterPayment: booking.balanceAmount, createdBy: req.user._id,
            discountAmount: 0, discountPercent: 0,
          }], { session });
          await saveBillPDF(booking, bill, { session, strict: true });
          result = { success: true, message: "Bill created successfully", booking, bill, remainingBalance: booking.balanceAmount };
        }, { readConcern: { level: "snapshot" }, writeConcern: { w: "majority" }, readPreference: "primary" });
      } catch (error) {
        if (error.code !== 11000) throw error;
        const previous = await Bill.findById(billId);
        if (!previous) throw error;
        result = await replay(previous);
      }
    }
    if (!result.idempotentReplay) {
      await createAuditEvent(req, {
        action: "ADMIN_BILL_CREATED", module: "GUEST_ROOM", functionName: "createAdminBill",
        ...bookingAuditFields(result.booking), remarks: remarks.trim(),
        details: { amount: payment, billNumber: result.bill.billNumber, billId: String(result.bill._id) },
      });
      // Realtime delivery must never turn a committed payment into an error.
      try {
        req.app.get("io")?.to("dashboard-room").emit("payment-updated", {
          bookingId: result.booking._id, billId: result.bill._id, amountPaid: payment,
          newBalance: result.booking.balanceAmount, timestamp: Date.now(),
        });
      } catch (error) { console.error("Admin bill realtime notification failed:", error.message); }
    }
    return res.json(result);
  } catch (error) {
    console.error("Admin bill creation failed:", error.message);
    return res.status(error.status || 503).json({ success: false, code: error.code, message: error.status ? error.message
      : "Unable to confirm bill creation. Retry with the same request key." });
  } finally {
    if (session) await session.endSession();
  }
};

// 📊 GET PAYMENT HISTORY FOR A BOOKING
export const getPaymentHistory = async (req, res) => {
  console.log("================================================================================");
  console.log("🔥 PAYMENT HISTORY REQUEST RECEIVED");
  console.log("================================================================================");
  
  try {
    const { id } = req.params;
    
    console.log("📋 Step 1: Booking ID received:", id);
    console.log("📋 Step 1: ID type:", typeof id);
    console.log("📋 Step 1: ID length:", id.length);

    // Validate ID format
    if (!id || id === 'undefined' || id === 'null') {
      console.log("❌ Invalid booking ID received");
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID"
      });
    }

    // Check if Booking model is available
    console.log("📋 Step 2: Checking Booking model...");
    console.log("📋 Step 2: Booking model exists:", typeof Booking !== 'undefined');
    
    if (typeof Booking === 'undefined') {
      console.log("❌ CRITICAL: Booking model is not imported!");
      return res.status(500).json({
        success: false,
        message: "Server configuration error: Booking model not found",
        error: "Booking model is not imported"
      });
    }

    // Fetch booking
    console.log("📋 Step 3: Fetching booking from database...");
    const booking = await Booking.findById(id).lean();

    if (!booking) {
      console.log("❌ Step 3: Booking not found with ID:", id);
      return res.status(404).json({
        success: false,
        message: "Booking not found"
      });
    }

    console.log("✅ Step 3 complete: Booking found");
    console.log("📄 Booking preview:", {
      guest: booking.guest,
      email: booking.email,
      contact: booking.contact,
      totalAmount: booking.totalAmount,
      paidAmount: booking.paidAmount,
      discount: booking.discount
    });

    // Check if Bill model is available
    console.log("📋 Step 4: Checking Bill model...");
    console.log("📋 Step 4: Bill model exists:", typeof Bill !== 'undefined');
    
    if (typeof Bill === 'undefined') {
      console.log("❌ CRITICAL: Bill model is not imported!");
      return res.status(500).json({
        success: false,
        message: "Server configuration error: Bill model not found",
        error: "Bill model is not imported"
      });
    }

    // Fetch bills (Linked by Booking ID OR Email OR Contact)
    console.log("📋 Step 5: Fetching bills from database...");
    
    const billQuery = {
      $or: [
        { bookingId: id }
      ]
    };

    if (booking.email) {
      billQuery.$or.push({ guestEmail: booking.email });
    }
    
    if (booking.contact) {
      billQuery.$or.push({ guestContact: booking.contact });
    }

    console.log("🔍 Bill Query:", JSON.stringify(billQuery, null, 2));

    const bills = await Bill.find(billQuery)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .lean();

    console.log("✅ Step 5 complete: Found", bills.length, "bills");

    // Calculate totals
    console.log("📋 Step 6: Calculating payment totals...");
    const totalPaid = bills.reduce((sum, bill) => {
      const amount = Number(bill.amountPaid) || 0;
      console.log("  Adding bill amount:", amount);
      return sum + amount;
    }, 0);
    
    const totalDiscount = Number(booking.discount) || 0;
    const waveOff = totalDiscount;

    console.log("✅ Step 6 complete: Totals calculated");
    console.log("💰 Payment Summary:", {
      totalAmount: booking.totalAmount,
      totalPaid,
      waveOff,
      balanceAmount: booking.balanceAmount
    });

    // Prepare response
    console.log("📋 Step 7: Preparing response...");
    const response = {
      success: true,
      booking: {
        totalAmount: Number(booking.totalAmount) || 0,
        paidAmount: Number(booking.paidAmount) || 0,
        balanceAmount: Number(booking.balanceAmount) || 0,
        waveOff: waveOff,
        discount: totalDiscount,
        paymentStatus: booking.paymentStatus || "UNPAID",
        paymentType: booking.paymentType || "Paid"
      },
      bills: bills || []
    };

    console.log("✅ Step 7 complete: Response prepared");
    console.log("📤 Response preview:", JSON.stringify(response, null, 2));

    console.log("📋 Step 8: Sending response...");
    res.json(response);
    
    console.log("✅ Payment history sent successfully");
    console.log("================================================================================");

  } catch (err) {
    console.log("================================================================================");
    console.log("❌ PAYMENT HISTORY ERROR");
    console.log("================================================================================");
    console.error("Error name:", err.name);
    console.error("Error message:", err.message);
    console.error("Error stack:", err.stack);
    
    // Check for specific error types
    if (err.name === 'CastError') {
      console.error("🔍 CastError detected - Invalid MongoDB ObjectId format");
      console.error("Attempted to cast:", err.value);
      console.error("For path:", err.path);
    }
    
    if (err.name === 'ReferenceError') {
      console.error("🔍 ReferenceError detected - Variable not defined");
      console.error("This usually means missing import or typo");
    }
    
    console.log("================================================================================");
    
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
      error: err.message,
      errorName: err.name,
      errorStack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

// 🧾 DOWNLOAD BILL PDF
export const downloadBillPDF = async (req, res) => {
  try {
    const { billId } = req.params;
    
    console.log("📥 Download request for bill:", billId);

    const bill = await Bill.findById(billId);
    if (!bill) {
      console.log("❌ Bill not found:", billId);
      return res.status(404).send("Bill not found");
    }

    // ✅ Check if PDF is on ImageKit (starts with http)
    if (bill.pdfUrl && bill.pdfUrl.startsWith('http')) {
      console.log("🔗 Redirecting to ImageKit URL:", bill.pdfUrl);
      
      // Option 1: Direct redirect
      return res.redirect(bill.pdfUrl);
      
      // Option 2: Fetch and serve (if you want to control headers)
      /*
      const pdfResponse = await fetch(bill.pdfUrl);
      const pdfBuffer = await pdfResponse.buffer();
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${bill.billNumber}.pdf"`);
      return res.send(pdfBuffer);
      */
    }

    // ✅ Fallback: Check local file system (for old bills)
    const filePath = path.join(process.cwd(), "bills", `${bill.billNumber}.pdf`);
    console.log("📂 Looking for local file at:", filePath);

    if (!fs.existsSync(filePath)) {
      console.log("❌ PDF file not found locally:", filePath);
      return res.status(404).send("PDF file not found");
    }

    console.log("✅ Serving local file");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${bill.billNumber}.pdf"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.on("error", (err) => {
      console.error("❌ Stream error:", err);
      if (!res.headersSent) {
        res.status(500).send("Error reading PDF file");
      }
    });
    
    fileStream.pipe(res);

  } catch (err) {
    console.error("❌ Download error:", err);
    if (!res.headersSent) {
      res.status(500).send("Download failed");
    }
  }
};
// ============================================
// 💸 PROCESS WAIVER (Admin + Manager + Co-Warden only)
// ============================================
export const processWaiver = async (req, res) => {
  try {
    const { id } = req.params;
    const { remarks, waiverAmount, attachments } = req.body;
    const user = req.user;

    // Role check: Allow Admin, Manager, and Co-Warden
    if (!['admin', 'manager', 'co_warden', 'adosa'].includes(user.role)) {
      return res.status(403).json({ success: false, message: "Only Admin, adosa, Manager, and Co-Warden can process waivers" });
    }

    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ success: false, message: "Remarks are required" });
    }
    if (!attachments || attachments.length === 0) {
      return res.status(400).json({ success: false, message: "At least one attachment is required" });
    }

    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    const totalAmount = Number(booking.totalAmount) || 0;
    const paidAmount = Number(booking.paidAmount) || 0;
    const previousDiscount = Number(booking.discount) || 0;
    const pendingBalance = Math.max(0, totalAmount - paidAmount - previousDiscount);

    if (pendingBalance <= 0) {
      return res.status(400).json({ success: false, message: "No pending balance to waive" });
    }

    const safeWaiverAmount = Number(waiverAmount) || pendingBalance;

    // Store waiver details on booking
    booking.discount = (booking.discount || 0) + safeWaiverAmount;
    booking.waiverRemarks = remarks.trim();
    booking.waiverAttachments = attachments;
    booking.waivedBy = user._id;
    booking.waivedAt = new Date();

    // Recalculate balance
    booking.balanceAmount = Math.max(0, totalAmount - paidAmount - booking.discount);
    if (booking.balanceAmount <= 0) {
      booking.paymentStatus = "PAID";
    } else if (paidAmount > 0) {
      booking.paymentStatus = "PARTIALLY_PAID";
    }

    await booking.save();

    // Create a Bill record for the waiver
    const billNumber = await generateBillNumber();
    const waiverBill = await Bill.create({
      bookingId: booking._id,
      billNumber: billNumber.replace("BILL", "WAIVER"),
      guestName: booking.guest,
      guestEmail: booking.email,
      guestContact: booking.contact,
      hostel: booking.hostel,
      roomNo: booking.roomNo,
      department: booking.department,
      from: booking.from,
      to: booking.to,
      totalAmount: totalAmount,
      amountPaid: 0,
      paidBeforeWaiver: paidAmount,
      waiverAmount: safeWaiverAmount,
      waiverRemarks: remarks.trim(),
      waiverAttachments: attachments,
      waivedBy: user._id,
      waivedAt: new Date(),
      billType: "WAIVER",
      paymentType: "WAIVER",
      balanceBeforePayment: pendingBalance,
      balanceAfterPayment: booking.balanceAmount,
      createdBy: user._id,
    });

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to('dashboard-room').emit('waiver-processed', {
        bookingId: booking._id,
        guest: booking.guest,
        waiverAmount: safeWaiverAmount,
        timestamp: Date.now()
      });
    }

    console.log("✅ Waiver processed:", { bookingId: booking._id, waiverAmount: safeWaiverAmount, by: user.name });

    res.json({
      success: true,
      message: `✅ Payment waiver of ₹${safeWaiverAmount} processed successfully`,
      booking,
      waiverBill
    });

  } catch (err) {
    console.error("❌ Waiver error:", err);
    res.status(500).json({ success: false, message: "Failed to process waiver", error: err.message });
  }
};

// ============================================
// 📋 GET ALL WAIVED BILLS
// ============================================
export const getWaivedBills = async (req, res) => {
  try {
    const user = req.user;
    const role = String(user?.role || "").toLowerCase();

    // Role check: admin roles see all; caretaker/warden see only their hostel.
    if (!['admin', 'manager', 'co_warden', 'adosa', 'caretaker', 'warden'].includes(role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const waivedBills = await Bill.find(hostelScopedBillQuery(user, { billType: "WAIVER" }))
      .sort({ createdAt: -1 })
      .populate('waivedBy', 'name email role')
      .populate('createdBy', 'name email role')
      .lean();

    res.json({ success: true, waivedBills });
  } catch (err) {
    console.error("❌ Get waived bills error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch waived bills", error: err.message });
  }
};

// ============================================
// 📋 GET ALL CANCELLED BILLS
// ============================================
export const getCancelledBills = async (req, res) => {
  try {
    const user = req.user;
    const role = String(user?.role || "").toLowerCase();

    if (!['admin', 'manager', 'adosa', 'assistant', 'warden', 'caretaker', 'co_warden'].includes(role)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const cancelledBills = await Bill.find(hostelScopedBillQuery(user, { paymentType: "CANCELLED" }))
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email role')
      .lean();

    res.json({ success: true, cancelledBills });
  } catch (err) {
    console.error("❌ Get cancelled bills error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch cancelled bills", error: err.message });
  }
};
