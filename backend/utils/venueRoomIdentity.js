import VenueConfig from "../models/VenueConfig.js";

const normalize = (value = "") => String(value || "").trim();
const normalizeKey = (value = "") => normalize(value).toLocaleLowerCase("en-IN");

const getGlobalVenueConfig = () => VenueConfig.findOne({ key: "global" }).lean();

/**
 * Finds the room currently displayed as `hall` / `roomNo` in the live
 * VenueConfig, returning its stable ids plus every name it has ever been
 * known by (its current name and any pre-rename names recorded in
 * room.previousNames — see venueConfigController.renameVenueRoom).
 *
 * Returns null when no room in the config matches (e.g. a booking for a
 * room that was later deleted from the config entirely) — callers must
 * fall back to a plain hall/roomNo match in that case.
 */
export const resolveVenueRoomIdentity = async (hall, roomNo) => {
  const hallKey = normalizeKey(hall);
  const roomKey = normalizeKey(roomNo);
  if (!hallKey || !roomKey) return null;

  const config = await getGlobalVenueConfig();
  if (!config) return null;

  for (const tab of config.mainTabs || []) {
    for (const section of tab.sections || []) {
      if (normalizeKey(section.label) !== hallKey) continue;
      for (const room of section.rooms || []) {
        const knownNames = [room.name, ...(room.previousNames || [])];
        if (knownNames.some((name) => normalizeKey(name) === roomKey)) {
          return {
            mainTabId: tab.id,
            sectionId: section.id,
            roomId: room.id,
            currentName: room.name,
            aliasNames: Array.from(new Set(knownNames.filter(Boolean))),
          };
        }
      }
    }
  }
  return null;
};

/**
 * Builds a Mongo query fragment matching a room by every name it has ever
 * been known by, so a room rename (e.g. "Room 101" -> "Room 101-A") cannot
 * let a legacy booking stored under the old name silently stop blocking the
 * same physical room. Hall matching is left exactly as the caller passed it
 * (no section-rename handling is in scope here). Falls back to a plain
 * hall/roomNo match when the room can't be resolved in the current config.
 */
export const buildRoomAliasMatch = async (hall, roomNo) => {
  const identity = await resolveVenueRoomIdentity(hall, roomNo);
  if (!identity || identity.aliasNames.length <= 1) {
    return { hall, roomNo };
  }
  return { hall, roomNo: { $in: identity.aliasNames } };
};
