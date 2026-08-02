import ImageKit from "imagekit";
import mongoose from "mongoose";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import NoticeTag from "../models/NoticeTag.js";
import StudentNotice from "../models/StudentNotice.js";

const text = (value, max = 1000) => String(value ?? "").trim().slice(0, max);
const NOTICE_ADMIN_COOKIE = "student_notice_admin";
const noticeAdminCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/student-notices/admin",
  maxAge: 12 * 60 * 60 * 1000,
});

export const loginNoticeAdmin = async (req, res) => {
  const configured = process.env.Student_Notice_Admin_Password;
  const supplied = String(req.body?.password || "");
  if (!configured) return res.status(503).json({ success: false, message: "Student Notices admin password is not configured." });
  const expected = Buffer.from(configured);
  const received = Buffer.from(supplied);
  const matches = expected.length === received.length && crypto.timingSafeEqual(expected, received);
  if (!matches) return res.status(401).json({ success: false, message: "Incorrect password." });
  const token = jwt.sign({ purpose: "student-notices-admin" }, process.env.JWT_SECRET, { expiresIn: "12h" });
  res.cookie(NOTICE_ADMIN_COOKIE, token, noticeAdminCookieOptions());
  return res.json({ success: true, authenticated: true });
};

export const logoutNoticeAdmin = async (_req, res) => {
  const options = noticeAdminCookieOptions();
  delete options.maxAge;
  res.clearCookie(NOTICE_ADMIN_COOKIE, options);
  return res.json({ success: true });
};

export const getNoticeAdminSession = async (_req, res) => res.json({ success: true, authenticated: true });
const slugify = (value) => text(value, 220).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `notice-${Date.now()}`;
const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isImageKitUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && (url.hostname === "ik.imagekit.io" || url.hostname.endsWith(".imagekit.io"));
  } catch {
    return false;
  }
};

const sanitizeAttachments = (items = []) => {
  if (!Array.isArray(items)) return [];
  const sanitized = items.slice(0, 12).map((item, index) => {
    const url = text(item?.url, 2000);
    const mimeType = text(item?.mimeType, 100).toLowerCase();
    const fileType = item?.fileType === "pdf" || mimeType === "application/pdf" ? "pdf" : "image";
    if (!isImageKitUrl(url)) throw new Error("Attachments must use secure ImageKit URLs.");
    if (fileType === "pdf" && mimeType !== "application/pdf") throw new Error("Invalid PDF attachment type.");
    if (fileType === "image" && !["image/jpeg", "image/png", "image/webp"].includes(mimeType)) throw new Error("Only JPEG, PNG, WebP and PDF attachments are allowed.");
    return {
      url,
      fileId: text(item?.fileId, 240),
      fileName: text(item?.fileName, 240) || `attachment-${index + 1}`,
      fileType,
      mimeType,
      size: Math.min(20 * 1024 * 1024, Math.max(0, Number(item?.size) || 0)),
      order: index,
      isPrimary: item?.isPrimary === true,
    };
  });
  if (sanitized.length && !sanitized.some((item) => item.isPrimary)) sanitized[0].isPrimary = true;
  let primaryFound = false;
  return sanitized.map((item) => {
    if (!item.isPrimary) return item;
    if (primaryFound) return { ...item, isPrimary: false };
    primaryFound = true;
    return item;
  });
};

const publicNoticeShape = (notice) => ({
  title: notice.title,
  slug: notice.slug,
  tagId: notice.tagId ? { name: notice.tagId.name, slug: notice.tagId.slug, icon: notice.tagId.icon } : null,
  noticeDate: notice.noticeDate,
  description: notice.description,
  ...(typeof notice.content === "string" ? { content: notice.content } : {}),
  attachments: (notice.attachments || []).map((attachment) => ({
    url: attachment.url,
    fileName: attachment.fileName,
    fileType: attachment.fileType,
    mimeType: attachment.mimeType,
    size: attachment.size,
    order: attachment.order,
    isPrimary: attachment.isPrimary,
  })),
  featured: notice.featured,
  publishedAt: notice.publishedAt,
  viewCount: notice.viewCount || 0,
});

const uniqueSlug = async (title, excludedId = null) => {
  const base = slugify(title);
  let slug = base;
  let suffix = 2;
  while (await StudentNotice.exists({ slug, ...(excludedId ? { _id: { $ne: excludedId } } : {}) })) slug = `${base}-${suffix++}`;
  return slug;
};

const noticePayload = async (body, userId, existing = null) => {
  const title = text(body.title, 220);
  const description = text(body.description, 700);
  if (!title || !description || !body.noticeDate || !mongoose.Types.ObjectId.isValid(body.tagId)) throw new Error("Department, title, notice date and short description are required.");
  const tag = await NoticeTag.findById(body.tagId);
  if (!tag) throw new Error("Selected department or tag does not exist.");
  const status = ["draft", "published", "archived"].includes(body.status) ? body.status : "draft";
  const wasPublished = existing?.status === "published";
  return {
    title,
    slug: existing && existing.title === title ? existing.slug : await uniqueSlug(title, existing?._id),
    tagId: tag._id,
    noticeDate: new Date(body.noticeDate),
    description,
    content: text(body.content, 12000),
    searchableKeywords: Array.isArray(body.searchableKeywords) ? [...new Set(body.searchableKeywords.map((item) => text(item, 80)).filter(Boolean))].slice(0, 40) : [],
    attachments: sanitizeAttachments(body.attachments),
    status,
    featured: body.featured === true,
    publishedAt: status === "published" ? (wasPublished ? existing.publishedAt : new Date()) : null,
    updatedBy: userId,
  };
};

export const getPublicTags = async (_req, res) => {
  const tags = await NoticeTag.find({ active: true }).sort({ order: 1, name: 1 }).select("name slug description icon order -_id").lean();
  res.json({ success: true, tags });
};

export const getPublicNotices = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 9));
    const query = { status: "published" };
    const activeTags = await NoticeTag.find({ active: true }).select("_id name slug").lean();
    const tagIds = activeTags.map((tag) => tag._id);
    query.tagId = { $in: tagIds };
    if (req.query.tag) {
      const tag = activeTags.find((item) => item.slug === req.query.tag);
      query.tagId = tag ? tag._id : null;
    }
    if (String(req.query.featured) === "true") query.featured = true;
    const search = text(req.query.search, 120);
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      const matchingTagIds = activeTags.filter((tag) => regex.test(tag.name)).map((tag) => tag._id);
      query.$or = [{ title: regex }, { description: regex }, { content: regex }, { searchableKeywords: regex }, { "attachments.fileName": regex }, { tagId: { $in: matchingTagIds } }];
    }
    const sort = req.query.sort === "oldest" ? { featured: -1, noticeDate: 1 } : { featured: -1, noticeDate: -1 };
    const [notices, total] = await Promise.all([
      StudentNotice.find(query).populate("tagId", "name slug icon").sort(sort).skip((page - 1) * limit).limit(limit).select("title slug tagId noticeDate description attachments featured publishedAt viewCount").lean(),
      StudentNotice.countDocuments(query),
    ]);
    res.json({ success: true, notices: notices.map(publicNoticeShape), pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Unable to load student notices." });
  }
};

export const getPublicNotice = async (req, res) => {
  const notice = await StudentNotice.findOne({ slug: req.params.slug, status: "published" }).populate({ path: "tagId", match: { active: true }, select: "name slug icon" }).select("title slug tagId noticeDate description content attachments featured publishedAt viewCount").lean();
  if (!notice || !notice.tagId) return res.status(404).json({ success: false, message: "Notice not found." });
  res.json({ success: true, notice: publicNoticeShape(notice) });
};

export const recordNoticeView = async (req, res) => {
  const notice = await StudentNotice.findOneAndUpdate({ slug: req.params.slug, status: "published" }, { $inc: { viewCount: 1 }, $set: { lastViewedAt: new Date() } }, { new: true }).select("viewCount").lean();
  if (!notice) return res.status(404).json({ success: false, message: "Notice not found." });
  res.json({ success: true, viewCount: notice.viewCount });
};

export const getAdminNotices = async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const query = {};
  if (["draft", "published", "archived"].includes(req.query.status)) query.status = req.query.status;
  if (mongoose.Types.ObjectId.isValid(req.query.tag)) query.tagId = req.query.tag;
  if (req.query.search) query.$text = { $search: text(req.query.search, 120) };
  const sort = req.query.sort === "views" ? { viewCount: -1, updatedAt: -1 } : { updatedAt: -1 };
  const [notices, total] = await Promise.all([StudentNotice.find(query).populate("tagId", "name slug").sort(sort).skip((page - 1) * limit).limit(limit).lean(), StudentNotice.countDocuments(query)]);
  res.json({ success: true, notices, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
};

export const getNoticeStats = async (_req, res) => {
  const [summary] = await StudentNotice.aggregate([{ $group: { _id: null, totalViews: { $sum: "$viewCount" }, totalNotices: { $sum: 1 } } }]);
  const mostViewed = await StudentNotice.find().sort({ viewCount: -1 }).limit(5).select("title slug viewCount status").lean();
  res.json({ success: true, totalViews: summary?.totalViews || 0, totalNotices: summary?.totalNotices || 0, mostViewed });
};

export const createNotice = async (req, res) => {
  try {
    const payload = await noticePayload(req.body, req.user._id);
    const notice = await StudentNotice.create({ ...payload, createdBy: req.user._id });
    res.status(201).json({ success: true, notice });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const updateNotice = async (req, res) => {
  try {
    const existing = await StudentNotice.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Notice not found." });
    Object.assign(existing, await noticePayload(req.body, req.user._id, existing));
    await existing.save();
    res.json({ success: true, notice: existing });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};

export const updateNoticeStatus = async (req, res) => {
  const status = req.body?.status;
  if (!["draft", "published", "archived"].includes(status)) return res.status(400).json({ success: false, message: "Invalid notice status." });
  const notice = await StudentNotice.findByIdAndUpdate(req.params.id, { status, publishedAt: status === "published" ? new Date() : null, updatedBy: req.user._id }, { new: true, runValidators: true });
  if (!notice) return res.status(404).json({ success: false, message: "Notice not found." });
  res.json({ success: true, notice });
};

export const deleteNotice = async (req, res) => {
  const notice = await StudentNotice.findByIdAndDelete(req.params.id);
  if (!notice) return res.status(404).json({ success: false, message: "Notice not found." });
  res.json({ success: true });
};

export const duplicateNotice = async (req, res) => {
  const source = await StudentNotice.findById(req.params.id).lean();
  if (!source) return res.status(404).json({ success: false, message: "Notice not found." });
  const title = `${source.title} Copy`;
  delete source._id; delete source.createdAt; delete source.updatedAt; delete source.__v;
  const notice = await StudentNotice.create({ ...source, title, slug: await uniqueSlug(title), status: "draft", publishedAt: null, viewCount: 0, lastViewedAt: null, createdBy: req.user._id, updatedBy: req.user._id });
  res.status(201).json({ success: true, notice });
};

export const getAdminTags = async (_req, res) => res.json({ success: true, tags: await NoticeTag.find().sort({ order: 1, name: 1 }).lean() });
export const createTag = async (req, res) => {
  try {
    const name = text(req.body?.name, 100); if (!name) throw new Error("Tag name is required.");
    const tag = await NoticeTag.create({ name, slug: slugify(req.body?.slug || name), description: text(req.body?.description, 500), icon: text(req.body?.icon, 80) || "Building2", active: req.body?.active !== false, order: Number(req.body?.order) || 0 });
    res.status(201).json({ success: true, tag });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
export const updateTag = async (req, res) => {
  try {
    const tag = await NoticeTag.findByIdAndUpdate(req.params.id, { name: text(req.body?.name, 100), slug: slugify(req.body?.slug || req.body?.name), description: text(req.body?.description, 500), icon: text(req.body?.icon, 80) || "Building2", active: req.body?.active !== false, order: Number(req.body?.order) || 0 }, { new: true, runValidators: true });
    if (!tag) return res.status(404).json({ success: false, message: "Tag not found." });
    res.json({ success: true, tag });
  } catch (error) { res.status(400).json({ success: false, message: error.message }); }
};
export const deleteTag = async (req, res) => {
  if (await StudentNotice.exists({ tagId: req.params.id })) return res.status(409).json({ success: false, message: "This tag is used by notices and cannot be deleted." });
  const tag = await NoticeTag.findByIdAndDelete(req.params.id);
  if (!tag) return res.status(404).json({ success: false, message: "Tag not found." });
  res.json({ success: true });
};

export const getNoticeUploadAuth = async (_req, res) => {
  try {
    if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) throw new Error("Missing ImageKit configuration");
    const imagekit = new ImageKit({ publicKey: process.env.IMAGEKIT_PUBLIC_KEY, privateKey: process.env.IMAGEKIT_PRIVATE_KEY, urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT });
    res.json({ ...imagekit.getAuthenticationParameters(), publicKey: process.env.IMAGEKIT_PUBLIC_KEY });
  } catch { res.status(503).json({ success: false, message: "Upload service is unavailable." }); }
};
