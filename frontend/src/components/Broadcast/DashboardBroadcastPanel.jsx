import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell, Megaphone, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BroadcastNoticeModal from "./BroadcastNoticeModal";

const storageKey = (user, noticeId) => {
  const email = user?.email || user?.user?.email || "guest";
  return `broadcastNoticeOpened:${email}:${noticeId}`;
};

const labelize = (value = "") =>
  String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function DashboardBroadcastPanel({ currentUser, theme = "light" }) {
  const navigate = useNavigate();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [popupNotice, setPopupNotice] = useState(null);
  const [serviceRequestCount, setServiceRequestCount] = useState(0);
  const [serviceRequests, setServiceRequests] = useState([]);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/broadcasts/notices/me", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load notices");
      setNotices(data.notices || []);
    } catch (err) {
      console.error("Broadcast notices load failed:", err);
      setNotices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadServiceRequestCount = useCallback(async () => {
    try {
      const tabs = ["medical", "cleaning", "maintenance", "sos"];
      const results = await Promise.all(
        tabs.map(async (tab) => {
          const res = await fetch(`/api/guest-support/requests?tab=${tab}`, { credentials: "include" });
          const data = await res.json();
          if (!res.ok) return [];
          return Array.isArray(data.requests) ? data.requests : [];
        })
      );
      const merged = results
        .flat()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setServiceRequests(merged);
      setServiceRequestCount(merged.length);
    } catch (err) {
      console.error("Service request count load failed:", err);
      setServiceRequestCount(0);
      setServiceRequests([]);
    }
  }, []);

  useEffect(() => {
    loadNotices();
    loadServiceRequestCount();
  }, [loadNotices, loadServiceRequestCount]);

  useEffect(() => {
    const handleBroadcastSent = () => loadNotices();
    const handleSupportUpdate = () => loadServiceRequestCount();
    window.addEventListener("broadcastSent", handleBroadcastSent);
    window.addEventListener("guestSupportRequest", handleSupportUpdate);
    window.addEventListener("newMedicalRequest", handleSupportUpdate);
    window.addEventListener("newCleaningRequest", handleSupportUpdate);
    window.addEventListener("newMaintenanceRequest", handleSupportUpdate);
    window.addEventListener("newSosAlert", handleSupportUpdate);
    window.addEventListener("supportRequestUpdated", handleSupportUpdate);
    return () => {
      window.removeEventListener("broadcastSent", handleBroadcastSent);
      window.removeEventListener("guestSupportRequest", handleSupportUpdate);
      window.removeEventListener("newMedicalRequest", handleSupportUpdate);
      window.removeEventListener("newCleaningRequest", handleSupportUpdate);
      window.removeEventListener("newMaintenanceRequest", handleSupportUpdate);
      window.removeEventListener("newSosAlert", handleSupportUpdate);
      window.removeEventListener("supportRequestUpdated", handleSupportUpdate);
    };
  }, [loadNotices, loadServiceRequestCount]);

  const unreadPopup = useMemo(
    () => notices.find((notice) => !localStorage.getItem(storageKey(currentUser, notice._id))),
    [notices, currentUser]
  );

  useEffect(() => {
    if (unreadPopup && !popupNotice && !selectedNotice) {
      setPopupNotice(unreadPopup);
    }
  }, [unreadPopup, popupNotice, selectedNotice]);

  const openNotice = (notice) => {
    localStorage.setItem(storageKey(currentUser, notice._id), "true");
    setPopupNotice(null);
    setSelectedNotice(notice);
  };

  const dismissPopup = () => {
    if (popupNotice?._id) {
      localStorage.setItem(storageKey(currentUser, popupNotice._id), "true");
    }
    setPopupNotice(null);
  };

  const visibleNotices = notices.slice(0, 4);
  const topServiceRequests = serviceRequests.slice(0, 3);
  const openSupportRequests = () => navigate("/support-requests");

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <section className={`rounded-2xl shadow-md border overflow-hidden ${
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                <Megaphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-black text-lg ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                  Broadcast Notices
                </h3>
                <p className="text-xs text-slate-500">General and emergency updates</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-cyan-50 text-cyan-700 text-xs font-black">
              {notices.length}
            </span>
          </div>

          <div className="p-4 space-y-3 min-h-[220px]">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading notices...</div>
            ) : visibleNotices.length > 0 ? (
              visibleNotices.map((notice) => {
                const isEmergency = notice.messageType === "emergency";
                return (
                  <button
                    key={notice._id}
                    onClick={() => openNotice(notice)}
                    className={`w-full text-left rounded-2xl border p-4 transition hover:shadow-md ${
                      isEmergency
                        ? "bg-red-50 border-red-100 hover:bg-red-100"
                        : "bg-cyan-50 border-cyan-100 hover:bg-cyan-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Bell className={`w-4 h-4 ${isEmergency ? "text-red-600" : "text-cyan-700"}`} />
                          <span className={`text-xs font-black ${isEmergency ? "text-red-700" : "text-cyan-700"}`}>
                            {labelize(notice.messageType)}
                          </span>
                        </div>
                        <h4 className="font-black text-slate-900 truncate mt-1">{notice.title}</h4>
                        <p className="text-xs text-slate-600 mt-1">
                          Valid till {notice.noticeEndAt ? new Date(notice.noticeEndAt).toLocaleDateString() : "-"}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-blue-700">Open</span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center py-12 text-slate-500">
                <Megaphone className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="font-semibold">No active broadcast notices</p>
              </div>
            )}
          </div>
        </section>

        <section className={`rounded-2xl shadow-md border overflow-hidden ${
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <div className="px-5 py-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <h3 className={`font-black text-lg ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                  Service Requests
                </h3>
                <p className="text-xs text-slate-500">Maintenance and Medical Request</p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-black">
              {serviceRequestCount}
            </span>
          </div>
          <div className="p-4 min-h-[220px]">
            {topServiceRequests.length > 0 ? (
              <div className="space-y-3">
                {topServiceRequests.map((request) => (
                  <button
                    key={`${request.requestType}-${request._id}`}
                    onClick={openSupportRequests}
                    className="w-full text-left rounded-2xl border border-amber-100 bg-amber-50 p-4 transition hover:bg-amber-100 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-amber-700" />
                          <span className="text-xs font-black uppercase text-amber-700">
                            {labelize(request.requestType)}
                          </span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600">
                            {labelize(request.status)}
                          </span>
                        </div>
                        <h4 className="mt-1 truncate font-black text-slate-900">
                          {request.guestName || "Guest"} · {request.room || "Room"}
                        </h4>
                        <p className="mt-1 truncate text-xs text-slate-600">
                          {request.hostel || "Hostel"} · {request.description || "No description provided"}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-blue-700">Open</span>
                    </div>
                  </button>
                ))}
                <button onClick={openSupportRequests} className="w-full rounded-xl border px-3 py-2 text-sm font-bold text-amber-700 hover:bg-amber-50">
                  View all service requests
                </button>
              </div>
            ) : (
              <button onClick={openSupportRequests} className="flex min-h-[190px] w-full items-center justify-center text-center text-slate-500">
                <div>
                  <Wrench className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                  <p className="font-semibold">No active service requests</p>
                </div>
              </button>
            )}
          </div>
        </section>
      </div>

      {popupNotice && (
        <BroadcastNoticeModal
          notice={popupNotice}
          mode="preview"
          onOpen={() => openNotice(popupNotice)}
          onClose={dismissPopup}
        />
      )}

      {selectedNotice && (
        <BroadcastNoticeModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      )}
    </>
  );
}
