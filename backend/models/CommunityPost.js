// models/CommunityPost.js
import mongoose from "mongoose";

const communityPostSchema = new mongoose.Schema(
  {
    authorId:       { type: String, required: true },          // Google sub ID
    name:           { type: String, required: true, trim: true },
    email:          { type: String, required: true, trim: true, lowercase: true },
    authorPicture:  { type: String, default: "" },             // Google avatar URL
    contact:        { type: String, trim: true, default: "" },
    title:          { type: String, required: true, trim: true, maxlength: 200 },
    description:    { type: String, trim: true, maxlength: 4000, default: "" },
    attachmentUrl:  { type: String, default: "" },             // ImageKit URL only
    attachmentType: { type: String, enum: ["image","pdf",""], default: "" },
    category: {
      type: String,
      enum: ["Suggestion","Feedback","Issue","Question"],
      required: true,
    },
    likes:    { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    likedBy:    [{ type: String }],   // array of authorIds
    dislikedBy: [{ type: String }],   // array of authorIds
    commentCount: { type: Number, default: 0 },
    reportCount:  { type: Number, default: 0 },
    reportedBy:   [{ type: String }], // array of authorIds who reported
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

// Compound index for sorted pagination
communityPostSchema.index({ createdAt: -1 });
communityPostSchema.index({ likes: -1, createdAt: -1 });

const CommunityPost = mongoose.model("CommunityPost", communityPostSchema);
export default CommunityPost;