import mongoose from "mongoose";

const logSchema = new mongoose.Schema({
  action: String,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  details: Object,
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Log", logSchema);
