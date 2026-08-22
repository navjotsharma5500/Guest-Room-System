import {
  bookingIntervalsOverlap,
  combineIndiaDateAndTime,
  getBookingFinalCheckout,
  getCurrentSegmentStart,
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
