import ChecklistItem from "../models/ChecklistItem.js";
import RoomCleaningLog from "../models/RoomCleaningLog.js";
import Hostel from "../models/Hostel.js";
import { getSystemSettings, updateSystemSettings } from "../utils/systemSettings.js";

const DEFAULT_ITEMS = [
  "AC Remote",
  "TV Remote",
  "Bedsheet",
  "Pillow",
  "Chair",
  "Table",
  "Keys",
  "Washroom",
  "Lights",
  "Fan",
];

const roleOf = (user) => String(user?.role || "").toLowerCase();
const userHostel = (user) => user?.assignedHostel || user?.hostel || "";
const normalizeHostelName = (value = "") => String(value || "").trim().toLowerCase();

const canManageUniversal = (user) => roleOf(user) === "admin";

const canAccessHostel = (user, hostel) => {
  const role = roleOf(user);
  if (["admin", "manager", "adosa"].includes(role)) return true;
  if (["caretaker", "warden"].includes(role)) {
    return normalizeHostelName(userHostel(user)) === normalizeHostelName(hostel);
  }
  return false;
};

const ensureCleaningEnabled = async (res) => {
  const settings = await getSystemSettings({ fresh: true });
  if (settings?.operations?.enableCleaningWorkflow === false) {
    res.status(403).json({ success: false, message: "Cleaning workflow is currently disabled by System Controls." });
    return null;
  }
  return settings;
};

export const ensureDefaultChecklistItems = async () => {
  for (const label of DEFAULT_ITEMS) {
    await ChecklistItem.updateOne(
      { label, scope: "universal", hostel: "" },
      { $setOnInsert: { label, scope: "universal", hostel: "", active: true } },
      { upsert: true }
    );
  }
};

export const getCleaningSettings = async (_req, res) => {
  const settings = await getSystemSettings({ fresh: true });
  res.json({
    success: true,
    cleaning: settings.cleaning || {
      enableCleaningChecklist: true,
      enableCleaningRequests: false,
    },
  });
};

export const updateCleaningSettings = async (req, res) => {
  if (roleOf(req.user) !== "admin") {
    return res.status(403).json({ success: false, message: "Only admin can update cleaning settings" });
  }

  const cleaning = {
    enableCleaningChecklist: req.body?.enableCleaningChecklist !== false,
    enableCleaningRequests: req.body?.enableCleaningRequests === true,
  };

  const settings = await updateSystemSettings({ cleaning }, req.user?._id || null);
  res.json({ success: true, cleaning: settings.cleaning });
};

export const getChecklistItems = async (req, res) => {
  const settings = await ensureCleaningEnabled(res);
  if (!settings) return;

  await ensureDefaultChecklistItems();

  const role = roleOf(req.user);
  const assignedHostel = userHostel(req.user);
  const requestedHostel = req.query.hostel || assignedHostel;

  const filter =
    role === "admin"
      ? {}
      : {
          $or: [
            { scope: "universal" },
            { scope: "hostel", hostel: assignedHostel },
          ],
        };

  const items = await ChecklistItem.find({ ...filter, active: true })
    .sort({ scope: 1, hostel: 1, label: 1 })
    .lean();

  res.json({
    success: true,
    items: requestedHostel
      ? items.filter((item) => item.scope === "universal" || item.hostel === requestedHostel || role === "admin")
      : items,
  });
};

export const addChecklistItem = async (req, res) => {
  const settings = await ensureCleaningEnabled(res);
  if (!settings) return;

  const label = String(req.body?.label || "").trim();
  const role = roleOf(req.user);
  const requestedScope = String(req.body?.scope || "hostel").toLowerCase();
  const hostel = role === "admin" && req.body?.hostel ? String(req.body.hostel).trim() : userHostel(req.user);
  const scope = role === "admin" && requestedScope === "universal" ? "universal" : "hostel";

  if (!label) {
    return res.status(400).json({ success: false, message: "Checklist item name is required" });
  }

  if (scope === "universal" && !canManageUniversal(req.user)) {
    return res.status(403).json({ success: false, message: "Only admin can add universal checklist items" });
  }

  if (scope === "hostel" && !hostel) {
    return res.status(400).json({ success: false, message: "Hostel is required" });
  }

  if (scope === "hostel" && !canAccessHostel(req.user, hostel)) {
    return res.status(403).json({ success: false, message: "You can manage checklist items only for your hostel" });
  }

  const item = await ChecklistItem.findOneAndUpdate(
    { label, scope, hostel: scope === "hostel" ? hostel : "" },
    {
      $set: {
        label,
        scope,
        hostel: scope === "hostel" ? hostel : "",
        active: true,
        createdBy: req.user?._id || null,
      },
    },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, item });
};

export const deleteChecklistItem = async (req, res) => {
  const settings = await ensureCleaningEnabled(res);
  if (!settings) return;

  const item = await ChecklistItem.findById(req.params.id);
  if (!item) {
    return res.status(404).json({ success: false, message: "Checklist item not found" });
  }

  if (item.scope === "universal" && !canManageUniversal(req.user)) {
    return res.status(403).json({ success: false, message: "Only admin can delete universal checklist items" });
  }

  if (item.scope === "hostel" && !canAccessHostel(req.user, item.hostel)) {
    return res.status(403).json({ success: false, message: "You can delete checklist items only for your hostel" });
  }

  item.active = false;
  await item.save();
  res.json({ success: true, message: "Checklist item deleted" });
};

export const getRoomCleaningStatus = async (req, res) => {
  const settings = await ensureCleaningEnabled(res);
  if (!settings) return;

  const { hostel, roomNo } = req.params;
  if (!canAccessHostel(req.user, hostel)) {
    return res.status(403).json({ success: false, message: "Not allowed for this hostel" });
  }

  const hostelDoc = await Hostel.findOne({ name: hostel }).lean();
  const room = hostelDoc?.rooms?.find((item) => item.roomNo === roomNo);
  const latestLog = await RoomCleaningLog.findOne({
    hostel,
    roomNo,
    status: { $in: ["pending", "checklist_submitted"] },
  })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    roomState: room?.isBlocked ? "maintenance_blocked" : room?.roomState || "available",
    room,
    cleaningLog: latestLog,
  });
};

export const submitCleaningChecklist = async (req, res) => {
  const settings = await ensureCleaningEnabled(res);
  if (!settings) return;

  const { hostel, roomNo } = req.params;
  if (!canAccessHostel(req.user, hostel)) {
    return res.status(403).json({ success: false, message: "Not allowed for this hostel" });
  }

  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  if (items.length === 0 || items.some((item) => item.checked !== true)) {
    return res.status(400).json({ success: false, message: "All checklist items must be verified before submission" });
  }

  const log = await RoomCleaningLog.findOneAndUpdate(
    { hostel, roomNo, status: { $in: ["pending", "checklist_submitted"] } },
    {
      $set: {
        hostel,
        roomNo,
        status: "checklist_submitted",
        checklistItems: items.map((item) => ({
          checklistItemId: item.checklistItemId || item._id || null,
          label: item.label,
          checked: item.checked === true,
          remarks: item.remarks || "",
          damageNotes: item.damageNotes || "",
          missingItemNotes: item.missingItemNotes || "",
        })),
        submittedBy: req.user?._id || null,
        submittedAt: new Date(),
      },
    },
    { new: true, upsert: true }
  );

  res.json({ success: true, message: "Cleaning checklist submitted", cleaningLog: log });
};

export const markRoomClean = async (req, res) => {
  const settings = await ensureCleaningEnabled(res);
  if (!settings) return;

  const { hostel, roomNo } = req.params;
  if (!canAccessHostel(req.user, hostel)) {
    return res.status(403).json({ success: false, message: "Not allowed for this hostel" });
  }

  const log = await RoomCleaningLog.findOne({
    hostel,
    roomNo,
    status: "checklist_submitted",
  }).sort({ submittedAt: -1 });

  if (!log) {
    return res.status(400).json({ success: false, message: "Submit the cleaning checklist before marking room clean" });
  }

  const hostelDoc = await Hostel.findOne({ name: hostel });
  const room = hostelDoc?.rooms?.find((item) => item.roomNo === roomNo);
  if (!room) {
    return res.status(404).json({ success: false, message: "Room not found" });
  }

  if (room.isBlocked) {
    return res.status(400).json({ success: false, message: "Room is maintenance blocked. Unblock it before marking available." });
  }

  room.roomState = "available";
  room.cleaningPendingSince = null;
  room.lastCleanedAt = new Date();
  room.lastCleanedBy = req.user?._id || null;
  await hostelDoc.save();

  log.status = "cleaned";
  log.markedCleanBy = req.user?._id || null;
  log.markedCleanAt = new Date();
  await log.save();

  const io = req.app.get("io") || global.io;
  if (io) {
    io.to("dashboard-room").emit("room_cleaned", {
      hostel,
      roomNo,
      roomState: "available",
      timestamp: new Date().toISOString(),
    });
  }

  res.json({ success: true, message: "Room marked clean and available", cleaningLog: log });
};
