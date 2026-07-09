import mongoose from "mongoose";

const publicGuestRoomVisitSchema = new mongoose.Schema(
  {
    visitorKeyHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    firstSeenAt: {
      type: Date,
      default: Date.now,
    },
    lastCountedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    count: {
      type: Number,
      default: 1,
      min: 1,
    },
  },
  { timestamps: true }
);

export default mongoose.model("PublicGuestRoomVisit", publicGuestRoomVisitSchema);
