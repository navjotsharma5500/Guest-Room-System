import mongoose from "mongoose";

const echoKnowledgeSchema = new mongoose.Schema(
  {
    question: { type: String, required: true, trim: true },
    answer: { type: String, required: true, trim: true },
    keywords: [{ type: String, trim: true, lowercase: true }],
    roles: [{ type: String, trim: true, lowercase: true }],
    minScore: { type: Number, default: 0.35, min: 0, max: 1 },
    priority: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

echoKnowledgeSchema.index({ isActive: 1, priority: -1, updatedAt: -1 });

export default mongoose.model("EchoKnowledge", echoKnowledgeSchema);
