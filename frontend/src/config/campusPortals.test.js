import {
  DEFAULT_QUICK_ACCESS,
  MAX_QUICK_ACCESS,
  ROLE_CAMPUS_PORTALS,
  getWorkspaceItems,
  readQuickAccessIds,
  sanitiseFavorites,
  writeQuickAccessIds,
} from "./campusPortals";
import { STAFF_ROLES_WITH_SHARED_SELECTOR } from "../utils/dashboardAccess";

const urlsFor = (role) => getWorkspaceItems(role).campusPortals.map((p) => p.target.url);

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
  ]);
  expect(urlsFor("assistant")).toEqual([
    "https://studentsocieties.thapar.edu/admin/login",
    "https://campusconnect.thapar.edu/event-calendar/admin",
    "https://campusconnect.thapar.edu/tc/admin/login",
    "https://campusconnect.thapar.edu/ic/admin/login",
  ]);
  expect(urlsFor("caretaker")).toEqual([
    "https://campusconnect.thapar.edu/permissions/login/?next=/permissions/",
  ]);
});

test("admin tools and grievance are admin-only; Fretbox follows the shared-selector roles", () => {
  expect(getWorkspaceItems("admin").adminTools.map((t) => t.id)).toEqual([
    "grievance-admin-portal", "public-ui", "campus-feedback", "echo-knowledge", "system-analytics",
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
