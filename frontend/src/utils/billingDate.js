const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const getIsoDate = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    const dateOnlyMatch = trimmed.match(DATE_ONLY_PATTERN);
    if (dateOnlyMatch) return trimmed;

    const isoMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})T/);
    if (isoMatch) return isoMatch[1];
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

export const formatBillingDate = (value) => {
  const isoDate = getIsoDate(value);
  if (!isoDate) return "—";

  const [, year, month, day] = isoDate.match(DATE_ONLY_PATTERN) || [];
  if (!year) return "—";

  return `${day} ${MONTHS_SHORT[Number(month) - 1]} ${year}`;
};
