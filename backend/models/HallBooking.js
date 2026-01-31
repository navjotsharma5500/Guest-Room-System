// backend/models/HallBooking.js
import mongoose from 'mongoose';

const hallBookingSchema = new mongoose.Schema({
  // Hall & Room Info
  hall: {
    type: String,
    required: true,
  },
  roomNo: {
    type: String,
    required: true,
  },

  // Booking Information
  name: {
    type: String,
    required: true,
    trim: true,
  },
  societyName: {
    type: String,
    required: true,
    trim: true,
  },
  eventName: {
    type: String,
    required: true,
    trim: true,
  },
  contact: {
    type: String,
    required: true,
    match: /^\d{10}$/,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: /@thapar\.edu$/,
  },

  // Date & Time
  checkInDate: {
    type: String,
    required: true,
  },
  checkInTime: {
    type: String,
    required: true,
  },
  checkOutDate: {
    type: String,
    required: true,
  },
  checkOutTime: {
    type: String,
    required: true,
  },

  // Additional Info
  purpose: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  attachments: [{
    type: String,
  }],

  // Status
  status: {
    type: String,
    enum: ['booked', 'checked_in', 'checked_out', 'cancelled', 'no_show'],
    default: 'booked',
  },

  // Extension Info
  extensionHistory: [{
    originalCheckOutDate: String,
    originalCheckOutTime: String,
    newCheckOutDate: String,
    newCheckOutTime: String,
    remarks: String,
    extendedAt: {
      type: Date,
      default: Date.now,
    },
  }],

  // Cancellation Info
  cancellationRemarks: {
    type: String,
    default: '',
  },
  cancelledAt: {
    type: Date,
  },

  // Creator Info
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // 🆕 NEW: Type identifiers
  bookingType: {
    type: String,
    default: 'hall',
    immutable: true,
  },

  isHallBooking: {
    type: Boolean,
    default: true,
    immutable: true,
  },

  // 🆕 NEW: Compatibility fields
  guest: {
    type: String,
    default: function() {
      return this.name;
    }
  },

  // Timestamps
  }, {
    timestamps: true,
  });

// Index for faster queries
hallBookingSchema.index({ hall: 1, roomNo: 1, checkInDate: 1, checkOutDate: 1 });
hallBookingSchema.index({ status: 1 });
hallBookingSchema.index({ email: 1 });

// Virtual fields for compatibility
hallBookingSchema.virtual('from').get(function() {
  return this.checkInDate;
});

hallBookingSchema.virtual('to').get(function() {
  return this.checkOutDate;
});

// Ensure virtuals are included in JSON
hallBookingSchema.set('toJSON', { virtuals: true });
hallBookingSchema.set('toObject', { virtuals: true });

export default mongoose.model('HallBooking', hallBookingSchema);