// backend/models/NightSystemSettings.js
import mongoose from 'mongoose';

const nightSystemSettingsSchema = new mongoose.Schema({
  _singleton: { type: String, default: 'settings', unique: true },

  // Timer durations
  defaultToVenueTimerMinutes:  { type: Number, default: 30 },
  defaultToHostelTimerMinutes: { type: Number, default: 30 },

  // Strike limit before permanent block
  defaulterStrikeLimit: { type: Number, default: 3 },

  // Cutoff time for students to apply (e.g. "21:00")
  lastApplyAllowedTime: { type: String, default: '21:00' },

  // Latest allowed scan times by role (24h format)
  lastScanTimeCaretaker: { type: String, default: '21:00' },
  lastScanTimeGuard: { type: String, default: '23:30' },

  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  updatedAt: { type: Date, default: null },
}, {
  timestamps: true,
  collection: 'night_system_settings',
});

const NightSystemSettings = mongoose.models.NightSystemSettings
  || mongoose.model('NightSystemSettings', nightSystemSettingsSchema);

// Singleton getter - always returns the one settings doc
export const getSettings = async () => {
  let settings = await NightSystemSettings.findOne({ _singleton: 'settings' });
  if (!settings) {
    settings = await NightSystemSettings.create({ _singleton: 'settings' });
  }
  return settings;
};

export default NightSystemSettings;
