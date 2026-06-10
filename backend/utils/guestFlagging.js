import GuestFlag from "../models/GuestFlag.js";
import { getSystemSettings } from "./systemSettings.js";

export const normalizeGuestIdentity = ({ email = "", contact = "" } = {}) => ({
  email: String(email || "").trim().toLowerCase(),
  contact: String(contact || "").trim(),
});

export const getFlagRuleConfig = (settings = {}) => {
  const rules = settings.flagRules || {};
  const yellowThreshold = Math.max(1, Number(rules.yellowThreshold || 3));
  const orangeThreshold = Math.max(1, Number(rules.orangeThreshold || 2));
  const redThreshold = Math.max(1, Number(rules.redThreshold || 1));

  return {
    yellowThreshold,
    orangeThreshold,
    redThreshold,
    yellowWeight: 1,
    orangeWeight: Math.max(1, Math.ceil(yellowThreshold / orangeThreshold)),
    redWeight: Math.max(yellowThreshold, Math.ceil(yellowThreshold / redThreshold)),
    blockScore: yellowThreshold,
  };
};

export const getFlagSeverityScore = (flagType, settings = {}) => {
  const rules = getFlagRuleConfig(settings);
  const type = String(flagType || "").toLowerCase();
  if (type === "red") return rules.redWeight;
  if (type === "orange") return rules.orangeWeight;
  return rules.yellowWeight;
};

export const calculateGuestSeverity = (flags = [], settings = {}) => {
  const rules = getFlagRuleConfig(settings);
  const counts = { yellow: 0, orange: 0, red: 0 };
  let severityScore = 0;

  for (const flag of flags) {
    const type = String(flag.flagType || "").toLowerCase();
    if (!counts[type] && counts[type] !== 0) continue;
    counts[type] += 1;
    severityScore += Number(flag.severityScore || getFlagSeverityScore(type, settings));
  }

  const blocked =
    counts.red >= rules.redThreshold ||
    counts.orange >= rules.orangeThreshold ||
    counts.yellow >= rules.yellowThreshold ||
    severityScore >= rules.blockScore;

  let reason = "";
  if (blocked) {
    if (counts.red >= rules.redThreshold) reason = `${counts.red} red flag(s) reached`;
    else if (counts.orange >= rules.orangeThreshold) reason = `${counts.orange} orange flag(s) reached`;
    else if (counts.yellow >= rules.yellowThreshold) reason = `${counts.yellow} yellow flag(s) reached`;
    else reason = `Mixed severity score ${severityScore}/${rules.blockScore} reached`;
  }

  return {
    blocked,
    reason,
    counts,
    severityScore,
    blockScore: rules.blockScore,
    thresholds: {
      yellow: rules.yellowThreshold,
      orange: rules.orangeThreshold,
      red: rules.redThreshold,
    },
  };
};

export const buildGuestFlagQuery = ({ email, contact } = {}) => {
  const identity = normalizeGuestIdentity({ email, contact });
  const or = [];
  if (identity.email) or.push({ email: identity.email });
  if (identity.contact) or.push({ contact: identity.contact });
  if (or.length === 0) return null;
  return {
    isActive: true,
    "override.isOverridden": { $ne: true },
    $or: or,
  };
};

export const getGuestRiskStatus = async ({ email, contact } = {}, settings = null) => {
  const activeSettings = settings || await getSystemSettings();
  if (activeSettings?.operations?.enableGuestFlagging === false) {
    return {
      blocked: false,
      disabled: true,
      flags: [],
      counts: { yellow: 0, orange: 0, red: 0 },
      severityScore: 0,
      blockScore: getFlagRuleConfig(activeSettings).blockScore,
      reason: "",
    };
  }

  const query = buildGuestFlagQuery({ email, contact });
  if (!query) {
    return calculateGuestSeverity([], activeSettings);
  }

  const flags = await GuestFlag.find(query)
    .sort({ createdAt: -1 })
    .populate("flaggedBy", "name email role")
    .populate("override.overriddenBy", "name email role")
    .lean();

  return {
    ...calculateGuestSeverity(flags, activeSettings),
    flags,
  };
};

export const assertGuestNotBlocked = async ({ email, contact } = {}, { allowOverride = false } = {}) => {
  const settings = await getSystemSettings();
  const risk = await getGuestRiskStatus({ email, contact }, settings);
  if (risk.blocked && !allowOverride) {
    const err = new Error(`Guest is blocked due to indiscipline flags. ${risk.reason || ""}`.trim());
    err.statusCode = 403;
    err.code = "GUEST_BLOCKED";
    err.risk = risk;
    throw err;
  }
  return risk;
};
