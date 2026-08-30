import { calculateInclusiveStayDays } from "../utils/bookingDuration.js";

test("same-day booking is 1 day", () => {
  expect(calculateInclusiveStayDays("2026-09-28", "2026-09-28")).toBe(1);
});

test("same-month range counts both endpoints inclusively", () => {
  expect(calculateInclusiveStayDays("2026-09-28", "2026-09-30")).toBe(3);
});

test("cross-month range (the reported '35 days' bug) resolves to 5", () => {
  expect(calculateInclusiveStayDays("2026-09-28", "2026-10-02")).toBe(5);
});

test("one-night bookings are 2 inclusive days", () => {
  expect(calculateInclusiveStayDays("2026-09-28", "2026-09-29")).toBe(2);
  expect(calculateInclusiveStayDays("2026-09-30", "2026-10-01")).toBe(2);
});

test("cross-year range", () => {
  expect(calculateInclusiveStayDays("2026-12-30", "2027-01-02")).toBe(4);
});

test("leap-year range across Feb/Mar boundary", () => {
  expect(calculateInclusiveStayDays("2028-02-27", "2028-03-01")).toBe(4);
});

test("non-leap-year Feb/Mar boundary is one day shorter", () => {
  expect(calculateInclusiveStayDays("2027-02-27", "2027-03-01")).toBe(3);
});

test("is unaffected by full ISO timestamps with time-of-day components", () => {
  // 02:00Z = 07:30 IST — same India calendar day as the date-only string.
  expect(calculateInclusiveStayDays("2026-09-28T02:00:00.000Z", "2026-10-02T02:00:00.000Z")).toBe(5);
});
