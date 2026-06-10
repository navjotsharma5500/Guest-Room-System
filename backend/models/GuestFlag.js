import mongoose from "mongoose";

const guestFlagSchema = new mongoose.Schema(
  {
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", default: null },
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true, index: true },
    guestName: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, index: true, default: "" },
    contact: { type: String, trim: true, index: true, default: "" },
    hostel: { type: String, trim: true, index: true, default: "" },
    roomNo: { type: String, trim: true, default: "" },
    flagType: {
      type: String,
      enum: ["yellow", "orange", "red"],
      required: true,
      index: true,
    },
    remarks: { type: String, trim: true, required: true },
    attachments: {
      type: [String],
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one attachment is required",
      },
      default: [],
    },
    flaggedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    severityScore: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
    override: {
      isOverridden: { type: Boolean, default: false, index: true },
      overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
      overriddenAt: { type: Date, default: null },
      remarks: { type: String, trim: true, default: "" },
    },
  },
  { timestamps: true }
);

guestFlagSchema.index({ email: 1, contact: 1, isActive: 1, "override.isOverridden": 1 });
guestFlagSchema.index({ bookingId: 1, createdAt: -1 });

export default mongoose.model("GuestFlag", guestFlagSchema);
