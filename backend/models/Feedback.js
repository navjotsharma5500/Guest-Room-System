// models/Feedback.js
import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema(
  {
    // Link to booking
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },

    // Guest Information (denormalized for quick access)
    guest: { type: String, required: true },
    email: { type: String, required: true },
    contact: { type: String, required: true },
    hostel: { type: String, required: true },
    roomNo: { type: String, required: true },

    // Stay dates
    checkInDate: { type: Date },
    checkOutDate: { type: Date },

    // Rating (1-5 stars)
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    // Rating label based on stars
    ratingLabel: {
      type: String,
      enum: ["Poor", "Below Average", "Average", "Good", "Outstanding"],
      required: true,
    },

    // Optional remarks
    remarks: {
      type: String,
      default: "",
    },

    // Optional attachments (ImageKit URLs)
    attachments: {
      type: [String],
      default: [],
      validate: [arrayLimit, "Cannot upload more than 5 attachments"],
    },

    // Who gave the feedback
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Submission timestamp
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Validation: Max 5 attachments
function arrayLimit(val) {
  return val.length <= 5;
}

// Index for faster queries
FeedbackSchema.index({ bookingId: 1 });
FeedbackSchema.index({ hostel: 1 });
FeedbackSchema.index({ rating: 1 });
FeedbackSchema.index({ submittedAt: -1 });
FeedbackSchema.index({ guest: 1 });
FeedbackSchema.index({ email: 1 });
FeedbackSchema.index({ contact: 1 });

// Ensure one feedback per booking
FeedbackSchema.index({ bookingId: 1 }, { unique: true });

export default mongoose.model("Feedback", FeedbackSchema);