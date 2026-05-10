//models/Bill.js
import mongoose from "mongoose";

const billSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true
    },

    // 📋 SNAPSHOT (DO NOT reference Guest)
    guestName: String,
    guestEmail: String,
    guestContact: String,
    department: String,
    rollno: String,

    hostel: String,
    roomNo: String,
    from: Date,
    to: Date,

    billNumber: {
      type: String,
      required: true,
      unique: true
    },

    // Bill type: standard payment or waiver
    billType: {
      type: String,
      enum: ["PAYMENT", "DIRECT_EXTENSION", "EXTENSION_PAYMENT", "REBOOKING_PAYMENT", "WAIVER"],
      default: "PAYMENT"
    },

    totalAmount: Number,
    amountPaid: Number,
    paidBeforeWaiver: Number, // Amount already paid before waiver

    paymentType: {
      type: String,
      enum: ["FULL", "PARTIAL", "WAIVER", "CANCELLED"]
    },
    paymentMethod: String,
    transactionId: String,

    balanceBeforePayment: Number,
    balanceAfterPayment: Number,

    discountPercent: Number,
    discountAmount: Number,

    // Waiver-specific fields
    waiverAmount: Number,
    waiverRemarks: String,
    waiverAttachments: [
      {
        url: String,
        fileId: String,
        name: String,
      }
    ],
    waivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    waivedAt: Date,

    paymentProof: [String],
    remarks: String,

    pdfUrl: String,

    status: {
      type: String,
      enum: ["active", "cancelled"],
      default: "active"
    },

    cancelMeta: {
      reason: String,
      cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      cancelledByName: String,
      attachments: [String],
      cancelledAt: Date
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }
  },
  { timestamps: true }
);

export default mongoose.model("Bill", billSchema);
