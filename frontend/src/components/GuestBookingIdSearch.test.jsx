import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchGuestModal from "./SearchGuestModal";
import FilterModal from "./FilterModal";
import { useAuth } from "../context/AuthContext";

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../context/ToastContext", () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock("framer-motion", () => {
  const React = require("react");
  return { motion: { div: React.forwardRef(({ initial, animate, exit, whileHover, whileTap, ...props }, ref) => <div ref={ref} {...props} />) } };
});

const booking = {
  bookingId: "GR-26090402", guest: "Alice", contact: "9876543210",
  email: "alice@example.com", from: "2026-09-04", to: "2026-09-06",
};
const hostelData = {
  A: { rooms: [{ roomNo: 101, bookings: [booking, { guest: "Legacy", _id: "mongo-only-id" }] }] },
  B: { rooms: [{ roomNo: 102, bookings: [{ ...booking, guest: "Outside" }] }] },
};
const mount = (Component) => render(<Component hostelData={hostelData} onClose={jest.fn()} onSelectGuest={jest.fn()} onSelectBooking={jest.fn()} />);
const search = () => fireEvent.click(screen.getByRole("button", { name: "Search" }));
beforeEach(() => useAuth.mockReturnValue({ currentUser: { role: "admin" } }));

describe("SearchGuestModal", () => {
  test.each(["GR-26090402", "gr-26090402", "26090402", "Alice", "9876543210", "alice@example.com"])("finds by %s", (query) => {
    mount(SearchGuestModal);
    fireEvent.change(screen.getByPlaceholderText("Search by name, contact, email, or Booking ID..."), { target: { value: query } });
    search();
    expect(screen.getByText(/Alice/)).toBeTruthy();
    expect(screen.getAllByText("Booking ID: GR-26090402").length).toBeGreaterThan(0);
  });
  test.each(["Legacy", "mongo-only-id"])("handles legacy booking query %s without using Mongo ID", (query) => {
    mount(SearchGuestModal);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: query } });
    search();
    expect(Boolean(screen.queryByText(/Legacy/))).toBe(query === "Legacy");
  });
});

describe("FilterModal", () => {
  test.each([
    ["caretaker", false],
    ["warden", false],
    ["admin", true],
    ["manager", true],
  ])("Show All preserves %s hostel access", (role, canSeeOutside) => {
    useAuth.mockReturnValue({ currentUser: { role, assignedHostel: "A" } });
    mount(FilterModal);
    fireEvent.click(screen.getByRole("button", { name: "Show All" }));
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Legacy")).toBeTruthy();
    expect(Boolean(screen.queryByText("Outside"))).toBe(canSeeOutside);
  });

  test.each(["GR-26090402", "gr-26090402", "26090402"])("filters by %s and combines with guest then resets", (query) => {
    mount(FilterModal);
    const input = screen.getByLabelText("Guest Room Booking ID");
    fireEvent.change(input, { target: { value: query } });
    search();
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.queryByText("Legacy")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Search by name"), { target: { value: "Outside" } });
    search();
    expect(screen.queryByText("Alice")).toBeNull();
    expect(screen.getByText("Outside")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(input.value).toBe("");
    search();
    expect(screen.getByText("Legacy")).toBeTruthy();
  });
  test("does not match Mongo ID", () => {
    mount(FilterModal);
    fireEvent.change(screen.getByLabelText("Guest Room Booking ID"), { target: { value: "mongo-only-id" } });
    search();
    expect(screen.queryByText("Legacy")).toBeNull();
  });
});

test.each(["caretaker", "warden"])("both search paths preserve %s hostel restriction", (role) => {
  useAuth.mockReturnValue({ currentUser: { role, assignedHostel: "A" } });
  for (const Component of [SearchGuestModal, FilterModal]) {
    const view = mount(Component);
    const input = Component === SearchGuestModal ? screen.getByRole("textbox") : screen.getByLabelText("Guest Room Booking ID");
    fireEvent.change(input, { target: { value: "26090402" } });
    search();
    expect(screen.getByText(/Alice/)).toBeTruthy();
    expect(screen.queryByText(/Outside/)).toBeNull();
    view.unmount();
  }
});
