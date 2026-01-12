import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
  type: String, // enquiry / booking
  action: String, // approved / rejected
  data: Object,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("History", historySchema);
