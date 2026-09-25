import mongoose from "mongoose";

export function isPublicFormUrl(value) {
  try {
    const url = new URL(value);
    return /^https?:\/\//i.test(value) && ["http:", "https:"].includes(url.protocol)
      && Boolean(url.hostname) && !url.username && !url.password;
  } catch {
    return false;
  }
}

const publicFormSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 240 },
  code: { type: String, trim: true, default: "", maxlength: 40 },
  slug: { type: String, required: true, trim: true, unique: true, maxlength: 240, match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ },
  description: { type: String, trim: true, default: "", maxlength: 4000 },
  category: { type: String, required: true, trim: true, maxlength: 160 },
  fileUrl: { type: String, required: true, maxlength: 4096, validate: { validator: isPublicFormUrl, message: "fileUrl must be an HTTP or HTTPS URL without credentials" } },
  originalFileName: { type: String, trim: true, default: "", maxlength: 240 },
  fileType: { type: String, trim: true, default: "PDF", maxlength: 40 },
  keywords: {
    type: [{ type: String, trim: true, maxlength: 100 }], default: [],
    validate: { validator: (value) => value.length <= 50, message: "At most 50 keywords are allowed" },
  },
  enabled: { type: Boolean, default: true },
  featured: { type: Boolean, default: false },
  order: { type: Number, default: 0, min: 0, max: Number.MAX_SAFE_INTEGER, validate: Number.isSafeInteger },
  viewCount: { type: Number, default: 0, min: 0, max: Number.MAX_SAFE_INTEGER, validate: Number.isSafeInteger },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

publicFormSchema.index({ enabled: 1, order: 1, title: 1 });

export default mongoose.model("PublicForm", publicFormSchema);
