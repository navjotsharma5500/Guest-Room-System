import mongoose from "mongoose";

export const requesterDetailsSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    contact: { type: String, required: true, trim: true },
    profilePicture: { type: String, default: "" },
    googleSub: { type: String, default: "" },
  },
  { _id: false }
);

export const supportHistorySchema = new mongoose.Schema(
  {
    action: { type: String, required: true },
    remarks: { type: String, default: "" },
    by: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    byName: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

export const baseSupportFields = {
  requesterDetails: { type: requesterDetailsSchema, required: true },
  hostel: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: "Hostel", required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
  },
  room: {
    id: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    roomNo: { type: String, required: true, trim: true },
    roomType: { type: String, default: "" },
  },
  description: { type: String, default: "", trim: true },
  urgency: {
    type: String,
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
    index: true,
  },
  isEmergency: { type: Boolean, default: false, index: true },
  status: {
    type: String,
    enum: ["open", "in_progress", "acknowledged", "resolved", "escalated", "cancelled"],
    default: "open",
    index: true,
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  remarks: { type: String, default: "" },
  history: { type: [supportHistorySchema], default: [] },
  source: { type: String, default: "qr" },
  userAgent: { type: String, default: "" },
  ipAddress: { type: String, default: "" },
};
