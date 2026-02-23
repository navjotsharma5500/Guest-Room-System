// src/utils/venueAccessPolicy.js - Client-side mirror of backend policy

export const DD_ASSISTANT_ALLOWED_ROOMS = [
  "LT-201",
  "LT-202",
  "TAN Auditorium",
];

export const DD_OFFICE_EMAIL = "Queries_studentaffairs@thapar.edu";
export const DOSA_OFFICE_EMAIL = "shabnam.rani@thapar.edu";
export const VENUE_MANDATORY_BCC = ["dosa@thapar.edu", "itmh@thapar.edu", "adosa3@thapar.edu"];

const normalizeRoomToken = (value = "") =>
  String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

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

const normalizeToken = (value = "") => String(value || "").trim().toLowerCase();

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

export const filterVenueRoomsByRole = (rooms = [], role = "") => {
  if (isVenueFullAccessRole(role)) return rooms;
  if (!isDDAssistantRole(role)) return [];
  
  return rooms.filter(room => isDDOfficeRoom(room.roomNo));
};