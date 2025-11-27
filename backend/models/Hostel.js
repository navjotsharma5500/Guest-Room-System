import mongoose from "mongoose";

const hostelSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    block: { type: String, required: true },
    type: { type: String, enum: ["boys", "girls"], required: true },
    totalRooms: { type: Number, required: true }
  },
  { timestamps: true }
);

export default mongoose.model("Hostel", hostelSchema);
