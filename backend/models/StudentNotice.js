import mongoose from "mongoose";

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    fileId: { type: String, trim: true, default: "" },
    fileName: { type: String, required: true, trim: true, maxlength: 240 },
    fileType: { type: String, enum: ["pdf", "image"], required: true },
    mimeType: { type: String, required: true, trim: true },
    size: { type: Number, min: 0, default: 0 },
    order: { type: Number, default: 0 },
    isPrimary: { type: Boolean, default: false },
  },
  { _id: true }
);

const studentNoticeSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 220 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    tagId: { type: mongoose.Schema.Types.ObjectId, ref: "NoticeTag", required: true, index: true },
    noticeDate: { type: Date, required: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 700 },
    content: { type: String, trim: true, maxlength: 12000, default: "" },
    searchableKeywords: [{ type: String, trim: true, maxlength: 80 }],
    attachments: { type: [attachmentSchema], default: [] },
    status: { type: String, enum: ["draft", "published", "archived"], default: "draft", index: true },
    featured: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date, default: null, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    viewCount: { type: Number, default: 0, min: 0, index: true },
    lastViewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

studentNoticeSchema.index({ title: "text", description: "text", content: "text", searchableKeywords: "text" });
studentNoticeSchema.index({ status: 1, featured: -1, noticeDate: -1 });

export default mongoose.model("StudentNotice", studentNoticeSchema);
