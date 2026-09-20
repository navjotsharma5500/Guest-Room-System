// src/config/campusPortals.js
//
// Central, frontend-only configuration for the Campus Connect workspace
// (DashboardSelector). It describes the *launcher links* shown in the sidebar
// and Quick Access area, and the small UI preferences persisted for them.
//
// IMPORTANT
//  - This file does NOT decide access to internal dashboards. Those still come
//    from resolveDashboardAccess() + settings.dashboardRegistry.
//  - External portals authenticate themselves. Nothing here stores or injects
//    credentials, tokens or cookies. Only UI preferences (sidebar pinned flag
//    and favourite portal IDs) are ever written to localStorage.
import {
  CalendarDays,
  ClipboardList,
  Database,
  GraduationCap,
  Globe,
  Landmark,
  Megaphone,
  MessageSquare,
  Moon,
  Route,
  Settings,
  BarChart3,
  Users,
} from "lucide-react";
import { STAFF_ROLES_WITH_SHARED_SELECTOR } from "../utils/dashboardAccess";

// Same normalisation the selector has always used for its role checks
// (lower-case only, no trimming), so no access condition is widened.
export const normalizeWorkspaceRole = (role = "") => String(role || "").toLowerCase();

// ─── Storage keys (UI preferences only) ─────────────────────────────────────
export const SIDEBAR_PINNED_STORAGE_KEY = "campusConnect.dashboardSelector.sidebarPinned";
export const FAVORITES_STORAGE_KEY_PREFIX = "campusConnect.dashboardSelector.favorites.";
export const MAX_QUICK_ACCESS = 6;

// ─── Portal catalogue ───────────────────────────────────────────────────────
// Presentation only. URLs are role-specific and live in ROLE_CAMPUS_PORTALS.
const CAMPUS_PORTAL_CATALOG = {
  "student-notices": {
    title: "Student Notices",
    description: "Manage and publish student notices",
    icon: Megaphone,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  "society-route-manager": {
    title: "Society Route Manager",
    description: "Manage student society routes and hosted paths",
    icon: Route,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
  "library-night-pass": {
    title: "Library Night Pass",
    description: "Access library night permission operations",
    icon: Moon,
    iconBg: "bg-slate-200",
    iconColor: "text-slate-700",
  },
  "event-calendar": {
    title: "Event Calendar",
    description: "Manage the consolidated campus event calendar",
    icon: CalendarDays,
    iconBg: "bg-orange-100",
    iconColor: "text-orange-600",
  },
  "student-calendar": {
    title: "Student Calendar",
    description: "Manage the student academic/event calendar",
    icon: GraduationCap,
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
  },
  "institute-calendar": {
    title: "Institute Calendar",
    description: "Manage the institute event calendar",
    icon: Landmark,
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
  },
  "student-societies": {
    title: "Student Societies",
    description: "Access student societies administration",
    icon: Users,
    iconBg: "bg-teal-100",
    iconColor: "text-teal-600",
  },
};

// ─── Role → external campus portals (exact URLs, in display order) ──────────
// Keyed by the exact normalised role. A role that is not listed here gets no
// campus portals. Do not infer portal access from dashboardRegistry.
export const ROLE_CAMPUS_PORTALS = {
  admin: [
    { id: "student-notices", url: "https://campusconnect.thapar.edu/student-notices/admin" },
    { id: "society-route-manager", url: "https://studentsocieties.thapar.edu/route-manager/" },
    { id: "library-night-pass", url: "https://campusconnect.thapar.edu/permissions/admin/" },
    { id: "event-calendar", url: "https://campusconnect.thapar.edu/event-calendar/admin" },
    { id: "student-calendar", url: "https://campusconnect.thapar.edu/tc/admin/login" },
    { id: "institute-calendar", url: "https://campusconnect.thapar.edu/ic/admin/login" },
    { id: "student-societies", url: "https://studentsocieties.thapar.edu/admin/login" },
  ],
  assistant: [
    { id: "student-societies", url: "https://studentsocieties.thapar.edu/admin/login" },
    { id: "event-calendar", url: "https://campusconnect.thapar.edu/event-calendar/admin" },
    { id: "student-calendar", url: "https://campusconnect.thapar.edu/tc/admin/login" },
    { id: "institute-calendar", url: "https://campusconnect.thapar.edu/ic/admin/login" },
  ],
  caretaker: [
    {
      id: "library-night-pass",
      url: "https://campusconnect.thapar.edu/permissions/login/?next=/permissions/",
    },
  ],
};

// ─── Default Quick Access per role ──────────────────────────────────────────
// Ids that a role cannot actually open are dropped by sanitiseFavorites(), so
// e.g. caretaker's Fretbox default only appears if that role receives Fretbox.
export const DEFAULT_QUICK_ACCESS = {
  admin: ["student-notices", "event-calendar", "library-night-pass", "student-societies"],
  assistant: ["event-calendar", "student-calendar", "institute-calendar", "student-societies"],
  caretaker: ["library-night-pass", "fretbox-resident-app"],
};
const FALLBACK_QUICK_ACCESS = ["fretbox-resident-app"];

// ─── Existing (pre-workspace) tools, kept with their original behaviour ─────
const FRETBOX_URL = "https://admin.fretbox.in/account/signin?returnUrl=dashboard";
const GRIEVANCE_PATH = "/grievance/admin/users";

const externalTarget = (url) => ({ type: "external", url });

const buildFretboxItem = () => ({
  id: "fretbox-resident-app",
  title: "Fretbox Resident App",
  description: "Open the Fretbox resident management portal",
  icon: Globe,
  iconBg: "bg-emerald-100",
  iconColor: "text-emerald-600",
  external: true,
  favoritable: true,
  target: externalTarget(FRETBOX_URL),
});

// The Grievance Portal is a separate application on the same CampusConnect
// domain and not part of this SPA's router, so it needs a hard same-tab
// navigation ("redirect"), exactly as before.
const buildGrievanceItem = () => ({
  id: "grievance-admin-portal",
  title: "Student Grievance Admin",
  description: "Manage student grievances and grievance portal users",
  icon: ClipboardList,
  iconBg: "bg-amber-100",
  iconColor: "text-amber-600",
  external: false,
  favoritable: true,
  target: { type: "redirect", path: GRIEVANCE_PATH },
});

const buildAdminTools = () => [
  {
    id: "public-ui",
    title: "Public UI",
    description: "Customise the public-facing pages",
    icon: Settings,
    iconBg: "bg-red-100",
    iconColor: "text-red-600",
    favoritable: false,
    target: { type: "route", path: "/admin/public-ui-customizer" },
  },
  {
    id: "campus-feedback",
    title: "Campus Feedback",
    description: "Review campus feedback submissions",
    icon: MessageSquare,
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    favoritable: false,
    target: { type: "route", path: "/admin/campus-feedback" },
  },
  {
    id: "echo-knowledge",
    title: "Echo Knowledge",
    description: "Manage the Echo assistant knowledge base",
    icon: Database,
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    favoritable: false,
    target: { type: "route", path: "/admin/echo-knowledge" },
  },
  {
    id: "system-analytics",
    title: "System Analytics",
    description: "View system-wide analytics",
    icon: BarChart3,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
    favoritable: false,
    // Handled in DashboardSelector: opens the existing in-page analytics view.
    target: { type: "action", action: "showAnalytics" },
  },
];

/**
 * Resolve every non-dashboardRegistry launcher item for a role, grouped for the
 * sidebar. `role` is normalised here so callers can pass the raw value.
 *
 * Access rules (unchanged from the previous selector):
 *  - Grievance + Admin Tools: exact role "admin" only
 *  - Fretbox: any role in STAFF_ROLES_WITH_SHARED_SELECTOR
 *  - Campus portals: only roles listed in ROLE_CAMPUS_PORTALS
 */
export const getWorkspaceItems = (rawRole) => {
  const role = normalizeWorkspaceRole(rawRole);

  const campusPortals = (ROLE_CAMPUS_PORTALS[role] || []).map(({ id, url }) => ({
    id,
    ...CAMPUS_PORTAL_CATALOG[id],
    external: true,
    favoritable: true,
    target: externalTarget(url),
  }));

  const adminTools = [];
  if (role === "admin") {
    adminTools.push(buildGrievanceItem(), ...buildAdminTools());
  }

  const otherTools = [];
  if (STAFF_ROLES_WITH_SHARED_SELECTOR.includes(role)) {
    otherTools.push(buildFretboxItem());
  }

  return { campusPortals, adminTools, otherTools };
};

// Sidebar footer action. Opens the existing Public Forms modal.
export const PUBLIC_FORMS_ITEM = {
  id: "public-forms",
  title: "Public Forms",
  description: "Access public booking portals and calendars",
  icon: Globe,
  iconBg: "bg-teal-100",
  iconColor: "text-teal-600",
  favoritable: false,
  target: { type: "action", action: "showPublicForms" },
};

export const getWorkspaceRoleLabel = (rawRole) => {
  switch (normalizeWorkspaceRole(rawRole)) {
    case "admin":
      return "Admin";
    case "assistant":
      return "Assistant";
    case "caretaker":
      return "Caretaker";
    default:
      return "Staff";
  }
};

// ─── localStorage helpers (UI preferences only, always fail-safe) ───────────
const safeStorage = () => {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
};

export const readSidebarPinned = () => {
  try {
    return safeStorage()?.getItem(SIDEBAR_PINNED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
};

export const writeSidebarPinned = (pinned) => {
  try {
    safeStorage()?.setItem(SIDEBAR_PINNED_STORAGE_KEY, pinned ? "true" : "false");
  } catch {
    /* preference only — ignore quota / privacy-mode errors */
  }
};

const favoritesKey = (rawRole) => {
  const role = normalizeWorkspaceRole(rawRole).replace(/[^a-z0-9_]/g, "");
  return role ? `${FAVORITES_STORAGE_KEY_PREFIX}${role}` : null;
};

/**
 * Turn any stored value into a clean list of favourite ids: strings only,
 * de-duplicated, restricted to ids the role can actually open, capped at
 * MAX_QUICK_ACCESS. Unknown / stale ids are silently dropped.
 */
export const sanitiseFavorites = (value, availableIds) => {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(availableIds);
  const seen = new Set();
  const result = [];
  for (const id of value) {
    if (typeof id !== "string" || !allowed.has(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= MAX_QUICK_ACCESS) break;
  }
  return result;
};

export const getDefaultQuickAccess = (rawRole) =>
  DEFAULT_QUICK_ACCESS[normalizeWorkspaceRole(rawRole)] || FALLBACK_QUICK_ACCESS;

/**
 * Quick Access ids for a role. A saved list (even an empty one, meaning the
 * user removed everything) wins; a missing or malformed value falls back to
 * the role defaults.
 */
export const readQuickAccessIds = (rawRole, availableIds) => {
  const key = favoritesKey(rawRole);
  let stored = null;
  if (key) {
    try {
      const raw = safeStorage()?.getItem(key);
      if (raw !== null && raw !== undefined) stored = JSON.parse(raw);
    } catch {
      stored = null;
    }
  }
  return Array.isArray(stored)
    ? sanitiseFavorites(stored, availableIds)
    : sanitiseFavorites(getDefaultQuickAccess(rawRole), availableIds);
};

export const writeQuickAccessIds = (rawRole, ids) => {
  const key = favoritesKey(rawRole);
  if (!key) return;
  try {
    // Portal ids only — never any credential or session material.
    safeStorage()?.setItem(key, JSON.stringify(ids.filter((id) => typeof id === "string")));
  } catch {
    /* preference only — ignore */
  }
};
