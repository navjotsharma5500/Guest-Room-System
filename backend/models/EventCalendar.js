// backend/models/EventCalendar.js
import mongoose from 'mongoose';

const eventCalendarSchema = new mongoose.Schema({
  // Event Information
  eventName: {
    type: String,
    required: true,
    trim: true,
  },
  societyName: {
    type: String,
    required: true,
    trim: true,
  },
  eventDate: {
    type: String, // Format: YYYY-MM-DD
    required: true,
  },
  eventTime: {
    type: String, // Format: HH:MM AM/PM
    required: true,
  },
  
  // Hall Information
  eventHall: {
    hall: {
      type: String,
      required: true,
    },
    roomNo: {
      type: String,
      required: true,
    }
  },

  // Attachments
  attachments: [{
    type: String, // ImageKit URLs
    required: true,
  }],

  // Creator Info
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },

  // Status
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming',
  },

  // Google Calendar Integration
  googleCalendarEventId: {
    type: String,
    default: null,
  },

  // Auto-sync with Hall Booking
  linkedHallBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'HallBooking',
    default: null,
  },

}, {
  timestamps: true,
});

// Indexes for faster queries
eventCalendarSchema.index({ eventDate: 1 });
eventCalendarSchema.index({ status: 1 });
eventCalendarSchema.index({ societyName: 1 });
eventCalendarSchema.index({ eventName: 1 });

// Auto-update status based on date
eventCalendarSchema.pre('save', function(next) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const eventDate = new Date(this.eventDate);
  eventDate.setHours(0, 0, 0, 0);

  if (this.status !== 'cancelled') {
    if (eventDate < today) {
      this.status = 'completed';
    } else if (eventDate.getTime() === today.getTime()) {
      this.status = 'ongoing';
    } else {
      this.status = 'upcoming';
    }
  }

  next();
});

export default mongoose.model('EventCalendar', eventCalendarSchema);