import mongoose from "mongoose";

const publicCardSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    title: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
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
        default: "glass",
        enum: ["glass", "solid", "outline"],
      },
      layoutStyle: {
        type: String,
        trim: true,
        default: "grid-3",
        enum: ["grid-3", "grid-2", "list"],
      },
      cardOrder: [{ type: String, trim: true }],
      cards: [publicCardSchema],
    },
  },
  { timestamps: true }
);

export default mongoose.model("PublicUiConfig", publicUiConfigSchema);
