import { getDashboardRegistryMap, getSystemSettings } from "./systemSettings.js";

const normalizeRole = (role = "") => String(role || "").trim().toLowerCase();
const normalizeEmail = (email = "") => String(email || "").trim().toLowerCase();

export const getFallbackDashboardAccess = (user = {}) => {
  const role = normalizeRole(user.role);
  const email = normalizeEmail(user.email);
  const permissions = user.permissions || {};

  if (role === "admin") {
    return {
      dashboards: ["guestRoom", "venue"],
      defaultDashboard: null,
      skipSelectorWhenSingle: true,
    };
  }

  if (["manager", "caretaker", "warden", "co_warden"].includes(role)) {
    return {
      dashboards: ["guestRoom"],
      defaultDashboard: "guestRoom",
      skipSelectorWhenSingle: true,
    };
  }

  if (role === "assistant" || role === "dd_assistant") {
    return {
      dashboards: ["venue"],
      defaultDashboard: "venue",
      skipSelectorWhenSingle: true,
    };
  }

  if (role === "adosa") {
    if (email === "adosa2@thapar.edu") {
      return {
        dashboards: ["guestRoom"],
        defaultDashboard: "guestRoom",
        skipSelectorWhenSingle: true,
      };
    }

    if (email === "adosa3@thapar.edu") {
      return {
        dashboards: ["venue"],
        defaultDashboard: "venue",
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

export const resolveUserDashboardAccess = async (user = {}, settings = null) => {
  const resolvedSettings = settings || (await getSystemSettings());
  const registryMap = getDashboardRegistryMap(resolvedSettings);
  const fallback = getFallbackDashboardAccess(user);
  const dashboardAccess = user?.dashboardAccess || {};

  const requestedDashboards = Array.isArray(dashboardAccess.dashboards) &&
    dashboardAccess.dashboards.length > 0
      ? dashboardAccess.dashboards
      : fallback.dashboards;

  const dashboards = requestedDashboards.filter((key) => {
    const entry = registryMap.get(key);
    return entry?.active;
  });

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

const STAFF_ROLES_WITH_SHARED_SELECTOR = [
  "admin",
  "adosa",
  "manager",
  "warden",
  "caretaker",
  "assistant",
  "dd_assistant",
  "co_warden",
];

export const getLoginRedirectForUser = async (user = {}, settings = null) => {
  const resolvedSettings = settings || (await getSystemSettings());
  const registryMap = getDashboardRegistryMap(resolvedSettings);
  const dashboardAccess = await resolveUserDashboardAccess(user, resolvedSettings);
  const role = normalizeRole(user.role);

  if (role === "student" || ["president", "gen_sec"].includes(role)) {
    return "/";
  }

  if (role === "guard") {
    const nightPath = registryMap.get("night")?.path;
    return nightPath || "/dashboard";
  }

  // Staff roles always land on the shared Dashboard Selector, even with a
  // single internal dashboard, so they can reach shared staff utility cards
  // (e.g. Fretbox Resident App). Their dashboardAccess permissions are
  // unaffected — this only changes the post-login landing page.
  if (STAFF_ROLES_WITH_SHARED_SELECTOR.includes(role)) {
    return "/admin/dashboard-selector";
  }

  if (dashboardAccess.dashboards.length === 1 && dashboardAccess.skipSelectorWhenSingle) {
    return registryMap.get(dashboardAccess.dashboards[0])?.path || "/";
  }

  if (dashboardAccess.dashboards.length > 1) {
    return "/admin/dashboard-selector";
  }

  return "/";
};
