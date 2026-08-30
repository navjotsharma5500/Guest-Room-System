import {
  bookingIntervalsOverlap,
  combineIndiaDateAndTime,
  getBookingFinalCheckout,
  getCurrentSegmentStart,
  doesRangeOverlapMaintenanceBlock,
} from "../utils/bookingTransfer.js";

test("combines Guest Room dates and times in India time", () => {
  expect(combineIndiaDateAndTime("2026-08-22", "14:35").toISOString()).toBe(
    "2026-08-22T09:05:00.000Z"
  );
  expect(combineIndiaDateAndTime("2026-08-22", "25:00")).toBeNull();
  expect(combineIndiaDateAndTime("2026-02-31", "10:00")).toBeNull();
});

test("uses the latest transfer boundary as the current location segment start", () => {
  const booking = {
    from: new Date("2026-08-21T00:00:00.000Z"),
    checkInTime: "10:00",
    transferHistory: [
      { segmentTo: new Date("2026-08-22T09:05:00.000Z") },
      { segmentTo: new Date("2026-08-23T06:30:00.000Z") },
    ],
  };

  expect(getCurrentSegmentStart(booking).toISOString()).toBe("2026-08-23T06:30:00.000Z");
});

test("calculates final checkout without changing the authoritative booking dates", () => {
  const booking = {
    to: new Date("2026-08-25T00:00:00.000Z"),
    checkOutTime: "10:00",
  };

  expect(getBookingFinalCheckout(booking).toISOString()).toBe("2026-08-25T04:30:00.000Z");
});

test("treats touching room intervals as available and real overlap as a conflict", () => {
  const sourceStart = new Date("2026-08-22T08:30:00.000Z");
  const sourceEnd = new Date("2026-08-25T04:30:00.000Z");

  expect(
    bookingIntervalsOverlap(
      sourceStart,
      sourceEnd,
      new Date("2026-08-20T04:30:00.000Z"),
      sourceStart
    )
  ).toBe(false);
  expect(
    bookingIntervalsOverlap(
      sourceStart,
      sourceEnd,
      new Date("2026-08-23T04:30:00.000Z"),
      new Date("2026-08-24T04:30:00.000Z")
    )
  ).toBe(true);
});

describe("doesRangeOverlapMaintenanceBlock", () => {
  const blockedRoom = { isBlocked: true, blockedTill: "2026-09-10T18:00:00.000Z" };

  test("rejects a booking that starts and ends before the block ends", () => {
    expect(doesRangeOverlapMaintenanceBlock(blockedRoom, "2026-09-05")).toBe(true);
  });

  test("rejects a booking that starts before and would run past the block end", () => {
    expect(doesRangeOverlapMaintenanceBlock(blockedRoom, "2026-09-09")).toBe(true);
  });

  test("rejects a booking that starts exactly on the blocked-through date", () => {
    expect(doesRangeOverlapMaintenanceBlock(blockedRoom, "2026-09-10")).toBe(true);
  });

  test("allows a booking that starts the day after the block ends", () => {
    expect(doesRangeOverlapMaintenanceBlock(blockedRoom, "2026-09-11")).toBe(false);
  });

  test("allows any booking when the room is not blocked", () => {
    expect(doesRangeOverlapMaintenanceBlock({ isBlocked: false, blockedTill: "2026-09-10" }, "2026-09-05")).toBe(false);
  });

  test("allows any booking when isBlocked is true but blockedTill is missing", () => {
    expect(doesRangeOverlapMaintenanceBlock({ isBlocked: true }, "2026-09-05")).toBe(false);
  });
});
