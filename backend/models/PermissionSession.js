// backend/models/PermissionSession.js
// One session per approved student per permission list
// Tracks the 4-phase scan lifecycle
import mongoose from 'mongoose';

const permissionSessionSchema = new mongoose.Schema({
  permissionListId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NightPermissionList',
    required: true,
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'NightStudent',
    required: true,
  },
  rollNo: { type: String, required: true, uppercase: true },
  name:   { type: String, required: true },

  venueName: { type: String, default: '' },
  venueHall: { type: String, default: '' },

  permissionStartDateTime: { type: Date, required: true },
  permissionEndDateTime:   { type: Date, required: true },

  // Timer durations (copied from settings at session creation time)
  allowedToVenueMinutes:  { type: Number, default: 30 },
  allowedToHostelMinutes: { type: Number, default: 30 },

  // Phase state machine:
  // NOT_STARTED → GOING_TO_VENUE → AT_VENUE → RETURNING_TO_HOSTEL → COMPLETED / DEFAULTER
  currentPhase: {
    type: String,
    enum: ['NOT_STARTED', 'GOING_TO_VENUE', 'AT_VENUE', 'RETURNING_TO_HOSTEL', 'COMPLETED', 'DEFAULTER'],
    default: 'NOT_STARTED',
  },

  // Scan timestamps
  hostelExitAt:    { type: Date, default: null },
  venueArrivalAt:  { type: Date, default: null },
  venueExitAt:     { type: Date, default: null },
  hostelArrivalAt: { type: Date, default: null },

  // Deadlines (computed at scan time)
  deadlineToVenue:  { type: Date, default: null },
  deadlineToHostel: { type: Date, default: null },

  // Defaulter info
  isDefaulter:     { type: Boolean, default: false },
  defaulterReason: { type: String, default: '' },

}, {
  timestamps: true,
  collection: 'permission_sessions',
});

permissionSessionSchema.index({ studentId: 1, currentPhase: 1 });
permissionSessionSchema.index({ permissionListId: 1 });
permissionSessionSchema.index({ rollNo: 1 });
permissionSessionSchema.index({ currentPhase: 1, deadlineToVenue: 1 });
permissionSessionSchema.index({ currentPhase: 1, deadlineToHostel: 1 });

const PermissionSession = mongoose.models.PermissionSession
  || mongoose.model('PermissionSession', permissionSessionSchema);

export default PermissionSession;
