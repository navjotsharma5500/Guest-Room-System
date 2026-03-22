import {
  calculateBillableDays,
  formatBillDateLong,
  parseDateOnlyToUtcDate,
  resolveBillStayPeriod,
} from "../utils/billingDates.js";

describe("billingDates", () => {
  test("formats stored UTC midnight dates without shifting the calendar day", () => {
    expect(formatBillDateLong("2026-03-21T00:00:00.000Z")).toBe("21 Mar 2026");
    expect(formatBillDateLong(new Date("2026-03-21T00:00:00.000Z"))).toBe("21 Mar 2026");
  });

  test("parses date-only input into a stable UTC date without mutating the day", () => {
    const parsed = parseDateOnlyToUtcDate("2026-03-21");
    expect(parsed.toISOString()).toBe("2026-03-21T00:00:00.000Z");
  });

  test("uses previous checkout as the billing start for extension-only payments", () => {
    const booking = {
      from: new Date("2026-03-21T00:00:00.000Z"),
      to: new Date("2026-03-23T00:00:00.000Z"),
      totalAmount: 2000,
      extensionAmount: 1000,
      extensionHistory: [
        {
          oldCheckout: new Date("2026-03-22T00:00:00.000Z"),
          newCheckout: new Date("2026-03-23T00:00:00.000Z"),
          amount: 1000,
        },
      ],
    };

    const period = resolveBillStayPeriod(booking, {
      previousPaidAmount: 1000,
      previousDiscount: 0,
    });

    expect(period.source).toBe("extension");
    expect(period.from.toISOString()).toBe("2026-03-22T00:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-03-23T00:00:00.000Z");
    expect(calculateBillableDays(period.from, period.to)).toBe(1);
  });

  test("keeps the original stay window when the booking balance is not yet extension-only", () => {
    const booking = {
      from: new Date("2026-03-21T00:00:00.000Z"),
      to: new Date("2026-03-23T00:00:00.000Z"),
      totalAmount: 2000,
      extensionAmount: 1000,
      extensionHistory: [
        {
          oldCheckout: new Date("2026-03-22T00:00:00.000Z"),
          newCheckout: new Date("2026-03-23T00:00:00.000Z"),
          amount: 1000,
        },
      ],
    };

    const period = resolveBillStayPeriod(booking, {
      previousPaidAmount: 500,
      previousDiscount: 0,
    });

    expect(period.source).toBe("booking");
    expect(period.from.toISOString()).toBe("2026-03-21T00:00:00.000Z");
    expect(period.to.toISOString()).toBe("2026-03-23T00:00:00.000Z");
  });
});
