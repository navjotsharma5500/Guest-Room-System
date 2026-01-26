import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema({
  roomNo: { type: String, required: true },
  roomType: { type: String, default: "Guest Room" },
  caretakerEmail: { type: String },
  wardenEmail: { type: String },
  
  // ✅ NEW: Room blocking fields
  isBlocked: { type: Boolean, default: false },
  blockedTill: { type: Date, default: null },
  blockRemarks: { type: String, default: null },
  blockAttachments: { type: [String], default: [] },
  blockedAt: { type: Date, default: null },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
});

const HostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    caretakerEmail: { type: String, required: true },
    wardenEmail: { type: String, required: true },
    active: { type: Boolean, default: true },
    rooms: [RoomSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Hostel", HostelSchema);