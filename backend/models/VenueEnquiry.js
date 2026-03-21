import mongoose from "mongoose";

const venueEnquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    contact: {
      type: String,
      required: true,
      trim: true,
      match: [/^[0-9]{10}$/, "Please enter a valid 10-digit contact number"],
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    hall: {
      type: String,
      required: true,
      trim: true,
    },
    roomNo: {
      type: String,
      required: true,
      trim: true,
    },
    societyName: {
      type: String,
      trim: true,
      required: true,
      default: "",
    },
    eventName: {
      type: String,
      trim: true,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      required: true,
      maxlength: 2000,
    },
    purpose: {
      type: String,
      trim: true,
      default: "",
    },
    checkInDate: {
      type: String,
      required: true,
    },
    checkInTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"],
    },
    checkOutDate: {
      type: String,
      required: true,
    },
    checkOutTime: {
      type: String,
      required: true,
      match: [/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Time must be in HH:MM format"],
    },
    files: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 5,
        message: "Maximum 5 files allowed",
      },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "booked"],
      default: "pending",
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    bookingIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "VenueBooking",
      },
    ],
  },
  {
    timestamps: true,
  }
);

venueEnquirySchema.index({ status: 1, submittedAt: -1 });
venueEnquirySchema.index({ checkInDate: 1, checkOutDate: 1 });
venueEnquirySchema.index({ email: 1 });

venueEnquirySchema.pre("save", function validateDateRange(next) {
  if (!this.checkInDate || !this.checkOutDate || !this.checkInTime || !this.checkOutTime) {
    return next();
  }

  const start = new Date(`${this.checkInDate}T${this.checkInTime}`);
  const end = new Date(`${this.checkOutDate}T${this.checkOutTime}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return next(new Error("Invalid check-in/check-out date or time"));
  }
  if (end <= start) {
    return next(new Error("Check-out must be after check-in"));
  }
  return next();
});

export default mongoose.model("VenueEnquiry", venueEnquirySchema);
