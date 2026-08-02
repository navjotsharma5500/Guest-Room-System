import mongoose from "mongoose";

const campusFeedbackSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userName: { type: String, required: true, trim: true },
    userEmail: { type: String, required: true, trim: true, lowercase: true },
    userPhoto: { type: String, trim: true, default: "" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    submittedAt: { type: Date, default: Date.now, index: true },
    approvedAt: { type: Date, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectedAt: { type: Date, default: null },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    submissionFingerprint: { type: String, default: null },
    submissionWindow: { type: Number, default: null },
  },
  { timestamps: true }
);

campusFeedbackSchema.index(
  { userId: 1, submissionFingerprint: 1, submissionWindow: 1 },
  {
    unique: true,
    partialFilterExpression: {
      submissionFingerprint: { $type: "string" },
      submissionWindow: { $type: "number" },
    },
  }
);

export default mongoose.model("CampusFeedback", campusFeedbackSchema);
