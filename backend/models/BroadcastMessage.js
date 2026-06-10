import mongoose from "mongoose";

export const BROADCAST_MESSAGE_TYPES = [
  "general",
  "emergency",
  "checkout_reminder",
  "payment_reminder",
  "maintenance_alert",
  "defaulter_reminder",
  "extension_reminder",
];

export const BROADCAST_RECIPIENT_GROUPS = [
  "all_caretakers",
  "all_wardens",
  "all_active_guests",
  "all_defaulters",
  "specific_hostel",
  "custom",
];

const broadcastAttachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    name: { type: String, default: "" },
    type: { type: String, default: "" },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const broadcastMessageSchema = new mongoose.Schema(
  {
    messageType: {
      type: String,
      enum: BROADCAST_MESSAGE_TYPES,
      default: "general",
      index: true,
    },
    title: { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    bodyHtml: { type: String, required: true },
    bodyText: { type: String, default: "" },

    recipientGroups: [
      {
        type: String,
        enum: BROADCAST_RECIPIENT_GROUPS,
      },
    ],
    specificHostel: { type: String, default: "", trim: true },
    customEmails: [{ type: String, lowercase: true, trim: true }],

    attachments: { type: [broadcastAttachmentSchema], default: [] },

    noticeEnabled: { type: Boolean, default: false, index: true },
    noticeStartAt: { type: Date, default: null, index: true },
    noticeEndAt: { type: Date, default: null, index: true },

    status: {
      type: String,
      enum: ["draft", "scheduled", "sending", "sent", "failed", "cancelled"],
      default: "draft",
      index: true,
    },
    scheduledAt: { type: Date, default: null, index: true },
    sentAt: { type: Date, default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    createdByName: { type: String, default: "" },
    createdByRole: { type: String, default: "" },

    totalRecipients: { type: Number, default: 0 },
    sentCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    lastError: { type: String, default: "" },
  },
  { timestamps: true }
);

broadcastMessageSchema.index({ createdAt: -1 });
broadcastMessageSchema.index({ status: 1, scheduledAt: 1 });
broadcastMessageSchema.index({ noticeEnabled: 1, noticeStartAt: 1, noticeEndAt: 1 });
broadcastMessageSchema.index({ title: "text", subject: "text", bodyText: "text" });

export default mongoose.model("BroadcastMessage", broadcastMessageSchema);
