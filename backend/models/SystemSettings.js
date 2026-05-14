import mongoose from "mongoose";

const dashboardRegistryItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    path: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    icon: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false }
);

const systemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: "global", unique: true },
    bookingDays: {
      guestMaxRequestDays: { type: Number, default: 5, min: 1 },
      managerMaxDirectBookingDays: { type: Number, default: 3, min: 1 },
      caretakerMaxDirectBookingDays: { type: Number, default: 3, min: 1 },
    },
    extensionRules: {
      maxExtensionRequestDays: { type: Number, default: 30, min: 1 },
      coWardenLevelDays: { type: Number, default: 5, min: 1 },
      adosaLevelDays: { type: Number, default: 10, min: 1 },
      adminLevelDays: { type: Number, default: 30, min: 1 },
    },
    emailSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    dashboardRegistry: {
      type: [dashboardRegistryItemSchema],
      default: [
        {
          key: "guestRoom",
          label: "Guest Room Booking",
          path: "/dashboard",
          active: true,
          icon: "Building2",
          description: "Guest room operations, bookings and approvals",
        },
        {
          key: "venue",
          label: "Venue Booking",
          path: "/venue-booking",
          active: true,
          icon: "MapPinned",
          description: "Venue booking operations and event management",
        },
        {
          key: "night",
          label: "Night Pass",
          path: "/night-dashboard",
          active: false,
          icon: "MoonStar",
          description: "Night pass operations",
        },
      ],
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("SystemSettings", systemSettingsSchema);
