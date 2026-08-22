// models/Booking.js - COMPLETE FIXED VERSION
import mongoose from "mongoose";
import BookingCounter from "./BookingCounter.js";

const TransferHistorySchema = new mongoose.Schema(
  {
    fromHostel: { type: String, required: true },
    fromRoomNo: { type: String, required: true },
    toHostel: { type: String, required: true },
    toRoomNo: { type: String, required: true },
    transferDate: { type: Date, required: true },
    transferTime: { type: String, required: true },
    segmentFrom: { type: Date, required: true },
    segmentTo: { type: Date, required: true },
    sourceStatus: { type: String, required: true },
    sourceReportedStatus: { type: String, required: true },
    sourceActualCheckInDate: { type: Date, default: null },
    sourceActualCheckInTime: { type: String, default: "" },
    sourceReportedAt: { type: Date, default: null },
    sourceReportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    sourceIdVerified: { type: Boolean, default: false },
    transferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    transferredByName: { type: String, default: "" },
    transferredByEmail: { type: String, default: "" },
    remarks: { type: String, default: "" },
    transferredAt: { type: Date, required: true },
  },
  { _id: false }
);

const getBookingDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}${value("month")}${value("day")}`;
};

const BookingSchema = new mongoose.Schema(
  {
    // Human-readable identifier. `_id` remains the internal relation/API key.
    bookingId: {
      type: String,
      trim: true,
      immutable: true,
      match: /^GR-\d{8,}$/,
    },
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

    transferHistory: { type: [TransferHistorySchema], default: [] },
    lastTransferredAt: { type: Date, default: null },
    lastTransferredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // =========================
    // STAY DATES & TIME
    // =========================
    from: { type: Date, required: true },
    to: { type: Date, required: true },

    checkInTime: { type: String, default: "00:00" },
    checkOutTime: { type: String, default: "23:59" },

    actualCheckInDate: { type: Date },
    actualCheckInTime: { type: String },
    earlyCheckIn: {
      isEarly: { type: Boolean, default: false },
      amount: { type: Number, default: 0 },
      paymentType: {
        type: String,
        enum: ["Paid", "Free"],
        default: "Paid",
      },
      remarks: { type: String, default: "" },
      attachments: { type: [String], default: [] },
    },

    actualCheckoutDate: { type: Date },
    actualCheckoutTime: { type: String },
    continuousStay: {
      isContinuous: { type: Boolean, default: false },
      startDate: { type: Date, default: null },
      totalDays: { type: Number, default: 0 },
      parentBookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
        default: null,
      },
    },
    directExtension: {
      used: { type: Boolean, default: false },
      oldCheckout: { type: Date, default: null },
      newCheckout: { type: Date, default: null },
      remarks: { type: String, default: "" },
      attachments: { type: [String], default: [] },
      paymentType: {
        type: String,
        enum: ["Paid", "Free", ""],
        default: "",
      },
      amount: { type: Number, default: 0 },
      paymentRemarks: { type: String, default: "" },
      paymentAttachments: { type: [String], default: [] },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
      createdAt: { type: Date, default: null },
    },

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

    //NEW PAYMENT STRUCTURE
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
      enum: ["UNPAID", "PARTIALLY_PAID", "PAID", "CANCELLED"],
      default: "UNPAID",
    },

    paymentResponsibility: {
      type: String,
      enum: ["GUEST", "DEPARTMENT", ""],
      default: "GUEST",
    },

    // OLD PAYMENT FIELDS (BACKWARD COMPATIBILITY)
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
    checkoutType: {
      type: String,
      enum: ["NORMAL", "EARLY", "AUTO"],
      default: "NORMAL",
    },

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

    //NEW: Extension Payment Fields
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

    // ✅ CRITICAL: Extension history for accurate billing periods
    extensionHistory: [{
      type: {
        type: String,
        enum: ["APPROVED_EXTENSION", "DIRECT_EXTENSION"],
        default: "APPROVED_EXTENSION",
      },
      extendedAt: { type: Date, default: Date.now },
      extendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      createdAt: { type: Date, default: Date.now },
      oldTo: { type: Date },           // Previous checkout date
      newTo: { type: Date },           // New checkout date after extension
      oldCheckout: { type: Date },     // Backward compatibility alias for oldTo
      newCheckout: { type: Date },     // Backward compatibility alias for newTo
      remarks: { type: String, default: "" },
      attachments: { type: [String], default: [] },
      paymentType: {
        type: String,
        enum: ["Paid", "Free", ""],
        default: "",
      },
      paymentRemarks: { type: String, default: "" },
      paymentAttachments: { type: [String], default: [] },
      approvedAmount: { type: Number, default: 0 },
      amount: { type: Number, default: 0 }
    }],

    // =========================
    // CANCELLATION
    // =========================
    cancelDate: { type: Date },
    cancelRemarks: { type: String, default: "" },
    cancelAttachments: { type: [String], default: [] },

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

    // =========================
    // REBOOKING APPROVAL SYSTEM
    // =========================
    approvalStatus: {
      type: String,
      enum: ["auto_approved", "under_review", "rejected"],
      default: "auto_approved",
    },

    isRebookingWithin24hrs: {
      type: Boolean,
      default: false,
    },

    reviewDeadline: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

//CRITICAL: Add virtual for real-time balance
BookingSchema.virtual('currentBalance').get(function() {
  return this.totalAmount - this.paidAmount;
});

//Virtual field for total wave off (discount)
BookingSchema.virtual('waveOff').get(function() {
  return this.discount || 0;
});

BookingSchema.set('toJSON', { virtuals: true });
BookingSchema.set('toObject', { virtuals: true });

// Allocate the number atomically so concurrent bookings cannot receive the same ID.
BookingSchema.pre("validate", async function generateBookingId() {
  if (!this.isNew || this.bookingId) return;

  const dateKey = getBookingDateKey();
  const counter = await BookingCounter.findOneAndUpdate(
    { _id: dateKey },
    { $inc: { sequence: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  this.bookingId = `GR-${dateKey}${String(counter.sequence).padStart(2, "0")}`;
});

// Add index for faster queries
BookingSchema.index({ hostel: 1, roomNo: 1 });
BookingSchema.index({ contact: 1 });
BookingSchema.index({ email: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ reportedStatus: 1 });
BookingSchema.index(
  { bookingId: 1 },
  { unique: true, partialFilterExpression: { bookingId: { $type: "string" } } }
);

export default mongoose.model("Booking", BookingSchema);
