const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const toValidDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getIsoDateString = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    const dateOnlyMatch = trimmed.match(DATE_ONLY_PATTERN);
    if (dateOnlyMatch) return trimmed;

    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (isoMatch) return isoMatch[1];
  }

  const date = toValidDate(value);
  if (!date) return null;
  return date.toISOString().slice(0, 10);
};

const getDateParts = (value) => {
  const isoDate = getIsoDateString(value);
  if (!isoDate) return null;

  const match = isoDate.match(DATE_ONLY_PATTERN);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    isoDate,
  };
};

export const parseDateOnlyToUtcDate = (value) => {
  const parts = getDateParts(value);
  if (!parts) return toValidDate(value);
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
};

export const formatBillDate = (value) => {
  const parts = getDateParts(value);
  if (!parts) return "";

  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${parts.year}`;
};

export const formatBillDateLong = (value) => {
  const parts = getDateParts(value);
  if (!parts) return "";

  return `${String(parts.day).padStart(2, "0")} ${MONTHS_SHORT[parts.month - 1]} ${parts.year}`;
};

export const calculateBillableDays = (from, to) => {
  const start = getDateParts(from);
  const end = getDateParts(to);

  if (!start || !end) return 1;

  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(end.year, end.month - 1, end.day);
  const diffDays = Math.round((endUtc - startUtc) / 86400000);

  return Math.max(1, diffDays);
};

const getExtensionBoundary = (extension, keys) => {
  for (const key of keys) {
    if (extension?.[key]) return extension[key];
  }
  return null;
};

export const resolveBillStayPeriod = (
  booking,
  { previousPaidAmount = 0, previousDiscount = 0 } = {}
) => {
  const basePeriod = {
    from: booking?.from ?? null,
    to: booking?.to ?? null,
    source: "booking",
  };

  // ✅ Check if extension history exists
  const history = Array.isArray(booking?.extensionHistory) ? booking.extensionHistory : [];
  
  console.log("📊 resolveBillStayPeriod DEBUG:", {
    bookingId: booking?._id,
    historyLength: history.length,
    history: history.map(h => ({
      oldTo: h.oldTo,
      newTo: h.newTo,
      oldCheckout: h.oldCheckout,
      newCheckout: h.newCheckout,
      approvedAmount: h.approvedAmount,
      amount: h.amount
    })),
    basePeriod
  });

  const latestExtension = history[history.length - 1];

  if (!latestExtension) {
    console.log("⚠️ No extension history found, using base period");
    return basePeriod;
  }

  // ✅ Extract extension dates with backward compatibility
  const extensionFrom = getExtensionBoundary(latestExtension, ["oldCheckout", "oldTo"]);
  const extensionTo = getExtensionBoundary(latestExtension, ["newCheckout", "newTo"]);
  
  // ✅ FIXED: Check for positive amount first, not just existence
  // latestExtension.amount might be 0 (falsy), so check approvedAmount too
  let extensionAmount = 0;
  if (Number(latestExtension?.approvedAmount) > 0) {
    extensionAmount = Number(latestExtension.approvedAmount);
  } else if (Number(latestExtension?.amount) > 0) {
    extensionAmount = Number(latestExtension.amount);
  } else if (Number(booking?.extensionAmount) > 0) {
    extensionAmount = Number(booking.extensionAmount);
  }

  console.log("🔍 Extension extraction:", {
    extensionFrom,
    extensionTo,
    extensionAmount,
    latestExtensionKeys: Object.keys(latestExtension)
  });

  // ✅ FIXED: If extension dates are valid and amount is positive, USE THEM
  if (extensionFrom && extensionTo && extensionAmount > 0) {
    console.log("✅ Using extension billing period:", {
      from: extensionFrom,
      to: extensionTo,
      amount: extensionAmount,
      source: "extension"
    });
    return {
      from: extensionFrom,
      to: extensionTo,
      source: "extension",
    };
  }

  // Fallback only if no valid extension data
  console.log("❌ Extension data incomplete, falling back:", {
    hasFrom: !!extensionFrom,
    hasTo: !!extensionTo,
    hasAmount: extensionAmount > 0,
    reason: !extensionFrom ? "No extensionFrom" : !extensionTo ? "No extensionTo" : "No amount"
  });
  return basePeriod;
};
