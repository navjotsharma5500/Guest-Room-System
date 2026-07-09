import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema({
  roomNo: { type: String, required: true },
  roomType: { type: String, default: "Guest Room" },
  guestRoom: { type: Boolean, default: true },
  guestCapacity: { type: Number, default: 2 },
  caretakerEmail: { type: String },
  wardenEmail: { type: String },
  // ✅ ADD THESE BLOCKING FIELDS
  isBlocked: { type: Boolean, default: false },
  blockedTill: { type: Date },
  blockRemarks: { type: String },
  blockAttachments: [{ type: String }],
  blockedAt: { type: Date },
  blockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  roomState: {
    type: String,
    enum: ["available", "occupied", "cleaning_pending", "maintenance_blocked"],
    default: "available",
  },
  cleaningPendingSince: { type: Date },
  lastCheckoutBookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking" },
  lastCleanedAt: { type: Date },
  lastCleanedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const HostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    hostelType: {
      type: String,
      enum: ["boys", "girls", "future", "co-ed"],
      default: "boys",
    },
    caretakerEmail: { type: String, required: true },
    wardenEmail: { type: String, required: true },
    active: { type: Boolean, default: true },
    rooms: [RoomSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Hostel", HostelSchema);
