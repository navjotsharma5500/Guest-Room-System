import { getLoginRedirectForUser } from "../utils/dashboardAccess.js";
import { DEFAULT_SYSTEM_SETTINGS } from "../utils/systemSettings.js";

const settings = DEFAULT_SYSTEM_SETTINGS;

describe("getLoginRedirectForUser — shared staff Dashboard Selector", () => {
  const staffCases = [
    { role: "admin", email: "admin@thapar.edu" },
    { role: "manager", permissions: { guestRoom: true } },
    { role: "caretaker", permissions: { guestRoom: true } },
    { role: "warden", permissions: { guestRoom: true } },
    { role: "co_warden", permissions: { guestRoom: true } },
    { role: "adosa", email: "adosa2@thapar.edu" },
    { role: "assistant", permissions: { venue: true } },
    { role: "dd_assistant", permissions: { venue: true } },
  ];

  it.each(staffCases)(
    "$role always lands on /admin/dashboard-selector even with a single dashboard",
    async ({ role, email, permissions }) => {
      const redirect = await getLoginRedirectForUser(
        { role, email, permissions },
        settings
      );
      expect(redirect).toBe("/admin/dashboard-selector");
    }
  );

  it("ADoSA with generic email and only one permission still lands on the selector", async () => {
    const redirect = await getLoginRedirectForUser(
      { role: "adosa", email: "adosa-generic@thapar.edu", permissions: { guestRoom: true } },
      settings
    );
    expect(redirect).toBe("/admin/dashboard-selector");
  });

  it("student is unaffected and goes to /", async () => {
    const redirect = await getLoginRedirectForUser({ role: "student" }, settings);
    expect(redirect).toBe("/");
  });

  it("president is unaffected and goes to /", async () => {
    const redirect = await getLoginRedirectForUser({ role: "president" }, settings);
    expect(redirect).toBe("/");
  });

  it("gen_sec is unaffected and goes to /", async () => {
    const redirect = await getLoginRedirectForUser({ role: "gen_sec" }, settings);
    expect(redirect).toBe("/");
  });

  it("guard is unaffected and goes to the night pass dashboard", async () => {
    const redirect = await getLoginRedirectForUser({ role: "guard" }, settings);
    expect(redirect).toBe("/night-dashboard");
  });

  it("role casing is normalized the same way as existing logic (ADMIN)", async () => {
    const redirect = await getLoginRedirectForUser({ role: "ADMIN" }, settings);
    expect(redirect).toBe("/admin/dashboard-selector");
  });

  it("does not mutate dashboardAccess permissions for a single-dashboard staff role", async () => {
    const { resolveUserDashboardAccess } = await import("../utils/dashboardAccess.js");
    const access = await resolveUserDashboardAccess(
      { role: "caretaker", permissions: { guestRoom: true } },
      settings
    );
    expect(access.dashboards).toEqual(["guestRoom"]);
  });
});
