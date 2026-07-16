import mongoose from "mongoose";

const websiteContentVersionSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sourceContentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WebsiteContent",
      default: null,
    },
    restoredFromVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WebsiteContentVersion",
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

websiteContentVersionSchema.index({ section: 1, createdAt: -1 });

export default mongoose.model("WebsiteContentVersion", websiteContentVersionSchema);
