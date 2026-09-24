import { fireEvent, render, screen, within } from "@testing-library/react";
import CampusConnect, { PublicQuickLinks } from "./CampusConnect";
import { DEFAULT_PUBLIC_UI_CONFIG } from "../utils/publicUiConfig";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../components/PublicPageWidgets", () => () => null);
jest.mock("../components/CampusFeedbackSection", () => () => null);
jest.mock("../utils/publicUiConfig", () => ({
  ...jest.requireActual("../utils/publicUiConfig"),
  fetchPublicUiConfig: () => new Promise(() => {}),
}));
jest.mock("framer-motion", () => {
  const React = require("react");
  const make = (tag) => React.forwardRef(({
    initial, animate, exit, transition, whileInView, whileHover, whileTap, viewport, drag,
    dragConstraints, dragElastic, onDragEnd, ...props
  }, ref) => React.createElement(tag, { ...props, ref }));
  return {
    motion: { div: make("div"), button: make("button"), h1: make("h1"), p: make("p") },
    AnimatePresence: ({ children }) => children,
    useInView: () => false,
  };
});

test("Health Hub staff login appears only in Quick Links and opens the exact URL safely in a new tab", () => {
  const open = jest.spyOn(window, "open").mockImplementation(() => null);
  try {
    render(<CampusConnect />);
    const footer = within(screen.getByRole("contentinfo"));
    expect(footer.getByText("Quick Links")).toBeInTheDocument();
    const login = footer.getByRole("button", { name: "TIET Health Hub – Staff Login" });
    expect(screen.getAllByText("TIET Health Hub – Staff Login")).toHaveLength(1);
    fireEvent.click(login);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(
      "https://campusconnect.thapar.edu/dispensary/admin",
      "_blank",
      "noopener,noreferrer"
    );
  } finally {
    open.mockRestore();
  }
});

test("existing Quick Links retain their order, labels, destinations and navigation behavior", () => {
  const onOpen = jest.fn();
  render(<PublicQuickLinks config={DEFAULT_PUBLIC_UI_CONFIG} onOpen={onOpen} />);
  const footer = within(screen.getByRole("contentinfo"));
  expect(footer.getAllByRole("button").map((element) => element.textContent)).toEqual([
    "Home", "How to Install", "Sign In", "Student Notices", "Institute Calendar",
    "Student Calendar", "Student Societies", "About Us", "Guest Room Booking",
    "Library Night Pass", "Venue Booking", "Student Societies",
    "TIET Health Hub – Staff Login",
  ]);
  for (const item of DEFAULT_PUBLIC_UI_CONFIG.footer.quickLinks) {
    fireEvent.click(footer.getAllByRole("button", { name: item.title })[0]);
    expect(onOpen).toHaveBeenLastCalledWith(item);
  }
  for (const item of [
    { id: "guest-room-service", title: "Guest Room Booking", destination: "/guest-room" },
    { id: "library-pass-service", title: "Library Night Pass", destination: "https://campusconnect.thapar.edu/permissions/" },
    { id: "venue-service", title: "Venue Booking", destination: "/venue-enquiry" },
    { id: "societies-service", title: "Student Societies", destination: "https://studentsocieties.thapar.edu/" },
  ]) {
    const buttons = footer.getAllByRole("button", { name: item.title });
    fireEvent.click(buttons[buttons.length - 1]);
    expect(onOpen).toHaveBeenLastCalledWith(item);
  }
  const lostFound = footer.getByRole("link", { name: "Lost & Found" });
  expect(lostFound).toHaveAttribute("href", "/lostnfound/");
  expect(lostFound).not.toHaveAttribute("target");
});
