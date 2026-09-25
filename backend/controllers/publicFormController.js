import mongoose from "mongoose";
import PublicForm from "../models/PublicForm.js";

const PUBLIC_FIELDS = "_id title code slug description category fileUrl originalFileName fileType keywords featured order";
const STRING_FIELDS = ["title", "code", "slug", "description", "category", "fileUrl", "originalFileName", "fileType"];
const EDITABLE_FIELDS = [...STRING_FIELDS, "keywords", "enabled", "featured", "order"];
export const validFormId = (id) => typeof id === "string" && /^[a-f\d]{24}$/i.test(id);
const badRequest = (message) => Object.assign(new Error(message), { status: 400 });

export function formError(res, error) {
  if (error.code === 11000) return res.status(409).json({ success: false, message: "A public form with this slug already exists." });
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError || error.status === 400) {
    return res.status(400).json({ success: false, message: error.message });
  }
  console.error("Public forms request failed:", error.message);
  return res.status(500).json({ success: false, message: "Unable to process public forms request." });
}

function editableInput(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw badRequest("A form object is required.");
  const input = {};
  for (const key of Object.keys(body)) {
    if (!EDITABLE_FIELDS.includes(key)) throw badRequest(`Unknown field: ${key}`);
    const value = body[key];
    if (STRING_FIELDS.includes(key) && typeof value !== "string") throw badRequest(`${key} must be a string.`);
    if (["enabled", "featured"].includes(key) && typeof value !== "boolean") throw badRequest(`${key} must be a boolean.`);
    if (key === "order" && (!Number.isSafeInteger(value) || value < 0)) throw badRequest("order must be a non-negative safe integer.");
    if (key === "keywords" && (!Array.isArray(value) || value.length > 50 || value.some((word) => typeof word !== "string"))) {
      throw badRequest("keywords must be an array of up to 50 strings.");
    }
    input[key] = value;
  }
  if (!Object.keys(input).length) throw badRequest("No editable fields supplied.");
  return input;
}

export async function listPublicForms(req, res) {
  try {
    const filter = { enabled: true };
    if (req.query.category !== undefined) {
      if (typeof req.query.category !== "string" || req.query.category.length > 160) throw badRequest("Invalid category filter.");
      filter.category = req.query.category.trim();
    }
    if (req.query.search !== undefined) {
      if (typeof req.query.search !== "string" || req.query.search.length > 200) throw badRequest("Invalid search filter.");
      const search = req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (search) filter.$or = ["title", "code", "description", "keywords"].map((key) => ({ [key]: { $regex: search, $options: "i" } }));
    }
    const forms = await PublicForm.find(filter).select(PUBLIC_FIELDS).sort({ order: 1, title: 1, _id: 1 }).lean();
    return res.json({ success: true, forms });
  } catch (error) { return formError(res, error); }
}

export async function getPublicForm(req, res) {
  if (!validFormId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid form ID." });
  try {
    const form = await PublicForm.findOne({ _id: req.params.id, enabled: true }).select(PUBLIC_FIELDS).lean();
    if (!form) return res.status(404).json({ success: false, message: "Public form not found." });
    return res.json({ success: true, form });
  } catch (error) { return formError(res, error); }
}

export async function listAdminForms(req, res) {
  try {
    const forms = await PublicForm.find().sort({ order: 1, title: 1, _id: 1 }).lean();
    return res.json({ success: true, forms: forms.map((form) => ({ ...form, viewCount: form.viewCount || 0 })) });
  } catch (error) { return formError(res, error); }
}

export async function createPublicForm(req, res) {
  try {
    const form = await PublicForm.create({ ...editableInput(req.body), createdBy: req.user._id, updatedBy: req.user._id });
    return res.status(201).json({ success: true, form });
  } catch (error) { return formError(res, error); }
}

export async function updatePublicForm(req, res) {
  if (!validFormId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid form ID." });
  try {
    const input = editableInput(req.body);
    const form = await PublicForm.findById(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: "Public form not found." });
    form.set({ ...input, updatedBy: req.user._id });
    await form.save();
    return res.json({ success: true, form });
  } catch (error) { return formError(res, error); }
}

export function setPublicFormStatus(req, res) {
  if (!req.body || Object.keys(req.body).length !== 1 || typeof req.body.enabled !== "boolean") {
    return res.status(400).json({ success: false, message: "Supply only enabled as a boolean." });
  }
  return updatePublicForm(req, res);
}

export async function deletePublicForm(req, res) {
  if (!validFormId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid form ID." });
  try {
    const form = await PublicForm.findByIdAndDelete(req.params.id);
    if (!form) return res.status(404).json({ success: false, message: "Public form not found." });
    return res.json({ success: true, message: "Public form deleted." });
  } catch (error) { return formError(res, error); }
}

export async function incrementFormView(req, res) {
  if (!validFormId(req.params.id)) return res.status(400).json({ success: false, message: "Invalid form ID." });
  try {
    const form = await PublicForm.findOneAndUpdate(
      { _id: req.params.id, enabled: true },
      { $inc: { viewCount: 1 } },
      { new: true },
    ).select("_id viewCount").lean();
    if (!form) return res.status(404).json({ success: false, message: "Public form not found." });
    return res.json({ success: true, viewCount: form.viewCount });
  } catch (error) { return formError(res, error); }
}

export async function reorderPublicForms(req, res) {
  try {
    const items = req.body?.items;
    if (!Array.isArray(items) || !items.length || items.length > 500
      || items.some((item) => !item || !validFormId(item.id) || !Number.isSafeInteger(item.order) || item.order < 0)
      || new Set(items.map((item) => item.id.toLowerCase())).size !== items.length) {
      throw badRequest("items must contain 1–500 distinct form IDs with non-negative integer orders.");
    }
    const count = await PublicForm.countDocuments({ _id: { $in: items.map((item) => item.id) } });
    if (count !== items.length) return res.status(404).json({ success: false, message: "One or more public forms do not exist." });
    await PublicForm.bulkWrite(items.map((item) => ({ updateOne: {
      filter: { _id: item.id }, update: { $set: { order: item.order, updatedBy: req.user._id } },
    } })));
    return res.json({ success: true });
  } catch (error) { return formError(res, error); }
}
