import { DEFAULT_SYSTEM_SETTINGS } from "../hooks/useSystemSettings";

const normalizeRole = (role = "") => String(role || "").trim().toLowerCase();
const normalizeEmail = (email = "") => String(email || "").trim().toLowerCase();

// Staff roles that must always land on / be able to see the shared Dashboard
// Selector (for shared utility cards like Fretbox), even when they only have
// a single internal dashboard. Mirrors backend/utils/dashboardAccess.js.
export const STAFF_ROLES_WITH_SHARED_SELECTOR = [
  "admin",
  "adosa",
  "manager",
  "warden",
  "caretaker",
  "assistant",
  "dd_assistant",
  "co_warden",
];

export const shouldAlwaysShowDashboardSelector = (role) =>
  STAFF_ROLES_WITH_SHARED_SELECTOR.includes(normalizeRole(role));

export const getFallbackDashboardAccess = (user = {}) => {
  const role = normalizeRole(user.role || user?.user?.role);
  const email = normalizeEmail(user.email || user?.user?.email);
  const permissions = user.permissions || user?.user?.permissions || {};

  if (role === "admin") {
    return { dashboards: ["guestRoom", "venue"], defaultDashboard: null, skipSelectorWhenSingle: true };
  }

  if (["manager", "caretaker", "warden", "co_warden"].includes(role)) {
    return { dashboards: ["guestRoom"], defaultDashboard: "guestRoom", skipSelectorWhenSingle: true };
  }

  if (["assistant", "dd_assistant"].includes(role)) {
    return { dashboards: ["venue"], defaultDashboard: "venue", skipSelectorWhenSingle: true };
  }

  if (role === "adosa") {
    if (email === "adosa2@thapar.edu") {
      return { dashboards: ["guestRoom"], defaultDashboard: "guestRoom", skipSelectorWhenSingle: true };
    }
    if (email === "adosa3@thapar.edu") {
      return { dashboards: ["venue"], defaultDashboard: "venue", skipSelectorWhenSingle: true };
    }
    const dashboards = [];
    if (permissions.guestRoom) dashboards.push("guestRoom");
    if (permissions.venue) dashboards.push("venue");
    if (permissions.night) dashboards.push("night");
    return {
      dashboards,
      defaultDashboard: dashboards.length === 1 ? dashboards[0] : null,
      skipSelectorWhenSingle: true,
    };
  }

  const dashboards = [];
  if (permissions.guestRoom) dashboards.push("guestRoom");
  if (permissions.venue) dashboards.push("venue");
  if (permissions.night) dashboards.push("night");
  return {
    dashboards,
    defaultDashboard: dashboards.length === 1 ? dashboards[0] : null,
    skipSelectorWhenSingle: true,
  };
};

export const resolveDashboardAccess = (user = {}, settings = DEFAULT_SYSTEM_SETTINGS) => {
  const fallback = getFallbackDashboardAccess(user);
  const dashboardAccess = user.dashboardAccess || user?.user?.dashboardAccess || {};
  const activeMap = new Map(
    (settings?.dashboardRegistry || []).map((entry) => [entry.key, entry])
  );

  const dashboards = (
    Array.isArray(dashboardAccess.dashboards) && dashboardAccess.dashboards.length > 0
      ? dashboardAccess.dashboards
      : fallback.dashboards
  ).filter((key) => activeMap.get(key)?.active);

  const defaultDashboard =
    dashboardAccess.defaultDashboard && dashboards.includes(dashboardAccess.defaultDashboard)
      ? dashboardAccess.defaultDashboard
      : fallback.defaultDashboard && dashboards.includes(fallback.defaultDashboard)
      ? fallback.defaultDashboard
      : dashboards.length === 1
      ? dashboards[0]
      : null;

  return {
    dashboards,
    defaultDashboard,
    skipSelectorWhenSingle:
      dashboardAccess.skipSelectorWhenSingle ?? fallback.skipSelectorWhenSingle ?? true,
  };
};

export const getDashboardPath = (settings = DEFAULT_SYSTEM_SETTINGS, dashboardKey) =>
  (settings?.dashboardRegistry || []).find((entry) => entry.key === dashboardKey)?.path || "/";
