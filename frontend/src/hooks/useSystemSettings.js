import { useCallback, useEffect, useMemo, useState } from "react";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL || "";

export const DEFAULT_SYSTEM_SETTINGS = {
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
  emailSettings: {},
  operations: {
    enableBroadcastCenter: true,
    enableCleaningWorkflow: true,
    enableGuestSupportPortal: true,
    enableHostelRatings: true,
    enableGuestFlagging: true,
  },
  flagRules: {
    yellowThreshold: 3,
    orangeThreshold: 2,
    redThreshold: 1,
  },
  cleaning: {
    enableCleaningChecklist: true,
    enableCleaningRequests: true,
  },
  support: {
    enableMedicalRequests: true,
    enableMaintenanceRequests: true,
    enableSosAlerts: true,
  },
  dashboardRegistry: [
    {
      key: "guestRoom",
      label: "Guest Room Booking",
      path: "/dashboard",
      active: true,
      description: "Guest room operations, bookings and approvals",
    },
    {
      key: "venue",
      label: "Venue Booking",
      path: "/venue-booking",
      active: true,
      description: "Venue booking operations and event management",
    },
    {
      key: "night",
      label: "Night Pass",
      path: "/night-dashboard",
      active: false,
      description: "Night pass operations",
    },
  ],
};

const mergeSettings = (settings = {}) => ({
  ...DEFAULT_SYSTEM_SETTINGS,
  ...settings,
  bookingDays: {
    ...DEFAULT_SYSTEM_SETTINGS.bookingDays,
    ...(settings.bookingDays || {}),
  },
  extensionRules: {
    ...DEFAULT_SYSTEM_SETTINGS.extensionRules,
    ...(settings.extensionRules || {}),
  },
  emailSettings: {
    ...DEFAULT_SYSTEM_SETTINGS.emailSettings,
    ...(settings.emailSettings || {}),
  },
  operations: {
    ...DEFAULT_SYSTEM_SETTINGS.operations,
    ...(settings.operations || {}),
  },
  flagRules: {
    ...DEFAULT_SYSTEM_SETTINGS.flagRules,
    ...(settings.flagRules || {}),
  },
  cleaning: {
    ...DEFAULT_SYSTEM_SETTINGS.cleaning,
    ...(settings.cleaning || {}),
  },
  support: {
    ...DEFAULT_SYSTEM_SETTINGS.support,
    ...(settings.support || {}),
  },
  dashboardRegistry:
    Array.isArray(settings.dashboardRegistry) && settings.dashboardRegistry.length > 0
      ? settings.dashboardRegistry
      : DEFAULT_SYSTEM_SETTINGS.dashboardRegistry,
});

export default function useSystemSettings({ admin = false, immediate = true } = {}) {
  const [settings, setSettings] = useState(DEFAULT_SYSTEM_SETTINGS);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState("");

  const endpoint = admin
    ? `${API}/api/system-settings`
    : `${API}/api/system-settings/public`;

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(endpoint, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to load system settings");
      }
      setSettings(mergeSettings(data.settings || {}));
      return data.settings;
    } catch (err) {
      setError(err.message || "Failed to load system settings");
      setSettings((prev) => mergeSettings(prev));
      return null;
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (!immediate) return;
    fetchSettings();
  }, [fetchSettings, immediate]);

  const updateSettings = useCallback(
    async (payload) => {
      const response = await fetch(`${API}/api/system-settings`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Failed to update system settings");
      }
      const merged = mergeSettings(data.settings || {});
      setSettings(merged);
      return merged;
    },
    []
  );

  return useMemo(
    () => ({
      settings,
      loading,
      error,
      fetchSettings,
      updateSettings,
      dashboardRegistry: settings.dashboardRegistry || [],
    }),
    [settings, loading, error, fetchSettings, updateSettings]
  );
}
