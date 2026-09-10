import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import ReportedModal from "./ReportedModal";

jest.mock("./EarlyCheckInPaymentModal", () => () => null);
jest.mock("framer-motion", () => {
  const ReactLocal = require("react");
  const strip = (Tag) =>
    ReactLocal.forwardRef(({ initial, animate, exit, whileHover, whileTap, transition, ...props }, ref) => (
      <Tag ref={ref} {...props} />
    ));
  return {
    motion: { div: strip("div"), button: strip("button"), select: strip("select"), input: strip("input"), textarea: strip("textarea") },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

const booking = {
  _id: "b1",
  guest: "Aman Sharma",
  contact: "9876543210",
  hostel: "Agira Hall",
  roomNo: "1",
  from: "2020-01-01",
  to: "2020-01-03",
  checkInTime: "10:00",
  status: "booked",
  reportedStatus: "pending",
};

const mountModal = () =>
  render(<ReportedModal booking={booking} open={true} onClose={jest.fn()} onSuccess={jest.fn()} />);

describe("ReportedModal - sharing-aware occupancy", () => {
  test("shows an informational Shared Room banner (not a block) when the occupant belongs to the same sharing group", async () => {
    global.fetch = jest.fn((url) => {
      if (String(url).includes("/check-room-occupancy")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            occupied: false,
            sharingAllowed: true,
            occupants: [{ guest: "Navjot Sharma" }],
            capacity: 2,
            occupiedGuests: 1,
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    mountModal();

    await waitFor(() => expect(screen.getByText("Shared Room")).toBeInTheDocument());
    expect(screen.getByText(/currently occupied by Navjot Sharma/i)).toBeInTheDocument();
    expect(screen.getByText(/authorized to share the room/)).toBeInTheDocument();

    // Not blocked: the hard "Room Currently Occupied" panel must not render.
    expect(screen.queryByText("⚠️ Room Currently Occupied")).toBeNull();
    expect(screen.queryByText(/Cannot report guest\. Room is currently occupied/)).toBeNull();
  });

  test("still blocks and shows the hard warning when the occupant is unrelated", async () => {
    global.fetch = jest.fn((url) => {
      if (String(url).includes("/check-room-occupancy")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            occupied: true,
            sharingAllowed: false,
            occupant: { guest: "Unrelated Guest", contact: "9999999999", hostel: "Agira Hall", roomNo: "1", from: "2020-01-01", to: "2020-01-05" },
            occupants: [{ guest: "Unrelated Guest" }],
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    mountModal();

    await waitFor(() => expect(screen.getByText("⚠️ Room Currently Occupied")).toBeInTheDocument());
    expect(screen.getByText("Unrelated Guest", { selector: "p" })).toBeInTheDocument();
    expect(screen.queryByText("Shared Room")).toBeNull();
  });
});
