// backend/models/NightPermissionList.js
import mongoose from 'mongoose';

const studentEntrySchema = new mongoose.Schema({
  rollNo: { type: String, required: true, uppercase: true, trim: true },
  name:   { type: String, required: true, trim: true },
  email:  { type: String, lowercase: true, trim: true, default: '' },
  hostel: { type: String, default: '' },
  roomNo: { type: String, default: '' },
  // Per-student approval status set by ADOSA
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING',
  },
  rejectionReason: { type: String, default: '' },
}, { _id: false });

const nightPermissionListSchema = new mongoose.Schema({
  societyName: { type: String, required: true, trim: true },
  eventName:   { type: String, required: true, trim: true },
  venueName:   { type: String, required: true, trim: true },
  venueHall:   { type: String, default: '' },

  startDateTime: { type: Date, required: true },
  endDateTime:   { type: Date, required: true },

  description: { type: String, default: '' },
  attachments: [{ type: String }],

  students: [studentEntrySchema],

  // Approval pipeline status
  status: {
    type: String,
    enum: [
      'DRAFT',
      'PENDING_PRESIDENT',
      'PENDING_ADOSA',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ],
    default: 'DRAFT',
  },

  // Who created (GEN_SEC role user from existing User model)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdByName: { type: String, default: '' },

  // President review
  presidentReviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  presidentReviewedAt:  { type: Date, default: null },
  presidentRemarks:     { type: String, default: '' },

  // ADOSA review
  adosaReviewedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  adosaReviewedAt:  { type: Date, default: null },
  adosaRemarks:     { type: String, default: '' },

  // Linked venue booking created on ADOSA approval
  venueBookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'VenueBooking',
    default: null,
  },

  // Consolidation key: same venue + overlapping time = same key
  consolidationKey: { type: String, default: '' },

  // For cancellation
  cancelledBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  cancelledAt:  { type: Date, default: null },
  cancelReason: { type: String, default: '' },

}, {
  timestamps: true,
  collection: 'night_permission_lists',
});

nightPermissionListSchema.index({ status: 1 });
nightPermissionListSchema.index({ startDateTime: 1 });
nightPermissionListSchema.index({ createdBy: 1 });
nightPermissionListSchema.index({ 'students.rollNo': 1 });

const NightPermissionList = mongoose.models.NightPermissionList
  || mongoose.model('NightPermissionList', nightPermissionListSchema);

export default NightPermissionList;
