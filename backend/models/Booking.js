import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    guestName: String,
    guestEmail: String,
    guestPhone: String,

    hostel: { type: mongoose.Schema.Types.ObjectId, ref: "Hostel" },
    roomNo: String,

    from: Date,
    to: Date,

    amount: Number, // 0 → free, >0 paid

    status: {
      type: String,
      enum: ["pending", "approved", "cancelled"],
      default: "pending"
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
