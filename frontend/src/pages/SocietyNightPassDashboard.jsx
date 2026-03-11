import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  RefreshCw,
  ShieldCheck,
  UserCircle2,
} from "lucide-react";
import PublicPageWidgets from "../components/PublicPageWidgets";
import {
  fetchSocietyNightMe,
  fetchSocietyNightRequests,
} from "../utils/societyNightPassApi";
import {
  clearSocietyNightPassSession,
  getStoredSocietyNightStudent,
} from "../utils/societyNightPassAuth";

const statusClasses = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
};

export default function SocietyNightPassDashboard() {
  const navigate = useNavigate();
  const [student, setStudent] = useState(() => getStoredSocietyNightStudent());
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [{ student: studentData }, { requests: requestData }] = await Promise.all([
        fetchSocietyNightMe(),
        fetchSocietyNightRequests(),
      ]);
      setStudent(studentData);
      setRequests(requestData || []);
    } catch (err) {
      if (err?.status === 401) {
        clearSocietyNightPassSession();
        navigate("/society-night-pass", { replace: true });
        return;
      }
      setError(err.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const summary = useMemo(() => ({
    total: requests.length,
    pending: requests.filter((item) => item.status === "PENDING").length,
    approved: requests.filter((item) => item.status === "APPROVED").length,
    rejected: requests.filter((item) => item.status === "REJECTED").length,
  }), [requests]);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#fff1f2_100%)]">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="flex flex-col gap-6 rounded-[32px] border border-white/80 bg-white/90 p-8 shadow-[0_24px_64px_rgba(15,23,42,0.12)] backdrop-blur md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
              <ShieldCheck className="h-4 w-4 text-red-600" />
              Student Only Portal
            </p>
            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              SOCIETY NIGHT PASS DASHBOARD
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              Raise night permission requests for society events and track university approval status from one place.
            </p>
          </div>

          <div className="flex flex-col gap-3 md:items-end">
            <Link
              to="/society-night-pass/request"
              className="inline-flex items-center gap-2 rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-red-700"
            >
              <Plus className="h-4 w-4" />
              Raise Night Permission
            </Link>
            <button
              type="button"
              onClick={loadDashboard}
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-semibold text-slate-500">Student</p>
            <div className="mt-3 flex items-center gap-3">
              <UserCircle2 className="h-10 w-10 text-red-600" />
              <div>
                <p className="font-bold text-slate-900">{student?.name || "Student"}</p>
                <p className="text-sm text-slate-500">{student?.rollNo || ""}</p>
              </div>
            </div>
          </div>
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-amber-700">Pending</p>
            <p className="mt-2 text-3xl font-black text-amber-900">{summary.pending}</p>
          </div>
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-emerald-700">Approved</p>
            <p className="mt-2 text-3xl font-black text-emerald-900">{summary.approved}</p>
          </div>
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
            <p className="text-sm font-semibold text-rose-700">Rejected</p>
            <p className="mt-2 text-3xl font-black text-rose-900">{summary.rejected}</p>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-950">My Requests</h2>
              <p className="text-sm text-slate-500">Status cards follow the public Lost & Found style.</p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
              Loading requests...
            </div>
          ) : error ? (
            <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-semibold text-slate-800">No requests submitted yet.</p>
              <p className="mt-2 text-sm text-slate-500">Create your first society night permission request.</p>
              <Link
                to="/society-night-pass/request"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Raise Night Permission
              </Link>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {requests.map((request) => (
                <article
                  key={request._id}
                  className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Society</p>
                      <h3 className="mt-2 text-2xl font-black text-slate-950">{request.society_name}</h3>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${statusClasses[request.status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                      {request.status}
                    </span>
                  </div>

                  <p className="mt-4 text-sm font-semibold text-slate-800">{request.purpose}</p>

                  <div className="mt-5 space-y-3 text-sm text-slate-600">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-red-500" />
                      <span>{request.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-blue-500" />
                      <span>{request.event_date} - {request.end_date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-amber-500" />
                      <span>{request.start_time} - {request.end_time}</span>
                    </div>
                  </div>

                  {request.notes ? (
                    <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      <p className="font-semibold text-slate-800">Additional Notes</p>
                      <p className="mt-1 leading-6">{request.notes}</p>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      <PublicPageWidgets footerMode="flow" footerClassName="mt-8 pb-4" echoClassName="bottom-24" />
    </div>
  );
}
