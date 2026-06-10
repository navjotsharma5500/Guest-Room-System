import mongoose from "mongoose";

const checklistItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    scope: {
      type: String,
      enum: ["universal", "hostel"],
      default: "universal",
      index: true,
    },
    hostel: { type: String, default: "", trim: true, index: true },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

checklistItemSchema.index({ label: 1, scope: 1, hostel: 1 }, { unique: true });

export default mongoose.model("ChecklistItem", checklistItemSchema);
