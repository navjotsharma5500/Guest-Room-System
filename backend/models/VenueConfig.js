import mongoose from "mongoose";

const venueRoomSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    // Names this room was known by before a rename, most recent first. Used
    // only to keep booking-conflict detection recognizing legacy bookings
    // stored under an old name — never shown in the UI or otherwise acted on.
    previousNames: { type: [String], default: [] },
  },
  { _id: false }
);

const venueSectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    rooms: { type: [venueRoomSchema], default: [] },
  },
  { _id: false }
);

const venueMainTabSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    sections: { type: [venueSectionSchema], default: [] },
  },
  { _id: false }
);

const venueConfigSchema = new mongoose.Schema(
  {
    key: { type: String, trim: true, unique: true, sparse: true },
    mainTabs: { type: [venueMainTabSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "venueconfigs",
  }
);

const VenueConfig =
  mongoose.models.VenueConfig ||
  mongoose.model("VenueConfig", venueConfigSchema);

export default VenueConfig;
