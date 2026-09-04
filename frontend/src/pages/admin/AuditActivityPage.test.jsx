import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AuditActivityPage, { filterTimeToUtc, formatAuditTimeIST } from "./AuditActivityPage";

jest.mock("react-router-dom", () => ({
  MemoryRouter: ({ children }) => children,
  useNavigate: () => jest.fn(),
  useSearchParams: () => [new URLSearchParams("bookingId=GR-26090103")],
}), { virtual: true });

const response = { success: true, logs: [{ _id: "1", timestamp: "2026-09-02T14:08:25.000Z", source: "USER", module: "GUEST_ROOM", userEmail: "admin@test.com", action: "GUEST_NOT_REPORTED", functionName: "markNotReported", bookingId: "GR-26090103", result: "SUCCESS", previousState: { status: "booked" }, newState: { status: "no_show" } }], pagination: { page: 1, pages: 2, total: 26 } };

beforeEach(() => { global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => response }); });
afterEach(() => jest.restoreAllMocks());

test("renders URL booking filter, filters, pagination, timeline and details", async () => {
  render(<MemoryRouter initialEntries={["/audit-activity?bookingId=GR-26090103"]}><AuditActivityPage/></MemoryRouter>);
  expect(screen.getByDisplayValue("GR-26090103")).toBeInTheDocument();
  expect(await screen.findByText("Guest Not Reported")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Global Search"), { target: { value: "markNotReported" } });
  fireEvent.click(screen.getByText("Apply filters"));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("search=markNotReported"), expect.anything()));
  fireEvent.click(await screen.findByText("Guest Not Reported"));
  expect(screen.getByRole("dialog", { name: "Audit details" })).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Close details"));
  fireEvent.click(screen.getByText("Timeline view"));
  expect(screen.getByText("Table view")).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Next page"));
  await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("page=2"), expect.anything()));
});

test("formats timestamps in IST", () => {
  expect(formatAuditTimeIST("2026-09-02T14:08:25.000Z")).toMatch(/02 Sept 2026.*07:38:25.*IST/i);
  expect(filterTimeToUtc("2026-09-02", "07:38")).toBe("2026-09-02T02:08:00.000Z");
});
