import { useCallback, useEffect, useMemo, useState } from "react";
import { BACKEND_URL } from "../utils/apiConfig";
import {
  getEnabledVenueRoomsConfig,
  normalizeVenueConfig,
  venueRoomsConfig,
} from "../config/venueRoomsConfig";

const API = BACKEND_URL;
const VENUE_CONFIG_UPDATED_EVENT = "venue-config-updated";

const readTabs = (payload) => {
  if (Array.isArray(payload?.mainTabs)) return payload.mainTabs;
  if (Array.isArray(payload)) return payload;
  return venueRoomsConfig;
};

export default function useVenueConfig() {
  const [venueConfig, setVenueConfig] = useState(venueRoomsConfig);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const applyConfig = useCallback((payload) => {
    const normalized = normalizeVenueConfig(readTabs(payload));
    setVenueConfig(normalized);
    return normalized;
  }, []);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API}/api/venue-config`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch venue config: ${response.status}`);
      }

      const data = await response.json();
      applyConfig(data);
      setError(null);
    } catch (err) {
      console.warn("Falling back to static venue config:", err);
      applyConfig(venueRoomsConfig);
      setError(err.message || "Failed to fetch venue config");
    } finally {
      setLoading(false);
    }
  }, [applyConfig]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleVenueConfigUpdated = (event) => {
      if (event?.detail?.mainTabs) {
        applyConfig(event.detail.mainTabs);
        return;
      }
      refresh();
    };

    window.addEventListener(VENUE_CONFIG_UPDATED_EVENT, handleVenueConfigUpdated);
    return () => {
      window.removeEventListener(VENUE_CONFIG_UPDATED_EVENT, handleVenueConfigUpdated);
    };
  }, [applyConfig, refresh]);

  const mutateConfig = useCallback(
    async (path, options) => {
      const response = await fetch(`${API}/api/venue-config${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        ...options,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || "Venue config update failed");
      }

      const normalized = applyConfig(data);
      window.dispatchEvent(
        new CustomEvent(VENUE_CONFIG_UPDATED_EVENT, {
          detail: { mainTabs: normalized },
        })
      );
      return normalized;
    },
    [applyConfig]
  );

  const addTab = useCallback(
    (label) =>
      mutateConfig("/tab", {
        method: "POST",
        body: JSON.stringify({ label }),
      }),
    [mutateConfig]
  );

  const addSection = useCallback(
    (mainTabId, label) =>
      mutateConfig("/section", {
        method: "POST",
        body: JSON.stringify({ mainTabId, label }),
      }),
    [mutateConfig]
  );

  const addRoom = useCallback(
    (sectionId, name) =>
      mutateConfig("/room", {
        method: "POST",
        body: JSON.stringify({ sectionId, name }),
      }),
    [mutateConfig]
  );

  const toggleItem = useCallback(
    (payload) =>
      mutateConfig("/toggle", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    [mutateConfig]
  );

  const enabledVenueConfig = useMemo(
    () => getEnabledVenueRoomsConfig(venueConfig),
    [venueConfig]
  );

  return {
    venueConfig,
    enabledVenueConfig,
    loading,
    error,
    refresh,
    addTab,
    addSection,
    addRoom,
    toggleItem,
  };
}
