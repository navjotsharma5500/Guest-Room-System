import mongoose from "mongoose";

const BookingCounterSchema = new mongoose.Schema(
  {
    // The date itself is the primary key, making concurrent upserts atomic.
    _id: { type: String, required: true },
    sequence: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("BookingCounter", BookingCounterSchema);
