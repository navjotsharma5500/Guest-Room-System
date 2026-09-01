import { calculateBookingDurationDays } from "../utils/bookingDuration.js";

test("same-day booking crosses 0 midnights", () => {
  expect(calculateBookingDurationDays("2026-09-03", "2026-09-03")).toBe(0);
});

test("adjacent dates cross 1 midnight", () => {
  expect(calculateBookingDurationDays("2026-09-03", "2026-09-04")).toBe(1);
});

test("two-date-boundary stay is 2 days", () => {
  expect(calculateBookingDurationDays("2026-09-03", "2026-09-05")).toBe(2);
});

test("cross-month range uses full dates and crosses 4 midnights", () => {
  expect(calculateBookingDurationDays("2026-09-28", "2026-10-02")).toBe(4);
  expect(calculateBookingDurationDays("2026-09-30", "2026-10-01")).toBe(1);
});

test("cross-year range crosses 3 midnights", () => {
  expect(calculateBookingDurationDays("2026-12-30", "2027-01-02")).toBe(3);
});

test("leap-year range across Feb/Mar boundary", () => {
  expect(calculateBookingDurationDays("2028-02-27", "2028-03-01")).toBe(3);
});

test("non-leap-year Feb/Mar boundary is one day shorter", () => {
  expect(calculateBookingDurationDays("2027-02-27", "2027-03-01")).toBe(2);
});

test("clock times do not change the India calendar-midnight count", () => {
  expect(
    calculateBookingDurationDays(
      "2026-09-03T04:30:00.000Z", // 10:00 IST
      "2026-09-04T15:30:00.000Z"  // 21:00 IST
    )
  ).toBe(1);
  expect(
    calculateBookingDurationDays(
      "2026-09-03T04:30:00.000Z", // 10:00 IST
      "2026-09-03T17:30:00.000Z"  // 23:00 IST
    )
  ).toBe(0);
});
