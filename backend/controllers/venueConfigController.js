import VenueConfig from "../models/VenueConfig.js";
import { cloneDefaultVenueConfig } from "../utils/defaultVenueConfig.js";

const cloneTabs = (tabs = []) => JSON.parse(JSON.stringify(tabs));
const GLOBAL_CONFIG_KEY = "global";

const normalizeTabs = (tabs = []) =>
  cloneTabs(Array.isArray(tabs) && tabs.length ? tabs : cloneDefaultVenueConfig());

const slugify = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

const makeUniqueId = (baseLabel, existingIds = new Set()) => {
  const baseId = slugify(baseLabel);
  let candidate = baseId;
  let index = 2;
  while (existingIds.has(candidate)) {
    candidate = `${baseId}-${index}`;
    index += 1;
  }
  return candidate;
};

const getConfigDocument = async () => {
  let doc = await VenueConfig.findOne({ key: GLOBAL_CONFIG_KEY });

  if (!doc) {
    const legacyDoc = await VenueConfig.findOne({
      $or: [{ key: { $exists: false } }, { key: null }, { key: "" }],
    }).sort({ updatedAt: -1 });

    if (legacyDoc) {
      try {
        const adopted = await VenueConfig.findOneAndUpdate(
          {
            _id: legacyDoc._id,
            $or: [{ key: { $exists: false } }, { key: null }, { key: "" }],
          },
          { $set: { key: GLOBAL_CONFIG_KEY } },
          { new: true }
        );
        doc = adopted || await VenueConfig.findOne({ key: GLOBAL_CONFIG_KEY });
      } catch (error) {
        if (error?.code !== 11000) throw error;
        doc = await VenueConfig.findOne({ key: GLOBAL_CONFIG_KEY });
      }
    }
  }

  if (!doc) {
    try {
      doc = await VenueConfig.create({
        key: GLOBAL_CONFIG_KEY,
        mainTabs: cloneDefaultVenueConfig(),
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      doc = await VenueConfig.findOne({ key: GLOBAL_CONFIG_KEY });
    }
  }

  if (!Array.isArray(doc.mainTabs) || doc.mainTabs.length === 0) {
    doc.mainTabs = cloneDefaultVenueConfig();
    await doc.save();
  }
  return doc;
};

const findMainTab = (tabs = [], mainTabId = "") =>
  tabs.find((tab) => tab.id === mainTabId);

const findSection = (tabs = [], sectionId = "") => {
  for (const tab of tabs) {
    const section = (tab.sections || []).find((item) => item.id === sectionId);
    if (section) return { tab, section };
  }
  return { tab: null, section: null };
};

// Room ids are only generated unique WITHIN their own section (makeUniqueId's
// existingIds set is scoped per-section), so two different sections can
// legitimately contain a room with the same id. Every room-level mutation
// must therefore be scoped by sectionId — never resolved by a global roomId
// search — or it risks silently modifying the wrong section's room.
const findRoomInSection = (tabs = [], sectionId = "", roomId = "") => {
  const { tab, section } = findSection(tabs, sectionId);
  if (!section) return { tab: null, section: null, room: null };
  const room = (section.rooms || []).find((item) => item.id === roomId);
  return { tab, section, room: room || null };
};

const saveAndRespond = async (doc, res) => {
  doc.markModified("mainTabs");
  await doc.save();
  return res.json({
    success: true,
    mainTabs: normalizeTabs(doc.mainTabs),
  });
};

export const getVenueConfig = async (_req, res) => {
  const doc = await getConfigDocument();
  return res.json({
    success: true,
    mainTabs: normalizeTabs(doc?.mainTabs),
  });
};

export const createVenueMainTab = async (req, res) => {
  const label = String(req.body?.label || "").trim();
  if (!label) {
    return res.status(400).json({ message: "Tab name is required" });
  }

  const doc = await getConfigDocument();
  const tabs = cloneTabs(doc.mainTabs);
  const existingIds = new Set(tabs.map((tab) => tab.id));

  tabs.push({
    id: makeUniqueId(label, existingIds),
    label,
    enabled: true,
    sections: [],
  });

  doc.mainTabs = tabs;
  return saveAndRespond(doc, res);
};

export const createVenueSection = async (req, res) => {
  const mainTabId = String(req.body?.mainTabId || "").trim();
  const label = String(req.body?.label || "").trim();

  if (!mainTabId || !label) {
    return res.status(400).json({ message: "mainTabId and section name are required" });
  }

  const doc = await getConfigDocument();
  const tabs = cloneTabs(doc.mainTabs);
  const tab = findMainTab(tabs, mainTabId);

  if (!tab) {
    return res.status(404).json({ message: "Main tab not found" });
  }

  const existingIds = new Set((tab.sections || []).map((section) => section.id));
  tab.sections = tab.sections || [];
  tab.sections.push({
    id: makeUniqueId(label, existingIds),
    label,
    enabled: true,
    rooms: [],
  });

  doc.mainTabs = tabs;
  return saveAndRespond(doc, res);
};

export const createVenueRoom = async (req, res) => {
  const sectionId = String(req.body?.sectionId || "").trim();
  const name = String(req.body?.name || "").trim();

  if (!sectionId || !name) {
    return res.status(400).json({ message: "sectionId and room name are required" });
  }

  const doc = await getConfigDocument();
  const tabs = cloneTabs(doc.mainTabs);
  const { section } = findSection(tabs, sectionId);

  if (!section) {
    return res.status(404).json({ message: "Section not found" });
  }

  const existingIds = new Set((section.rooms || []).map((room) => room.id));
  section.rooms = section.rooms || [];
  section.rooms.push({
    id: makeUniqueId(name, existingIds),
    name,
    enabled: true,
  });

  doc.mainTabs = tabs;
  return saveAndRespond(doc, res);
};

export const renameVenueMainTab = async (req, res) => {
  const mainTabId = String(req.body?.mainTabId || "").trim();
  const label = String(req.body?.label || "").trim();

  if (!mainTabId || !label) {
    return res.status(400).json({ message: "mainTabId and label are required" });
  }

  const doc = await getConfigDocument();
  const tabs = cloneTabs(doc.mainTabs);
  const tab = findMainTab(tabs, mainTabId);

  if (!tab) {
    return res.status(404).json({ message: "Main tab not found" });
  }

  // Only the label changes — id, enabled, and sections/rooms are untouched,
  // so historical bookings (which never reference mainTabId) are unaffected.
  tab.label = label;
  doc.mainTabs = tabs;
  return saveAndRespond(doc, res);
};

export const renameVenueRoom = async (req, res) => {
  const roomId = String(req.body?.roomId || "").trim();
  const sectionId = String(req.body?.sectionId || "").trim();
  const name = String(req.body?.name || "").trim();

  if (!sectionId || !roomId || !name) {
    return res.status(400).json({ message: "sectionId, roomId, and name are required" });
  }

  const doc = await getConfigDocument();
  const tabs = cloneTabs(doc.mainTabs);
  const { room } = findRoomInSection(tabs, sectionId, roomId);

  if (!room) {
    return res.status(404).json({ message: "Room not found in the given section" });
  }

  // Record the outgoing name as an alias before overwriting it. Existing
  // VenueBooking documents store the room's old name as a plain string (no
  // roomId), so keeping a history of prior names lets conflict-detection
  // still recognize legacy active/upcoming bookings after a rename — see
  // utils/venueRoomIdentity.js. The rename itself only changes `name`;
  // id/enabled/order are untouched.
  if (room.name !== name) {
    const previousNames = new Set(room.previousNames || []);
    previousNames.add(room.name);
    previousNames.delete(name);
    room.previousNames = Array.from(previousNames);
    room.name = name;
  }

  doc.mainTabs = tabs;
  return saveAndRespond(doc, res);
};

export const reorderVenueRooms = async (req, res) => {
  const sectionId = String(req.body?.sectionId || "").trim();
  const roomIds = req.body?.roomIds;

  if (!sectionId) {
    return res.status(400).json({ message: "sectionId is required" });
  }
  if (!Array.isArray(roomIds) || roomIds.length === 0 || !roomIds.every((id) => typeof id === "string" && id.trim())) {
    return res.status(400).json({ message: "roomIds must be a non-empty array of room id strings" });
  }

  const doc = await getConfigDocument();
  const tabs = cloneTabs(doc.mainTabs);
  const { section } = findSection(tabs, sectionId);

  if (!section) {
    return res.status(404).json({ message: "Section not found" });
  }

  const currentRooms = section.rooms || [];
  const currentIds = currentRooms.map((room) => room.id);
  const submittedUnique = new Set(roomIds);

  const isExactMatch =
    roomIds.length === currentIds.length &&
    submittedUnique.size === roomIds.length &&
    currentIds.every((id) => submittedUnique.has(id));

  if (!isExactMatch) {
    return res.status(400).json({
      message: "roomIds must contain every room currently in this section exactly once — no other section's rooms may be reordered",
    });
  }

  const roomsById = new Map(currentRooms.map((room) => [room.id, room]));
  section.rooms = roomIds.map((id) => roomsById.get(id));

  doc.mainTabs = tabs;
  return saveAndRespond(doc, res);
};

export const toggleVenueConfigItem = async (req, res) => {
  const enabled = req.body?.enabled;
  const mainTabId = String(req.body?.mainTabId || "").trim();
  const sectionId = String(req.body?.sectionId || "").trim();
  const roomId = String(req.body?.roomId || "").trim();

  if (typeof enabled !== "boolean") {
    return res.status(400).json({ message: "enabled must be a boolean" });
  }

  const doc = await getConfigDocument();
  const tabs = cloneTabs(doc.mainTabs);

  if (roomId) {
    // Room ids are only unique within their own section, so a room-level
    // toggle must be scoped by sectionId — otherwise a duplicate id in
    // another section could be toggled instead.
    if (!sectionId) {
      return res.status(400).json({ message: "sectionId is required together with roomId" });
    }
    const { room } = findRoomInSection(tabs, sectionId, roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found in the given section" });
    }
    room.enabled = enabled;
  } else if (sectionId) {
    const { section } = findSection(tabs, sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found" });
    }
    section.enabled = enabled;
  } else if (mainTabId) {
    const tab = findMainTab(tabs, mainTabId);
    if (!tab) {
      return res.status(404).json({ message: "Main tab not found" });
    }
    tab.enabled = enabled;
  } else {
    return res.status(400).json({ message: "mainTabId, sectionId, or roomId is required" });
  }

  doc.mainTabs = tabs;
  return saveAndRespond(doc, res);
};
