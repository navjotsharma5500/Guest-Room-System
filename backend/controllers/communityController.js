// controllers/communityController.js
import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import sanitizeHtml from "sanitize-html";
import CommunityPost    from "../models/CommunityPost.js";
import CommunityComment from "../models/CommunityComment.js";

const GOOGLE_CLIENT = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET    = process.env.COMMUNITY_JWT_SECRET || process.env.JWT_SECRET;
const ALLOWED_DOMAIN = "thapar.edu";
const ALLOWED_MIME_TYPES = ["image/png","image/jpeg","image/webp","application/pdf"];

/* ─── helpers ─── */
function sanitize(str) {
  return sanitizeHtml(str || "", { allowedTags:[], allowedAttributes:{} }).trim();
}

function signCommunityJwt(user) {
  return jwt.sign(
    { sub: user.sub, name: user.name, email: user.email, picture: user.picture, role: user.role || "user" },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/* ────────────────────────────────────────────
   AUTH — Google Sign-In (ID-token flow)
──────────────────────────────────────────── */
export async function googleAuth(req, res) {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ message: "Missing credential" });

    const ticket = await GOOGLE_CLIENT.verifyIdToken({
      idToken:  credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    /* Enforce @thapar.edu */
    if (!payload.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
      return res.status(403).json({ message: `Only @${ALLOWED_DOMAIN} accounts are allowed.` });
    }

    const user = {
      sub:     payload.sub,
      name:    payload.name,
      email:   payload.email,
      picture: payload.picture || "",
      role:    "user",
    };

    const token = signCommunityJwt(user);
    return res.json({ token, user });
  } catch (err) {
    console.error("Community googleAuth error:", err);
    return res.status(401).json({ message: "Invalid Google credential" });
  }
}

/* ────────────────────────────────────────────
   POSTS — GET (paginated, sorted, filtered)
──────────────────────────────────────────── */
export async function getPosts(req, res) {
  try {
    const page     = Math.max(1, parseInt(req.query.page)  || 1);
    const limit    = Math.min(20, parseInt(req.query.limit) || 10);
    const sort     = req.query.sort || "latest";       // latest | popular | trending
    const category = req.query.category;
    const search   = req.query.search?.trim();

    const filter = {};
    if (category && ["Suggestion","Feedback","Issue","Question"].includes(category)) {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { title:       { $regex: search, $options:"i" } },
        { description: { $regex: search, $options:"i" } },
        { name:        { $regex: search, $options:"i" } },
      ];
    }

    let sortObj = {};
    if (sort === "popular")  sortObj = { likes:-1, createdAt:-1 };
    else if (sort === "trending") {
      // trending = high (likes - dislikes) in last 7 days
      const week = new Date(Date.now() - 7*24*60*60*1000);
      filter.createdAt = { $gte: week };
      sortObj = { likes:-1, createdAt:-1 };
    } else {
      sortObj = { createdAt:-1 };
    }

    const [posts, total] = await Promise.all([
      CommunityPost.find(filter).sort(sortObj).skip((page-1)*limit).limit(limit).lean(),
      CommunityPost.countDocuments(filter),
    ]);

    return res.json({ posts, total, page, pages: Math.ceil(total/limit) });
  } catch (err) {
    console.error("getPosts error:", err);
    return res.status(500).json({ message: "Failed to fetch posts" });
  }
}

/* ────────────────────────────────────────────
   POSTS — CREATE
──────────────────────────────────────────── */
export async function createPost(req, res) {
  try {
    const user = req.communityUser;
    const {
      name, email, contact, title, description,
      category, attachmentUrl, attachmentType,
    } = req.body;

    /* Validate */
    if (!title?.trim())                               return res.status(400).json({ message:"Title is required" });
    if (!email?.endsWith(`@${ALLOWED_DOMAIN}`))       return res.status(403).json({ message:"Only @thapar.edu emails allowed" });
    if (!["Suggestion","Feedback","Issue","Question"].includes(category))
                                                       return res.status(400).json({ message:"Invalid category" });
    if (attachmentUrl && !attachmentType)              return res.status(400).json({ message:"attachmentType required with attachmentUrl" });

    /* Sanitize */
    const post = await CommunityPost.create({
      authorId:       user.sub,
      name:           sanitize(name || user.name),
      email:          user.email,                // trust token, not body
      authorPicture:  user.picture || "",
      contact:        sanitize(contact || ""),
      title:          sanitize(title),
      description:    sanitize(description || ""),
      category,
      attachmentUrl:  attachmentUrl  || "",
      attachmentType: attachmentType || "",
    });

    return res.status(201).json({ post });
  } catch (err) {
    console.error("createPost error:", err);
    return res.status(500).json({ message:"Failed to create post" });
  }
}

/* ────────────────────────────────────────────
   POSTS — VOTE (like | dislike)
──────────────────────────────────────────── */
export async function votePost(req, res) {
  try {
    const { id }   = req.params;
    const { type } = req.body;   // "like" | "dislike"
    const userId   = req.communityUser.sub;

    if (!["like","dislike"].includes(type)) {
      return res.status(400).json({ message:"type must be like or dislike" });
    }

    const post = await CommunityPost.findById(id);
    if (!post) return res.status(404).json({ message:"Post not found" });

    const likedIdx    = post.likedBy.indexOf(userId);
    const dislikedIdx = post.dislikedBy.indexOf(userId);

    if (type === "like") {
      if (likedIdx !== -1) {
        // toggle off
        post.likedBy.splice(likedIdx, 1);
        post.likes = Math.max(0, post.likes - 1);
      } else {
        post.likedBy.push(userId);
        post.likes++;
        // remove from dislikes if present
        if (dislikedIdx !== -1) {
          post.dislikedBy.splice(dislikedIdx, 1);
          post.dislikes = Math.max(0, post.dislikes - 1);
        }
      }
    } else {
      if (dislikedIdx !== -1) {
        post.dislikedBy.splice(dislikedIdx, 1);
        post.dislikes = Math.max(0, post.dislikes - 1);
      } else {
        post.dislikedBy.push(userId);
        post.dislikes++;
        if (likedIdx !== -1) {
          post.likedBy.splice(likedIdx, 1);
          post.likes = Math.max(0, post.likes - 1);
        }
      }
    }

    await post.save();
    return res.json({ post });
  } catch (err) {
    console.error("votePost error:", err);
    return res.status(500).json({ message:"Vote failed" });
  }
}

/* ────────────────────────────────────────────
   POSTS — DELETE (admin only)
──────────────────────────────────────────── */
export async function deletePost(req, res) {
  try {
    const user = req.communityUser;
    if (user.role !== "admin") return res.status(403).json({ message:"Admin only" });

    const post = await CommunityPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ message:"Post not found" });

    // cascade delete comments
    await CommunityComment.deleteMany({ postId: req.params.id });

    return res.json({ message:"Post deleted" });
  } catch (err) {
    console.error("deletePost error:", err);
    return res.status(500).json({ message:"Failed to delete post" });
  }
}

/* ────────────────────────────────────────────
   POSTS — REPORT
   Any authenticated user can report once.
   Auto-deletes post + comments at 5 reports.
──────────────────────────────────────────── */
export async function reportPost(req, res) {
  try {
    const userId = req.communityUser.sub;
    const post   = await CommunityPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message:"Post not found" });

    // Prevent double-reporting
    if (post.reportedBy.includes(userId)) {
      return res.status(400).json({ message:"You have already reported this post" });
    }

    post.reportedBy.push(userId);
    post.reportCount = post.reportedBy.length;

    const REPORT_THRESHOLD = 5;

    if (post.reportCount >= REPORT_THRESHOLD) {
      // Auto-delete post and its comments
      await CommunityComment.deleteMany({ postId: post._id });
      await post.deleteOne();
      return res.json({ deleted: true, message:"Post removed due to multiple reports" });
    }

    await post.save();
    return res.json({ deleted: false, reportCount: post.reportCount });
  } catch (err) {
    console.error("reportPost error:", err);
    return res.status(500).json({ message:"Failed to report post" });
  }
}
export async function getComments(req, res) {
  try {
    const { postId } = req.params;

    // Fetch all comments for the post in one query
    const all = await CommunityComment.find({ postId }).sort({ createdAt:1 }).lean();

    // Group: root comments + replies
    const roots   = all.filter(c => !c.parentCommentId);
    const replies = all.filter(c =>  c.parentCommentId);

    // Attach replies to parent
    const commentMap = {};
    roots.forEach(c => { commentMap[c._id] = { ...c, replies:[] }; });
    replies.forEach(r => {
      const parent = commentMap[r.parentCommentId];
      if (parent) parent.replies.push(r);
    });

    return res.json({ comments: Object.values(commentMap) });
  } catch (err) {
    console.error("getComments error:", err);
    return res.status(500).json({ message:"Failed to fetch comments" });
  }
}

/* ────────────────────────────────────────────
   COMMENTS — CREATE
──────────────────────────────────────────── */
export async function createComment(req, res) {
  try {
    const user = req.communityUser;
    const { postId, message, parentCommentId } = req.body;

    if (!postId || !message?.trim()) {
      return res.status(400).json({ message:"postId and message are required" });
    }

    // Limit nesting: only 1 level deep
    if (parentCommentId) {
      const parent = await CommunityComment.findById(parentCommentId);
      if (!parent) return res.status(404).json({ message:"Parent comment not found" });
      if (parent.parentCommentId) {
        return res.status(400).json({ message:"Only 1 level of nesting allowed" });
      }
    }

    const comment = await CommunityComment.create({
      postId,
      authorId: user.sub,
      name:     user.name,
      email:    user.email,
      message:  sanitize(message),
      parentCommentId: parentCommentId || null,
    });

    // Increment comment count on post (only root comments)
    if (!parentCommentId) {
      await CommunityPost.findByIdAndUpdate(postId, { $inc:{ commentCount:1 } });
    }

    return res.status(201).json({ comment });
  } catch (err) {
    console.error("createComment error:", err);
    return res.status(500).json({ message:"Failed to create comment" });
  }
}

/* ────────────────────────────────────────────
   COMMENTS — LIKE
──────────────────────────────────────────── */
export async function likeComment(req, res) {
  try {
    const { id } = req.params;
    const userId = req.communityUser.sub;

    const comment = await CommunityComment.findById(id);
    if (!comment) return res.status(404).json({ message:"Comment not found" });

    const idx = comment.likedBy.indexOf(userId);
    if (idx !== -1) {
      comment.likedBy.splice(idx, 1);
      comment.likes = Math.max(0, comment.likes - 1);
    } else {
      comment.likedBy.push(userId);
      comment.likes++;
    }

    await comment.save();
    return res.json({ comment });
  } catch (err) {
    console.error("likeComment error:", err);
    return res.status(500).json({ message:"Failed to like comment" });
  }
}

/* ────────────────────────────────────────────
   COMMENTS — DELETE (admin or own)
──────────────────────────────────────────── */
export async function deleteComment(req, res) {
  try {
    const user    = req.communityUser;
    const comment = await CommunityComment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message:"Comment not found" });

    const isOwner = comment.authorId === user.sub;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) return res.status(403).json({ message:"Not authorized" });

    await comment.deleteOne();

    // Decrement post count if root comment
    if (!comment.parentCommentId) {
      await CommunityPost.findByIdAndUpdate(comment.postId, { $inc:{ commentCount:-1 } });
    }
    // Delete child replies too
    await CommunityComment.deleteMany({ parentCommentId: comment._id });

    return res.json({ message:"Comment deleted" });
  } catch (err) {
    console.error("deleteComment error:", err);
    return res.status(500).json({ message:"Failed to delete comment" });
  }
}