import WebsiteContent from "../models/WebsiteContent.js";
import WebsiteContentVersion from "../models/WebsiteContentVersion.js";
import { DEFAULT_WEBSITE_CONTENT, WEBSITE_SECTIONS } from "../utils/defaultWebsiteContent.js";

const roleOf = (user) => String(user?.role || "").toLowerCase();

const assertAdmin = (req, res) => {
  if (roleOf(req.user) !== "admin") {
    res.status(403).json({ success: false, message: "Only admin can manage website content" });
    return false;
  }
  return true;
};

const normalizeSection = (section) => String(section || "").trim().toLowerCase();

const seedDefaultsIfEmpty = async () => {
  const count = await WebsiteContent.countDocuments();
  if (count > 0) return;

  await WebsiteContent.insertMany(
    WEBSITE_SECTIONS.map((section) => ({
      section,
      data: DEFAULT_WEBSITE_CONTENT[section],
      isPublished: true,
    }))
  );
};

export const getPublicWebsiteContent = async (_req, res) => {
  await seedDefaultsIfEmpty();
  const docs = await WebsiteContent.find({ isPublished: true }).lean();
  const content = { ...DEFAULT_WEBSITE_CONTENT };
  docs.forEach((doc) => {
    content[doc.section] = { ...content[doc.section], ...(doc.data || {}) };
  });
  res.json({ success: true, content });
};

export const getPublicWebsiteSection = async (req, res) => {
  await seedDefaultsIfEmpty();
  const section = normalizeSection(req.params.section);
  const doc = await WebsiteContent.findOne({ section, isPublished: true }).lean();
  res.json({
    success: true,
    section,
    data: { ...(DEFAULT_WEBSITE_CONTENT[section] || {}), ...(doc?.data || {}) },
  });
};

export const getAdminWebsiteContent = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  await seedDefaultsIfEmpty();
  const docs = await WebsiteContent.find().sort({ section: 1 }).lean();
  const content = { ...DEFAULT_WEBSITE_CONTENT };
  docs.forEach((doc) => {
    content[doc.section] = { ...content[doc.section], ...(doc.data || {}) };
  });
  res.json({ success: true, content, docs });
};

export const updateWebsiteSection = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  const section = normalizeSection(req.params.section);
  if (!section) return res.status(400).json({ success: false, message: "Section is required" });

  const doc = await WebsiteContent.findOneAndUpdate(
    { section },
    {
      $set: {
        section,
        data: req.body?.data || {},
        updatedBy: req.user?._id || null,
      },
      $setOnInsert: { isPublished: true },
    },
    { upsert: true, new: true }
  );

  res.json({ success: true, section, data: doc.data, doc });
};

export const seedDefaultWebsiteContent = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  for (const section of WEBSITE_SECTIONS) {
    await WebsiteContent.updateOne(
      { section },
      {
        $setOnInsert: {
          section,
          data: DEFAULT_WEBSITE_CONTENT[section],
          isPublished: true,
          updatedBy: req.user?._id || null,
        },
      },
      { upsert: true }
    );
  }
  res.json({ success: true, message: "Default website content ensured" });
};

export const publishWebsiteSection = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  const section = normalizeSection(req.params.section);
  const existing = await WebsiteContent.findOne({ section }).lean();
  if (existing) {
    await WebsiteContentVersion.create({
      section,
      data: existing.data || {},
      sourceContentId: existing._id,
      createdBy: req.user?._id || null,
    });
  }

  const doc = await WebsiteContent.findOneAndUpdate(
    { section },
    { $set: { isPublished: true, updatedBy: req.user?._id || null } },
    { new: true, upsert: true }
  );
  res.json({ success: true, doc });
};

export const resetWebsiteSection = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  const section = normalizeSection(req.params.section);
  if (!DEFAULT_WEBSITE_CONTENT[section]) {
    return res.status(404).json({ success: false, message: "Unknown website section" });
  }
  const doc = await WebsiteContent.findOneAndUpdate(
    { section },
    {
      $set: {
        data: DEFAULT_WEBSITE_CONTENT[section],
        isPublished: true,
        updatedBy: req.user?._id || null,
      },
    },
    { new: true, upsert: true }
  );
  res.json({ success: true, section, data: doc.data, doc });
};

export const getWebsiteSectionVersions = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  const section = normalizeSection(req.params.section);
  const versions = await WebsiteContentVersion.find({ section })
    .select("section data createdAt createdBy restoredFromVersionId")
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  res.json({ success: true, versions });
};

export const restoreWebsiteSectionVersion = async (req, res) => {
  if (!assertAdmin(req, res)) return;
  const section = normalizeSection(req.params.section);
  const version = await WebsiteContentVersion.findOne({ _id: req.params.versionId, section }).lean();
  if (!version) {
    return res.status(404).json({ success: false, message: "Website content version not found" });
  }

  const existing = await WebsiteContent.findOne({ section }).lean();
  if (existing) {
    await WebsiteContentVersion.create({
      section,
      data: existing.data || {},
      sourceContentId: existing._id,
      restoredFromVersionId: version._id,
      createdBy: req.user?._id || null,
    });
  }

  const doc = await WebsiteContent.findOneAndUpdate(
    { section },
    {
      $set: {
        section,
        data: version.data || {},
        isPublished: true,
        updatedBy: req.user?._id || null,
      },
    },
    { new: true, upsert: true }
  );

  res.json({ success: true, section, data: doc.data, doc });
};
