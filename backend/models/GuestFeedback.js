// models/GuestFeedbackUpgraded.js
import mongoose from "mongoose";

const GuestFeedbackSchema = new mongoose.Schema(
  {
    // Guest Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    
    contact: {
      type: String,
      required: true,
      trim: true,
      match: /^[0-9]{10}$/,
    },
    
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    
    hostel: {
      type: String,
      required: true,
    },
    
    // âœ… NEW: Profile Picture URL from ImageKit
    profilePictureUrl: {
      type: String,
      default: "",
      trim: true,
    },
    
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
      enum: ["Poor", "Below Average", "Average", "Good", "Excellent"],
      required: true,
    },
    
    // Optional description/comments
    description: {
      type: String,
      default: "",
      trim: true,
    },
    
    // Submission timestamp
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    
    // Status for admin management
    status: {
      type: String,
      enum: ["pending", "reviewed", "archived"],
      default: "pending",
    },
    
    // Admin notes (optional)
    adminNotes: {
      type: String,
      default: "",
    },

    // âœ… NEW: Google Auth metadata (optional)
    googleAuthMetadata: {
      googleId: String,
      emailVerified: Boolean,
      locale: String,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for faster queries
GuestFeedbackSchema.index({ hostel: 1 });
GuestFeedbackSchema.index({ rating: 1 });
GuestFeedbackSchema.index({ submittedAt: -1 });
GuestFeedbackSchema.index({ email: 1 });
GuestFeedbackSchema.index({ status: 1 });

// Virtual for formatted submission date
GuestFeedbackSchema.virtual('formattedDate').get(function() {
  return this.submittedAt.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Virtual for profile picture availability
GuestFeedbackSchema.virtual('hasProfilePicture').get(function() {
  return !!this.profilePictureUrl;
});

export default mongoose.model("GuestFeedback", GuestFeedbackSchema);
