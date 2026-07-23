import mongoose from "mongoose";

const masterEventCalendarOverrideSchema = new mongoose.Schema({
  unifiedId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  sourceType: {
    type: String,
    default: "",
  },
  sourceId: {
    type: String,
    default: "",
  },
  hiddenFromMasterCalendar: {
    type: Boolean,
    default: false,
  },
  hiddenAt: {
    type: Date,
    default: null,
  },
  hiddenBy: {
    type: String,
    default: "",
  },
  hiddenReason: {
    type: String,
    default: "",
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
    default: "",
  },
  conflictResolutionRemarks: {
    type: String,
    default: "",
  },
}, {
  timestamps: true,
});

export default mongoose.model("MasterEventCalendarOverride", masterEventCalendarOverrideSchema);
