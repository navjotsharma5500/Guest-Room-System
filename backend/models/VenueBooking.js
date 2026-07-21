// backend/models/VenueBooking.js
import mongoose from 'mongoose';

const venueBookingSchema = new mongoose.Schema({
  // Venue & Room Info
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
    trim: true,
    default: '',
  },
  eventName: {
    type: String,
    required: true,
    trim: true,
  },
  department: {
    type: String,
    trim: true,
    default: '',
  },
  contact: {
    type: String,
    default: '',
    validate: {
      validator: function(v) {
        // Empty string is valid (optional), or must be exactly 10 digits
        return v === '' || /^\d{10}$/.test(v);
      },
      message: 'Contact must be exactly 10 digits if provided'
    }
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    match: /@thapar\.edu$/,
  },
  societyEmail: {
    type: String,
    default: "",
    lowercase: true,
  },
  presidentEmail: {
    type: String,
    default: "",
    lowercase: true,
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

  bookingFor: {
    type: String,
    enum: ['student_calendar', 'institute_calendar'],
    default: 'institute_calendar',
    required: true,
  },

  conflictResolved: {
    type: Boolean,
    default: false,
  },
  conflictResolvedAt: {
    type: Date,
    default: null,
  },
  conflictResolvedBy: {
    type: String,
    default: '',
  },
  conflictResolutionRemarks: {
    type: String,
    default: '',
  },

  // Status
  status: {
    type: String,
    enum: ['booked', 'checked_in', 'checked_out', 'cancelled', 'no_show', 'completed'],
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

  editHistory: [{
    editedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    editedAt: {
      type: Date,
      default: Date.now,
    },
    previousValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    updatedValues: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  }],

  lastEditedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  lastEditedAt: {
    type: Date,
    default: null,
  },

  // Creator Info
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },

  // Link to venue enquiry when booking is created from approved enquiry flow
  enquiryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VenueEnquiry',
    default: null,
  },

  // 🆕 NEW: Type identifiers
  bookingType: {
    type: String,
    default: 'venue',
    immutable: true,
  },

  isVenueBooking: {
    type: Boolean,
    default: true,
    immutable: true,
  },

  // Deprecated compatibility field (kept to avoid breaking old readers)
  isHallBooking: {
    type: Boolean,
    default: false,
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
    collection: 'venuebookings',
  });

// Index for faster queries
venueBookingSchema.index({ hall: 1, roomNo: 1, checkInDate: 1, checkOutDate: 1 });
venueBookingSchema.index({ status: 1 });
venueBookingSchema.index({ email: 1 });
venueBookingSchema.index({ enquiryId: 1 });
venueBookingSchema.index({ bookingFor: 1 });

// Virtual fields for compatibility
venueBookingSchema.virtual('from').get(function() {
  return this.checkInDate;
});

venueBookingSchema.virtual('to').get(function() {
  return this.checkOutDate;
});

// Ensure virtuals are included in JSON
venueBookingSchema.set('toJSON', { virtuals: true });
venueBookingSchema.set('toObject', { virtuals: true });

const VenueBooking = mongoose.models.VenueBooking
  || mongoose.model('VenueBooking', venueBookingSchema);

export default VenueBooking;
