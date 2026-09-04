import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock3, Filter, Search, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API } from "../../utils/api";

export const formatAuditTimeIST = (value) => value
  ? new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
    }).format(new Date(value)).replace(",", "") + " IST"
  : "—";

export const filterTimeToUtc = (date, time, end = false) =>
  new Date(`${date}T${time}:${end ? "59.999" : "00.000"}+05:30`).toISOString();

const tabs = [
  ["AUDIT", "Activity Logs"], ["REQUEST_TRACE", "Request Trace"], ["CRON_JOB", "System / Cron Jobs"],
];
const emptyFilters = { search: "", dateFrom: "", dateTo: "", timeFrom: "00:00", timeTo: "23:59", source: "", module: "", action: "", user: "", role: "", bookingId: "", guest: "", hostel: "", room: "", result: "", requestId: "" };

const stateText = (value) => value && Object.entries(value).filter(([, item]) => item != null).map(([key, item]) => `${key}: ${item}`).join(" · ");

export default function AuditActivityPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [kind, setKind] = useState("AUDIT");
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, bookingId: searchParams.get("bookingId") || "" }));
  const [applied, setApplied] = useState(filters);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeline, setTimeline] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ kind, page: String(page), limit: "25" });
      Object.entries(applied).forEach(([key, value]) => {
        if (!value || ["timeFrom", "timeTo"].includes(key)) return;
        if (["dateFrom", "dateTo"].includes(key)) {
          const time = key === "dateFrom" ? applied.timeFrom : applied.timeTo;
          params.set(key, filterTimeToUtc(value, time, key === "dateTo"));
        } else params.set(key, value);
      });
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/api/admin/audit-logs?${params}`, { credentials: "include", headers: token ? { Authorization: `Bearer ${token}` } : {} });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load audit logs");
      setLogs(data.logs || []); setPagination(data.pagination || { page, pages: 1, total: 0 });
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [applied, kind]);

  useEffect(() => { load(1); }, [load]);
  const set = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  const target = (log) => log.bookingId || log.entityId || [log.hostel, log.roomNo].filter(Boolean).join(" / ") || "—";
  const label = (text) => String(text || "Unknown").replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
  const detailRows = useMemo(() => selected ? [
    ["Time", formatAuditTimeIST(selected.timestamp)], ["Source", selected.source], ["Module", label(selected.module)],
    ["User", selected.userEmail || selected.userName || "Legacy / Unknown"], ["Role", selected.userRole || "Legacy / Unknown"],
    ["Action", selected.action], ["Function", selected.functionName], ["API", [selected.method, selected.route].filter(Boolean).join(" ")],
    ["Booking", selected.bookingId], ["Guest", [selected.guestName, selected.guestEmail, selected.guestContact].filter(Boolean).join(" · ")],
    ["Hostel", selected.hostel], ["Room", selected.roomNo], ["Previous State", stateText(selected.previousState)],
    ["New State", stateText(selected.newState)], ["Remarks", selected.remarks], ["Request ID", selected.requestId],
    ["IP", selected.ipAddress], ["Browser", selected.userAgent], ["HTTP Status", selected.httpStatus],
    ["Duration", selected.durationMs != null ? `${selected.durationMs} ms` : null], ["Result", selected.result], ["Error", selected.error],
  ].filter(([, value]) => value != null && value !== "") : [], [selected]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-white px-4 py-3 shadow-sm">
        <button aria-label="Back" onClick={() => navigate("/dashboard")} className="rounded-lg p-2 hover:bg-slate-100"><ArrowLeft size={20}/></button>
        <div><h1 className="text-lg font-bold">System Audit & Activity</h1><p className="text-xs text-slate-500">Admin-only · timestamps shown in Asia/Kolkata (IST)</p></div>
      </header>
      <main className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex rounded-xl border bg-white p-1 shadow-sm">{tabs.map(([value, title]) => <button key={value} onClick={() => setKind(value)} className={`rounded-lg px-3 py-2 text-sm ${kind === value ? "bg-red-600 text-white" : "hover:bg-slate-100"}`}>{title}</button>)}</div>
          <button onClick={() => setTimeline((v) => !v)} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm"><Clock3 size={16}/>{timeline ? "Table view" : "Timeline view"}</button>
        </div>
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="relative mb-3"><Search className="absolute left-3 top-3 text-slate-400" size={18}/><input aria-label="Global Search" value={filters.search} onChange={set("search")} onKeyDown={(e) => e.key === "Enter" && setApplied(filters)} placeholder="Search Booking ID, Guest, User, Action, Function, Hostel, Room..." className="w-full rounded-xl border py-2.5 pl-10 pr-3 outline-none focus:border-red-400"/></div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
            {["dateFrom","dateTo"].map((key) => <input key={key} aria-label={key} type="date" value={filters[key]} onChange={set(key)} className="rounded-lg border px-2 py-2 text-sm"/>)}
            {["timeFrom","timeTo"].map((key) => <input key={key} aria-label={key} type="time" value={filters[key]} onChange={set(key)} className="rounded-lg border px-2 py-2 text-sm"/>)}
            {["source","module","result"].map((key) => <select key={key} aria-label={key} value={filters[key]} onChange={set(key)} className="rounded-lg border px-2 py-2 text-sm"><option value="">All {key}</option>{(key === "source" ? ["USER","SYSTEM","CRON"] : key === "result" ? ["SUCCESS","FAILED"] : ["GUEST_ROOM","ENQUIRY","PAYMENT","AUTH","SYSTEM_SETTINGS","SYSTEM","LEGACY"]).map((v) => <option key={v}>{v}</option>)}</select>)}
            <input aria-label="Action" value={filters.action} onChange={set("action")} placeholder="Action" className="rounded-lg border px-2 py-2 text-sm"/>
            {[["user","User / email"],["role","Role"],["bookingId","Booking ID"],["guest","Guest"],["hostel","Hostel"],["room","Room"],["requestId","Request ID"]].map(([key, placeholder]) => <input key={key} aria-label={placeholder} value={filters[key]} onChange={set(key)} placeholder={placeholder} className="rounded-lg border px-2 py-2 text-sm"/>)}
          </div>
          <div className="mt-3 flex gap-2"><button onClick={() => setApplied(filters)} className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white"><Filter size={16}/>Apply filters</button><button onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); }} className="rounded-lg border px-4 py-2 text-sm">Clear</button></div>
        </section>
        {error && <div role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</div>}
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          {loading ? <div className="p-12 text-center text-slate-500">Loading activity…</div> : logs.length === 0 ? <div className="p-12 text-center text-slate-500">No matching activity found.</div> : timeline ? <div className="divide-y">{logs.map((log) => <button key={log._id} onClick={() => setSelected(log)} className="flex w-full gap-4 p-4 text-left hover:bg-slate-50"><span className="w-48 shrink-0 text-sm text-slate-500">{formatAuditTimeIST(log.timestamp)}</span><span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${log.result === "FAILED" ? "bg-red-500" : "bg-emerald-500"}`}/><span><b>{label(log.action)}</b><span className="block text-sm text-slate-500">{log.userEmail || log.userName || log.source} · {target(log)} · {log.functionName || log.route || "—"}</span></span></button>)}</div> :
            <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-100 text-left text-xs uppercase text-slate-500"><tr>{["Time","Source","Module","User","Action","Function / API","Target","Result"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y">{logs.map((log) => <tr key={log._id} tabIndex="0" onClick={() => setSelected(log)} onKeyDown={(e) => e.key === "Enter" && setSelected(log)} className="cursor-pointer hover:bg-slate-50"><td className="whitespace-nowrap px-4 py-3">{formatAuditTimeIST(log.timestamp)}</td><td className="px-4 py-3">{log.source}</td><td className="px-4 py-3">{label(log.module)}</td><td className="px-4 py-3">{log.userEmail || log.userName || "Legacy / Unknown"}</td><td className="px-4 py-3 font-medium">{label(log.action)}</td><td className="px-4 py-3">{log.functionName || [log.method, log.route].filter(Boolean).join(" ") || "—"}</td><td className="px-4 py-3">{target(log)}</td><td className={`px-4 py-3 font-semibold ${log.result === "FAILED" ? "text-red-600" : "text-emerald-600"}`}>{log.result}</td></tr>)}</tbody></table></div>}
          <footer className="flex items-center justify-between border-t px-4 py-3 text-sm"><span>{pagination.total} records</span><div className="flex items-center gap-2"><button aria-label="Previous page" disabled={pagination.page <= 1} onClick={() => load(pagination.page - 1)} className="rounded border p-2 disabled:opacity-40"><ChevronLeft size={16}/></button><span>Page {pagination.page} of {pagination.pages}</span><button aria-label="Next page" disabled={pagination.page >= pagination.pages} onClick={() => load(pagination.page + 1)} className="rounded border p-2 disabled:opacity-40"><ChevronRight size={16}/></button></div></footer>
        </section>
      </main>
      {selected && <div className="fixed inset-0 z-50 bg-black/30" onClick={() => setSelected(null)}><aside role="dialog" aria-label="Audit details" onClick={(e) => e.stopPropagation()} className="absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-2xl"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-bold">Activity details</h2>{selected.legacy && <p className="text-sm text-amber-600">Legacy record — unavailable fields were never stored.</p>}</div><button aria-label="Close details" onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-slate-100"><X/></button></div><dl className="space-y-3">{detailRows.map(([title, value]) => <div key={title} className="grid grid-cols-3 gap-3 border-b pb-3"><dt className="text-sm font-medium text-slate-500">{title}</dt><dd className="col-span-2 break-words text-sm">{String(value)}</dd></div>)}</dl></aside></div>}
    </div>
  );
}
