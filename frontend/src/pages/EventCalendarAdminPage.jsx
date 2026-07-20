import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, Edit3, LogOut, RefreshCw, Search, ShieldAlert, Trash2, X } from "lucide-react";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;

const sourceLabel = {
  "venue-booking": "Venue Booking",
  "student-calendar": "Student Calendar",
  "institute-calendar": "Institute Calendar",
};

const adminEventKey = (event) =>
  event?.unifiedId || event?._id || event?.id || `${event?.sourceType || "event"}-${event?.eventName}-${event?.eventDate}-${event?.eventTime}`;

export default function EventCalendarAdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [sources, setSources] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [search, setSearch] = useState("");
  const [sourceType, setSourceType] = useState("");
  const [error, setError] = useState("");
  const [conflicts, setConflicts] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(pagination.page || 1), limit: "50" });
    if (search.trim()) params.set("search", search.trim());
    if (sourceType) params.set("sourceType", sourceType);
    return params.toString();
  }, [pagination.page, search, sourceType]);

  const conflictEventIds = useMemo(() => {
    const ids = new Set();
    conflicts.forEach((conflict) => {
      ids.add(adminEventKey(conflict.firstEvent));
      ids.add(adminEventKey(conflict.secondEvent));
    });
    return ids;
  }, [conflicts]);

  const checkSession = async () => {
    try {
      const response = await fetch(`${API}/api/event-calendar/admin/session`, { credentials: "include" });
      setAuthenticated(response.ok);
    } finally {
      setLoading(false);
    }
  };

  const loadEvents = useCallback(async () => {
    if (!authenticated) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API}/api/event-calendar/admin/events?${query}`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to load events");
      setEvents(data.events || []);
      setSources(data.sources || null);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [authenticated, query]);

  const loadConflicts = useCallback(async () => {
    try {
      const response = await fetch(`${API}/api/event-calendar/admin/conflicts`, { credentials: "include" });
      const data = await response.json();
      if (response.ok) setConflicts(data.conflicts || []);
    } catch {
      setConflicts([]);
    }
  }, []);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    loadEvents();
    loadConflicts();
  }, [authenticated, query, loadEvents, loadConflicts]);

  const login = async (event) => {
    event.preventDefault();
    setError("");
    const response = await fetch(`${API}/api/event-calendar/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.message || "Invalid password");
      return;
    }
    setAuthenticated(true);
    setPassword("");
  };

  const logout = async () => {
    await fetch(`${API}/api/event-calendar/admin/logout`, { method: "POST", credentials: "include" });
    setAuthenticated(false);
  };

  const openEdit = (eventRecord) => {
    setEditingEvent(eventRecord);
    setEditForm({
      eventName: eventRecord.eventName || "",
      societyName: eventRecord.societyName || "",
      eventDate: eventRecord.eventDate || "",
      eventEndDate: eventRecord.eventEndDate || eventRecord.eventDate || "",
      eventTime: eventRecord.eventTime || "",
      checkOutTime: eventRecord.checkOutTime || "",
      hall: eventRecord.eventHall?.hall || "",
      roomNo: eventRecord.eventHall?.roomNo || "",
      description: eventRecord.description || eventRecord.purpose || "",
    });
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editingEvent) return;
    setSavingEdit(true);
    setError("");

    const payload = {
      eventName: editForm.eventName,
      societyName: editForm.societyName,
      eventDate: editForm.eventDate,
      eventEndDate: editForm.eventEndDate,
      eventTime: editForm.eventTime,
      checkOutTime: editForm.checkOutTime,
      eventHall: {
        hall: editForm.hall,
        roomNo: editForm.roomNo,
      },
      description: editForm.description,
    };

    try {
      const response = await fetch(`${API}/api/event-calendar/admin/events/${encodeURIComponent(editingEvent.unifiedId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Update failed");
      setEditingEvent(null);
      setEditForm({});
      loadEvents();
      loadConflicts();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  };

  const deleteEvent = async (eventRecord) => {
    const confirmed = window.confirm(
      `This will affect the original source.\n\nEvent: ${eventRecord.eventName}\nSource: ${sourceLabel[eventRecord.sourceType] || eventRecord.sourceType}\nDate: ${eventRecord.eventDate}`
    );
    if (!confirmed) return;
    const response = await fetch(`${API}/api/event-calendar/admin/events/${encodeURIComponent(eventRecord.unifiedId)}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.message || "Delete failed");
      return;
    }
    loadEvents();
    loadConflicts();
  };

  if (loading && !authenticated) {
    return <div className="min-h-screen grid place-items-center text-slate-500">Loading Event Calendar Admin...</div>;
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-100 grid place-items-center px-4">
        <form onSubmit={login} className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-5">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 grid place-items-center">
              <Calendar size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">Event Calendar Admin</h1>
              <p className="text-sm text-slate-500">Password protected event calendar portal</p>
            </div>
          </div>
          {error && <p className="rounded-xl bg-red-50 text-red-700 px-4 py-3 text-sm">{error}</p>}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter admin password"
            required
          />
          <button className="w-full rounded-2xl bg-blue-600 text-white font-bold py-3 hover:bg-blue-700">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Event Calendar Admin</h1>
            <p className="text-sm text-slate-500">Combined Venue, Student and Institute calendar records</p>
          </div>
          <div className="flex gap-2">
            <button onClick={loadEvents} className="px-4 py-2 rounded-xl border bg-white flex items-center gap-2">
              <RefreshCw size={16} /> Refresh
            </button>
            <button onClick={logout} className="px-4 py-2 rounded-xl bg-red-600 text-white flex items-center gap-2">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {["venue", "student", "institute"].map((key) => (
            <div key={key} className="rounded-2xl bg-white border border-slate-200 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">{key}</p>
              <p className="text-2xl font-black text-slate-900">{sources?.[key]?.count ?? 0}</p>
              <p className={sources?.[key]?.available === false ? "text-red-600 text-sm" : "text-green-600 text-sm"}>
                {sources?.[key]?.available === false ? "Unavailable" : "Available"}
              </p>
            </div>
          ))}
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-bold">Conflicts</p>
            <p className="text-2xl font-black text-slate-900">{conflicts.length}</p>
            <p className="text-sm text-slate-500">Detected overlaps</p>
          </div>
        </div>

        {error && <div className="rounded-2xl bg-red-50 border border-red-100 text-red-700 p-4">{error}</div>}

        <div className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col md:flex-row gap-3">
          <label className="flex-1 flex items-center gap-2 border border-slate-200 rounded-xl px-3">
            <Search size={16} className="text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setPagination((prev) => ({ ...prev, page: 1 }));
                setSearch(event.target.value);
              }}
              className="w-full py-2 outline-none"
              placeholder="Search event, society, venue..."
            />
          </label>
          <select
            value={sourceType}
            onChange={(event) => {
              setPagination((prev) => ({ ...prev, page: 1 }));
              setSourceType(event.target.value);
            }}
            className="border border-slate-200 rounded-xl px-3 py-2"
          >
            <option value="">All Sources</option>
            <option value="venue-booking">Venue Booking</option>
            <option value="student-calendar">Student Calendar</option>
            <option value="institute-calendar">Institute Calendar</option>
          </select>
        </div>

        {conflicts.length > 0 && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-center gap-2 font-bold text-amber-800 mb-2">
              <ShieldAlert size={18} /> Conflict Review
            </div>
            <div className="space-y-2">
              {conflicts.slice(0, 5).map((conflict) => (
                <div key={conflict.conflictId} className="bg-white/70 rounded-xl p-3 text-sm text-amber-900">
                  {conflict.firstEvent.eventName} conflicts with {conflict.secondEvent.eventName}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3">Event</th>
                  <th className="text-left px-4 py-3">Source</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Venue</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((eventRecord) => {
                  const hasConflict = conflictEventIds.has(adminEventKey(eventRecord));
                  return (
                  <tr key={eventRecord.unifiedId} className={`border-t border-slate-100 hover:bg-slate-50 ${hasConflict ? "bg-amber-50/70" : ""}`}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        {eventRecord.eventName}
                        {hasConflict && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[11px] font-bold">
                            <ShieldAlert size={12} /> Conflict
                          </span>
                        )}
                      </p>
                      <p className="text-slate-500">{eventRecord.societyName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-bold">
                        {sourceLabel[eventRecord.sourceType] || eventRecord.sourceType}
                      </span>
                    </td>
                    <td className="px-4 py-3">{eventRecord.eventDate} {eventRecord.eventTime}</td>
                    <td className="px-4 py-3">{eventRecord.eventHall?.roomNo || eventRecord.eventHall?.hall || "-"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(eventRecord)} className="text-blue-600 hover:bg-blue-50 rounded-lg p-2 mr-1">
                        <Edit3 size={16} />
                      </button>
                      {eventRecord.deletable !== false && (
                        <button onClick={() => deleteEvent(eventRecord)} className="text-red-600 hover:bg-red-50 rounded-lg p-2">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
                })}
                {events.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-4 py-10 text-center text-slate-500">No events found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.totalPages} · {pagination.total} records</p>
            <div className="flex gap-2">
              <button
                disabled={!pagination.hasPreviousPage}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="px-3 py-2 rounded-lg border disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={!pagination.hasNextPage}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="px-3 py-2 rounded-lg border disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {editingEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm grid place-items-center p-4">
          <form onSubmit={saveEdit} className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Edit Calendar Event</h2>
                <p className="text-sm text-slate-500">{sourceLabel[editingEvent.sourceType] || editingEvent.sourceType}</p>
              </div>
              <button type="button" onClick={() => setEditingEvent(null)} className="p-2 rounded-xl hover:bg-slate-100">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Event Name</span>
                <input value={editForm.eventName} onChange={(e) => setEditForm((p) => ({ ...p, eventName: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Society / Source</span>
                <input value={editForm.societyName} onChange={(e) => setEditForm((p) => ({ ...p, societyName: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Start Date</span>
                <input type="date" value={editForm.eventDate} onChange={(e) => setEditForm((p) => ({ ...p, eventDate: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">End Date</span>
                <input type="date" value={editForm.eventEndDate} onChange={(e) => setEditForm((p) => ({ ...p, eventEndDate: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Start Time</span>
                <input value={editForm.eventTime} onChange={(e) => setEditForm((p) => ({ ...p, eventTime: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="10:00 AM" />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">End Time</span>
                <input value={editForm.checkOutTime} onChange={(e) => setEditForm((p) => ({ ...p, checkOutTime: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" placeholder="12:00 PM" />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Hall</span>
                <input value={editForm.hall} onChange={(e) => setEditForm((p) => ({ ...p, hall: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="space-y-1">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Room / Venue</span>
                <input value={editForm.roomNo} onChange={(e) => setEditForm((p) => ({ ...p, roomNo: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2" />
              </label>
              <label className="space-y-1 md:col-span-2">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold">Description</span>
                <textarea value={editForm.description} onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2 min-h-[110px]" />
              </label>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
              <button type="button" onClick={() => setEditingEvent(null)} className="px-4 py-2 rounded-xl border border-slate-200">
                Cancel
              </button>
              <button disabled={savingEdit} className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-60">
                {savingEdit ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
