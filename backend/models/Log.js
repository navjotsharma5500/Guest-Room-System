import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    action: { type: String, required: true },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    meta: {
      type: Object,
      default: {}
    }
  },
  { timestamps: true }
);

export default mongoose.model("Log", logSchema);
