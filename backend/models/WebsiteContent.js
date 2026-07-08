import mongoose from "mongoose";

const websiteContentSchema = new mongoose.Schema(
  {
    section: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

websiteContentSchema.index({ section: 1, isPublished: 1 });

export default mongoose.model("WebsiteContent", websiteContentSchema);
