import EchoKnowledge from "../models/EchoKnowledge.js";

const toStringArray = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v).trim().toLowerCase()).filter(Boolean);
  const text = String(value || "").trim();
  if (!text) return [];
  const separator = text.includes("|") ? "|" : ",";
  return text
    .split(separator)
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
};

const toBoolean = (value, fallback = true) => {
  if (typeof value === "boolean") return value;
  const text = String(value || "").trim().toLowerCase();
  if (!text) return fallback;
  if (["true", "1", "yes", "y"].includes(text)) return true;
  if (["false", "0", "no", "n"].includes(text)) return false;
  return fallback;
};

const buildPayload = (payload = {}) => ({
  question: String(payload.question || "").trim(),
  answer: String(payload.answer || "").trim(),
  keywords: toStringArray(payload.keywords),
  roles: toStringArray(payload.roles),
  minScore: Number(payload.minScore ?? 0.35),
  priority: Number(payload.priority ?? 0),
  isActive: toBoolean(payload.isActive, true),
});

const escapeCsvCell = (value) => {
  const text = String(value ?? "");
  if (text.includes('"') || text.includes(",") || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;
  const normalized = String(text || "").replace(/^\uFEFF/, "");

  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i];
    const next = normalized[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell.trim());
        cell = "";
      } else if (ch === "\n") {
        row.push(cell.trim());
        rows.push(row);
        row = [];
        cell = "";
      } else if (ch !== "\r") {
        cell += ch;
      }
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.trim());
    rows.push(row);
  }

  return rows;
};

export const getEchoKnowledgeList = async (req, res) => {
  try {
    const { q = "", includeInactive = "false", role = "" } = req.query;
    const andConditions = [];
    if (includeInactive !== "true") andConditions.push({ isActive: true });
    if (role) {
      andConditions.push({
        $or: [{ roles: { $size: 0 } }, { roles: role.toLowerCase() }],
      });
    }
    if (q.trim()) {
      andConditions.push({
        $or: [
          { question: { $regex: q.trim(), $options: "i" } },
          { answer: { $regex: q.trim(), $options: "i" } },
          { keywords: { $elemMatch: { $regex: q.trim(), $options: "i" } } },
        ],
      });
    }
    const query = andConditions.length > 0 ? { $and: andConditions } : {};

    const items = await EchoKnowledge.find(query).sort({ priority: -1, updatedAt: -1 });
    return res.json({ success: true, items });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const createEchoKnowledge = async (req, res) => {
  try {
    const item = await EchoKnowledge.create(buildPayload(req.body || {}));
    return res.status(201).json({ success: true, item });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const updateEchoKnowledge = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = buildPayload(req.body || {});

    const item = await EchoKnowledge.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({ success: false, message: "Knowledge item not found" });
    }
    return res.json({ success: true, item });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteEchoKnowledge = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await EchoKnowledge.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Knowledge item not found" });
    }
    return res.json({ success: true, message: "Knowledge item deleted" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const exportEchoKnowledgeCsv = async (req, res) => {
  try {
    const items = await EchoKnowledge.find({}).sort({ priority: -1, updatedAt: -1 }).lean();
    const headers = ["id", "question", "answer", "keywords", "roles", "minScore", "priority", "isActive"];
    const lines = [headers.join(",")];

    for (const item of items) {
      const row = [
        item._id,
        item.question || "",
        item.answer || "",
        Array.isArray(item.keywords) ? item.keywords.join("|") : "",
        Array.isArray(item.roles) ? item.roles.join("|") : "",
        Number(item.minScore ?? 0.35),
        Number(item.priority ?? 0),
        item.isActive !== false ? "true" : "false",
      ];
      lines.push(row.map(escapeCsvCell).join(","));
    }

    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=echo-knowledge.csv");
    return res.status(200).send(csv);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const importEchoKnowledgeCsv = async (req, res) => {
  try {
    if (!req.file?.buffer) {
      return res.status(400).json({ success: false, message: "CSV file is required" });
    }

    const content = req.file.buffer.toString("utf-8");
    const rows = parseCsv(content);
    if (!rows.length) {
      return res.status(400).json({ success: false, message: "CSV file is empty" });
    }

    const headers = rows[0].map((h) => String(h || "").trim());
    const indexMap = headers.reduce((acc, name, index) => {
      if (name) acc[name] = index;
      return acc;
    }, {});

    if (indexMap.question === undefined || indexMap.answer === undefined) {
      return res.status(400).json({
        success: false,
        message: "CSV must include question and answer columns",
      });
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (let i = 1; i < rows.length; i += 1) {
      const row = rows[i];
      const question = String(row[indexMap.question] || "").trim();
      const answer = String(row[indexMap.answer] || "").trim();
      if (!question || !answer) {
        skipped += 1;
        continue;
      }

      const payload = buildPayload({
        question,
        answer,
        keywords: indexMap.keywords !== undefined ? row[indexMap.keywords] : "",
        roles: indexMap.roles !== undefined ? row[indexMap.roles] : "",
        minScore: indexMap.minScore !== undefined ? row[indexMap.minScore] : 0.35,
        priority: indexMap.priority !== undefined ? row[indexMap.priority] : 0,
        isActive: indexMap.isActive !== undefined ? row[indexMap.isActive] : true,
      });

      const existing = await EchoKnowledge.findOne({ question: payload.question });
      if (existing) {
        existing.answer = payload.answer;
        existing.keywords = payload.keywords;
        existing.roles = payload.roles;
        existing.minScore = payload.minScore;
        existing.priority = payload.priority;
        existing.isActive = payload.isActive;
        await existing.save();
        updated += 1;
      } else {
        await EchoKnowledge.create(payload);
        created += 1;
      }
    }

    return res.json({
      success: true,
      message: "CSV import completed",
      summary: { created, updated, skipped },
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
