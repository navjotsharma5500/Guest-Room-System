import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import RoomCard from "./RoomCard";
import { useAuth } from "../context/AuthContext";

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../hooks/useSystemSettings", () => () => ({ settings: { operations: { enableCleaningWorkflow: true } } }));
jest.mock("./Cleaning/CleaningChecklistModal", () => () => null);
jest.mock("./Cleaning/RoomCleaningStatusBadge", () => () => null);
jest.mock("framer-motion", () => {
  const ReactLocal = require("react");
  return {
    motion: {
      div: ReactLocal.forwardRef(({ initial, animate, exit, whileHover, whileTap, transition, ...props }, ref) => (
        <div ref={ref} {...props} />
      )),
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

beforeEach(() => {
  useAuth.mockReturnValue({ user: { role: "admin", email: "admin@example.com" } });
});

const future = { from: "2099-01-10", to: "2099-01-12", checkInTime: "10:00", checkOutTime: "10:00", status: "booked" };

describe("RoomCard - Shared Room badge", () => {
  test("shows SHARED badge only when 2+ bookings truly share a sharingGroupId", () => {
    const room = {
      roomNo: "101",
      bookings: [
        { ...future, _id: "a1", guest: "Navjot Sharma", sharingGroupId: "grp1", numGuests: 1 },
        { ...future, _id: "b1", guest: "Aman Sharma", sharingGroupId: "grp1", numGuests: 1 },
      ],
    };
    render(<RoomCard hostel="Agira Hall" room={room} theme="light" />);
    expect(screen.getByText("SHARED · 2 GUESTS")).toBeInTheDocument();
  });

  test("two unrelated sequential bookings (different/absent sharingGroupId) are NOT labelled shared", () => {
    const room = {
      roomNo: "101",
      bookings: [
        { ...future, _id: "a1", guest: "Guest A", from: "2099-01-01", to: "2099-01-02" },
        { ...future, _id: "b1", guest: "Guest B", from: "2099-02-01", to: "2099-02-02" },
      ],
    };
    render(<RoomCard hostel="Agira Hall" room={room} theme="light" />);
    expect(screen.queryByText(/SHARED/)).toBeNull();
    expect(screen.getByText(/2 upcoming bookings/)).toBeInTheDocument();
  });

  test("a single sharingGroupId with only one booking present in this room is not labelled shared", () => {
    const room = {
      roomNo: "101",
      bookings: [{ ...future, _id: "a1", guest: "Solo Guest", sharingGroupId: "grp1" }],
    };
    render(<RoomCard hostel="Agira Hall" room={room} theme="light" />);
    expect(screen.queryByText(/SHARED/)).toBeNull();
  });
});

describe("RoomCard - multi-booking modal", () => {
  test("shows both shared bookings separately, each tagged SHARED with its own Booking ID", () => {
    const room = {
      roomNo: "101",
      bookings: [
        { ...future, _id: "a1", bookingId: "GR-1", guest: "Navjot Sharma", sharingGroupId: "grp1", numGuests: 1 },
        { ...future, _id: "b1", bookingId: "GR-2", guest: "Aman Sharma", sharingGroupId: "grp1", numGuests: 1 },
      ],
    };
    render(<RoomCard hostel="Agira Hall" room={room} theme="light" onSelect={jest.fn()} />);

    // Two bookings -> clicking the card opens the modal (not direct select)
    fireEvent.click(screen.getByText("Room 101"));

    expect(screen.getByText("Navjot Sharma")).toBeInTheDocument();
    expect(screen.getByText("Aman Sharma")).toBeInTheDocument();
    expect(screen.getByText("GR-1")).toBeInTheDocument();
    expect(screen.getByText("GR-2")).toBeInTheDocument();
    expect(screen.getAllByText("SHARED")).toHaveLength(2);
  });

  test("unrelated sequential bookings in the modal are not tagged SHARED and remain individually clickable", () => {
    const onSelect = jest.fn();
    const room = {
      roomNo: "101",
      bookings: [
        { ...future, _id: "a1", bookingId: "GR-1", guest: "Guest A", from: "2099-01-01", to: "2099-01-02" },
        { ...future, _id: "b1", bookingId: "GR-2", guest: "Guest B", from: "2099-02-01", to: "2099-02-02" },
      ],
    };
    render(<RoomCard hostel="Agira Hall" room={room} theme="light" onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Room 101"));

    expect(screen.queryByText("SHARED")).toBeNull();
    fireEvent.click(screen.getByText("Guest A"));
    expect(onSelect).toHaveBeenCalledWith("Agira Hall", "101", "a1");
  });
});
