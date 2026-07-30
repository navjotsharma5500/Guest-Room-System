import mongoose from "mongoose";

const publicCardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    locked: { type: Boolean, default: false },
    lockMessage: { type: String, trim: true, default: "" },
    title: { type: String, trim: true, default: "" },
    subtitle: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    shortDescription: { type: String, trim: true, default: "" },
    detailedDescription: { type: String, trim: true, default: "" },
    image: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "" },
    working: { type: String, trim: true, default: "" },
    destination: { type: String, trim: true, default: "" },
    action: { type: String, trim: true, default: "" },
    icon: { type: String, trim: true, default: "" },
    badge: { type: String, trim: true, default: "" },
    comingSoon: { type: Boolean, default: false },
    accentColor: { type: String, trim: true, default: "" },
    cardColor: { type: String, trim: true, default: "" },
    ctaText: { type: String, trim: true, default: "" },
    order: { type: Number, default: 0 },
    features: [{ type: String, trim: true }],
  },
  { _id: false }
);

const publicUiConfigSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: "global" },
    widgets: {
      developerText: {
        type: String,
        trim: true,
        default: "Created by DoSA Office",
      },
      poweredByText: {
        type: String,
        trim: true,
        default: "Powered by Thapar Institute of Engineering & Technology",
      },
      maintainedByText: {
        type: String,
        trim: true,
        default: "Created and Maintained by DoSA Office",
      },
      systemStatusText: {
        type: String,
        trim: true,
        default: "System Online",
      },
      systemOnline: { type: Boolean, default: true },
      echoEnabled: { type: Boolean, default: true },
    },
    selector: {
      title: { type: String, trim: true, default: "Thapar Operations" },
      subtitle: {
        type: String,
        trim: true,
        default: "Centralized portal for Guest Rooms, Venues & Student Services",
      },
      themePreset: {
        type: String,
        trim: true,
        default: "light",
        enum: ["light", "cool", "warm", "slate"],
      },
      cardStyle: {
        type: String,
        trim: true,
        default: "default",
        enum: ["default", "shadow", "outline", "glass", "solid"],
      },
      layoutStyle: {
        type: String,
        trim: true,
        default: "grid-3",
        enum: ["grid-3", "grid-4", "grid-2", "list", "bento", "featured", "compact", "horizontal", "masonry"],
      },
      accentColor: {
        type: String,
        trim: true,
        default: "#c62828",
      },
      cardOrder: [{ type: String, trim: true }],
      cards: [publicCardSchema],
    },
    header: { type: mongoose.Schema.Types.Mixed, default: {} },
    navigation: { type: mongoose.Schema.Types.Mixed, default: [] },
    hero: { type: mongoose.Schema.Types.Mixed, default: {} },
    sections: { type: mongoose.Schema.Types.Mixed, default: [] },
    timeline: { type: mongoose.Schema.Types.Mixed, default: [] },
    developers: { type: mongoose.Schema.Types.Mixed, default: [] },
    footer: { type: mongoose.Schema.Types.Mixed, default: {} },
    echo: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model("PublicUiConfig", publicUiConfigSchema);
