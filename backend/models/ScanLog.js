// backend/models/ScanLog.js
// Immutable audit trail - never delete, never update
import mongoose from 'mongoose';

const scanLogSchema = new mongoose.Schema({
  rollNo:    { type: String, required: true, uppercase: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'NightStudent', default: null },
  permissionSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PermissionSession', default: null },

  scanType: {
    type: String,
    enum: ['HOSTEL_EXIT', 'VENUE_ENTRY', 'VENUE_EXIT', 'HOSTEL_ENTRY'],
    required: true,
  },

  // Who scanned (User from main project - CARETAKER or GUARD role)
  scannedByUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  scannedByName: { type: String, default: '' },

  scanLocation: {
    type: String,
    enum: ['HOSTEL', 'VENUE'],
    required: true,
  },

  scanTime: {
    type: Date,
    required: true,
    default: Date.now,
  },

  result: {
    type: String,
    enum: ['VALID', 'INVALID', 'DEFAULTER'],
    required: true,
  },

  reason: { type: String, default: '' },
}, {
  timestamps: true,
  collection: 'scan_logs',
});

scanLogSchema.index({ rollNo: 1, scanTime: -1 });
scanLogSchema.index({ result: 1 });
scanLogSchema.index({ scanTime: -1 });

const ScanLog = mongoose.models.ScanLog
  || mongoose.model('ScanLog', scanLogSchema);

export default ScanLog;
