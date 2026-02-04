// backend/models/SocietyNameSuggestion.js
import mongoose from 'mongoose';

const societyNameSuggestionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  lastUsed: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

societyNameSuggestionSchema.index({ name: 'text' });

export default mongoose.model('SocietyNameSuggestion', societyNameSuggestionSchema);