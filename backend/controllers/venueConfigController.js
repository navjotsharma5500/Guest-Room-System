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

// Section ids are only generated unique WITHIN their own Main Tab
// (makeUniqueId's existingIds set is scoped per Main Tab), so two different
// Main Tabs can legitimately contain a section with the same id. Every
// section-level mutation must therefore be scoped by mainTabId — never
// resolved by a global sectionId search — or it risks silently modifying
// the wrong Main Tab's section.
const findSectionInMainTab = (tabs = [], mainTabId = "", sectionId = "") => {
  const tab = findMainTab(tabs, mainTabId);
  if (!tab) return { tab: null, section: null };
  const section = (tab.sections || []).find((item) => item.id === sectionId);
  return { tab, section: section || null };
};

// Room ids are only generated unique WITHIN their own section, and section
// ids are only unique within their own Main Tab — so the canonical identity
// for a room is mainTabId + sectionId + roomId. Every room-level mutation
// must resolve the room via this exact chain (Main Tab -> Section -> Room),
// never by a global sectionId or roomId scan, or it risks silently
// modifying the wrong Main Tab/Section's room.
const findRoomInMainTabSection = (tabs = [], mainTabId = "", sectionId = "", roomId = "") => {
  const { tab, section } = findSectionInMainTab(tabs, mainTabId, sectionId);
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
  const mainTabId = String(req.body?.mainTabId || "").trim();
  const sectionId = String(req.body?.sectionId || "").trim();
  const name = String(req.body?.name || "").trim();

  if (!mainTabId || !sectionId || !name) {
    return res.status(400).json({ message: "mainTabId, sectionId, and room name are required" });
  }

  const doc = await getConfigDocument();
  const tabs = cloneTabs(doc.mainTabs);
  // Section ids are only unique within their own Main Tab, so locating the
  // section to add a room to must be scoped by mainTabId — otherwise a
  // duplicate section id under a different Main Tab could receive the room.
  const { section } = findSectionInMainTab(tabs, mainTabId, sectionId);

  if (!section) {
    return res.status(404).json({ message: "Section not found in the given main tab" });
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

export const renameVenueSection = async (req, res) => {
  const mainTabId = String(req.body?.mainTabId || "").trim();
  const sectionId = String(req.body?.sectionId || "").trim();
  const label = String(req.body?.label || "").trim();

  if (!mainTabId || !sectionId || !label) {
    return res.status(400).json({ message: "mainTabId, sectionId, and label are required" });
  }

  const doc = await getConfigDocument();
  const tabs = cloneTabs(doc.mainTabs);
  const { section } = findSectionInMainTab(tabs, mainTabId, sectionId);

  if (!section) {
    return res.status(404).json({ message: "Section not found in the given main tab" });
  }

  // Record the outgoing label as an alias before overwriting it. Existing
  // VenueBooking documents store the section's old label as a plain string
  // in `hall` (no sectionId), so keeping a history of prior labels lets
  // conflict/availability detection still recognize legacy active/upcoming
  // bookings after a rename — see utils/venueRoomIdentity.js. The rename
  // itself only changes `label`; id/enabled/rooms/order are untouched.
  if (section.label !== label) {
    const previousNames = new Set(section.previousNames || []);
    previousNames.add(section.label);
    previousNames.delete(label);
    section.previousNames = Array.from(previousNames);
    section.label = label;
  }

  doc.mainTabs = tabs;
  return saveAndRespond(doc, res);
};

export const renameVenueRoom = async (req, res) => {
  const mainTabId = String(req.body?.mainTabId || "").trim();
  const roomId = String(req.body?.roomId || "").trim();
  const sectionId = String(req.body?.sectionId || "").trim();
  const name = String(req.body?.name || "").trim();

  if (!mainTabId || !sectionId || !roomId || !name) {
    return res.status(400).json({ message: "mainTabId, sectionId, roomId, and name are required" });
  }

  const doc = await getConfigDocument();
  const tabs = cloneTabs(doc.mainTabs);
  const { room } = findRoomInMainTabSection(tabs, mainTabId, sectionId, roomId);

  if (!room) {
    return res.status(404).json({ message: "Room not found in the given main tab/section" });
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
  const mainTabId = String(req.body?.mainTabId || "").trim();
  const sectionId = String(req.body?.sectionId || "").trim();
  const roomIds = req.body?.roomIds;

  if (!mainTabId || !sectionId) {
    return res.status(400).json({ message: "mainTabId and sectionId are required" });
  }
  if (!Array.isArray(roomIds) || roomIds.length === 0 || !roomIds.every((id) => typeof id === "string" && id.trim())) {
    return res.status(400).json({ message: "roomIds must be a non-empty array of room id strings" });
  }

  const doc = await getConfigDocument();
  const tabs = cloneTabs(doc.mainTabs);
  // Section ids are only unique within their own Main Tab, so locating the
  // section to reorder must be scoped by mainTabId — otherwise a duplicate
  // section id under a different Main Tab could have its rooms reordered.
  const { section } = findSectionInMainTab(tabs, mainTabId, sectionId);

  if (!section) {
    return res.status(404).json({ message: "Section not found in the given main tab" });
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
    // Room ids are only unique within their own section, and section ids
    // are only unique within their own Main Tab — so a room-level toggle
    // must be scoped by both mainTabId and sectionId, otherwise a duplicate
    // section/room id combination under a different Main Tab could be
    // toggled instead.
    if (!mainTabId || !sectionId) {
      return res.status(400).json({ message: "mainTabId and sectionId are required together with roomId" });
    }
    const { room } = findRoomInMainTabSection(tabs, mainTabId, sectionId, roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found in the given main tab/section" });
    }
    room.enabled = enabled;
  } else if (sectionId) {
    // Section ids are only unique within their own Main Tab, so a
    // section-level toggle must be scoped by mainTabId — otherwise a
    // duplicate id in another Main Tab could be toggled instead.
    if (!mainTabId) {
      return res.status(400).json({ message: "mainTabId is required together with sectionId" });
    }
    const { section } = findSectionInMainTab(tabs, mainTabId, sectionId);
    if (!section) {
      return res.status(404).json({ message: "Section not found in the given main tab" });
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
