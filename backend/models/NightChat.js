// models/NightChat.js
import mongoose from "mongoose";

// ─── Attachment sub-schema ────────────────────────────────────────────────────
const AttachmentSchema = new mongoose.Schema(
  {
    url:      { type: String, required: true },
    type:     { type: String, enum: ["image", "pdf"], required: true },
    filename: { type: String, default: "" },
  },
  { _id: false }
);

// ─── Message ──────────────────────────────────────────────────────────────────
// Immutable once created — no edit, no delete
const MessageSchema = new mongoose.Schema(
  {
    roomId:      { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true, index: true },
    senderId:    { type: mongoose.Schema.Types.ObjectId, ref: "User",     required: true },
    senderName:  { type: String, required: true },
    senderRole:  { type: String, required: true },
    messageType: { type: String, enum: ["TEXT", "ATTACHMENT", "SYSTEM"], default: "TEXT" },
    content:     { type: String, default: "" },
    attachments: { type: [AttachmentSchema], default: [] },
    readBy: [
      {
        userId:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        readAt:   { type: Date, default: Date.now },
      }
    ],
    isSystemMessage: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// ─── ChatRoom ─────────────────────────────────────────────────────────────────
const ChatRoomSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["SOCIETY", "APPROVAL", "ROLE"],
      required: true,
      index: true,
    },

    // For SOCIETY rooms: which society
    societyId:   { type: String, default: null },
    societyName: { type: String, default: null },

    // For APPROVAL rooms: which list/request
    referenceId:   { type: mongoose.Schema.Types.ObjectId, default: null },
    referenceName: { type: String, default: null },  // e.g. "Nuit Blanche - 22 Feb"

    // For ROLE rooms: e.g. "president-adosa"
    roleChannel: { type: String, default: null },

    // Roles allowed to participate
    allowedRoles: [{ type: String }],

    // Explicit participant user IDs (for ROLE and APPROVAL rooms)
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    // Is this thread locked (admin can lock for archival)
    isLocked: { type: Boolean, default: false },

    // Last message snapshot for preview
    lastMessage: {
      content:   { type: String, default: "" },
      senderName: { type: String, default: "" },
      sentAt:    { type: Date, default: null },
    },

    // Unread count per participant (map: userId → count)
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Compound index to avoid duplicate rooms
ChatRoomSchema.index({ type: 1, societyId: 1 }, { sparse: true });
ChatRoomSchema.index({ type: 1, referenceId: 1 }, { sparse: true });
ChatRoomSchema.index({ type: 1, roleChannel: 1 }, { sparse: true });

export const ChatRoom = mongoose.model("ChatRoom", ChatRoomSchema);
export const Message  = mongoose.model("Message",  MessageSchema);