import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [source, setSource] = useState("loading");
  const mountedRef = useRef(false);
  const requestGenerationRef = useRef(0);
  const activeRequestRef = useRef(null);

  const applyConfig = useCallback((payload) => {
    const normalized = normalizeVenueConfig(readTabs(payload));
    setVenueConfig(normalized);
    return normalized;
  }, []);

  const refresh = useCallback(async () => {
    const generation = ++requestGenerationRef.current;
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;

    try {
      if (mountedRef.current) setLoading(true);
      const response = await fetch(`${API}/api/venue-config`, {
        credentials: "include",
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch venue config: ${response.status}`);
      }

      const data = await response.json();
      if (!mountedRef.current || generation !== requestGenerationRef.current) return;
      applyConfig(data);
      setError(null);
      setSource("dynamic");
    } catch (err) {
      if (err?.name === "AbortError" || !mountedRef.current || generation !== requestGenerationRef.current) {
        return;
      }
      console.warn("Falling back to static venue config:", err);
      applyConfig(venueRoomsConfig);
      setError(err.message || "Failed to fetch venue config");
      setSource("fallback");
    } finally {
      if (mountedRef.current && generation === requestGenerationRef.current) {
        setLoading(false);
        if (activeRequestRef.current === controller) activeRequestRef.current = null;
      }
    }
  }, [applyConfig]);

  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
      requestGenerationRef.current += 1;
      activeRequestRef.current?.abort();
    };
  }, [refresh]);

  useEffect(() => {
    const handleVenueConfigUpdated = (event) => {
      if (event?.detail?.mainTabs) {
        requestGenerationRef.current += 1;
        activeRequestRef.current?.abort();
        applyConfig(event.detail.mainTabs);
        setError(null);
        setSource("dynamic");
        setLoading(false);
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

      requestGenerationRef.current += 1;
      activeRequestRef.current?.abort();
      if (!mountedRef.current) return normalizeVenueConfig(readTabs(data));
      const normalized = applyConfig(data);
      setError(null);
      setSource("dynamic");
      setLoading(false);
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
    (mainTabId, sectionId, name) =>
      mutateConfig("/room", {
        method: "POST",
        body: JSON.stringify({ mainTabId, sectionId, name }),
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

  const renameTab = useCallback(
    (mainTabId, label) =>
      mutateConfig("/tab", {
        method: "PATCH",
        body: JSON.stringify({ mainTabId, label }),
      }),
    [mutateConfig]
  );

  const renameSection = useCallback(
    (mainTabId, sectionId, label) =>
      mutateConfig("/section", {
        method: "PATCH",
        body: JSON.stringify({ mainTabId, sectionId, label }),
      }),
    [mutateConfig]
  );

  const renameRoom = useCallback(
    (mainTabId, sectionId, roomId, name) =>
      mutateConfig("/room", {
        method: "PATCH",
        body: JSON.stringify({ mainTabId, sectionId, roomId, name }),
      }),
    [mutateConfig]
  );

  const reorderRooms = useCallback(
    (mainTabId, sectionId, roomIds) =>
      mutateConfig("/room-order", {
        method: "PATCH",
        body: JSON.stringify({ mainTabId, sectionId, roomIds }),
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
    loaded: !loading,
    source,
    isDynamic: source === "dynamic",
    error,
    refresh,
    addTab,
    addSection,
    addRoom,
    toggleItem,
    renameTab,
    renameSection,
    renameRoom,
    reorderRooms,
  };
}
