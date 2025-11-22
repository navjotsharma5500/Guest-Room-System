import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    guestName: { type: String, required: true },
    guestEmail: { type: String, required: true },
    guestPhone: { type: String, required: true },

    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    roomNo: { type: String, required: true },

    // Reference to hostel
    hostel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hostel",
      required: true
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending"
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    tokenUsed: { type: Boolean, default: false }
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
