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
  FileText,
  GraduationCap,
  Globe,
  HeartPulse,
  Landmark,
  Megaphone,
  MessageSquare,
  Moon,
  MoonStar,
  PackageSearch,
  Route,
  Settings,
  BarChart3,
  Users,
} from "lucide-react";
import { STAFF_ROLES_WITH_SHARED_SELECTOR } from "../utils/dashboardAccess";

// Same normalisation the selector has always used for its role checks
// (lower-case only, no trimming), so no access condition is widened.
export const normalizeWorkspaceRole = (role = "") => String(role || "").toLowerCase();

// Account-specific access is keyed by e-mail, so it is compared trimmed and
// lower-cased.
export const normalizeWorkspaceEmail = (email) => String(email || "").trim().toLowerCase();

// ─── Storage keys (UI preferences only) ─────────────────────────────────────
export const SIDEBAR_PINNED_STORAGE_KEY = "campusConnect.dashboardSelector.sidebarPinned";
export const FAVORITES_STORAGE_KEY_PREFIX = "campusConnect.dashboardSelector.favorites.";
export const MAX_QUICK_ACCESS = 6;

// ─── Portal catalogue ───────────────────────────────────────────────────────
// Presentation only. URLs are access-specific and live in ROLE_CAMPUS_PORTALS /
// ACCOUNT_CAMPUS_PORTALS.
const CAMPUS_PORTAL_CATALOG = {
  "tiet-health-hub": {
    title: "TIET Health Hub",
    description: "Access TIET Health Hub administration",
    icon: HeartPulse,
    iconBg: "bg-rose-100",
    iconColor: "text-rose-600",
  },
  "lost-and-found": {
    title: "Lost & Found",
    description: "Manage and access the campus Lost & Found portal",
    icon: PackageSearch,
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
  },
  "society-night-permission": {
    title: "Society Night Permission",
    description: "Manage society night permission requests",
    icon: MoonStar,
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
  },
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

const SOCIETY_NIGHT_PERMISSION_URL = "https://studentsocieties.thapar.edu/permissions/";
const LOST_AND_FOUND_URL = "https://campusconnect.thapar.edu/lostnfound/";
const TIET_HEALTH_HUB_URL = "https://campusconnect.thapar.edu/dispensary/admin";

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
    { id: "lost-and-found", url: LOST_AND_FOUND_URL },
    { id: "society-night-permission", url: SOCIETY_NIGHT_PERMISSION_URL },
    { id: "tiet-health-hub", url: TIET_HEALTH_HUB_URL },
  ],
  assistant: [
    { id: "student-societies", url: "https://studentsocieties.thapar.edu/admin/login" },
    { id: "event-calendar", url: "https://campusconnect.thapar.edu/event-calendar/admin" },
    { id: "student-calendar", url: "https://campusconnect.thapar.edu/tc/admin/login" },
    { id: "institute-calendar", url: "https://campusconnect.thapar.edu/ic/admin/login" },
    { id: "society-night-permission", url: SOCIETY_NIGHT_PERMISSION_URL },
    { id: "tiet-health-hub", url: TIET_HEALTH_HUB_URL },
  ],
  caretaker: [
    {
      id: "library-night-pass",
      url: "https://campusconnect.thapar.edu/permissions/login/?next=/permissions/",
    },
    { id: "society-night-permission", url: SOCIETY_NIGHT_PERMISSION_URL },
  ],
};

// ─── Exceptional accounts → extra campus portals ────────────────────────────
// Keyed by the normalised (trimmed, lower-case) e-mail, exact match only. These
// are added on top of whatever the user's role already grants and de-duplicated
// by portal id. Never grant a role-wide portal by listing one account here.
export const ACCOUNT_CAMPUS_PORTALS = {
  "adosa3@thapar.edu": [{ id: "society-night-permission", url: SOCIETY_NIGHT_PERMISSION_URL }],
};

// Extra Quick Access defaults for the same exceptional accounts.
export const ACCOUNT_DEFAULT_QUICK_ACCESS = {
  "adosa3@thapar.edu": ["society-night-permission"],
};

/**
 * Campus portal entries ({ id, url }) for a user: role portals first, then
 * account-specific ones, de-duplicated by id (first occurrence wins).
 */
export const resolveCampusPortalEntries = (rawRole, rawEmail) => {
  const role = normalizeWorkspaceRole(rawRole);
  const email = normalizeWorkspaceEmail(rawEmail);
  const seen = new Set();
  return [...(ROLE_CAMPUS_PORTALS[role] || []), ...(ACCOUNT_CAMPUS_PORTALS[email] || [])].filter(
    ({ id }) => !seen.has(id) && seen.add(id)
  );
};

// ─── Default Quick Access per role ──────────────────────────────────────────
// Ids that a role cannot actually open are dropped by sanitiseFavorites(), so
// e.g. caretaker's Fretbox default only appears if that role receives Fretbox.
export const DEFAULT_QUICK_ACCESS = {
  admin: [
    "student-notices",
    "event-calendar",
    "library-night-pass",
    "student-societies",
    "society-night-permission",
    "tiet-health-hub",
  ],
  assistant: ["event-calendar", "student-calendar", "institute-calendar", "student-societies", "society-night-permission", "tiet-health-hub"],
  caretaker: ["library-night-pass", "fretbox-resident-app", "society-night-permission"],
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

// Shared with Assistant (see getWorkspaceItems): Assistant gets management
// access to Public Forms only, not the rest of the Admin Tools rail.
const buildPublicFormsItem = () => ({
  id: "manage-public-forms",
  title: "Manage Public Forms",
  description: "Manage student forms and downloads",
  icon: FileText,
  iconBg: "bg-red-100",
  iconColor: "text-red-600",
  favoritable: false,
  target: { type: "route", path: "/admin/public-forms" },
});

const buildAdminTools = () => [
  buildPublicFormsItem(),
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
 * sidebar. `role` and `email` are normalised here so callers can pass raw values.
 *
 * Access rules (unchanged from the previous selector, except as noted):
 *  - Grievance + full Admin Tools: exact role "admin" only
 *  - Manage Public Forms: also shown to role "assistant" (management access,
 *    no delete — see publicFormRoutes.js)
 *  - Fretbox: any role in STAFF_ROLES_WITH_SHARED_SELECTOR
 *  - Campus portals: roles listed in ROLE_CAMPUS_PORTALS, plus accounts listed
 *    in ACCOUNT_CAMPUS_PORTALS (see resolveCampusPortalEntries)
 */
export const getWorkspaceItems = (rawRole, rawEmail) => {
  const role = normalizeWorkspaceRole(rawRole);

  const campusPortals = resolveCampusPortalEntries(role, rawEmail).map(({ id, url }) => ({
    id,
    ...CAMPUS_PORTAL_CATALOG[id],
    external: true,
    favoritable: true,
    target: externalTarget(url),
  }));

  const adminTools = [];
  if (role === "admin") {
    adminTools.push(buildGrievanceItem(), ...buildAdminTools());
  } else if (role === "assistant") {
    adminTools.push(buildPublicFormsItem());
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

// Role-keyed as before. Accounts with account-specific portals get their own
// key so their preferences neither leak to, nor get overwritten by, other users
// of the same role on a shared browser. Everyone else keeps the existing key.
const favoritesKey = (rawRole, rawEmail) => {
  const role = normalizeWorkspaceRole(rawRole).replace(/[^a-z0-9_]/g, "");
  if (!role) return null;
  const email = normalizeWorkspaceEmail(rawEmail);
  if (ACCOUNT_CAMPUS_PORTALS[email] || ACCOUNT_DEFAULT_QUICK_ACCESS[email]) {
    return `${FAVORITES_STORAGE_KEY_PREFIX}${role}.account.${email.replace(/[^a-z0-9@._-]/g, "")}`;
  }
  return `${FAVORITES_STORAGE_KEY_PREFIX}${role}`;
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

export const getDefaultQuickAccess = (rawRole, rawEmail) => {
  const roleDefaults = DEFAULT_QUICK_ACCESS[normalizeWorkspaceRole(rawRole)] || FALLBACK_QUICK_ACCESS;
  const accountDefaults = ACCOUNT_DEFAULT_QUICK_ACCESS[normalizeWorkspaceEmail(rawEmail)] || [];
  return [...new Set([...roleDefaults, ...accountDefaults])];
};

/**
 * Quick Access ids for a role. A saved list (even an empty one, meaning the
 * user removed everything) wins; a missing or malformed value falls back to
 * the role defaults.
 */
export const readQuickAccessIds = (rawRole, availableIds, rawEmail) => {
  const key = favoritesKey(rawRole, rawEmail);
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
    : sanitiseFavorites(getDefaultQuickAccess(rawRole, rawEmail), availableIds);
};

export const writeQuickAccessIds = (rawRole, ids, rawEmail) => {
  const key = favoritesKey(rawRole, rawEmail);
  if (!key) return;
  try {
    // Portal ids only — never any credential or session material.
    safeStorage()?.setItem(key, JSON.stringify(ids.filter((id) => typeof id === "string")));
  } catch {
    /* preference only — ignore */
  }
};
