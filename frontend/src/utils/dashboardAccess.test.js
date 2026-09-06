import {
  resolveDashboardAccess,
  shouldAlwaysShowDashboardSelector,
  STAFF_ROLES_WITH_SHARED_SELECTOR,
  getDashboardPath,
} from "./dashboardAccess";

const settings = {
  dashboardRegistry: [
    { key: "guestRoom", path: "/dashboard", active: true },
    { key: "venue", path: "/venue-booking", active: true },
    { key: "night", path: "/night-dashboard", active: false },
  ],
};

describe("shouldAlwaysShowDashboardSelector", () => {
  it.each(STAFF_ROLES_WITH_SHARED_SELECTOR)(
    "returns true for staff role %s",
    (role) => {
      expect(shouldAlwaysShowDashboardSelector(role)).toBe(true);
    }
  );

  it("is case-insensitive", () => {
    expect(shouldAlwaysShowDashboardSelector("CARETAKER")).toBe(true);
  });

  it.each(["student", "guard", "gen_sec", "president"])(
    "returns false for non-staff role %s",
    (role) => {
      expect(shouldAlwaysShowDashboardSelector(role)).toBe(false);
    }
  );
});

describe("resolveDashboardAccess — permissions unaffected by selector visibility", () => {
  it("caretaker keeps only guestRoom access", () => {
    const access = resolveDashboardAccess({ role: "caretaker" }, settings);
    expect(access.dashboards).toEqual(["guestRoom"]);
    expect(access.skipSelectorWhenSingle).toBe(true);
  });

  it("assistant keeps only venue access", () => {
    const access = resolveDashboardAccess({ role: "assistant" }, settings);
    expect(access.dashboards).toEqual(["venue"]);
  });

  it("admin keeps both guestRoom and venue access", () => {
    const access = resolveDashboardAccess({ role: "admin" }, settings);
    expect(access.dashboards).toEqual(["guestRoom", "venue"]);
  });

  it("getDashboardPath resolves the guestRoom path", () => {
    expect(getDashboardPath(settings, "guestRoom")).toBe("/dashboard");
  });
});
