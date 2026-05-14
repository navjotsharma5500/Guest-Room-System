// src/utils/roleAccess.js

export const ROLE_ACCESS = {
  admin:        ["guestroom", "venue", "selector"],
  adosa:        ["venue", "selector", "guestroom"],
  assistant:    ["venue", "selector"],
  caretaker:    ["guestroom"],
  warden:       ["guestroom"],
  manager:      ["guestroom"],
  co_warden:    ["guestroom"], // ✅ Guest Room ONLY (selector: false, venue: false, night: false)
  dd_assistant: ["venue_limited"],
};

export const hasAccess = (role, resource) => {
  const normalizedRole = (role || "").toLowerCase();
  const permissions = ROLE_ACCESS[normalizedRole] || [];
  return permissions.includes(resource);
};

export const canSeeSelector = (role) => hasAccess(role, "selector");
