import mongoose from "mongoose";

const societyNightRequestSchema = new mongoose.Schema(
  {
    student_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NightStudent",
      required: true,
      index: true,
    },
    student_email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    society_name: {
      type: String,
      required: true,
      trim: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    location: {
      type: String,
      required: true,
      trim: true,
    },
    event_date: {
      type: String,
      required: true,
      trim: true,
    },
    start_time: {
      type: String,
      required: true,
      trim: true,
    },
    end_date: {
      type: String,
      required: true,
      trim: true,
    },
    end_time: {
      type: String,
      required: true,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
  },
  {
    collection: "society_night_requests",
    timestamps: { createdAt: "created_at", updatedAt: false },
  }
);

societyNightRequestSchema.index({ student_id: 1, created_at: -1 });

const SocietyNightRequest =
  mongoose.models.SocietyNightRequest ||
  mongoose.model("SocietyNightRequest", societyNightRequestSchema);

export default SocietyNightRequest;
