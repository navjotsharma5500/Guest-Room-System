// models/Booking.js - COMPLETE FIXED VERSION
import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    // =========================
    // BASIC GUEST INFO
    // =========================
    guest: { type: String, required: true },
    email: { type: String, required: true },
    contact: { type: String, required: true },

    idType: {
      type: String,
      enum: ["ROLL", "EMP", ""],
      default: "",
    },

    rollno: { type: String, default: "" },
    department: { type: String, default: "" },
    gender: { type: String, default: "" },

    // =========================
    // LOCATION
    // =========================
    hostel: { type: String, required: true },
    roomNo: { type: String, required: true },

    // =========================
    // STAY DATES & TIME
    // =========================
    from: { type: Date, required: true },
    to: { type: Date, required: true },

    checkInTime: { type: String, default: "00:00" },
    checkOutTime: { type: String, default: "23:59" },

    actualCheckInDate: { type: Date },
    actualCheckInTime: { type: String },

    // =========================
    // GUEST COUNTS
    // =========================
    numGuests: { type: Number, default: 1 },
    females: { type: Number, default: 0 },
    males: { type: Number, default: 0 },

    // =========================
    // ADDRESS & PURPOSE
    // =========================
    purpose: { type: String, default: "" },
    city: { type: String, default: "" },
    state: { type: String, default: "" },
    reference: { type: String, default: "" },

    // 🆕 NEW PAYMENT STRUCTURE
    paymentType: {
      type: String,
      enum: ["Paid", "Free"],
      default: "Paid",
    },

    totalAmount: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balanceAmount: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PARTIALLY_PAID", "PAID"],
      default: "UNPAID",
    },

    // 🔁 OLD PAYMENT FIELDS (BACKWARD COMPATIBILITY)
    amount: { type: Number, default: 0 },
    amountToBePaid: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },

    paymentMode: {
      type: String,
      enum: ["UPI", "ONLINE", "BANK TRANSFER", "CASH", "DEPARTMENT", ""],
      default: "",
    },

    transactionId: { type: String, default: "" },
    transactionDate: { type: Date },
    paymentRemarks: { type: String, default: "" },
    billId: { type: String, default: "" },

    // =========================
    // ATTACHMENTS (4 TYPES)
    // =========================
    files: { type: [String], default: [] },                      // Guest enquiry attachments
    approvalDocuments: { type: [String], default: [] },          // Free booking approval docs
    paymentAttachments: { type: [String], default: [] },         // Payment proof

    // Payment Rollbacks
    paymentRollbacks: [{
      amount: { type: Number, required: true },
      rollbackDate: { type: Date, default: Date.now },
      rollbackBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      remarks: { type: String, required: true },
      attachments: { type: [String], default: [] },
      previousPaidAmount: { type: Number },
      previousBalanceAmount: { type: Number }
    }],

    // =========================
    // ENQUIRY LINK
    // =========================
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Enquiry",
      default: null,
    },

    // =========================
    // REPORTING (CARETAKER)
    // =========================
    reportedStatus: {
      type: String,
      enum: ["pending", "reported", "not_reported", "no_show"],
      default: "pending",
    },

    reportedAt: { type: Date, default: null },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    idVerified: { type: Boolean, default: false },
    noShowMarkedAt: { type: Date, default: null },

    // =========================
    // CHECKOUT
    // =========================
    checkedOutAt: { type: Date, default: null },
    checkOutComment: { type: String, default: "" },

    // =========================
    // EXTENSION
    // =========================
    // models/Booking.js

    extensionDate: {
      type: Date,
      default: null,
    },

    extendRemarks: {
      type: String,
      default: "",
    },

    extensionAttachments: {
      type: [String],
      default: [],
    },

    // ✅ NEW: Extension Payment Fields
    extensionPaymentType: {
      type: String,
      enum: ["Paid", "Free", ""],
      default: "",
    },

    extensionAmount: {
      type: Number,
      default: 0,
    },

    extensionPaymentRemarks: {
      type: String,
      default: "",
    },

    extensionPaymentAttachments: {
      type: [String],
      default: [],
    },

    // =========================
    // CANCELLATION
    // =========================
    cancelDate: { type: Date },
    cancelRemarks: { type: String, default: "" },

    // =========================
    // REMARKS (FREE BOOKING)
    // =========================
    remarks: { type: String, default: "" },
    freeRemarks: { type: String, default: "" },

    // =========================
    // PROFILE PICTURE
    // =========================
    profilePicture: { type: String, default: "" },

    // =========================
    // EMAILS (STAFF)
    // =========================
    caretakerEmail: { type: String, default: "" },
    wardenEmail: { type: String, default: "" },

    // =========================
    // GENERAL COMMENTS
    // =========================
    comments: { type: String, default: "" },

    // =========================
    // STATUS & AUDIT
    // =========================
    status: {
      type: String,
      enum: ["booked", "cancelled", "checked_in", "checked_out", "no_show"],
      default: "booked",
    },

    feedback: {
     type: mongoose.Schema.Types.ObjectId,
     ref: "Feedback"
   },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

// 🔥 CRITICAL: Add virtual for real-time balance
BookingSchema.virtual('currentBalance').get(function() {
  return this.totalAmount - this.paidAmount;
});

// 🆕 Virtual field for total wave off (discount)
BookingSchema.virtual('waveOff').get(function() {
  return this.discount || 0;
});

BookingSchema.set('toJSON', { virtuals: true });
BookingSchema.set('toObject', { virtuals: true });

// Add index for faster queries
BookingSchema.index({ hostel: 1, roomNo: 1 });
BookingSchema.index({ contact: 1 });
BookingSchema.index({ email: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ reportedStatus: 1 });

export default mongoose.model("Booking", BookingSchema);