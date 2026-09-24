import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import DashboardSelector from "./DashboardSelector";

// ─── Mocks ──────────────────────────────────────────────────────────────────
const mockNavigate = jest.fn();
jest.mock(
  "react-router-dom",
  () => ({
    Navigate: ({ to }) => <div data-testid="navigate" data-to={to} />,
    useNavigate: () => mockNavigate,
  }),
  { virtual: true }
);

jest.mock("framer-motion", () => {
  const React = require("react");
  const strip = ({ initial, animate, exit, transition, whileHover, whileTap, variants, ...props }) => props;
  const make = (Tag) => React.forwardRef((props, ref) => <Tag ref={ref} {...strip(props)} />);
  return {
    motion: new Proxy({}, { get: (_, tag) => make(tag) }),
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

let mockUser = null;
jest.mock("../../context/AuthContext", () => ({
  useAuth: () => ({ currentUser: mockUser }),
}));

const REGISTRY = [
  { key: "guestRoom", label: "Guest Room Booking", path: "/dashboard", active: true, description: "Guest room operations" },
  { key: "venue", label: "Venue Booking", path: "/venue-booking", active: true, description: "Venue operations" },
  { key: "night", label: "Night Pass", path: "/night-dashboard", active: true, description: "Night pass operations" },
];
let mockSettings = { dashboardRegistry: REGISTRY };
jest.mock("../../hooks/useSystemSettings", () => {
  const actual = jest.requireActual("../../hooks/useSystemSettings");
  return { __esModule: true, ...actual, default: () => ({ settings: mockSettings }) };
});

jest.mock("../../components/EchoOrb", () => ({ onClick }) => (
  <button type="button" onClick={onClick}>Echo FAB</button>
));
jest.mock("../../components/EchoModal", () => () => <div>Echo Modal</div>);
jest.mock("./AdvancedAnalyticsPage", () => () => <div>Analytics Page Stub</div>);

// ─── Fixtures ───────────────────────────────────────────────────────────────
const LOST_AND_FOUND_URL = "https://campusconnect.thapar.edu/lostnfound/";
const SNP_URL = "https://studentsocieties.thapar.edu/permissions/";
const ADMIN_PORTALS = [
  ["Student Notices", "https://campusconnect.thapar.edu/student-notices/admin"],
  ["Society Route Manager", "https://studentsocieties.thapar.edu/route-manager/"],
  ["Library Night Pass", "https://campusconnect.thapar.edu/permissions/admin/"],
  ["Event Calendar", "https://campusconnect.thapar.edu/event-calendar/admin"],
  ["Student Calendar", "https://campusconnect.thapar.edu/tc/admin/login"],
  ["Institute Calendar", "https://campusconnect.thapar.edu/ic/admin/login"],
  ["Student Societies", "https://studentsocieties.thapar.edu/admin/login"],
  ["Lost & Found", LOST_AND_FOUND_URL],
  ["Society Night Permission", SNP_URL],
  ["TIET Health Hub", "https://campusconnect.thapar.edu/dispensary/admin"],
];
const ASSISTANT_PORTALS = [
  ["Student Societies", "https://studentsocieties.thapar.edu/admin/login"],
  ["Event Calendar", "https://campusconnect.thapar.edu/event-calendar/admin"],
  ["Student Calendar", "https://campusconnect.thapar.edu/tc/admin/login"],
  ["Institute Calendar", "https://campusconnect.thapar.edu/ic/admin/login"],
  ["Society Night Permission", SNP_URL],
  ["TIET Health Hub", "https://campusconnect.thapar.edu/dispensary/admin"],
];
const CARETAKER_PORTALS = [
  ["Library Night Pass", "https://campusconnect.thapar.edu/permissions/login/?next=/permissions/"],
  ["Society Night Permission", SNP_URL],
];
const FRETBOX_URL = "https://admin.fretbox.in/account/signin?returnUrl=dashboard";
const ADMIN_LIBRARY_URL = "https://campusconnect.thapar.edu/permissions/admin/";
const ADMIN_ONLY_URLS = [
  "https://campusconnect.thapar.edu/student-notices/admin",
  "https://studentsocieties.thapar.edu/route-manager/",
  ADMIN_LIBRARY_URL,
];

const PINNED_KEY = "campusConnect.dashboardSelector.sidebarPinned";
const favKey = (role) => `campusConnect.dashboardSelector.favorites.${role}`;

const ADMIN = { role: "admin", name: "Ada", email: "admin@thapar.edu" };
const ASSISTANT = { role: "assistant", name: "Asha", email: "assistant@thapar.edu" };
const CARETAKER = { role: "caretaker", name: "Carl", email: "caretaker@thapar.edu" };
const ADOSA3 = { role: "adosa", name: "Ada Three", email: "adosa3@thapar.edu", dashboardAccess: { dashboards: ["guestRoom"] } };
const ADOSA2 = { role: "adosa", name: "Ada Two", email: "adosa2@thapar.edu", dashboardAccess: { dashboards: ["guestRoom"] } };
const DD_ASSISTANT = { role: "dd_assistant", name: "Dee", email: "dd@thapar.edu", dashboardAccess: { dashboards: ["guestRoom"] } };

const renderSelector = (user, settings) => {
  mockUser = user;
  mockSettings = settings || { dashboardRegistry: REGISTRY };
  return render(<DashboardSelector />);
};

const rail = () => screen.getByRole("complementary", { name: "Workspace sidebar" });
const railList = (name) => within(rail()).queryByRole("list", { name });
const quickAccess = () => screen.getByRole("region", { name: "Quick Access" });
const buttonNames = (container) => within(container).getAllByRole("button").map((b) => b.getAttribute("aria-label"));
const portalTitles = () =>
  within(railList("Campus Portals")).getAllByRole("button").map((b) => b.getAttribute("aria-label"));
const portalButton = (container, title, external = true) =>
  within(container).getByRole("button", { name: external ? `${title} (opens in new tab)` : title });

let openSpy;
beforeEach(() => {
  localStorage.clear();
  mockNavigate.mockClear();
  openSpy = jest.spyOn(window, "open").mockImplementation(() => null);
});
afterEach(() => {
  openSpy.mockRestore();
});

// ─── Header ─────────────────────────────────────────────────────────────────
describe("compact header", () => {
  test.each([
    [ADMIN, "Admin Workspace"],
    [ASSISTANT, "Assistant Workspace"],
    [CARETAKER, "Caretaker Workspace"],
    [{ role: "manager", name: "M" }, "Staff Workspace"],
  ])("shows Campus Connect with role-aware badge for %o", (user, badge) => {
    renderSelector(user);
    expect(screen.getByRole("heading", { level: 1, name: "Campus Connect" })).toBeInTheDocument();
    expect(screen.getByText(badge)).toBeInTheDocument();
    expect(screen.getByText("Your campus operations workspace")).toBeInTheDocument();
    expect(screen.queryByText("Hostel Management")).not.toBeInTheDocument();
    expect(screen.queryByText("Select your administrative dashboard")).not.toBeInTheDocument();
  });
});

// ─── Role → portal mapping ──────────────────────────────────────────────────
describe("role-based campus portals", () => {
  test("admin sees all 10 portals and each opens its exact URL in a new tab", () => {
    renderSelector(ADMIN);
    const list = railList("Campus Portals");
    expect(within(list).getAllByRole("button")).toHaveLength(10);
    ADMIN_PORTALS.forEach(([title, url]) => {
      fireEvent.click(portalButton(list, title));
      expect(openSpy).toHaveBeenLastCalledWith(url, "_blank", "noopener,noreferrer");
    });
    expect(openSpy).toHaveBeenCalledTimes(10);
  });

  test("assistant sees exactly its 6 portals, none of the admin-only ones", () => {
    renderSelector(ASSISTANT);
    const list = railList("Campus Portals");
    expect(within(list).getAllByRole("button")).toHaveLength(6);
    ASSISTANT_PORTALS.forEach(([title, url]) => {
      fireEvent.click(portalButton(list, title));
      expect(openSpy).toHaveBeenLastCalledWith(url, "_blank", "noopener,noreferrer");
    });
    ["Student Notices", "Society Route Manager", "Library Night Pass", "Lost & Found"].forEach((title) => {
      expect(screen.queryByRole("button", { name: new RegExp(title) })).not.toBeInTheDocument();
    });
    const opened = openSpy.mock.calls.map(([url]) => url);
    ADMIN_ONLY_URLS.forEach((url) => expect(opened).not.toContain(url));
  });

  test("caretaker sees Library Night Pass (caretaker login URL) and Society Night Permission", () => {
    renderSelector(CARETAKER);
    const list = railList("Campus Portals");
    expect(within(list).getAllByRole("button")).toHaveLength(2);
    CARETAKER_PORTALS.forEach(([title, url]) => {
      fireEvent.click(portalButton(list, title));
      expect(openSpy).toHaveBeenLastCalledWith(url, "_blank", "noopener,noreferrer");
    });
    expect(openSpy).not.toHaveBeenCalledWith(ADMIN_LIBRARY_URL, expect.anything(), expect.anything());
    [
      "Student Notices", "Society Route Manager", "Event Calendar",
      "Student Calendar", "Institute Calendar", "Student Societies", "Lost & Found",
    ].forEach((title) => {
      expect(screen.queryByRole("button", { name: new RegExp(title) })).not.toBeInTheDocument();
    });
  });

  test.each(["manager", "warden", "co_warden", "adosa", "dd_assistant"])(
    "%s gets no campus portals but keeps the shared selector and Fretbox",
    (staffRole) => {
      renderSelector({ role: staffRole, dashboardAccess: { dashboards: ["guestRoom"] } });
      expect(railList("Campus Portals")).not.toBeInTheDocument();
      expect(railList("Admin Tools")).not.toBeInTheDocument();
      fireEvent.click(portalButton(railList("Other Tools"), "Fretbox Resident App"));
      expect(openSpy).toHaveBeenCalledWith(FRETBOX_URL, "_blank", "noopener,noreferrer");
    }
  );

  test("role matching is exact: a look-alike role gets no portals", () => {
    renderSelector({ role: "assistant_admin", permissions: { guestRoom: true, venue: true } });
    expect(railList("Campus Portals")).not.toBeInTheDocument();
    expect(railList("Admin Tools")).not.toBeInTheDocument();
  });
});

describe("Lost & Found and Society Night Permission access", () => {
  test("admin sees both, once each, after its existing portals", () => {
    renderSelector(ADMIN);
    const names = portalTitles();
    expect(names.filter((n) => n === "Lost & Found (opens in new tab)")).toHaveLength(1);
    expect(names.filter((n) => n === "Society Night Permission (opens in new tab)")).toHaveLength(1);
    expect(names.slice(0, 7)).toEqual(ADMIN_PORTALS.slice(0, 7).map(([title]) => `${title} (opens in new tab)`));
  });

  test("both open the exact URLs in a new tab without leaving the workspace", () => {
    renderSelector(ADMIN);
    const list = railList("Campus Portals");
    fireEvent.click(portalButton(list, "Lost & Found"));
    expect(openSpy).toHaveBeenLastCalledWith("https://campusconnect.thapar.edu/lostnfound/", "_blank", "noopener,noreferrer");
    fireEvent.click(portalButton(list, "Society Night Permission"));
    expect(openSpy).toHaveBeenLastCalledWith("https://studentsocieties.thapar.edu/permissions/", "_blank", "noopener,noreferrer");
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test("assistant still sees Society Night Permission exactly once", () => {
    renderSelector(ASSISTANT);
    expect(portalTitles().filter((n) => n.startsWith("Society Night Permission"))).toHaveLength(1);
    expect(portalTitles()).toHaveLength(6);
  });

  test("adosa3@thapar.edu sees only Society Night Permission and it opens in a new tab", () => {
    renderSelector(ADOSA3);
    expect(portalTitles()).toEqual(["Society Night Permission (opens in new tab)"]);
    fireEvent.click(portalButton(railList("Campus Portals"), "Society Night Permission"));
    expect(openSpy).toHaveBeenCalledWith(SNP_URL, "_blank", "noopener,noreferrer");
    expect(screen.queryByRole("button", { name: /Lost & Found/ })).not.toBeInTheDocument();
    // Existing shared-selector access is unchanged.
    expect(within(railList("Other Tools")).getAllByRole("button")).toHaveLength(1);
    expect(within(railList("Workspaces")).getAllByRole("button")).toHaveLength(1);
  });

  test("email matching is case- and whitespace-insensitive", () => {
    renderSelector({ ...ADOSA3, email: "  ADoSA3@Thapar.edu " });
    expect(portalTitles()).toEqual(["Society Night Permission (opens in new tab)"]);
  });

  test("other ADoSA accounts do not receive it", () => {
    renderSelector(ADOSA2);
    expect(railList("Campus Portals")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Society Night Permission/ })).not.toBeInTheDocument();
  });

  test.each([["adosa3@thapar.edu.evil.com"], ["xadosa3@thapar.edu"], [""], [undefined]])(
    "look-alike or missing email %p does not receive it",
    (email) => {
      renderSelector({ ...ADOSA2, email });
      expect(railList("Campus Portals")).not.toBeInTheDocument();
    }
  );

  test("dd_assistant receives neither Lost & Found nor Society Night Permission", () => {
    renderSelector(DD_ASSISTANT);
    expect(railList("Campus Portals")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Lost & Found|Society Night Permission/ })).not.toBeInTheDocument();
  });
});

// ─── Quick Access ───────────────────────────────────────────────────────────
describe("Quick Access defaults", () => {
  test("admin", () => {
    renderSelector(ADMIN);
    expect(buttonNames(quickAccess())).toEqual([
      "Student Notices (opens in new tab)",
      "Event Calendar (opens in new tab)",
      "Library Night Pass (opens in new tab)",
      "Student Societies (opens in new tab)",
      "Society Night Permission (opens in new tab)",
      "TIET Health Hub (opens in new tab)",
    ]);
  });

  test("assistant", () => {
    renderSelector(ASSISTANT);
    expect(buttonNames(quickAccess())).toEqual([
      "Event Calendar (opens in new tab)",
      "Student Calendar (opens in new tab)",
      "Institute Calendar (opens in new tab)",
      "Student Societies (opens in new tab)",
      "Society Night Permission (opens in new tab)",
      "TIET Health Hub (opens in new tab)",
    ]);
  });

  test("caretaker gets Library Night Pass, Fretbox and Society Night Permission", () => {
    renderSelector(CARETAKER);
    expect(buttonNames(quickAccess())).toEqual([
      "Library Night Pass (opens in new tab)",
      "Fretbox Resident App (opens in new tab)",
      "Society Night Permission (opens in new tab)",
    ]);
  });

  test("adosa3 gets Fretbox plus Society Night Permission; other ADoSA only Fretbox", () => {
    const { unmount } = renderSelector(ADOSA3);
    expect(buttonNames(quickAccess())).toEqual([
      "Fretbox Resident App (opens in new tab)",
      "Society Night Permission (opens in new tab)",
    ]);
    unmount();
    renderSelector(ADOSA2);
    expect(buttonNames(quickAccess())).toEqual(["Fretbox Resident App (opens in new tab)"]);
  });

  test("Lost & Found is not a default Quick Access item but can be favourited", () => {
    localStorage.setItem(PINNED_KEY, "true");
    renderSelector(ADMIN);
    expect(within(quickAccess()).queryByRole("button", { name: /Lost & Found/ })).not.toBeInTheDocument();
    fireEvent.click(within(rail()).getByRole("button", { name: "Remove TIET Health Hub from Quick Access" }));
    fireEvent.click(within(rail()).getByRole("button", { name: "Add Lost & Found to Quick Access" }));
    expect(within(quickAccess()).getByRole("button", { name: /Lost & Found/ })).toBeInTheDocument();
  });

  test("clicking a Quick Access card opens the role's exact URL in a new tab", () => {
    renderSelector(ADMIN);
    fireEvent.click(portalButton(quickAccess(), "Event Calendar"));
    expect(openSpy).toHaveBeenCalledWith(
      "https://campusconnect.thapar.edu/event-calendar/admin",
      "_blank",
      "noopener,noreferrer"
    );
  });
});

// ─── Existing permissions ───────────────────────────────────────────────────
describe("existing internal dashboard permissions", () => {
  test("admin sees registry dashboards it has access to, driven by dashboardRegistry", () => {
    renderSelector(ADMIN);
    const section = screen.getByRole("region", { name: "Dashboards" });
    expect(within(section).getByRole("button", { name: /Guest Room Booking/ })).toBeInTheDocument();
    expect(within(section).getByRole("button", { name: /Venue Booking/ })).toBeInTheDocument();
    expect(within(section).queryByRole("button", { name: /Night Pass/ })).not.toBeInTheDocument();
    // Also listed under Workspaces in the sidebar.
    expect(within(railList("Workspaces")).getAllByRole("button")).toHaveLength(2);
  });

  test("per-user dashboardAccess and active flag are respected; cards navigate to registry paths", () => {
    const user = { role: "manager", dashboardAccess: { dashboards: ["guestRoom", "night"] } };
    renderSelector(user);
    const section = screen.getByRole("region", { name: "Dashboards" });
    expect(within(section).queryByRole("button", { name: /Venue Booking/ })).not.toBeInTheDocument();
    fireEvent.click(within(section).getByRole("button", { name: /Night Pass/ }));
    expect(mockNavigate).toHaveBeenCalledWith("/night-dashboard");
  });

  test("inactive registry dashboards stay hidden", () => {
    renderSelector(
      { role: "manager", dashboardAccess: { dashboards: ["guestRoom", "night"] } },
      { dashboardRegistry: REGISTRY.map((d) => (d.key === "night" ? { ...d, active: false } : d)) }
    );
    expect(screen.queryByRole("button", { name: /Night Pass/ })).not.toBeInTheDocument();
  });

  test("sidebar workspace item navigates to the dashboard path", () => {
    renderSelector(ADMIN);
    fireEvent.click(within(railList("Workspaces")).getByRole("button", { name: "Venue Booking" }));
    expect(mockNavigate).toHaveBeenCalledWith("/venue-booking");
  });

  test("a non-staff user with a single dashboard is still redirected past the selector", () => {
    renderSelector({ role: "faculty", permissions: { guestRoom: true } });
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/dashboard");
    expect(screen.queryByRole("heading", { name: "Campus Connect" })).not.toBeInTheDocument();
  });

  test("staff roles with a single dashboard still see the selector (no redirect)", () => {
    renderSelector({ role: "caretaker" });
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campus Connect" })).toBeInTheDocument();
  });
});

describe("Fretbox and Student Grievance access", () => {
  test.each(["admin", "adosa", "manager", "warden", "caretaker", "assistant", "dd_assistant", "co_warden"])(
    "%s receives Fretbox",
    (staffRole) => {
      renderSelector({ role: staffRole, dashboardAccess: { dashboards: ["guestRoom"] } });
      expect(within(railList("Other Tools")).getAllByRole("button")).toHaveLength(1);
    }
  );

  test("a role outside the shared-selector list does not receive Fretbox", () => {
    renderSelector({ role: "faculty", permissions: { guestRoom: true, venue: true } });
    expect(railList("Other Tools")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Fretbox/ })).not.toBeInTheDocument();
  });

  test("Student Grievance and the other admin tools are admin-only", () => {
    renderSelector(ADMIN);
    const tools = railList("Admin Tools");
    expect(within(tools).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual([
      "Student Grievance Admin",
      "Manage Public Forms",
      "Public UI",
      "Campus Feedback",
      "Echo Knowledge",
      "System Analytics",
    ]);
  });

  test.each([ASSISTANT, CARETAKER, { role: "manager" }, { role: "adosa", dashboardAccess: { dashboards: ["guestRoom"] } }])(
    "non-admin %o sees no Student Grievance or admin tools",
    (user) => {
      renderSelector(user);
      expect(screen.queryByRole("button", { name: /Grievance/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Manage Public Forms|Public UI|Campus Feedback|Echo Knowledge|System Analytics/ })).not.toBeInTheDocument();
    }
  );

  test("admin tools keep their existing routes", () => {
    renderSelector(ADMIN);
    const tools = railList("Admin Tools");
    fireEvent.click(within(tools).getByRole("button", { name: "Public UI" }));
    expect(mockNavigate).toHaveBeenLastCalledWith("/admin/public-ui-customizer");
    fireEvent.click(within(tools).getByRole("button", { name: "Campus Feedback" }));
    expect(mockNavigate).toHaveBeenLastCalledWith("/admin/campus-feedback");
    fireEvent.click(within(tools).getByRole("button", { name: "Echo Knowledge" }));
    expect(mockNavigate).toHaveBeenLastCalledWith("/admin/echo-knowledge");
    fireEvent.click(within(tools).getByRole("button", { name: "Manage Public Forms" }));
    expect(mockNavigate).toHaveBeenLastCalledWith("/admin/public-forms");
  });

  test("Fretbox opens in a new tab", () => {
    renderSelector(ADMIN);
    fireEvent.click(portalButton(railList("Other Tools"), "Fretbox Resident App"));
    expect(openSpy).toHaveBeenCalledWith(FRETBOX_URL, "_blank", "noopener,noreferrer");
  });
});

describe("System Analytics and Public Forms", () => {
  test("System Analytics opens the existing analytics view and can return", () => {
    renderSelector(ADMIN);
    fireEvent.click(within(railList("Admin Tools")).getByRole("button", { name: "System Analytics" }));
    expect(screen.getByText("Analytics Page Stub")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Echo FAB" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Back to Dashboard/ }));
    expect(screen.queryByText("Analytics Page Stub")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Campus Connect" })).toBeInTheDocument();
  });

  test("Public Forms modal opens from the sidebar footer", () => {
    renderSelector(CARETAKER);
    expect(screen.queryByText("Access public booking portals and calendars")).not.toBeInTheDocument();
    fireEvent.click(within(rail()).getByRole("button", { name: "Public Forms" }));
    expect(screen.getByRole("heading", { level: 2, name: "Public Forms" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Student Forms & Downloads/ })).toHaveAttribute("href", "/public-forms");
    for (const title of ["Hostel Guest Room Booking Form", "Guest Room Feedback Form", "Venue Booking Form", "Event Calendar Page"]) {
      expect(screen.getByRole("link", { name: new RegExp(title) })).toBeInTheDocument();
    }
  });

  test("Echo FAB still opens Echo", () => {
    renderSelector(ADMIN);
    fireEvent.click(screen.getByRole("button", { name: "Echo FAB" }));
    expect(screen.getByText("Echo Modal")).toBeInTheDocument();
  });
});

// ─── Sidebar hover / pin ────────────────────────────────────────────────────
describe("sidebar hover and pin", () => {
  test("starts collapsed, expands on hover and collapses on leave", () => {
    renderSelector(ADMIN);
    expect(rail()).toHaveAttribute("data-expanded", "false");
    expect(rail().style.width).toBe("60px");
    fireEvent.mouseEnter(rail());
    expect(rail()).toHaveAttribute("data-expanded", "true");
    expect(rail().style.width).toBe("270px");
    fireEvent.mouseLeave(rail());
    expect(rail()).toHaveAttribute("data-expanded", "false");
  });

  test("pinning keeps it expanded, persists, and restores on next visit", () => {
    const { unmount } = renderSelector(ADMIN);
    fireEvent.click(within(rail()).getByRole("button", { name: "Pin sidebar open" }));
    expect(localStorage.getItem(PINNED_KEY)).toBe("true");
    fireEvent.mouseEnter(rail());
    fireEvent.mouseLeave(rail());
    expect(rail()).toHaveAttribute("data-expanded", "true");
    expect(rail()).toHaveAttribute("data-pinned", "true");

    unmount();
    renderSelector(ADMIN);
    expect(rail()).toHaveAttribute("data-pinned", "true");
    expect(rail()).toHaveAttribute("data-expanded", "true");

    fireEvent.click(within(rail()).getByRole("button", { name: "Unpin sidebar" }));
    expect(localStorage.getItem(PINNED_KEY)).toBe("false");
    expect(rail()).toHaveAttribute("data-expanded", "false");
  });

  test("malformed pinned value is treated as not pinned", () => {
    localStorage.setItem(PINNED_KEY, "{garbage");
    renderSelector(ADMIN);
    expect(rail()).toHaveAttribute("data-pinned", "false");
  });

  test("collapsed rail items carry a tooltip title", () => {
    renderSelector(ADMIN);
    expect(within(railList("Campus Portals")).getAllByRole("button")[0]).toHaveAttribute("title", "Student Notices");
  });
});

// ─── Favorites ──────────────────────────────────────────────────────────────
describe("favorites", () => {
  const pinSidebar = () => localStorage.setItem(PINNED_KEY, "true");
  const readFav = (role) => JSON.parse(localStorage.getItem(favKey(role)));

  test("stars only appear when the sidebar is expanded", () => {
    renderSelector(ADMIN);
    expect(screen.queryByRole("button", { name: /to Quick Access/ })).not.toBeInTheDocument();
    fireEvent.mouseEnter(rail());
    expect(screen.getAllByRole("button", { name: /Quick Access/ }).length).toBeGreaterThan(0);
  });

  test("add and remove persist role-wise and never affect other roles", () => {
    pinSidebar();
    const { unmount } = renderSelector(ADMIN);
    fireEvent.click(within(rail()).getByRole("button", { name: "Remove TIET Health Hub from Quick Access" }));
    fireEvent.click(within(rail()).getByRole("button", { name: "Add Student Calendar to Quick Access" }));
    expect(readFav("admin")).toEqual([
      "student-notices", "event-calendar", "library-night-pass", "student-societies",
      "society-night-permission", "student-calendar",
    ]);
    expect(within(quickAccess()).getByRole("button", { name: /Student Calendar/ })).toBeInTheDocument();

    fireEvent.click(within(rail()).getByRole("button", { name: "Remove Student Notices from Quick Access" }));
    expect(readFav("admin")).not.toContain("student-notices");
    expect(within(quickAccess()).queryByRole("button", { name: /Student Notices/ })).not.toBeInTheDocument();

    unmount();
    const view = renderSelector(ADMIN);
    expect(within(quickAccess()).getByRole("button", { name: /Student Calendar/ })).toBeInTheDocument();
    expect(within(quickAccess()).queryByRole("button", { name: /Student Notices/ })).not.toBeInTheDocument();
    view.unmount();

    // Assistant is untouched and still on its defaults.
    expect(localStorage.getItem(favKey("assistant"))).toBeNull();
    renderSelector(ASSISTANT);
    expect(within(quickAccess()).getAllByRole("button")).toHaveLength(6);
  });

  test("favorites are capped at 6", () => {
    pinSidebar();
    renderSelector(ADMIN);
    fireEvent.click(within(rail()).getByRole("button", { name: "Remove TIET Health Hub from Quick Access" }));
    fireEvent.click(within(rail()).getByRole("button", { name: "Add Student Calendar to Quick Access" }));
    expect(readFav("admin")).toHaveLength(6);
    expect(within(rail()).getByRole("button", { name: "Add Institute Calendar to Quick Access" })).toBeDisabled();
    const blocked = within(rail()).getByRole("button", { name: "Add Society Route Manager to Quick Access" });
    expect(blocked).toBeDisabled();
    fireEvent.click(blocked);
    expect(readFav("admin")).toHaveLength(6);
  });

  test("invalid, unknown, duplicate and other-role favorites are silently ignored", () => {
    localStorage.setItem(
      favKey("assistant"),
      JSON.stringify(["student-notices", "student-societies", "nope", 42, null, "student-societies", "grievance-admin-portal"])
    );
    renderSelector(ASSISTANT);
    expect(buttonNames(quickAccess())).toEqual(["Student Societies (opens in new tab)"]);
  });

  test.each(["{not json", JSON.stringify({ a: 1 }), JSON.stringify("student-notices")])(
    "malformed stored value %s falls back to role defaults",
    (raw) => {
      localStorage.setItem(favKey("assistant"), raw);
      renderSelector(ASSISTANT);
      expect(within(quickAccess()).getAllByRole("button")).toHaveLength(6);
    }
  );

  test("an intentionally emptied list stays empty and shows a hint", () => {
    localStorage.setItem(favKey("admin"), "[]");
    renderSelector(ADMIN);
    expect(within(quickAccess()).queryAllByRole("button")).toHaveLength(0);
    expect(within(quickAccess()).getByText(/Nothing pinned yet/)).toBeInTheDocument();
  });

  test("Grievance and Fretbox can be favourited by admin, and stay admin-scoped", () => {
    pinSidebar();
    renderSelector(ADMIN);
    fireEvent.click(within(rail()).getByRole("button", { name: "Remove TIET Health Hub from Quick Access" }));
    fireEvent.click(within(rail()).getByRole("button", { name: "Add Student Grievance Admin to Quick Access" }));
    expect(readFav("admin")).toContain("grievance-admin-portal");
    expect(within(quickAccess()).getByRole("button", { name: "Student Grievance Admin" })).toBeInTheDocument();
  });

  test("favorites saved for one role/account never expose an unavailable portal to another user", () => {
    const stored = JSON.stringify(["society-night-permission", "lost-and-found", "student-notices", "fretbox-resident-app"]);

    // adosa3 stores under an account-scoped key; ADoSA colleagues never read it.
    localStorage.setItem(`${favKey("adosa")}.account.adosa3@thapar.edu`, stored);
    let view = renderSelector(ADOSA3);
    expect(buttonNames(quickAccess())).toEqual([
      "Society Night Permission (opens in new tab)",
      "Fretbox Resident App (opens in new tab)",
    ]);
    view.unmount();
    view = renderSelector(ADOSA2);
    expect(buttonNames(quickAccess())).toEqual(["Fretbox Resident App (opens in new tab)"]);
    view.unmount();

    // Even if the plain role key is polluted, only available ids survive.
    localStorage.setItem(favKey("adosa"), stored);
    view = renderSelector(ADOSA2);
    expect(buttonNames(quickAccess())).toEqual(["Fretbox Resident App (opens in new tab)"]);
    view.unmount();
    localStorage.setItem(favKey("dd_assistant"), stored);
    view = renderSelector(DD_ASSISTANT);
    expect(buttonNames(quickAccess())).toEqual(["Fretbox Resident App (opens in new tab)"]);
    view.unmount();
    localStorage.setItem(favKey("caretaker"), stored);
    renderSelector(CARETAKER);
    expect(buttonNames(quickAccess())).toEqual([
      "Society Night Permission (opens in new tab)",
      "Fretbox Resident App (opens in new tab)",
    ]);
  });

  test("adosa3 favourites are stored under an account-scoped key, not the shared role key", () => {
    pinSidebar();
    renderSelector(ADOSA3);
    fireEvent.click(within(rail()).getByRole("button", { name: "Remove Society Night Permission from Quick Access" }));
    expect(localStorage.getItem(favKey("adosa"))).toBeNull();
    expect(JSON.parse(localStorage.getItem(`${favKey("adosa")}.account.adosa3@thapar.edu`))).toEqual(["fretbox-resident-app"]);
  });

  test("no credentials, tokens, sessions or cookies are written to localStorage or cookies", () => {
    pinSidebar();
    renderSelector(ADMIN);
    fireEvent.click(portalButton(railList("Campus Portals"), "Lost & Found"));
    fireEvent.click(portalButton(railList("Campus Portals"), "Society Night Permission"));
    fireEvent.click(within(rail()).getByRole("button", { name: "Remove TIET Health Hub from Quick Access" }));
    fireEvent.click(within(rail()).getByRole("button", { name: "Add Student Calendar to Quick Access" }));
    const dump = JSON.stringify(Object.entries(localStorage)).toLowerCase();
    expect(dump).not.toMatch(/password|token|session|cookie|secret|credential|bearer/);
    expect(Object.keys(localStorage).every((key) => key.startsWith("campusConnect.dashboardSelector."))).toBe(true);
    expect(document.cookie).toBe("");
    // Launching is a bare URL: nothing is appended to it.
    expect(openSpy.mock.calls.map(([url]) => url)).toEqual([LOST_AND_FOUND_URL, SNP_URL]);
  });

  test("only UI preference keys are ever written to localStorage", () => {
    pinSidebar();
    renderSelector(ADMIN);
    fireEvent.click(within(rail()).getByRole("button", { name: "Remove TIET Health Hub from Quick Access" }));
    fireEvent.click(within(rail()).getByRole("button", { name: "Add Student Calendar to Quick Access" }));
    fireEvent.click(within(rail()).getByRole("button", { name: "Unpin sidebar" }));
    const keys = Object.keys(localStorage);
    expect(keys.sort()).toEqual([favKey("admin"), PINNED_KEY].sort());
    expect(localStorage.getItem(PINNED_KEY)).toMatch(/^(true|false)$/);
    expect(readFav("admin").every((id) => /^[a-z-]+$/.test(id))).toBe(true);
  });
});

// ─── Mobile drawer ──────────────────────────────────────────────────────────
describe("mobile drawer", () => {
  const openDrawer = () => fireEvent.click(screen.getByRole("button", { name: "Open workspace menu" }));

  test("opens from the hamburger and closes on Escape", () => {
    renderSelector(ADMIN);
    expect(screen.queryByRole("dialog", { name: "Workspace menu" })).not.toBeInTheDocument();
    openDrawer();
    const dialog = screen.getByRole("dialog", { name: "Workspace menu" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "Open workspace menu" })).toHaveAttribute("aria-expanded", "true");
    expect(within(dialog).getByRole("list", { name: "Campus Portals" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Workspace menu" })).not.toBeInTheDocument();
  });

  test("closes on backdrop click and on the close button", () => {
    renderSelector(ADMIN);
    openDrawer();
    fireEvent.click(screen.getByTestId("workspace-drawer-backdrop"));
    expect(screen.queryByRole("dialog", { name: "Workspace menu" })).not.toBeInTheDocument();
    openDrawer();
    fireEvent.click(screen.getByRole("button", { name: "Close workspace menu" }));
    expect(screen.queryByRole("dialog", { name: "Workspace menu" })).not.toBeInTheDocument();
  });

  test("closes after navigating, using the same exact URL", () => {
    renderSelector(ASSISTANT);
    openDrawer();
    const dialog = screen.getByRole("dialog", { name: "Workspace menu" });
    fireEvent.click(portalButton(dialog, "Student Calendar"));
    expect(openSpy).toHaveBeenCalledWith("https://campusconnect.thapar.edu/tc/admin/login", "_blank", "noopener,noreferrer");
    expect(screen.queryByRole("dialog", { name: "Workspace menu" })).not.toBeInTheDocument();
  });

  test("favorites can be toggled inside the drawer without closing it", () => {
    renderSelector(ASSISTANT);
    openDrawer();
    const dialog = screen.getByRole("dialog", { name: "Workspace menu" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove Event Calendar from Quick Access" }));
    expect(screen.getByRole("dialog", { name: "Workspace menu" })).toBeInTheDocument();
    expect(readFavOrNull("assistant")).not.toContain("event-calendar");
  });

  test("returns focus to the hamburger when closed", () => {
    renderSelector(ADMIN);
    const hamburger = screen.getByRole("button", { name: "Open workspace menu" });
    openDrawer();
    expect(screen.getByRole("button", { name: "Close workspace menu" })).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(hamburger).toHaveFocus();
  });
});

function readFavOrNull(role) {
  const raw = localStorage.getItem(favKey(role));
  return raw ? JSON.parse(raw) : null;
}

describe("footer", () => {
  test("shows only the compact DoSA footer, without the old DashboardFooter content", () => {
    renderSelector(ADMIN);
    expect(screen.getByRole("contentinfo")).toHaveTextContent(/^Created and Maintained by DoSA Office © 2026$/);
    expect(screen.queryByText(/Powered by Thapar Institute/)).not.toBeInTheDocument();
    expect(screen.queryByText("System Online")).not.toBeInTheDocument();
    expect(screen.queryByText("Created by DoSA Office")).not.toBeInTheDocument();
  });
});


describe("TIET Health Hub", () => {
  test.each([ADMIN, ASSISTANT])("%o can launch from default Quick Access", (user) => {
    renderSelector(user);
    fireEvent.click(portalButton(quickAccess(), "TIET Health Hub"));
    expect(openSpy).toHaveBeenCalledWith(
      "https://campusconnect.thapar.edu/dispensary/admin", "_blank", "noopener,noreferrer"
    );
  });

  test.each([CARETAKER, ADOSA2, ADOSA3, DD_ASSISTANT,
    ...["manager", "warden", "co_warden", "student", "unknown"].map((role) => ({ role }))
  ])("%o cannot see it even with a saved favorite", (user) => {
    localStorage.setItem(favKey(user.role), JSON.stringify(["tiet-health-hub"]));
    renderSelector(user);
    expect(screen.queryByRole("button", { name: /TIET Health Hub/ })).not.toBeInTheDocument();
    expect(openSpy).not.toHaveBeenCalled();
  });
});
