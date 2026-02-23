// backend/models/NightStudent.js
// Master student registry - populated from ResidentsList Excel upload
// Images are 100% on ImageKit, named by rollNo - NEVER stored in DB
import mongoose from 'mongoose';

const nightStudentSchema = new mongoose.Schema({
  rollNo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true,
    index: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  // Stored as 10-digit local number (stripped +91), or raw for non-IN
  contact: {
    type: String,
    trim: true,
    default: '',
  },
  // From Excel: Building_name e.g. "Agira Hall (A)"
  hostel: {
    type: String,
    trim: true,
    default: '',
  },
  // From Excel: Room no e.g. "A-253"
  roomNo: {
    type: String,
    trim: true,
    default: '',
  },
  // M / F
  gender: {
    type: String,
    enum: ['M', 'F', ''],
    default: '',
  },
  branch: {
    type: String,
    trim: true,
    default: '',
  },
  course: {
    type: String,
    trim: true,
    default: '',
  },
  activeStatus: {
    type: String,
    default: 'Active',
  },

  // ImageKit base path only - no binary in DB ever
  // Pattern: IMAGEKIT_URL_ENDPOINT + IMAGEKIT_STUDENT_FOLDER + "/" + rollNo
  // Actual file: <rollNo>_<suffix>.jpg (suffix managed by ImageKit)
  profileImageUrl: {
    type: String,
    default: '',
  },

  // Defaulter state - managed by scan + cron only
  isDefaulter: {
    type: Boolean,
    default: false,
  },
  defaulterCount: {
    type: Number,
    default: 0,
  },
  defaulterBlocked: {
    type: Boolean,
    default: false,
  },

  // Rollback audit trail
  rolledBackBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  rolledBackAt: {
    type: Date,
    default: null,
  },
  rollbackReason: {
    type: String,
    default: '',
  },
}, {
  timestamps: true,
  collection: 'night_students',
});

nightStudentSchema.index({ rollNo: 1 });
nightStudentSchema.index({ email: 1 });
nightStudentSchema.index({ hostel: 1 });
nightStudentSchema.index({ isDefaulter: 1 });
nightStudentSchema.index({ defaulterBlocked: 1 });

const NightStudent = mongoose.models.NightStudent
  || mongoose.model('NightStudent', nightStudentSchema);

export default NightStudent;
