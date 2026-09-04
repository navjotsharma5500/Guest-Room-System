import Log from "../models/Log.js";

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").slice(0, 200);
const textRegex = (value) => new RegExp(escapeRegex(value), "i");

const normalizeLegacyLog = (row) => {
  const details = row.details || row.meta || {};
  const legacy = !row.kind && !row.source;
  return {
    ...row,
    kind: row.kind || "AUDIT",
    source: row.source || (row.userId || row.user ? "USER" : "SYSTEM"),
    module: row.module || "LEGACY",
    action: String(row.action || "UNKNOWN").toUpperCase(),
    userId: row.userId || row.user || null,
    userName: row.userName || (legacy ? "Legacy / Unknown" : undefined),
    userEmail: row.userEmail || undefined,
    userRole: row.userRole || (legacy ? "Legacy / Unknown" : undefined),
    bookingId: row.bookingId || details.bookingId || undefined,
    hostel: row.hostel || details.hostel || undefined,
    roomNo: row.roomNo || details.roomNo || undefined,
    details,
    legacy,
  };
};

export const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 25));
    const query = {};
    if (req.query.kind === "AUDIT") query.$or = [{ kind: "AUDIT" }, { kind: { $exists: false } }];
    else if (req.query.kind) query.kind = req.query.kind;
    const exact = ["module", "source", "action", "functionName", "userRole", "result", "requestId"];
    exact.forEach((key) => {
      if (req.query[key]) query[key] = key === "action" ? String(req.query[key]).toUpperCase() : req.query[key];
    });
    if (req.query.module === "LEGACY") query.module = { $exists: false };
    if (req.query.role) query.userRole = req.query.role;

    if (req.query.dateFrom || req.query.dateTo) {
      query.timestamp = {};
      if (req.query.dateFrom) query.timestamp.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) query.timestamp.$lte = new Date(req.query.dateTo);
      if (Object.values(query.timestamp).some((d) => Number.isNaN(d.getTime()))) {
        return res.status(400).json({ success: false, message: "Invalid date range" });
      }
    }

    const contains = {
      user: ["userName", "userEmail"], bookingId: ["bookingId", "details.bookingId"],
      guest: ["guestName", "guestEmail", "guestContact"], hostel: ["hostel", "details.hostel"],
      room: ["roomNo", "details.roomNo"],
    };
    Object.entries(contains).forEach(([param, fields]) => {
      if (!req.query[param]) return;
      query.$and ||= [];
      query.$and.push({ $or: fields.map((field) => ({ [field]: textRegex(req.query[param]) })) });
    });

    if (req.query.search) {
      const regex = textRegex(req.query.search);
      query.$and ||= [];
      query.$and.push({ $or: [
        "action", "functionName", "userName", "userEmail", "userRole", "bookingId",
        "guestName", "guestEmail", "guestContact", "hostel", "roomNo", "route", "requestId", "remarks",
      ].map((field) => ({ [field]: regex })) });
    }

    const [rows, total] = await Promise.all([
      Log.find(query).sort({ timestamp: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Log.countDocuments(query),
    ]);

    res.json({
      success: true,
      logs: rows.map(normalizeLegacyLog),
      pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error("AUDIT_READ_FAILED", error);
    res.status(500).json({ success: false, message: "Unable to load audit logs" });
  }
};
