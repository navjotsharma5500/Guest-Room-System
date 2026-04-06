// models/CommunityComment.js
import mongoose from "mongoose";

const communityCommentSchema = new mongoose.Schema(
  {
    postId:          { type: mongoose.Schema.Types.ObjectId, ref: "CommunityPost", required: true },
    authorId:        { type: String, required: true },
    name:            { type: String, required: true, trim: true },
    email:           { type: String, required: true, trim: true, lowercase: true },
    message:         { type: String, required: true, trim: true, maxlength: 2000 },
    parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: "CommunityComment", default: null },
    likes:           { type: Number, default: 0 },
    likedBy:         [{ type: String }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
  }
);

communityCommentSchema.index({ postId: 1, createdAt: 1 });
communityCommentSchema.index({ parentCommentId: 1 });

const CommunityComment = mongoose.model("CommunityComment", communityCommentSchema);
export default CommunityComment;