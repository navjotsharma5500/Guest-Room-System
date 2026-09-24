import {
  ACCOUNT_CAMPUS_PORTALS,
  DEFAULT_QUICK_ACCESS,
  MAX_QUICK_ACCESS,
  ROLE_CAMPUS_PORTALS,
  getDefaultQuickAccess,
  getWorkspaceItems,
  normalizeWorkspaceEmail,
  readQuickAccessIds,
  resolveCampusPortalEntries,
  sanitiseFavorites,
  writeQuickAccessIds,
} from "./campusPortals";
import { STAFF_ROLES_WITH_SHARED_SELECTOR } from "../utils/dashboardAccess";

const urlsFor = (role, email) => getWorkspaceItems(role, email).campusPortals.map((p) => p.target.url);
const idsFor = (role, email) => getWorkspaceItems(role, email).campusPortals.map((p) => p.id);
const SNP_URL = "https://studentsocieties.thapar.edu/permissions/";
const LOST_AND_FOUND_URL = "https://campusconnect.thapar.edu/lostnfound/";

beforeEach(() => localStorage.clear());

test("only admin, assistant and caretaker are configured for campus portals", () => {
  expect(Object.keys(ROLE_CAMPUS_PORTALS).sort()).toEqual(["admin", "assistant", "caretaker"]);
  ["manager", "warden", "co_warden", "adosa", "dd_assistant", "", undefined, null].forEach((role) => {
    expect(getWorkspaceItems(role).campusPortals).toEqual([]);
  });
});

test("exact role → URL mapping", () => {
  expect(urlsFor("admin")).toEqual([
    "https://campusconnect.thapar.edu/student-notices/admin",
    "https://studentsocieties.thapar.edu/route-manager/",
    "https://campusconnect.thapar.edu/permissions/admin/",
    "https://campusconnect.thapar.edu/event-calendar/admin",
    "https://campusconnect.thapar.edu/tc/admin/login",
    "https://campusconnect.thapar.edu/ic/admin/login",
    "https://studentsocieties.thapar.edu/admin/login",
    LOST_AND_FOUND_URL,
    SNP_URL,
    "https://campusconnect.thapar.edu/dispensary/admin",
  ]);
  expect(urlsFor("assistant")).toEqual([
    "https://studentsocieties.thapar.edu/admin/login",
    "https://campusconnect.thapar.edu/event-calendar/admin",
    "https://campusconnect.thapar.edu/tc/admin/login",
    "https://campusconnect.thapar.edu/ic/admin/login",
    SNP_URL,
    "https://campusconnect.thapar.edu/dispensary/admin",
  ]);
  expect(urlsFor("caretaker")).toEqual([
    "https://campusconnect.thapar.edu/permissions/login/?next=/permissions/",
    SNP_URL,
  ]);
});

test("admin tools and grievance are admin-only; Fretbox follows the shared-selector roles", () => {
  expect(getWorkspaceItems("admin").adminTools.map((t) => t.id)).toEqual([
    "grievance-admin-portal", "manage-public-forms", "public-ui", "campus-feedback", "echo-knowledge", "system-analytics",
  ]);
  ["assistant", "caretaker", "manager", "faculty", ""].forEach((role) => {
    expect(getWorkspaceItems(role).adminTools).toEqual([]);
  });
  ["admin", ...STAFF_ROLES_WITH_SHARED_SELECTOR, "faculty", "student"].forEach((role) => {
    const hasFretbox = getWorkspaceItems(role).otherTools.length === 1;
    expect(hasFretbox).toBe(STAFF_ROLES_WITH_SHARED_SELECTOR.includes(role));
  });
});

test("every default Quick Access id is available for its role (caretaker's Fretbox included)", () => {
  Object.entries(DEFAULT_QUICK_ACCESS).forEach(([role, ids]) => {
    const { campusPortals, adminTools, otherTools } = getWorkspaceItems(role);
    const available = [...campusPortals, ...adminTools, ...otherTools].map((i) => i.id);
    expect(sanitiseFavorites(ids, available)).toEqual(ids);
  });
});

test("sanitiseFavorites drops non-strings, unknown ids and duplicates, and caps the list", () => {
  const available = ["a", "b", "c", "d", "e", "f", "g", "h"];
  expect(sanitiseFavorites(["a", "a", 1, null, {}, "zzz", "b"], available)).toEqual(["a", "b"]);
  expect(sanitiseFavorites(available, available)).toHaveLength(MAX_QUICK_ACCESS);
  expect(sanitiseFavorites("a", available)).toEqual([]);
  expect(sanitiseFavorites(undefined, available)).toEqual([]);
});

test("Quick Access storage is role-keyed and tolerant of a broken storage layer", () => {
  const available = ["a", "b"];
  writeQuickAccessIds("admin", ["b"]);
  expect(localStorage.getItem("campusConnect.dashboardSelector.favorites.admin")).toBe('["b"]');
  expect(readQuickAccessIds("admin", available)).toEqual(["b"]);
  expect(readQuickAccessIds("caretaker", ["library-night-pass"])).toEqual(["library-night-pass"]);

  // No role → nothing is persisted.
  writeQuickAccessIds("", ["a"]);
  expect(Object.keys(localStorage)).toEqual(["campusConnect.dashboardSelector.favorites.admin"]);

  const setItem = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("quota");
  });
  expect(() => writeQuickAccessIds("admin", ["a"])).not.toThrow();
  setItem.mockRestore();
});

test.each(["dd_assistant", "manager", "warden", "co_warden", "adosa", "student", "assistant_admin"])(
  "%s cannot receive Society Night Permission or Lost & Found",
  (role) => {
    expect(idsFor(role)).toEqual([]);
    expect(idsFor(role, "someone@thapar.edu")).toEqual([]);
  }
);

test("Lost & Found is admin-only", () => {
  expect(idsFor("admin")).toContain("lost-and-found");
  ["assistant", "caretaker", "adosa", "dd_assistant"].forEach((role) => {
    expect(idsFor(role, "adosa3@thapar.edu")).not.toContain("lost-and-found");
  });
});

test("account-specific access is exactly adosa3@thapar.edu -> Society Night Permission", () => {
  expect(ACCOUNT_CAMPUS_PORTALS).toEqual({
    "adosa3@thapar.edu": [{ id: "society-night-permission", url: SNP_URL }],
  });
  expect(urlsFor("adosa", "adosa3@thapar.edu")).toEqual([SNP_URL]);
  expect(idsFor("adosa", "adosa2@thapar.edu")).toEqual([]);
  expect(idsFor("adosa")).toEqual([]);
});

test("email is normalised before matching", () => {
  expect(normalizeWorkspaceEmail("  ADoSA3@Thapar.EDU ")).toBe("adosa3@thapar.edu");
  expect(normalizeWorkspaceEmail(null)).toBe("");
  expect(idsFor("adosa", "ADoSA3@thapar.edu")).toEqual(["society-night-permission"]);
  expect(idsFor("adosa", " adosa3@thapar.edu ")).toEqual(["society-night-permission"]);
  expect(idsFor("adosa", "adosa3@thapar.edu.evil.com")).toEqual([]);
});

test("role and account portals are merged and de-duplicated by id", () => {
  // Assistant already has it by role; an account entry must not duplicate it.
  const assistantIds = idsFor("assistant", "adosa3@thapar.edu");
  expect(assistantIds.filter((id) => id === "society-night-permission")).toHaveLength(1);
  expect(assistantIds).toEqual(idsFor("assistant"));
  const ids = resolveCampusPortalEntries("caretaker", "adosa3@thapar.edu").map((e) => e.id);
  expect(new Set(ids).size).toBe(ids.length);
});

test("Quick Access defaults: admin/caretaker include Society Night Permission; adosa3 only for that account", () => {
  expect(DEFAULT_QUICK_ACCESS.admin).toEqual([
    "student-notices", "event-calendar", "library-night-pass", "student-societies", "society-night-permission", "tiet-health-hub",
  ]);
  expect(DEFAULT_QUICK_ACCESS.admin).not.toContain("lost-and-found");
  expect(DEFAULT_QUICK_ACCESS.caretaker).toEqual([
    "library-night-pass", "fretbox-resident-app", "society-night-permission",
  ]);
  expect(getDefaultQuickAccess("adosa", "adosa3@thapar.edu")).toEqual([
    "fretbox-resident-app", "society-night-permission",
  ]);
  expect(getDefaultQuickAccess("adosa", "adosa2@thapar.edu")).toEqual(["fretbox-resident-app"]);
  expect(getDefaultQuickAccess("assistant", "adosa3@thapar.edu")).toEqual(DEFAULT_QUICK_ACCESS.assistant);
});

test("account-scoped favourites use a separate key, and unavailable ids are sanitised away", () => {
  const stored = ["society-night-permission", "lost-and-found"];
  writeQuickAccessIds("adosa", stored, "ADoSA3@thapar.edu");
  expect(Object.keys(localStorage)).toEqual([
    "campusConnect.dashboardSelector.favorites.adosa.account.adosa3@thapar.edu",
  ]);
  const adosa3Available = idsFor("adosa", "adosa3@thapar.edu");
  expect(readQuickAccessIds("adosa", adosa3Available, "adosa3@thapar.edu")).toEqual(["society-night-permission"]);
  // Other ADoSA users read the role key, never the account one.
  expect(readQuickAccessIds("adosa", idsFor("adosa", "adosa2@thapar.edu"), "adosa2@thapar.edu")).toEqual([]);
  // A polluted role-wide key still cannot expose the account portal.
  localStorage.setItem("campusConnect.dashboardSelector.favorites.adosa", JSON.stringify(stored));
  expect(readQuickAccessIds("adosa", idsFor("adosa", "adosa2@thapar.edu"), "adosa2@thapar.edu")).toEqual([]);
});


test.each(["ADMIN", "ASSISTANT"])("%s receives TIET Health Hub and its default Quick Access entry", (role) => {
  expect(getWorkspaceItems(role).campusPortals.find(({ id }) => id === "tiet-health-hub")).toMatchObject({
    title: "TIET Health Hub",
    description: "Access TIET Health Hub administration",
    external: true,
    target: { type: "external", url: "https://campusconnect.thapar.edu/dispensary/admin" },
  });
  expect(readQuickAccessIds(role, idsFor(role))).toContain("tiet-health-hub");
  expect(MAX_QUICK_ACCESS).toBe(6);
});

test.each(["caretaker", "adosa", "dd_assistant", "manager", "warden", "co_warden", "student", "faculty", "assistant_admin", "unknown", "", null])(
  "%s cannot receive TIET Health Hub through role, account or saved favorites",
  (role) => {
    [undefined, "someone@thapar.edu", "adosa3@thapar.edu"].forEach((email) => {
      expect(idsFor(role, email)).not.toContain("tiet-health-hub");
      writeQuickAccessIds(role, ["tiet-health-hub"], email);
      expect(readQuickAccessIds(role, idsFor(role, email), email)).not.toContain("tiet-health-hub");
    });
  }
);
