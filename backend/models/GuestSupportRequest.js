import mongoose from "mongoose";

const guestSupportRequestSchema = new mongoose.Schema(
  {
    requestType: {
      type: String,
      enum: ["medical", "cleaning", "maintenance", "sos"],
      required: true,
      index: true,
    },
    typedRequestId: { type: mongoose.Schema.Types.ObjectId, index: true },
    hostelId: { type: mongoose.Schema.Types.ObjectId, ref: "Hostel", required: true, index: true },
    hostelName: { type: String, required: true, trim: true },
    roomId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    roomNo: { type: String, required: true, trim: true },
    roomType: { type: String, default: "" },

    guestName: { type: String, required: true, trim: true },
    guestEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    guestProfilePicture: { type: String, default: "" },
    contact: { type: String, default: "", trim: true },

    message: { type: String, default: "", trim: true },
    status: {
      type: String,
      enum: ["open", "in_progress", "acknowledged", "resolved", "escalated", "cancelled"],
      default: "open",
      index: true,
    },
    source: { type: String, default: "qr" },
    googleSub: { type: String, default: "", index: true },
    userAgent: { type: String, default: "" },
    ipAddress: { type: String, default: "" },
  },
  { timestamps: true }
);

guestSupportRequestSchema.index({ hostelName: 1, roomNo: 1, createdAt: -1 });
guestSupportRequestSchema.index({ requestType: 1, typedRequestId: 1 });

export default mongoose.model("GuestSupportRequest", guestSupportRequestSchema);
