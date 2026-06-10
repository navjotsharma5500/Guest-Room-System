import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Filter, Megaphone, Plus, Search } from "lucide-react";
import BroadcastAnalyticsCards from "../components/Broadcast/BroadcastAnalyticsCards";
import BroadcastComposerModal from "../components/Broadcast/BroadcastComposerModal";
import BroadcastDetailsModal from "../components/Broadcast/BroadcastDetailsModal";
import BroadcastHistoryTable from "../components/Broadcast/BroadcastHistoryTable";
import { useToast } from "../context/ToastContext";

const allowedRoles = ["admin", "manager", "adosa"];

const messageTypes = [
  ["all", "All Types"],
  ["general", "General"],
  ["emergency", "Emergency"],
  ["checkout_reminder", "Checkout Reminder"],
  ["payment_reminder", "Payment Reminder"],
  ["maintenance_alert", "Maintenance Alert"],
  ["defaulter_reminder", "Defaulter Reminder"],
  ["extension_reminder", "Extension Reminder"],
];

const statuses = [
  ["all", "All Statuses"],
  ["draft", "Draft"],
  ["scheduled", "Scheduled"],
  ["sent", "Sent"],
  ["failed", "Failed"],
  ["cancelled", "Cancelled"],
];

export default function BroadcastPage({ currentUser, onBack }) {
  const { showToast } = useToast();
  const [messages, setMessages] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [filters, setFilters] = useState({ q: "", status: "all", type: "all" });

  const role = String(currentUser?.role || currentUser?.user?.role || "").toLowerCase();
  const canAccess = allowedRoles.includes(role);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.q.trim()) params.set("q", filters.q.trim());
    if (filters.status !== "all") params.set("status", filters.status);
    if (filters.type !== "all") params.set("type", filters.type);
    return params.toString();
  }, [filters]);

  const loadData = useCallback(async () => {
    if (!canAccess) return;
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch(`/api/broadcasts${query ? `?${query}` : ""}`, { credentials: "include" }),
        fetch("/api/broadcasts/stats", { credentials: "include" }),
      ]);
      const [listData, statsData] = await Promise.all([listRes.json(), statsRes.json()]);
      if (!listRes.ok) throw new Error(listData.message || "Failed to load broadcasts");
      if (!statsRes.ok) throw new Error(statsData.message || "Failed to load broadcast stats");
      setMessages(listData.messages || []);
      setStats(statsData.stats || null);
    } catch (err) {
      showToast?.(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [canAccess, query, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleBroadcastSent = () => {
      loadData();
    };
    window.addEventListener("broadcastSent", handleBroadcastSent);
    return () => window.removeEventListener("broadcastSent", handleBroadcastSent);
  }, [loadData]);

  const handleSendNow = async (message) => {
    if (!window.confirm(`Send "${message.title}" now?`)) return;
    try {
      const res = await fetch(`/api/broadcasts/${message._id}/send`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send broadcast");
      showToast?.("Broadcast sent.", "success");
      loadData();
    } catch (err) {
      showToast?.(err.message, "error");
    }
  };

  const handleCancel = async (message) => {
    if (!window.confirm(`Cancel scheduled broadcast "${message.title}"?`)) return;
    try {
      const res = await fetch(`/api/broadcasts/${message._id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to cancel broadcast");
      showToast?.("Scheduled broadcast cancelled.", "success");
      loadData();
    } catch (err) {
      showToast?.(err.message, "error");
    }
  };

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-red-600 font-bold mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="max-w-xl mx-auto mt-24 bg-white border rounded-3xl p-10 text-center shadow-sm">
          <Megaphone className="w-12 h-12 mx-auto text-slate-400 mb-4" />
          <h1 className="text-2xl font-black text-slate-900">Access Restricted</h1>
          <p className="text-slate-500 mt-2">Broadcast Center is available only to Admin, Manager, and DoSA roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="sticky top-0 z-20 bg-white/85 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="w-10 h-10 rounded-full border bg-white hover:bg-slate-50 flex items-center justify-center text-red-600"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900">Broadcast Center</h1>
                    <p className="text-sm text-slate-500">Operational messaging across hostels</p>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setComposerOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Broadcast
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <BroadcastAnalyticsCards stats={stats} />

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_220px] gap-3">
            <label className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={filters.q}
                onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
                placeholder="Search title, subject, or content..."
                className="w-full border rounded-xl pl-11 pr-4 py-3"
              />
            </label>
            <label className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <select
                value={filters.type}
                onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
                className="w-full border rounded-xl pl-11 pr-4 py-3"
              >
                {messageTypes.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
              className="w-full border rounded-xl px-4 py-3"
            >
              {statuses.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>

        <BroadcastHistoryTable
          messages={messages}
          loading={loading}
          onView={setSelectedMessage}
          onSendNow={handleSendNow}
          onCancel={handleCancel}
        />
      </main>

      {composerOpen && (
        <BroadcastComposerModal
          onClose={() => setComposerOpen(false)}
          onSaved={(message) => {
            setComposerOpen(false);
            showToast?.(message, "success");
            loadData();
          }}
        />
      )}

      {selectedMessage && (
        <BroadcastDetailsModal
          message={selectedMessage}
          onClose={() => setSelectedMessage(null)}
        />
      )}
    </div>
  );
}
