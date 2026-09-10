import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import DirectBookingModal from "./DirectBookingModal";
import { useAuth } from "../context/AuthContext";

jest.mock("../context/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../context/ToastContext", () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock("../hooks/useSystemSettings", () => () => ({
  settings: { bookingDays: { managerMaxDirectBookingDays: 3, caretakerMaxDirectBookingDays: 3 } },
}));
jest.mock("framer-motion", () => {
  const ReactLocal = require("react");
  return {
    motion: {
      div: ReactLocal.forwardRef(({ initial, animate, exit, whileHover, whileTap, ...props }, ref) => (
        <div ref={ref} {...props} />
      )),
    },
  };
});
// Bypass the real ImageKit SDK: IKUpload becomes a plain button that fires
// onSuccess with a fake uploaded URL, so tests can drive uploads without a
// real ImageKit backend.
jest.mock("imagekitio-react", () => {
  const ReactLocal = require("react");
  return {
    IKContext: ({ children }) => <>{children}</>,
    IKUpload: ReactLocal.forwardRef(({ onSuccess, ...props }, ref) => (
      <button
        type="button"
        ref={ref}
        data-testid="ik-upload"
        onClick={() => onSuccess({ url: "https://example.com/fake-upload.pdf" })}
      >
        upload
      </button>
    )),
  };
});

const sourceBooking = {
  _id: "src1",
  bookingId: "GR-26091001",
  guest: "Navjot Sharma",
  hostel: "Agira Hall",
  roomNo: "1",
  from: "2026-09-10",
  to: "2026-09-12",
  checkInTime: "10:00",
  checkOutTime: "10:00",
  numGuests: 1,
  sharingGroupId: null,
};

const normalModal = {
  open: true,
  hostel: "Agira Hall",
  room: { roomNo: "1", bookings: [] },
  prefill: null,
};

const sharingModal = {
  open: true,
  mode: "sharing",
  hostel: "Agira Hall",
  room: { roomNo: "1", guestCapacity: 2, bookings: [sourceBooking] },
  prefill: { from: "2026-09-11", to: "2026-09-13", checkInTime: "10:00", checkOutTime: "10:00" },
  sourceBooking,
};

let fetchMock;
beforeEach(() => {
  useAuth.mockReturnValue({ currentUser: { role: "admin" } });
  fetchMock = jest.fn((url) => {
    if (String(url).includes("/share-room")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, booking: { _id: "new1", bookingId: "GR-26091002" } }),
      });
    }
    if (String(url).endsWith("/api/bookings")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, booking: { _id: "new2", bookingId: "GR-26091003" } }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({ success: true }) });
  });
  global.fetch = fetchMock;
});

describe("DirectBookingModal - normal mode (unchanged behavior)", () => {
  test("header shows plain Direct Booking title, no sharing banner", () => {
    render(<DirectBookingModal modal={normalModal} onClose={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.getByText(/Direct Booking — Agira Hall \/ Room 1/)).toBeInTheDocument();
    expect(screen.queryByText("Create Shared Room Booking")).toBeNull();
    expect(screen.queryByText(/This creates a separate booking/)).toBeNull();
  });

  test("blocks Next when dates overlap an existing booking in the room", () => {
    const modal = {
      ...normalModal,
      room: {
        roomNo: "1",
        bookings: [{ _id: "x1", from: "2026-09-10", to: "2026-09-12", checkInTime: "10:00", checkOutTime: "10:00", status: "booked" }],
      },
    };
    render(<DirectBookingModal modal={modal} onClose={jest.fn()} onSubmit={jest.fn()} />);
    const [fromInput, toInput] = screen.getAllByDisplayValue("");
    fireEvent.change(fromInput, { target: { value: "2026-09-10" } });
    fireEvent.change(toInput, { target: { value: "2026-09-11" } });
    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: "10:00" } });
    fireEvent.change(timeInputs[1], { target: { value: "10:00" } });
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByText(/conflicts with an existing booking/)).toBeInTheDocument();
  });
});

describe("DirectBookingModal - sharing mode", () => {
  test("shows 'Create Shared Room Booking' header and sharing banner with source details", () => {
    render(<DirectBookingModal modal={sharingModal} onClose={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.getByText("Create Shared Room Booking")).toBeInTheDocument();
    expect(screen.getByText(/Agira Hall · Room 1/)).toBeInTheDocument();
    expect(screen.getByText(/Navjot Sharma · GR-26091001/)).toBeInTheDocument();
    expect(screen.getByText(/This creates a separate booking/)).toBeInTheDocument();
  });

  test("prefills source dates/times but they remain editable", () => {
    render(<DirectBookingModal modal={sharingModal} onClose={jest.fn()} onSubmit={jest.fn()} />);
    expect(screen.getByDisplayValue("2026-09-11")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2026-09-13")).toBeInTheDocument();
    const fromInput = screen.getByDisplayValue("2026-09-11");
    fireEvent.change(fromInput, { target: { value: "2026-09-12" } });
    expect(fromInput.value).toBe("2026-09-12");
  });

  test("blocks Next with the no-overlap message when the selected stay never overlaps the source booking", () => {
    render(<DirectBookingModal modal={sharingModal} onClose={jest.fn()} onSubmit={jest.fn()} />);
    const fromInput = screen.getByDisplayValue("2026-09-11");
    const toInput = screen.getByDisplayValue("2026-09-13");
    // Source books 10th->12th; push the shared stay entirely after it (12th->14th
    // touches only at the checkout instant, which is not a positive overlap).
    fireEvent.change(fromInput, { target: { value: "2026-09-12" } });
    fireEvent.change(toInput, { target: { value: "2026-09-14" } });
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(
      screen.getByText(/does not overlap the selected shared-room booking\. Please create a normal Direct Booking instead\./)
    ).toBeInTheDocument();
  });

  test("allows overlap with the source booking, blocks overlap with an unrelated booking", () => {
    const unrelated = { _id: "c1", guest: "C", from: "2026-09-11", to: "2026-09-12", checkInTime: "10:00", checkOutTime: "10:00", status: "booked" };
    const modal = { ...sharingModal, room: { ...sharingModal.room, bookings: [sourceBooking, unrelated] } };
    render(<DirectBookingModal modal={modal} onClose={jest.fn()} onSubmit={jest.fn()} />);
    // Default prefill (11th->13th) overlaps BOTH the source (10-12) and unrelated C (11-12) booking.
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByText(/conflicts with another, unrelated booking/)).toBeInTheDocument();
  });

  test("guest personal fields are not pre-filled from the source booking", async () => {
    render(<DirectBookingModal modal={sharingModal} onClose={jest.fn()} onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const guestInput = await screen.findByPlaceholderText("Guest Name / Society Name");
    expect(guestInput.value).toBe("");
    expect(screen.getByPlaceholderText(/Roll No \/ Emp ID/).value).toBe("");
    expect(screen.getByPlaceholderText("Contact (10 digits)").value).toBe("");
  });

  test("capacity indicator updates reactively as Total Guests changes, and blocks submit when exceeded", async () => {
    render(<DirectBookingModal modal={sharingModal} onClose={jest.fn()} onSubmit={jest.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await screen.findByPlaceholderText("Guest Name / Society Name");

    expect(screen.getByText("Room Capacity: 2")).toBeInTheDocument();
    expect(screen.getByText("Existing Guests: 1")).toBeInTheDocument();
    expect(screen.getByText(/New Guests: 1/)).toBeInTheDocument();
    expect(screen.getByText(/After Sharing: 2\/2/)).toBeInTheDocument();
    expect(screen.queryByText(/Room capacity exceeded/)).toBeNull();

    const guestsInput = screen.getByPlaceholderText("Total Guests");
    fireEvent.change(guestsInput, { target: { value: "2" } });

    expect(screen.getByText(/New Guests: 2/)).toBeInTheDocument();
    expect(screen.getByText(/After Sharing: 3\/2/)).toBeInTheDocument();
    expect(screen.getByText(/Room capacity exceeded for the selected sharing period\./)).toBeInTheDocument();
  });

  test("submits to the dedicated share-room endpoint, not the normal bookings endpoint", async () => {
    const onSubmit = jest.fn();
    render(<DirectBookingModal modal={sharingModal} onClose={jest.fn()} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(await screen.findByPlaceholderText("Guest Name / Society Name"), { target: { value: "Aman Sharma" } });
    fireEvent.change(screen.getByPlaceholderText("Contact (10 digits)"), { target: { value: "9876543210" } });
    fireEvent.change(screen.getByPlaceholderText(/Email/), { target: { value: "aman@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Males"), { target: { value: "1" } });
    fireEvent.click(screen.getByTestId("ik-upload"));

    fireEvent.click(screen.getByRole("button", { name: "Next: Payment" }));
    fireEvent.change(await screen.findByPlaceholderText("Enter total bill amount"), { target: { value: "1000" } });

    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(await screen.findByRole("button", { name: "Submit Booking" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    const calledUrl = fetchMock.mock.calls.find(([url]) => String(url).includes("/share-room"))?.[0];
    expect(calledUrl).toContain("/api/bookings/src1/share-room");
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/api/bookings"))).toBe(false);
  });
});

describe("DirectBookingModal - normal mode submit endpoint", () => {
  test("normal mode still submits to POST /api/bookings", async () => {
    const onSubmit = jest.fn();
    const modal = { ...normalModal };
    render(<DirectBookingModal modal={modal} onClose={jest.fn()} onSubmit={onSubmit} />);

    const [fromInput, toInput] = screen.getAllByDisplayValue("");
    fireEvent.change(fromInput, { target: { value: "2026-09-20" } });
    fireEvent.change(toInput, { target: { value: "2026-09-21" } });
    const timeInputs = document.querySelectorAll('input[type="time"]');
    fireEvent.change(timeInputs[0], { target: { value: "10:00" } });
    fireEvent.change(timeInputs[1], { target: { value: "10:00" } });

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.change(await screen.findByPlaceholderText("Guest Name / Society Name"), { target: { value: "Test Guest" } });
    fireEvent.change(screen.getByPlaceholderText("Contact (10 digits)"), { target: { value: "9876543210" } });
    fireEvent.change(screen.getByPlaceholderText(/Email/), { target: { value: "guest@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("Males"), { target: { value: "1" } });
    fireEvent.click(screen.getByTestId("ik-upload"));

    fireEvent.click(screen.getByRole("button", { name: "Next: Payment" }));
    fireEvent.change(await screen.findByPlaceholderText("Enter total bill amount"), { target: { value: "1000" } });

    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(await screen.findByRole("button", { name: "Submit Booking" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/api/bookings"))).toBe(true);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("/share-room"))).toBe(false);
  });
});
