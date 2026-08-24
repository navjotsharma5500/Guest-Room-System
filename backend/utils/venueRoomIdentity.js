import VenueConfig from "../models/VenueConfig.js";

const normalize = (value = "") => String(value || "").trim();
const normalizeKey = (value = "") => normalize(value).toLocaleLowerCase("en-IN");

const getGlobalVenueConfig = () => VenueConfig.findOne({ key: "global" }).lean();

/**
 * Finds the room currently displayed as `hall` / `roomNo` in the live
 * VenueConfig, returning its stable ids plus every name/label it (and its
 * parent Section) has ever been known by:
 *  - room.name + room.previousNames (see venueConfigController.renameVenueRoom)
 *  - section.label + section.previousNames (see venueConfigController.renameVenueSection)
 *
 * A booking's `hall` is matched against the Section's current label OR any
 * of its previousNames, and `roomNo` against the Room's current name OR any
 * of its previousNames — so either identity can have been renamed
 * independently and this still resolves to the same physical room.
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
      const hallAliasNames = Array.from(
        new Set([section.label, ...(section.previousNames || [])].filter(Boolean))
      );
      const hallMatches = hallAliasNames.some((name) => normalizeKey(name) === hallKey);
      if (!hallMatches) continue;

      for (const room of section.rooms || []) {
        const aliasNames = Array.from(
          new Set([room.name, ...(room.previousNames || [])].filter(Boolean))
        );
        if (aliasNames.some((name) => normalizeKey(name) === roomKey)) {
          return {
            mainTabId: tab.id,
            sectionId: section.id,
            roomId: room.id,
            currentName: room.name,
            currentHall: section.label,
            aliasNames,
            hallAliasNames,
          };
        }
      }
    }
  }
  return null;
};

/**
 * Builds a Mongo query fragment matching a room by every hall label and
 * room name it has ever been known by, so a Section rename (e.g. "Agira
 * Hall (A)" -> "Agira Hall - A") or a Room rename cannot let a legacy
 * booking stored under an old hall/room name silently stop blocking the
 * same physical room. Falls back to a plain hall/roomNo match when the
 * room can't be resolved in the current config.
 */
export const buildRoomAliasMatch = async (hall, roomNo) => {
  const identity = await resolveVenueRoomIdentity(hall, roomNo);
  if (!identity) {
    return { hall, roomNo };
  }

  return {
    hall: identity.hallAliasNames.length > 1 ? { $in: identity.hallAliasNames } : hall,
    roomNo: identity.aliasNames.length > 1 ? { $in: identity.aliasNames } : roomNo,
  };
};
