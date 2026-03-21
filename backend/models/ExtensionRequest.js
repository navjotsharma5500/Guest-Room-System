//models/ExtensionRequest.js
import mongoose from "mongoose";

const extensionRequestSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    oldCheckout: {
      type: Date,
      required: true,
    },
    requestedCheckout: {
      type: Date,
      required: true,
    },
    remarks: {
      type: String,
      default: "",
    },
    // Store any preliminary payment info if collected, though actual payment is after approval
    paymentData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // ✅ Top-level payment fields so ApprovalPage can display them without
    // digging into the nested paymentData object
    extensionPaymentType: {
      type: String,
      enum: ["Paid", "Free"],
      default: "Paid",
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
    extensionAttachments: {
      type: [String],
      default: [],
    },
    hostel: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "expired"],
      default: "pending",
    },
    requiredApprovalLevel: {
      type: String,
      enum: ["co_warden", "adosa"],
      required: true,
    },
    rejectionReason: {
      type: String,
      default: ""
    },
    approvedAmount: {
      type: Number,
      default: 0
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ExtensionRequest", extensionRequestSchema);
