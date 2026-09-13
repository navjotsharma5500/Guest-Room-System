import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PaymentModal from "./PaymentModal";
const mockToast = jest.fn(); const mockRefresh = jest.fn();
jest.mock("../context/ToastContext", () => ({ useToast: () => ({ showToast: mockToast }) }));
jest.mock("../context/DashboardRefreshContext", () => ({ useDashboardRefresh: () => ({ refreshDashboard: mockRefresh }) }));
jest.mock("imagekitio-react", () => {
  const React = require("react");
  return { IKContext: ({ children }) => <>{children}</>, IKUpload: React.forwardRef(({ onSuccess }, ref) => <button ref={ref} onClick={() => onSuccess({ url: "https://example.com/proof.pdf" })}>Mock upload</button>) };
});
jest.mock("framer-motion", () => ({ AnimatePresence: ({ children }) => <>{children}</>, motion: { div: ({ initial, animate, exit, ...props }) => <div {...props} /> } }));
const booking = { _id: "b1", bookingId: "GR-26090101", guest: "Test Guest", totalAmount: 1000, paidAmount: 1000, balanceAmount: 0, paymentStatus: "PAID" };
const fill = () => {
  fireEvent.change(screen.getByLabelText("Amount *"), { target: { value: "200" } });
  fireEvent.change(screen.getByLabelText("Remarks"), { target: { value: "Correction" } });
  fireEvent.click(screen.getByText("Mock upload"));
};
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear(); global.fetch = jest.fn();
  Object.defineProperty(window, "crypto", { configurable: true, value: { randomUUID: () => "test-admin-key-0001" } });
  jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => jest.restoreAllMocks());
test("fully paid normal mode stays blocked", () => {
  render(<PaymentModal booking={booking} onClose={jest.fn()} />);
  expect(screen.getByText("Fully Paid")).toBeInTheDocument(); expect(screen.queryByText("Create Bill")).toBeNull();
});
test("admin mode bypasses fully paid and shows only amount remarks proof", () => {
  render(<PaymentModal mode="adminCreateBill" booking={booking} onClose={jest.fn()} />);
  expect(screen.getByText("Create New Bill")).toBeInTheDocument(); expect(screen.getByText(/Test Guest/)).toBeInTheDocument();
  expect(screen.getByText(/GR-26090101/)).toBeInTheDocument(); expect(screen.getByLabelText("Amount *")).toBeInTheDocument();
  expect(screen.getByLabelText("Remarks")).toBeInTheDocument(); expect(screen.getByText(/Upload Payment Proof/)).toBeInTheDocument();
  expect(screen.queryByText(/Discount \(%\)/)).toBeNull(); expect(screen.queryByPlaceholderText("Enter transaction ID")).toBeNull();
  expect(document.querySelector('input[type="date"]')).toBeNull(); expect(document.querySelector("select")).toBeNull();
});
test("submits dedicated endpoint once then refreshes, updates booking and closes", async () => {
  const onSuccess = jest.fn(); const onClose = jest.fn(); const updated = { ...booking, totalAmount: 1200, paidAmount: 1200 };
  let resolve; global.fetch.mockReturnValue(new Promise(r => { resolve = r; }));
  render(<PaymentModal mode="adminCreateBill" booking={booking} onClose={onClose} onSuccess={onSuccess} />); fill();
  fireEvent.click(screen.getByText("Create Bill")); fireEvent.click(screen.getByText("Processing...")); expect(fetch).toHaveBeenCalledTimes(1);
  const [url, options] = fetch.mock.calls[0]; expect(url).toMatch(/\/bookings\/b1\/admin-bill$/);
  expect(JSON.parse(options.body)).toEqual({ amount: 200, remarks: "Correction", paymentAttachments: ["https://example.com/proof.pdf"] });
  expect(options.headers["Idempotency-Key"]).toBe("test-admin-key-0001");
  resolve({ ok: true, json: async () => ({ success: true, booking: updated }) });
  await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1)); expect(onSuccess).toHaveBeenCalledWith(updated); expect(mockRefresh).toHaveBeenCalledWith(true);
});
test("network retry reuses original key and payload", async () => {
  global.fetch.mockRejectedValueOnce(new Error("Network error")).mockResolvedValue({ ok: true, json: async () => ({ booking }) });
  render(<PaymentModal mode="adminCreateBill" booking={booking} onClose={jest.fn()} />); fill(); fireEvent.click(screen.getByText("Create Bill"));
  await waitFor(() => expect(screen.getByText("Create Bill")).toBeEnabled()); fireEvent.click(screen.getByText("Create Bill"));
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2)); expect(fetch.mock.calls[0][1]).toEqual(fetch.mock.calls[1][1]);
});
test("validation requires amount, remarks and proof", () => {
  render(<PaymentModal mode="adminCreateBill" booking={booking} onClose={jest.fn()} />);
  fireEvent.click(screen.getByText("Create Bill")); expect(fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Amount *"), { target: { value: "200" } }); fireEvent.click(screen.getByText("Create Bill")); expect(fetch).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText("Remarks"), { target: { value: "Correction" } }); fireEvent.click(screen.getByText("Create Bill")); expect(fetch).not.toHaveBeenCalled();
});
test("normal pending mode retains transaction and discount fields", () => {
  render(<PaymentModal booking={{ ...booking, paidAmount: 850, balanceAmount: 150 }} onClose={jest.fn()} />);
  expect(screen.getByPlaceholderText("Enter transaction ID")).toBeInTheDocument(); expect(document.querySelector('input[type="date"]')).toBeTruthy();
  expect(screen.getByText(/Discount \(%\)/)).toBeInTheDocument(); expect(screen.queryByText("Create Bill")).toBeNull();
});

test("reopening an uncertain bill restores original retry details", async () => {
  fetch.mockRejectedValue(new Error("Network error"));
  const first = render(<PaymentModal mode="adminCreateBill" booking={booking} onClose={jest.fn()} />);
  fill(); fireEvent.click(screen.getByText("Create Bill")); await waitFor(() => expect(screen.getByText("Create Bill")).toBeEnabled());
  first.unmount();
  render(<PaymentModal mode="adminCreateBill" booking={booking} onClose={jest.fn()} />);
  expect(screen.getByLabelText("Amount *")).toHaveValue(200); expect(screen.getByLabelText("Remarks")).toHaveValue("Correction");
  fireEvent.click(screen.getByText("Create Bill")); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch.mock.calls[0][1]).toEqual(fetch.mock.calls[1][1]);
});
test("admin pending mode accepts partial amount without autofilling or extra selectors", () => {
  render(<PaymentModal mode="adminCreateBill" booking={{ ...booking, paidAmount: 850 }} onClose={jest.fn()} />);
  fireEvent.change(screen.getByLabelText("Amount *"), { target: { value: "100" } });
  expect(screen.getByLabelText("Amount *")).toHaveValue(100); expect(document.querySelector("select")).toBeNull();
});

test("normal full payment keeps endpoint payload and refresh contract", async () => {
  const onClose = jest.fn(); const onSuccess = jest.fn();
  fetch.mockResolvedValue({ ok: true, json: async () => ({ booking }) });
  render(<PaymentModal booking={{ ...booking, paidAmount: 850 }} onClose={onClose} onSuccess={onSuccess} />);
  fireEvent.click(screen.getByText("UPI"));
  fireEvent.change(screen.getByPlaceholderText("Enter transaction ID"), { target: { value: "normal-reference" } });
  fireEvent.change(document.querySelector('input[type="date"]'), { target: { value: "2026-09-13" } });
  fireEvent.change(screen.getByLabelText("Remarks"), { target: { value: "Normal payment" } });
  fireEvent.click(screen.getByText("Mock upload")); fireEvent.click(screen.getByText("Pay ₹150"));
  await waitFor(() => expect(onClose).toHaveBeenCalled());
  expect(fetch.mock.calls[0][0]).toMatch(/\/bookings\/b1\/payment$/);
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ paymentType: "FULL", amountPaid: 150, paymentMethod: "UPI", transactionId: "normal-reference", discount: 0 });
  expect(fetch.mock.calls[0][1].headers["Idempotency-Key"]).toBeUndefined();
  expect(onSuccess).toHaveBeenCalledWith(booking); expect(mockRefresh).toHaveBeenCalledWith(true);
});

test("a refreshed balance cannot block confirmation of an uncertain original request", async () => {
  fetch.mockRejectedValueOnce(new Error("Network error")).mockResolvedValue({ ok: true, json: async () => ({ booking }) });
  const view = render(<PaymentModal mode="adminCreateBill" booking={{ ...booking, paidAmount: 700 }} onClose={jest.fn()} />);
  fill(); fireEvent.click(screen.getByText("Create Bill")); await waitFor(() => expect(screen.getByText("Create Bill")).toBeEnabled());
  view.rerender(<PaymentModal mode="adminCreateBill" booking={{ ...booking, paidAmount: 900 }} onClose={jest.fn()} />);
  fireEvent.click(screen.getByText("Create Bill")); await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  expect(fetch.mock.calls[0][1]).toEqual(fetch.mock.calls[1][1]);
});
