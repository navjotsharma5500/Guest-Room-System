// backend/models/EventNameSuggestion.js
import mongoose from 'mongoose';

const DEFAULT_EVENT_NAMES_RAW = [
  "SATURNALIA",
  "THAPAR FOOD FESTIVAL",
  "FROSH WEEK",
  "URJA",
  "HACKTU",
  "CP CONTEST",
  "CHAKRAVUYH",
  "MIRAGE",
  "HACATHON",
  "MAKEATHON",
  "SPEAKER SESSION",
  "TECHMEET",
  "AI-ML WORKSHOP",
  "HACKOWASP",
  "CYBERSECURITY WORKSHOP",
  "IZHAAR",
  "MUDRANITE & SUR NITE",
  "VIRSA MELA",
  "GURPURAB",
  "DHAWANI",
  "ARTIST NIGHT",
  "KHAYAL",
  "POETRY SESSION",
  "NUKKAD NATAK (TNT)",
  "BLOOD DONATION CAMP",
  "SWATCHTA HI SEVA",
  "HAR GHAR TIRANGA",
  "YOUTH DAY",
  "EXPERT TALKS",
  "GENDER SENTIVITY EVENTS",
  "YOGA SESSIONS",
  "LA FIESTA",
  "DONATION DRIVES",
  "SCHOOL VISIT",
  "OLD AGE HOME VISIT",
  "SARV-SAKTI EVENT",
  "CLOTH DONATION DRIVES",
  "PRATIGYA SESSIONS FOR POOR CHILDRENS",
  "ECOGNIGMA",
  "ESUMMIT",
  "IPL & UEFA SESSION",
  "Luminescence",
  "Awareness session",
  "VORTEX",
  "ENVOYAGE",
  "THAPAR MUN SESSION",
  "SHOONYA",
  "GLOBAL VILLAGE",
  "BAL KALAKAR",
  "RED DAY",
  "MAIN CONFERENCE",
  "EDUCATIONAL TOURS",
  "DANCE EVENTS",
  "CASCADE",
  "CINEYOUTH",
  "TOASTTALKS",
  "ARAMBH",
  "KALIEDOSCOPE",
  "PARTS MAKING",
  "EUREKA",
  "ORION",
  "COLLOQUIM",
  "PLAYNNOVATE",
  "EXPERT TALK",
  "FLAGATHON",
];

const normalizeName = (value = "") => String(value || "").trim().toLowerCase();

export const DEFAULT_EVENT_NAMES = Array.from(
  DEFAULT_EVENT_NAMES_RAW.reduce((map, value) => {
    const name = String(value || "").trim();
    if (!name) return map;
    const key = normalizeName(name);
    if (!map.has(key)) map.set(key, name);
    return map;
  }, new Map()).values()
);

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

const EventNameSuggestion = mongoose.models.EventNameSuggestion
  || mongoose.model('EventNameSuggestion', eventNameSuggestionSchema);

export const seedDefaultEventSuggestions = async () => {
  if (!Array.isArray(DEFAULT_EVENT_NAMES) || DEFAULT_EVENT_NAMES.length === 0) return;

  const now = new Date();
  const operations = DEFAULT_EVENT_NAMES.map((name) => ({
    updateOne: {
      filter: { name },
      update: {
        $setOnInsert: {
          name,
          usageCount: 0,
          lastUsed: now,
        },
      },
      upsert: true,
    },
  }));

  await EventNameSuggestion.bulkWrite(operations, { ordered: false });
};

export default EventNameSuggestion;
