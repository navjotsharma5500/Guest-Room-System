import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Eye, MessageSquare, Siren, VolumeX } from "lucide-react";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL || "";

const tabs = [
  { key: "medical", label: "Medical" },
  { key: "cleaning", label: "Cleaning" },
  { key: "maintenance", label: "Maintenance" },
  { key: "sos", label: "SOS" },
  { key: "resolved", label: "Resolved" },
];

const statusLabels = {
  open: "Open",
  in_progress: "In Progress",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
  escalated: "Escalated",
  cancelled: "Cancelled",
};

const priorityClass = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700 animate-pulse",
};

export default function SupportRequestsPage({ theme = "light", onBack }) {
  const [activeTab, setActiveTab] = useState("medical");
  const [requests, setRequests] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [sirenActive, setSirenActive] = useState(false);
  const sirenRef = useRef({ context: null, intervalId: null, oscillator: null });

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tab: activeTab });
      if (search.trim()) params.set("q", search.trim());
      if (statusFilter !== "all" && activeTab !== "resolved") params.set("status", statusFilter);
      const res = await fetch(`${API}/api/guest-support/requests?${params.toString()}`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to load support requests");
      setRequests(data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search, statusFilter]);

  const loadActiveSos = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/guest-support/sos/active`, { credentials: "include" });
      const data = await res.json();
      if (res.ok) setSirenActive((data.alerts || []).some((alert) => alert.sirenActive));
    } catch (err) {
      console.warn("Failed to load active SOS alerts", err);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    loadActiveSos();
  }, [loadActiveSos]);

  useEffect(() => {
    const handler = (event) => {
      const request = event.detail;
      setRequests((prev) => [request, ...prev]);
      if (request?.requestType === "sos") setSirenActive(true);
    };
    const updatedHandler = () => {
      loadRequests();
      loadActiveSos();
    };

    window.addEventListener("newMedicalRequest", handler);
    window.addEventListener("newCleaningRequest", handler);
    window.addEventListener("newMaintenanceRequest", handler);
    window.addEventListener("newSosAlert", handler);
    window.addEventListener("supportRequestUpdated", updatedHandler);
    return () => {
      window.removeEventListener("newMedicalRequest", handler);
      window.removeEventListener("newCleaningRequest", handler);
      window.removeEventListener("newMaintenanceRequest", handler);
      window.removeEventListener("newSosAlert", handler);
      window.removeEventListener("supportRequestUpdated", updatedHandler);
    };
  }, [loadActiveSos, loadRequests]);

  useEffect(() => {
    const stopSirenTone = () => {
      if (sirenRef.current.intervalId) clearInterval(sirenRef.current.intervalId);
      if (sirenRef.current.oscillator) {
        try {
          sirenRef.current.oscillator.stop();
        } catch {}
      }
      sirenRef.current.intervalId = null;
      sirenRef.current.oscillator = null;
    };

    if (!sirenActive) {
      stopSirenTone();
      return undefined;
    }

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return undefined;
      const context = sirenRef.current.context || new AudioContext();
      sirenRef.current.context = context;
      const gain = context.createGain();
      gain.gain.value = 0.04;
      gain.connect(context.destination);

      const playPulse = () => {
        if (sirenRef.current.oscillator) {
          try {
            sirenRef.current.oscillator.stop();
          } catch {}
        }
        const oscillator = context.createOscillator();
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(620, context.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(980, context.currentTime + 0.35);
        oscillator.connect(gain);
        oscillator.start();
        oscillator.stop(context.currentTime + 0.55);
        sirenRef.current.oscillator = oscillator;
      };

      context.resume?.();
      playPulse();
      sirenRef.current.intervalId = setInterval(playPulse, 900);
    } catch (err) {
      console.warn("Siren playback requires user interaction in this browser.", err);
    }

    return stopSirenTone;
  }, [sirenActive]);

  const actionRequest = async (request, action, extraRemarks = "") => {
    const res = await fetch(`${API}/api/guest-support/requests/${request.requestType}/${request._id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, remarks: extraRemarks }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Action failed");
    if (action === "stop_siren" || action === "acknowledge_emergency" || action === "mark_resolved") {
      loadActiveSos();
    }
    loadRequests();
    if (selected?._id === request._id) setSelected(data.request);
  };

  const visibleRequests = useMemo(() => requests, [requests]);

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-slate-950 text-white" : "bg-slate-50 text-slate-900"}`}>
      <div className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Support Requests</h1>
            <p className="text-sm text-slate-500">Medical, cleaning, maintenance and SOS operations.</p>
          </div>
          <div className="flex items-center gap-2">
            {sirenActive && (
              <button
                onClick={() => setSirenActive(false)}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white font-bold animate-pulse"
              >
                <VolumeX className="w-4 h-4" />
                Stop Local Siren
              </button>
            )}
            {onBack && (
              <button onClick={onBack} className="rounded-lg border px-4 py-2 bg-white font-bold">Back</button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-wrap gap-2 mb-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-xl px-4 py-2 text-sm font-black ${
                  activeTab === tab.key ? "bg-red-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search guest, email, hostel, room, description..."
              className="w-full rounded-xl border px-4 py-2"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              disabled={activeTab === "resolved"}
              className="w-full rounded-xl border px-4 py-2 bg-white disabled:bg-slate-100"
            >
              <option value="all">All active statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
        </div>

        <div className="rounded-2xl border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  {["Request ID", "Request Type", "Guest Name", "Hostel", "Room", "Priority", "Created At", "Status", "Actions"].map((head) => (
                    <th key={head} className="px-4 py-3 text-left font-black">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {visibleRequests.map((request) => (
                  <tr key={`${request.requestType}-${request._id}`} className={request.requestType === "sos" && request.sirenActive ? "bg-red-50" : ""}>
                    <td className="px-4 py-3 font-mono text-xs">{request.requestId}</td>
                    <td className="px-4 py-3 capitalize font-bold">{request.requestType}</td>
                    <td className="px-4 py-3">{request.guestName}</td>
                    <td className="px-4 py-3">{request.hostel}</td>
                    <td className="px-4 py-3">{request.room}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs font-black ${priorityClass[request.priority] || priorityClass.medium}`}>
                        {request.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">{new Date(request.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">{statusLabels[request.status] || request.status}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => setSelected(request)} className="rounded-lg border px-2 py-1 font-bold inline-flex items-center gap-1">
                          <Eye className="w-3 h-3" /> View
                        </button>
                        {request.status !== "resolved" && (
                          <>
                            <button onClick={() => actionRequest(request, "mark_in_progress")} className="rounded-lg bg-blue-600 text-white px-2 py-1 font-bold">
                              In Progress
                            </button>
                            <button onClick={() => actionRequest(request, "mark_resolved")} className="rounded-lg bg-green-600 text-white px-2 py-1 font-bold">
                              Resolved
                            </button>
                            {request.requestType === "sos" && (
                              <>
                                <button onClick={() => actionRequest(request, "acknowledge_emergency")} className="rounded-lg bg-red-600 text-white px-2 py-1 font-bold">
                                  Acknowledge
                                </button>
                                <button onClick={() => actionRequest(request, "stop_siren")} className="rounded-lg bg-slate-800 text-white px-2 py-1 font-bold">
                                  Stop Siren
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && visibleRequests.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">No support requests found.</td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-slate-500">Loading support requests...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {selected && (
        <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b flex justify-between gap-3">
              <div>
                <h2 className="text-xl font-black text-slate-900">{selected.requestId}</h2>
                <p className="text-sm text-slate-500">{selected.hostel} • {selected.room}</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg border px-3 py-1">Close</button>
            </div>
            <div className="p-5 space-y-4">
              {selected.requestType === "sos" && selected.sirenActive && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700 font-black flex items-center gap-2">
                  <Siren className="w-5 h-5" />
                  Active SOS siren
                </div>
              )}
              <Detail label="Guest" value={`${selected.guestName} (${selected.guestEmail})`} />
              <Detail label="Contact" value={selected.contact} />
              <Detail label="Priority" value={selected.priority} />
              {selected.details?.issueType && <Detail label="Issue" value={selected.details.issueType} />}
              {selected.details?.complaintType && <Detail label="Complaint" value={selected.details.complaintType} />}
              {selected.details?.category && <Detail label="Category" value={`${selected.details.category} / ${selected.details.subcategory || "Other"}`} />}
              <Detail label="Description" value={selected.description || "No description provided."} />
              <Detail label="Status" value={statusLabels[selected.status] || selected.status} />

              {selected.status !== "resolved" && (
                <>
                  <textarea
                    value={remarks}
                    onChange={(event) => setRemarks(event.target.value)}
                    placeholder="Add remarks..."
                    rows={3}
                    className="w-full rounded-xl border px-4 py-3"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => actionRequest(selected, "add_remarks", remarks)} className="rounded-lg bg-slate-800 text-white px-3 py-2 font-bold inline-flex gap-2 items-center">
                      <MessageSquare className="w-4 h-4" /> Add Remarks
                    </button>
                    <button onClick={() => actionRequest(selected, "escalate", remarks)} className="rounded-lg bg-orange-600 text-white px-3 py-2 font-bold inline-flex gap-2 items-center">
                      <AlertTriangle className="w-4 h-4" /> Escalate
                    </button>
                    {selected.requestType === "sos" && (
                      <button onClick={() => actionRequest(selected, "stop_siren", remarks)} className="rounded-lg bg-red-600 text-white px-3 py-2 font-bold">
                        Stop Siren
                      </button>
                    )}
                  </div>
                </>
              )}

              <div>
                <h3 className="font-black text-slate-900 mb-2">History</h3>
                <div className="space-y-2">
                  {(selected.details?.history || []).map((item, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 border p-3 text-sm">
                      <p className="font-bold">{item.action}</p>
                      {item.remarks && <p className="text-slate-600">{item.remarks}</p>}
                      <p className="text-xs text-slate-400">{item.byName || "System"} • {new Date(item.at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-black">{label}</p>
      <p className="font-semibold text-slate-800">{value}</p>
    </div>
  );
}
