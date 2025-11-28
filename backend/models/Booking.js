import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    guestName: { type: String, required: true },
    guestPhone: { type: String, required: true },
    guestAddress: { type: String, required: true },

    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true,
    },

    roomNumber: { type: String, required: true },

    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["booked", "checkedout", "cancelled"],
      default: "booked",
    },

    tokenUsed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
