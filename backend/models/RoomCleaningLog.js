import mongoose from "mongoose";

const cleaningChecklistEntrySchema = new mongoose.Schema(
  {
    checklistItemId: { type: mongoose.Schema.Types.ObjectId, ref: "ChecklistItem", default: null },
    label: { type: String, required: true },
    checked: { type: Boolean, default: false },
    remarks: { type: String, default: "" },
    damageNotes: { type: String, default: "" },
    missingItemNotes: { type: String, default: "" },
  },
  { _id: false }
);

const roomCleaningLogSchema = new mongoose.Schema(
  {
    hostel: { type: String, required: true, index: true },
    roomNo: { type: String, required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null, index: true },
    status: {
      type: String,
      enum: ["pending", "checklist_submitted", "cleaned"],
      default: "pending",
      index: true,
    },
    checklistItems: { type: [cleaningChecklistEntrySchema], default: [] },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    submittedAt: { type: Date, default: null },
    markedCleanBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    markedCleanAt: { type: Date, default: null },
  },
  { timestamps: true }
);

roomCleaningLogSchema.index({ hostel: 1, roomNo: 1, status: 1 });
roomCleaningLogSchema.index({ bookingId: 1, status: 1 });

export default mongoose.model("RoomCleaningLog", roomCleaningLogSchema);
