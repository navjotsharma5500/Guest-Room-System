const normalizeToken = (value = "") => String(value || "").trim().toLowerCase();
const normalizeRoomToken = (value = "") =>
  normalizeToken(value).replace(/[^a-z0-9]/g, "");

const escapeRegExp = (value = "") =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const roomNameToRegexSource = (roomName = "") => {
  const tokens = String(roomName || "")
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map(escapeRegExp);

  if (!tokens.length) return "^$";
  return `^${tokens.join("[-_\\s]*")}$`;
};

export const DD_ASSISTANT_ALLOWED_ROOMS = [
  "LT-201",
  "LT-202",
  "TAN Auditorium",
];

export const DD_OFFICE_EMAIL = "Queries_studentaffairs@thapar.edu";
export const DOSA_OFFICE_EMAIL = "shabnam.rani@thapar.edu";
export const VENUE_MANDATORY_BCC = ["dosa@thapar.edu", "itmh@thapar.edu", "adosa3@thapar.edu"];

const DD_ALLOWED_ROOM_TOKEN_SET = new Set(
  DD_ASSISTANT_ALLOWED_ROOMS.map(normalizeRoomToken)
);

const DD_ASSISTANT_ROLE_ALIASES = new Set([
  "dd assistant",
  "dd_assistant",
  "ddassistant",
  "db assistant",
  "db_assistant",
  "dbassistant",
]);

export const isDDAssistantRole = (role = "") =>
  DD_ASSISTANT_ROLE_ALIASES.has(normalizeToken(role));

export const isVenueFullAccessRole = (role = "") =>
  ["admin", "assistant"].includes(normalizeToken(role));

export const hasVenueDashboardAccess = (role = "") =>
  isVenueFullAccessRole(role) || isDDAssistantRole(role);

export const isDDOfficeRoom = (roomNo = "") =>
  DD_ALLOWED_ROOM_TOKEN_SET.has(normalizeRoomToken(roomNo));

export const canAccessVenueRoom = (role = "", _hall = "", roomNo = "") => {
  if (isVenueFullAccessRole(role)) return true;
  if (isDDAssistantRole(role)) return isDDOfficeRoom(roomNo);
  return false;
};

export const getVenueRoomFilterForRole = (role = "", roomField = "roomNo") => {
  if (isVenueFullAccessRole(role)) return {};

  if (isDDAssistantRole(role)) {
    return {
      $or: DD_ASSISTANT_ALLOWED_ROOMS.map((roomNo) => ({
        [roomField]: {
          $regex: roomNameToRegexSource(roomNo),
          $options: "i",
        },
      })),
    };
  }

  return { _id: null };
};

export const mergeRoleRoomFilter = (
  baseQuery = {},
  role = "",
  roomField = "roomNo"
) => {
  const roleFilter = getVenueRoomFilterForRole(role, roomField);
  if (!roleFilter || !Object.keys(roleFilter).length) return baseQuery;
  return { $and: [baseQuery, roleFilter] };
};

export const filterRecordsByVenueRole = (
  records = [],
  role = "",
  roomResolver = (record) => record?.roomNo
) => {
  if (isVenueFullAccessRole(role)) return records;
  if (!isDDAssistantRole(role)) return [];

  return records.filter((record) => {
    const resolvedRoom = roomResolver(record);
    return isDDOfficeRoom(resolvedRoom);
  });
};

export const getVenueAuthorityByRoom = (roomNo = "") => {
  const isDDRoom = isDDOfficeRoom(roomNo);
  if (isDDRoom) {
    return {
      officeKey: "dd",
      officeName: "DD Office",
      senderEmail: DD_OFFICE_EMAIL,
      ccForEscalation: [DOSA_OFFICE_EMAIL],
    };
  }

  return {
    officeKey: "dosa",
    officeName: "DoSA Office",
    senderEmail: DOSA_OFFICE_EMAIL,
    ccForEscalation: [],
  };
};
