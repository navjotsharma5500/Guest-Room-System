import { calculateBookingDurationDays } from "./dateUtils";

describe("calculateBookingDurationDays", () => {
  test.each([
    ["2026-09-03", "2026-09-03", 0],
    ["2026-09-03", "2026-09-04", 1],
    ["2026-09-03", "2026-09-05", 2],
    ["2026-09-28", "2026-10-02", 4],
    ["2026-09-30", "2026-10-01", 1],
    ["2026-12-30", "2027-01-02", 3],
    ["2028-02-27", "2028-03-01", 3],
    ["2027-02-27", "2027-03-01", 2],
  ])("%s to %s crosses %i calendar midnights", (from, to, expected) => {
    expect(calculateBookingDurationDays(from, to)).toBe(expected);
  });

  test("uses India calendar dates and ignores time of day", () => {
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
});
