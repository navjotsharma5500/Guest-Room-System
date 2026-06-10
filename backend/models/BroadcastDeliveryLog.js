import mongoose from "mongoose";

const broadcastDeliveryLogSchema = new mongoose.Schema(
  {
    broadcastId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BroadcastMessage",
      required: true,
      index: true,
    },
    recipientEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    recipientName: { type: String, default: "" },
    recipientRole: { type: String, default: "" },
    recipientGroup: { type: String, default: "" },

    status: {
      type: String,
      enum: ["pending", "sent", "failed", "skipped"],
      default: "pending",
      index: true,
    },
    errorMessage: { type: String, default: "" },
    attempts: { type: Number, default: 0 },
    sentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

broadcastDeliveryLogSchema.index({ broadcastId: 1, status: 1 });
broadcastDeliveryLogSchema.index({ createdAt: -1 });

export default mongoose.model("BroadcastDeliveryLog", broadcastDeliveryLogSchema);
