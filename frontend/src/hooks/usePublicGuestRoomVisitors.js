import { useCallback, useEffect, useState } from "react";
import { BACKEND_URL } from "../utils/apiConfig";

const VISITOR_ID_KEY = "guestRoomPublicVisitorId";

const createVisitorId = () => {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
};

const getVisitorId = () => {
  try {
    const existing = localStorage.getItem(VISITOR_ID_KEY);
    if (existing) return existing;
    const next = createVisitorId();
    localStorage.setItem(VISITOR_ID_KEY, next);
    return next;
  } catch {
    return createVisitorId();
  }
};

export default function usePublicGuestRoomVisitors({ recordVisit = false, fetchCount = true } = {}) {
  const [stats, setStats] = useState({ totalVisitors: 0, todayVisitors: 0 });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const res = await fetch(`${BACKEND_URL}/api/public/guest-room/visitor-count`, {
      credentials: "include",
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Unable to load visitor count");
    setStats({
      totalVisitors: Number(data.totalVisitors || 0),
      todayVisitors: Number(data.todayVisitors || 0),
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        if (recordVisit) {
          const visitorId = getVisitorId();
          const res = await fetch(`${BACKEND_URL}/api/public/guest-room/visit`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Unable to record visit");
          if (mounted && fetchCount) {
            setStats({
              totalVisitors: Number(data.totalVisitors || 0),
              todayVisitors: Number(data.todayVisitors || 0),
            });
          }
        } else if (fetchCount) {
          await fetchStats();
        }
      } catch (err) {
        console.warn("Guest room visitor counter unavailable:", err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [fetchStats, fetchCount, recordVisit]);

  return { ...stats, loading, refresh: fetchStats };
}
