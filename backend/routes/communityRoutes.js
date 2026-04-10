// routes/communityRoutes.js
import express from "express";
import jwt from "jsonwebtoken";
import {
  googleAuth,
  getPosts,
  createPost,
  votePost,
  deletePost,
  reportPost,
  getComments,
  createComment,
  likeComment,
  deleteComment,
} from "../controllers/communityController.js";

const router = express.Router();

const JWT_SECRET = process.env.COMMUNITY_JWT_SECRET || process.env.JWT_SECRET;

/* ─────────────────────────────────────────
   Community JWT middleware
   Verifies the community_jwt issued on Google sign-in
───────────────────────────────────────── */
function communityAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET);
    req.communityUser = payload;   // { sub, name, email, picture, role }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/* ─────────────────────────────────────────
   AUTH & DEBUG
───────────────────────────────────────── */
// GET /api/community/health - Debug endpoint to verify routes are working
router.get("/health", (req, res) => {
  res.json({ message: "Community routes are working!", status: "ok", timestamp: new Date().toISOString() });
});

// POST /api/community/auth/google
// Body: { credential: <Google ID token> }
router.post("/auth/google", googleAuth);

/* ─────────────────────────────────────────
   POSTS
───────────────────────────────────────── */
// GET  /api/community/posts
// ?page=1&limit=10&sort=latest|popular|trending&category=...&search=...
router.get("/posts", getPosts);

// POST /api/community/posts  (auth required)
router.post("/posts", communityAuth, createPost);

// POST /api/community/posts/:id/vote  (auth required)
// Body: { type: "like" | "dislike" }
router.post("/posts/:id/vote", communityAuth, votePost);

// POST /api/community/posts/:id/report  (auth required)
router.post("/posts/:id/report", communityAuth, reportPost);

// DELETE /api/community/posts/:id  (admin only)
router.delete("/posts/:id", communityAuth, deletePost);

/* ─────────────────────────────────────────
   COMMENTS
───────────────────────────────────────── */
// GET /api/community/posts/:postId/comments  (public)
router.get("/posts/:postId/comments", getComments);

// POST /api/community/comments  (auth required)
// Body: { postId, message, parentCommentId? }
router.post("/comments", communityAuth, createComment);

// POST /api/community/comments/:id/like  (auth required)
router.post("/comments/:id/like", communityAuth, likeComment);

// DELETE /api/community/comments/:id  (admin or own)
router.delete("/comments/:id", communityAuth, deleteComment);

export default router;