import mongoose from "mongoose";

const tokenRequestSchema = new mongoose.Schema(
  {
    guestEmail: { type: String, required: true },
    guestName: { type: String, required: true },

    reason: { type: String, required: true },

    approved: { type: Boolean, default: false },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    token: { type: String, default: null }
  },
  { timestamps: true }
);

export default mongoose.model("TokenRequest", tokenRequestSchema);
