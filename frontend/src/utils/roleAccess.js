// src/utils/roleAccess.js

export const ROLE_ACCESS = {
  admin:        ["guestroom", "venue", "night", "selector"],
  adosa:        ["venue", "night", "selector"],
  assistant:    ["venue", "night", "selector"],
  caretaker:    ["guestroom", "night_scan", "selector"],
  warden:       ["guestroom"],
  manager:      ["guestroom"],
  co_warden:    ["guestroom"],
  dd_assistant: ["venue_limited"],
  president:    ["night"],
  gen_sec:      ["night"],
  guard:        ["night_scan_only"],
  student:      ["night_student"],
};

export const hasAccess = (role, resource) => {
  const normalizedRole = (role || "").toLowerCase();
  const permissions = ROLE_ACCESS[normalizedRole] || [];
  return permissions.includes(resource);
};

export const canSeeSelector = (role) => hasAccess(role, "selector");
