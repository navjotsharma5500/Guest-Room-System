import mongoose from "mongoose";

const emailLogSchema = new mongoose.Schema(
  {
    to: String,
    subject: String,
    type: String,
    bookingId: mongoose.Schema.Types.ObjectId,
    status: { type: String, enum: ["sent", "failed"] },
    error: String,
  },
  { timestamps: true }
);

export default mongoose.model("EmailLog", emailLogSchema);
