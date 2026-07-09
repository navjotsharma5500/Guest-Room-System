import crypto from "crypto";
import PublicGuestRoomVisit from "../models/PublicGuestRoomVisit.js";

const VISITOR_COOKIE = "grw_visitor_id";
const DAY_MS = 24 * 60 * 60 * 1000;

const getVisitorId = (req) => {
  const raw = req.body?.visitorId || req.cookies?.[VISITOR_COOKIE] || "";
  const visitorId = String(raw).trim();
  if (visitorId.length >= 16 && visitorId.length <= 128) return visitorId;
  return crypto.randomUUID();
};

const hashVisitorId = (visitorId) => {
  const salt = process.env.VISITOR_COUNTER_SECRET || process.env.JWT_SECRET || "guest-room-visitor-counter";
  return crypto.createHash("sha256").update(`${visitorId}:${salt}`).digest("hex");
};

const getTodayStart = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const buildVisitorStats = async () => {
  const [totalRow] = await PublicGuestRoomVisit.aggregate([
    { $group: { _id: null, totalVisitors: { $sum: "$count" } } },
  ]);

  const todayVisitors = await PublicGuestRoomVisit.countDocuments({
    lastCountedAt: { $gte: getTodayStart() },
  });

  return {
    totalVisitors: totalRow?.totalVisitors || 0,
    todayVisitors,
  };
};

export const recordGuestRoomVisit = async (req, res) => {
  try {
    const visitorId = getVisitorId(req);
    const visitorKeyHash = hashVisitorId(visitorId);
    const now = new Date();
    const cutoff = new Date(now.getTime() - DAY_MS);

    let counted = false;
    let visit = await PublicGuestRoomVisit.findOne({ visitorKeyHash });

    if (!visit) {
      counted = true;
      visit = await PublicGuestRoomVisit.create({
        visitorKeyHash,
        firstSeenAt: now,
        lastCountedAt: now,
        count: 1,
      });
    } else if (!visit.lastCountedAt || visit.lastCountedAt <= cutoff) {
      counted = true;
      visit.lastCountedAt = now;
      visit.count = Number(visit.count || 0) + 1;
      await visit.save();
    }

    res.cookie(VISITOR_COOKIE, visitorId, {
      maxAge: 365 * DAY_MS,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      httpOnly: false,
    });

    const stats = await buildVisitorStats();
    res.json({ success: true, counted, ...stats });
  } catch (err) {
    console.error("Guest room visit tracking failed:", err);
    res.status(500).json({ success: false, message: "Unable to record visit" });
  }
};

export const getGuestRoomVisitorCount = async (_req, res) => {
  try {
    const stats = await buildVisitorStats();
    res.json(stats);
  } catch (err) {
    console.error("Guest room visitor count failed:", err);
    res.status(500).json({ totalVisitors: 0, todayVisitors: 0 });
  }
};
