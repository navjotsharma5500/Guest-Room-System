// backend/models/EventNameSuggestion.js
import mongoose from 'mongoose';

const eventNameSuggestionSchema = new mongoose.Schema({
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

eventNameSuggestionSchema.index({ name: 'text' });

export default mongoose.model('EventNameSuggestion', eventNameSuggestionSchema);