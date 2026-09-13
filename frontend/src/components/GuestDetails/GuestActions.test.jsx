import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import GuestActions from "./GuestActions";

jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../../context/ToastContext", () => ({ useToast: () => ({ showToast: jest.fn() }) }));
jest.mock("../../hooks/useSystemSettings", () => () => ({ settings: {} }));
jest.mock("framer-motion", () => {
  const ReactLocal = require("react");
  return {
    motion: {
      button: ReactLocal.forwardRef(({ whileHover, whileTap, ...props }, ref) => <button ref={ref} {...props} />),
      div: ReactLocal.forwardRef(({ initial, animate, exit, transition, ...props }, ref) => <div ref={ref} {...props} />),
    },
    AnimatePresence: ({ children }) => <>{children}</>,
  };
});

const baseBooking = {
  _id: "b1",
  bookingId: "GR-26091001",
  status: "booked",
  approvalStatus: "auto_approved",
};

const mount = (booking, userRole, extra = {}) => {
  render(
    <GuestActions
      showActionsDropdown={true}
      setShowActionsDropdown={jest.fn()}
      theme="light"
      booking={booking}
      onEditDetails={jest.fn()}
      onGuestHistory={jest.fn()}
      onBillHistory={jest.fn()}
      onDownloadPDF={jest.fn()}
      onPayAmount={jest.fn()}
      onExtendBooking={jest.fn()}
      onShareRoom={jest.fn()}
      userRole={userRole}
      {...extra}
    />
  );
};

describe("GuestActions - Share Room", () => {
  test("appears for an eligible booking and an authorized role", () => {
    mount(baseBooking, "admin");
    expect(screen.getByText("Share Room")).toBeInTheDocument();
  });

  test.each(["admin", "manager", "caretaker", "warden", "Warden", "co_warden", "adosa"])(
    "is offered to role %s",
    (role) => {
      mount(baseBooking, role);
      expect(screen.getByText("Share Room")).toBeInTheDocument();
    }
  );

  test.each(["student", "assistant", "dd_assistant"])("is hidden for unauthorized role %s", (role) => {
    mount(baseBooking, role);
    expect(screen.queryByText("Share Room")).toBeNull();
  });

  test.each(["cancelled", "no_show", "checked_out"])("has no usable action for terminal booking status %s", (status) => {
    mount({ ...baseBooking, status }, "admin");
    expect(screen.queryByText("Share Room")).toBeNull();
  });

  test.each(["under_review", "rejected"])("is hidden when approvalStatus is %s", (approvalStatus) => {
    mount({ ...baseBooking, approvalStatus }, "admin");
    expect(screen.queryByText("Share Room")).toBeNull();
  });

  test("is offered for a checked_in booking", () => {
    mount({ ...baseBooking, status: "checked_in" }, "admin");
    expect(screen.getByText("Share Room")).toBeInTheDocument();
  });

  test("clicking Share Room invokes onShareRoom and closes the dropdown", () => {
    const onShareRoom = jest.fn();
    const setShowActionsDropdown = jest.fn();
    mount(baseBooking, "admin", { onShareRoom, setShowActionsDropdown });
    fireEvent.click(screen.getByText("Share Room"));
    expect(onShareRoom).toHaveBeenCalledTimes(1);
    expect(setShowActionsDropdown).toHaveBeenCalledWith(false);
  });

  test("is hidden entirely when onShareRoom is not provided", () => {
    mount(baseBooking, "admin", { onShareRoom: undefined });
    expect(screen.queryByText("Share Room")).toBeNull();
  });
});

describe("Create New Bill", () => {
  test.each(["booked", "checked_in", "checked_out"])("admin sees action for fully paid %s", status => {
    const onCreateNewBill = jest.fn(); const setShowActionsDropdown = jest.fn();
    mount({ ...baseBooking, status, totalAmount: 1000, paidAmount: 1000, balanceAmount: 0, paymentStatus: "PAID" }, "admin", { onCreateNewBill, setShowActionsDropdown });
    fireEvent.click(screen.getByText("Create New Bill")); expect(onCreateNewBill).toHaveBeenCalledTimes(1);
    expect(setShowActionsDropdown).toHaveBeenCalledWith(false); expect(screen.queryByText("Pay Amount")).toBeNull();
  });
  test.each(["manager", "caretaker", "warden", "adosa", "co_warden", "student", "assistant", "Admin"])("hidden for %s", role => {
    mount(baseBooking, role, { onCreateNewBill: jest.fn() }); expect(screen.queryByText("Create New Bill")).toBeNull();
  });
  test.each(["cancelled", "no_show"])("hidden for %s", status => {
    mount({ ...baseBooking, status }, "admin", { onCreateNewBill: jest.fn() }); expect(screen.queryByText("Create New Bill")).toBeNull();
  });
  test("normal Pay Amount remains available with pending balance", () => {
    mount({ ...baseBooking, totalAmount: 1000, paidAmount: 850 }, "caretaker", { onCreateNewBill: jest.fn() });
    expect(screen.getByText("Pay Amount")).toBeInTheDocument();
  });
});
