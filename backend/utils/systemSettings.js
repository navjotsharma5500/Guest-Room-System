import SystemSettings from "../models/SystemSettings.js";

export const DEFAULT_DASHBOARD_REGISTRY = [
  {
    key: "guestRoom",
    label: "Guest Room Booking",
    path: "/dashboard",
    active: true,
    icon: "Building2",
    description: "Guest room operations, bookings and approvals",
  },
  {
    key: "venue",
    label: "Venue Booking",
    path: "/venue-booking",
    active: true,
    icon: "MapPinned",
    description: "Venue booking operations and event management",
  },
  {
    key: "night",
    label: "Night Pass",
    path: "/night-dashboard",
    active: false,
    icon: "MoonStar",
    description: "Night pass operations",
  },
];

export const EMAIL_TEMPLATE_REGISTRY = [
  "caretakerBookingApprovedFree",
  "caretakerBookingApprovedPaid",
  "caretakerBookingCancelled",
  "caretakerBookingExtended",
  "caretakerBookingExtendedPaid",
  "caretakerDirectBooking",
  "caretakerDirectBookingFree",
  "enquiryNotification",
  "extensionApproved",
  "extensionRejected",
  "extensionReminder",
  "extensionRequest",
  "guestBookingApprovedFree",
  "guestBookingApprovedPaid",
  "guestBookingCancelled",
  "guestBookingExtended",
  "guestBookingExtendedPaid",
  "guestBookingRejected",
  "guestCheckoutFeedback",
  "guestDirectBooking",
  "guestDirectBookingFree",
  "guestEnquiryReceived",
  "managerBookingApprovedFree",
  "managerBookingApprovedPaid",
  "managerBookingCancelled",
  "managerBookingExtended",
  "managerBookingExtendedPaid",
  "managerDirectBooking",
  "managerDirectBookingFree",
  "rebookingApprovalRequired",
  "venueMasterTemplate",
  "wardenBookingApprovedFree",
  "wardenBookingApprovedPaid",
  "wardenBookingCancelled",
  "wardenBookingExtended",
  "wardenBookingExtendedPaid",
  "wardenDirectBooking",
  "wardenDirectBookingFree",
];

export const DEFAULT_EMAIL_SETTING = {
  enabled: true,
  sendToRoles: [],
  ccRoles: [],
  bccRoles: [],
  customEmails: [],
};

export const buildDefaultEmailSettings = () =>
  Object.fromEntries(
    EMAIL_TEMPLATE_REGISTRY.map((templateKey) => [templateKey, { ...DEFAULT_EMAIL_SETTING }])
  );

export const DEFAULT_SYSTEM_SETTINGS = {
  key: "global",
  bookingDays: {
    guestMaxRequestDays: 5,
    managerMaxDirectBookingDays: 3,
    caretakerMaxDirectBookingDays: 3,
  },
  extensionRules: {
    maxExtensionRequestDays: 30,
    coWardenLevelDays: 5,
    adosaLevelDays: 10,
    adminLevelDays: 30,
  },
  emailSettings: buildDefaultEmailSettings(),
  dashboardRegistry: DEFAULT_DASHBOARD_REGISTRY,
  updatedBy: null,
};

let settingsPromise = null;
let lastLoadedAt = 0;
const SETTINGS_TTL_MS = 10 * 1000;

const mergeEmailSettings = (current = {}) => ({
  ...buildDefaultEmailSettings(),
  ...current,
});

const normalizeDashboardRegistry = (registry = []) => {
  if (!Array.isArray(registry) || registry.length === 0) {
    return DEFAULT_DASHBOARD_REGISTRY;
  }

  const byKey = new Map(
    DEFAULT_DASHBOARD_REGISTRY.map((entry) => [entry.key, { ...entry }])
  );

  for (const entry of registry) {
    if (!entry?.key) continue;
    byKey.set(entry.key, {
      ...byKey.get(entry.key),
      ...entry,
    });
  }

  return Array.from(byKey.values());
};

export const sanitizeSystemSettings = (doc = {}) => ({
  ...DEFAULT_SYSTEM_SETTINGS,
  ...doc,
  bookingDays: {
    ...DEFAULT_SYSTEM_SETTINGS.bookingDays,
    ...(doc.bookingDays || {}),
  },
  extensionRules: {
    ...DEFAULT_SYSTEM_SETTINGS.extensionRules,
    ...(doc.extensionRules || {}),
  },
  emailSettings: mergeEmailSettings(doc.emailSettings || {}),
  dashboardRegistry: normalizeDashboardRegistry(doc.dashboardRegistry),
});

export const validateSystemSettingsPayload = (payload = {}) => {
  const settings = sanitizeSystemSettings(payload);
  const {
    guestMaxRequestDays,
    managerMaxDirectBookingDays,
    caretakerMaxDirectBookingDays,
  } = settings.bookingDays;
  const {
    maxExtensionRequestDays,
    coWardenLevelDays,
    adosaLevelDays,
    adminLevelDays,
  } = settings.extensionRules;

  if (guestMaxRequestDays <= 0) {
    throw new Error("Guest max request days must be greater than 0");
  }
  if (managerMaxDirectBookingDays <= 0) {
    throw new Error("Manager max direct booking days must be greater than 0");
  }
  if (caretakerMaxDirectBookingDays <= 0) {
    throw new Error("Caretaker max direct booking days must be greater than 0");
  }
  if (coWardenLevelDays <= caretakerMaxDirectBookingDays) {
    throw new Error("Co-Warden level must be greater than caretaker direct booking limit");
  }
  if (adosaLevelDays <= coWardenLevelDays) {
    throw new Error("ADoSA level must be greater than Co-Warden level");
  }
  if (adminLevelDays <= adosaLevelDays) {
    throw new Error("Admin level must be greater than ADoSA level");
  }
  if (maxExtensionRequestDays > adminLevelDays) {
    throw new Error("Max extension request days must be less than or equal to admin level days");
  }
};

export const getSystemSettings = async ({ fresh = false } = {}) => {
  const shouldRefresh =
    fresh ||
    !settingsPromise ||
    Date.now() - lastLoadedAt > SETTINGS_TTL_MS;

  if (shouldRefresh) {
    settingsPromise = SystemSettings.findOneAndUpdate(
      { key: "global" },
      { $setOnInsert: DEFAULT_SYSTEM_SETTINGS },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    )
      .lean()
      .then((settings) => sanitizeSystemSettings(settings))
      .finally(() => {
        lastLoadedAt = Date.now();
      });
  }

  return settingsPromise;
};

export const updateSystemSettings = async (partialPayload = {}, updatedBy = null) => {
  const current = await getSystemSettings({ fresh: true });
  const next = sanitizeSystemSettings({
    ...current,
    ...partialPayload,
    bookingDays: {
      ...current.bookingDays,
      ...(partialPayload.bookingDays || {}),
    },
    extensionRules: {
      ...current.extensionRules,
      ...(partialPayload.extensionRules || {}),
    },
    emailSettings: {
      ...current.emailSettings,
      ...(partialPayload.emailSettings || {}),
    },
    dashboardRegistry:
      partialPayload.dashboardRegistry || current.dashboardRegistry,
  });

  validateSystemSettingsPayload(next);

  const saved = await SystemSettings.findOneAndUpdate(
    { key: "global" },
    {
      $set: {
        bookingDays: next.bookingDays,
        extensionRules: next.extensionRules,
        emailSettings: next.emailSettings,
        dashboardRegistry: next.dashboardRegistry,
        updatedBy: updatedBy || null,
      },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  settingsPromise = Promise.resolve(sanitizeSystemSettings(saved));
  lastLoadedAt = Date.now();

  return sanitizeSystemSettings(saved);
};

export const getDashboardRegistryMap = (settings) =>
  new Map((settings?.dashboardRegistry || []).map((dashboard) => [dashboard.key, dashboard]));

export const getRequiredExtensionApprovalLevel = (totalStayDays, settings) => {
  const caretakerLimit = Number(settings?.bookingDays?.caretakerMaxDirectBookingDays || 3);
  const coWardenLimit = Number(settings?.extensionRules?.coWardenLevelDays || 5);
  const adosaLimit = Number(settings?.extensionRules?.adosaLevelDays || 10);
  const adminLimit = Number(settings?.extensionRules?.adminLevelDays || 30);

  if (totalStayDays <= caretakerLimit) return "direct";
  if (totalStayDays <= coWardenLimit) return "co_warden";
  if (totalStayDays <= adosaLimit) return "adosa";
  if (totalStayDays <= adminLimit) return "admin";
  return "not_allowed";
};

export const getEmailConfigForTemplate = (settings, templateName) => ({
  ...DEFAULT_EMAIL_SETTING,
  ...(settings?.emailSettings?.[templateName] || {}),
});
