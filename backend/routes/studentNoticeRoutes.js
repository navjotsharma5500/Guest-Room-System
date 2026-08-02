import express from "express";
import jwt from "jsonwebtoken";
import * as controller from "../controllers/studentNoticeController.js";
import User from "../models/User.js";

const router = express.Router();
const noticeAdminOnly = async (req, res, next) => {
  try {
    const payload = jwt.verify(req.cookies?.student_notice_admin || "", process.env.JWT_SECRET);
    if (payload?.purpose !== "student-notices-admin") throw new Error("Invalid session");
    const adminUser = await User.findOne({ role: "admin", isActive: { $ne: false } }).select("_id").lean();
    if (!adminUser) return res.status(503).json({ success: false, message: "No active administrator account is available for notice attribution." });
    req.user = adminUser;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Student Notices admin authentication required." });
  }
};

router.post("/admin/login", controller.loginNoticeAdmin);
router.post("/admin/logout", controller.logoutNoticeAdmin);
router.get("/admin/session", noticeAdminOnly, controller.getNoticeAdminSession);

router.get("/admin/notices", noticeAdminOnly, controller.getAdminNotices);
router.get("/admin/stats", noticeAdminOnly, controller.getNoticeStats);
router.post("/admin/notices", noticeAdminOnly, controller.createNotice);
router.put("/admin/notices/:id", noticeAdminOnly, controller.updateNotice);
router.patch("/admin/notices/:id/status", noticeAdminOnly, controller.updateNoticeStatus);
router.post("/admin/notices/:id/duplicate", noticeAdminOnly, controller.duplicateNotice);
router.delete("/admin/notices/:id", noticeAdminOnly, controller.deleteNotice);
router.get("/admin/tags", noticeAdminOnly, controller.getAdminTags);
router.post("/admin/tags", noticeAdminOnly, controller.createTag);
router.put("/admin/tags/:id", noticeAdminOnly, controller.updateTag);
router.delete("/admin/tags/:id", noticeAdminOnly, controller.deleteTag);
router.get("/admin/upload-auth", noticeAdminOnly, controller.getNoticeUploadAuth);

router.get("/tags", controller.getPublicTags);
router.get("/", controller.getPublicNotices);
router.post("/:slug/view", controller.recordNoticeView);
router.get("/:slug", controller.getPublicNotice);

export default router;
