// src/utils/checkPermission.js

import { ROLE_ACCESS } from "../constants/roleAccess";
import { PERMISSIONS as P } from "../constants/permissions";

export function hasPermission(user, key) {
  if (!user) return false;

  const role = (user.role || user?.user?.role || "").toLowerCase();
  if (!role) return false;

  // Get base permissions for the role
  const permissions = [...(ROLE_ACCESS[role] || [])];

  // ✅ SPECIAL OVERRIDE: adosa2@thapar.edu
  // If user has specific 'guestRoom' permission flag (from User model), 
  // inject guest room permissions into their allowed list.
  if (role === "adosa" && user.permissions?.guestRoom === true) {
    permissions.push(P.DASHBOARD_GUEST);
    permissions.push(P.SIDEBAR_ALL_HOSTELS);
    permissions.push(P.SIDEBAR_HOSTELS);
  }

  return permissions.includes(key);
}