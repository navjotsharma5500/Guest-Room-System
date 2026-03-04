// src/pages/admin/DashboardSelector.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2, Calendar, Moon, Globe, Search, Sparkles, Lock,
  X, ArrowRight, LayoutDashboard, Settings, IndianRupee, LogOut,
  Package, Users, AlertCircle, ExternalLink, Send,
  BrainCircuit, QrCode, MessageSquare, CalendarDays,
  FileText, HelpCircle, BarChart3, Star, ChevronRight, Home,
  Grid, Eye, TrendingUp, TrendingDown, Activity, Clock,
  Wifi, Monitor, Smartphone, CheckCircle, XCircle, RefreshCw,
  Database, Zap, Globe2, MousePointer, Mail
} from "lucide-react";
import EchoOrb from "../../components/EchoOrb";
import EchoModal from "../../components/EchoModal";
import { useAuth } from "../../context/AuthContext";
import { BACKEND_URL } from "../../utils/apiConfig";
import { parseISO, format, getQuarter, getYear, subDays, isAfter } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import DashboardFooter from "../../components/DashboardFooter";

const API = BACKEND_URL;

// ════════════════════════════════════════════════════════════════════════════
// ADMIN ANALYTICS DASHBOARD (Hidden by default, shown via toggle)
// ════════════════════════════════════════════════════════════════════════════
const PC = {
  red:    "#DC2626", blue:   "#3B82F6", green:  "#10B981", amber:  "#F59E0B",
  purple: "#8B5CF6", teal:   "#14B8A6", pink:   "#EC4899", gray:   "#6B7280",
};

const AdminAnalyticsDashboard = ({ userName }) => {
  const [bookings, setBookings]   = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [ga4, setGa4]             = useState(null);
  const [ga4Days, setGa4Days]     = useState(30);
  const [loading, setLoading]     = useState(true);
  const [ga4Loading, setGa4Loading] = useState(true);
  const [error, setError]         = useState(null);
  const [range, setRange]         = useState("Monthly");
  const [activeChart, setActiveChart]   = useState("trend");
  const [activeTraffic, setActiveTraffic] = useState("daily");
  const [lastRefresh, setLastRefresh]   = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const [bookRes, dashRes] = await Promise.all([
        fetch(`${API}/api/bookings/all-for-download`, { credentials: "include", headers }),
        fetch(`${API}/api/dashboard/stats`, { credentials: "include", headers }),
      ]);
      if (bookRes.ok) {
        const data = await bookRes.json();
        const all = [];
        (data.hostels || []).forEach(h =>
          (h.rooms || []).forEach(r =>
            (r.bookings || []).forEach(b => {
              try { all.push({ ...b, hostel: h.name, roomNo: r.roomNo, from: parseISO(b.from), to: parseISO(b.to) }); } catch {}
            })
          )
        );
        setBookings(all);
      }
      if (dashRes.ok) setDashStats(await dashRes.json());
      setLastRefresh(new Date());
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  const fetchGA4 = useCallback(async (days = 30) => {
    setGa4Loading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API}/api/analytics/ga4?days=${days}`, {
        credentials: "include", headers: { Authorization: `Bearer ${token}` },
      });
      setGa4(await res.json());
    } catch { setGa4({ configured: false, message: "Failed to connect to analytics" }); }
    finally { setGa4Loading(false); }
  }, []);

  useEffect(() => { fetchData(); fetchGA4(ga4Days); }, [fetchData, fetchGA4]);
  const handleGa4Days = (d) => { setGa4Days(d); fetchGA4(d); };

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const total      = bookings.length;
  const cancelled  = bookings.filter(b => b.status === "cancelled").length;
  const checkedOut = bookings.filter(b => b.status === "checked_out").length;
  const checkedIn  = bookings.filter(b => b.reportedStatus === "reported" || b.status === "checked_in").length;
  const booked     = bookings.filter(b => b.status === "booked").length;
  const free       = bookings.filter(b => b.paymentType === "Free").length;
  const paid       = bookings.filter(b => b.paymentType === "Paid").length;
  const revenue    = bookings.reduce((s, b) => s + (b.paymentType === "Paid" ? Number(b.paidAmount) || 0 : 0), 0);
  const billed     = bookings.reduce((s, b) => s + (b.paymentType === "Paid" ? Number(b.totalAmount) || 0 : 0), 0);
  const discount   = bookings.reduce((s, b) => s + (Number(b.discount) || 0), 0);
  const pending    = Math.max(0, billed - revenue - discount);
  const fullyPaid  = bookings.filter(b => b.paymentType === "Paid" && b.paymentStatus === "PAID").length;
  const partial    = bookings.filter(b => b.paymentType === "Paid" && b.paymentStatus === "PARTIALLY_PAID").length;
  const unpaid     = bookings.filter(b => b.paymentType === "Paid" && b.paymentStatus === "UNPAID").length;
  const collectionRate = billed > 0 ? Math.round((revenue / billed) * 100) : 0;
  const last30 = bookings.filter(b => { try { return isAfter(b.from, subDays(new Date(), 30)); } catch { return false; } });
  const last7  = bookings.filter(b => { try { return isAfter(b.from, subDays(new Date(), 7)); } catch { return false; } });

  const hostelMap = {}, hostelRevMap = {};
  bookings.forEach(b => {
    hostelMap[b.hostel] = (hostelMap[b.hostel] || 0) + 1;
    if (b.paymentType === "Paid") hostelRevMap[b.hostel] = (hostelRevMap[b.hostel] || 0) + (Number(b.paidAmount) || 0);
  });
  const hostelData = Object.entries(hostelMap)
    .map(([name, count]) => ({ name, bookings: count, revenue: Math.round(hostelRevMap[name] || 0) }))
    .sort((a, b) => b.bookings - a.bookings);

  const hourMap = {};
  bookings.forEach(b => { try { const slot = `${b.from.getHours()}:00`; hourMap[slot] = (hourMap[slot] || 0) + 1; } catch {} });
  const peakHour = Object.entries(hourMap).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";

  const DOW = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const dowMap = {};
  bookings.forEach(b => { try { const d = DOW[b.from.getDay()]; dowMap[d] = (dowMap[d] || 0) + 1; } catch {} });
  const dowData = DOW.map(d => ({ day: d, bookings: dowMap[d] || 0 }));

  const trendMap = {}, revMap = {};
  bookings.forEach(b => {
    let key = "Overall";
    try {
      if (range === "Monthly")   key = format(b.from, "MMM yyyy");
      if (range === "Quarterly") key = `Q${getQuarter(b.from)} ${getYear(b.from)}`;
      if (range === "Annual")    key = `${getYear(b.from)}`;
      trendMap[key] = (trendMap[key] || 0) + 1;
      if (b.paymentType === "Paid") revMap[key] = (revMap[key] || 0) + (Number(b.paidAmount) || 0);
    } catch {}
  });
  const trendData = Object.entries(trendMap).map(([period, count]) => ({ period, count })).sort((a,b) => a.period.localeCompare(b.period));
  const revTrend  = Object.entries(revMap).map(([period, revenue]) => ({ period, revenue: Math.round(revenue) })).sort((a,b) => a.period.localeCompare(b.period));

  const statusPie = [
    { name: "Booked",      value: booked,     color: PC.purple },
    { name: "Checked In",  value: checkedIn,  color: PC.amber },
    { name: "Checked Out", value: checkedOut, color: PC.green },
    { name: "Cancelled",   value: cancelled,  color: PC.red },
  ].filter(d => d.value > 0);

  const payPie = [
    { name: "Fully Paid", value: fullyPaid, color: PC.green },
    { name: "Partial",    value: partial,   color: PC.amber },
    { name: "Unpaid",     value: unpaid,    color: PC.red },
    { name: "Free",       value: free,      color: PC.blue },
  ].filter(d => d.value > 0);

  const CHART_TABS = [
    { id: "trend",      label: "📈 Booking Trend" },
    { id: "revenue",    label: "💰 Revenue Trend" },
    { id: "hostels",    label: "🏨 By Hostel" },
    { id: "rev-hostel", label: "💵 Revenue by Hostel" },
    { id: "dow",        label: "📅 Day of Week" },
    { id: "status",     label: "⚡ Status" },
    { id: "payment",    label: "💳 Payment" },
  ];

  const KpiCard = ({ label, value, sub, color = "text-slate-900", icon: Icon, iconBg = "bg-slate-100", iconColor = "text-slate-600", trend, trendUp, accent }) => (
    <div className={`relative overflow-hidden rounded-2xl p-4 border shadow-sm hover:shadow-lg transition-all group ${
      accent ? `bg-gradient-to-br ${accent} border-transparent text-white` : "bg-white/80 backdrop-blur-sm border-white/80"
    }`}>
      {accent && <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />}
      <div className="flex items-start justify-between mb-2">
        <p className={`text-xs font-semibold leading-tight ${accent ? "text-white/80" : "text-slate-500"}`}>{label}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${accent ? "bg-white/20" : iconBg}`}>
            <Icon className={`w-4 h-4 ${accent ? "text-white" : iconColor}`} />
          </div>
        )}
      </div>
      <p className={`text-2xl font-bold leading-none mb-1 ${accent ? "text-white" : color}`}>{value}</p>
      {sub && <p className={`text-[11px] ${accent ? "text-white/70" : "text-slate-400"}`}>{sub}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-semibold px-2 py-0.5 rounded-full w-fit ${
          accent ? "bg-white/20 text-white" : trendUp ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
        }`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </div>
  );

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500">Loading system analytics…</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <XCircle className="w-10 h-10 text-red-400" />
      <p className="text-sm text-slate-500">Failed to load: {error}</p>
      <button onClick={fetchData} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-semibold flex items-center gap-2">
        <RefreshCw className="w-4 h-4" /> Retry
      </button>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>System Analytics</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live data · Last refreshed {format(lastRefresh, "hh:mm a, d MMM")}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">System Online</span>
          </div>
          <button onClick={fetchData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/70 border border-slate-200 text-xs font-medium text-slate-600 hover:bg-white transition">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {/* Row 1: Top KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Total Bookings" value={total.toLocaleString()} sub={`${last30.length} in last 30 days`}
          icon={FileText} accent="from-blue-600 to-blue-500" trend={`${last7.length} this week`} trendUp={last7.length > 0} />
        <KpiCard label="Revenue Collected" value={`₹${(revenue/1000).toFixed(1)}K`} sub={`from ${paid} paid bookings`}
          icon={IndianRupee} accent="from-emerald-600 to-green-500" trend={`${collectionRate}% collection rate`} trendUp={collectionRate >= 70} />
        <KpiCard label="Pending Amount" value={`₹${(pending/1000).toFixed(1)}K`} sub={`${unpaid + partial} outstanding`}
          icon={AlertCircle} accent="from-red-600 to-rose-500" />
        <KpiCard label="Active Guests" value={checkedIn.toLocaleString()} sub={`${booked} bookings confirmed`}
          icon={Users} accent="from-amber-500 to-orange-500" trend="Currently in hostel" trendUp={true} />
      </div>

      {/* Row 2: Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Free Bookings" value={free.toLocaleString()} sub={`${total > 0 ? Math.round((free/total)*100) : 0}% of total`}
          icon={CheckCircle} iconBg="bg-teal-100" iconColor="text-teal-600" />
        <KpiCard label="Discounts Given" value={`₹${(discount/1000).toFixed(1)}K`} sub="total waived amount"
          color="text-purple-700" icon={Star} iconBg="bg-purple-100" iconColor="text-purple-600" />
        <KpiCard label="Peak Booking Hour" value={peakHour} sub="most active time slot"
          color="text-blue-700" icon={Clock} iconBg="bg-blue-100" iconColor="text-blue-600" />
        <KpiCard label="Hostels Tracked" value={hostelData.length} sub={`${Object.keys(hostelRevMap).length} with paid bookings`}
          icon={Building2} iconBg="bg-slate-100" iconColor="text-slate-600" />
      </div>

      {/* System Overview */}
      {dashStats && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-slate-500" /> System Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total Users",       value: dashStats.users,           icon: Users,        color: "text-blue-700" },
              { label: "Total Bookings(DB)",value: dashStats.bookings,        icon: FileText,     color: "text-green-700" },
              { label: "Enquiries",         value: dashStats.enquiries,       icon: MessageSquare,color: "text-purple-700" },
              { label: "Pending Tokens",    value: dashStats.tokens?.pending ?? "—", icon: Clock, color: "text-amber-700" },
            ].map((s, i) => (
              <div key={i} className="bg-slate-50/80 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                <p className={`text-xl font-bold ${s.color}`}>{s.value?.toLocaleString?.() ?? s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          WEBSITE TRAFFIC — Google Analytics 4
          ══════════════════════════════════════════════════════════ */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Globe2 className="w-4 h-4 text-blue-600" /> Website Traffic
            <span className="text-xs font-normal text-slate-400 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">Google Analytics 4</span>
          </h2>
          {ga4?.configured && (
            <div className="flex items-center gap-1.5">
              {[7, 30, 90].map(d => (
                <button key={d} onClick={() => handleGa4Days(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    ga4Days === d ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>{d}d</button>
              ))}
              <button onClick={() => fetchGA4(ga4Days)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition">
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${ga4Loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          )}
        </div>

        {ga4Loading ? (
          <div className="flex items-center justify-center py-10 bg-white/60 rounded-2xl border border-white/80">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading traffic data…</p>
            </div>
          </div>
        ) : !ga4?.configured ? (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-orange-800 mb-1">GA4 Backend Not Configured</p>
                <p className="text-xs text-orange-600 mb-3 leading-relaxed">
                  {ga4?.message || "Set GA4_PROPERTY_ID and GOOGLE_SERVICE_ACCOUNT_KEY in your backend .env file."}
                </p>
                <div className="bg-orange-900/10 rounded-xl p-3 font-mono text-[11px] text-orange-800 space-y-1">
                  <p>GA4_PROPERTY_ID=properties/YOUR_NUMERIC_ID</p>
                  <p>{`GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}`}</p>
                </div>
                <p className="text-[11px] text-orange-500 mt-2">
                  Your GA4 tracking script (G-Z8GK8ESCM1) is already installed on the frontend ✅ — only the backend service account is missing.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* GA4 KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Sessions", value: ga4.overview.sessions.toLocaleString(),
                  sub: `vs ${ga4.overview.prevSessions.toLocaleString()} prev period`,
                  icon: Activity, iconBg: "bg-blue-100", iconColor: "text-blue-600",
                  trendUp: ga4.overview.sessions >= ga4.overview.prevSessions,
                  trend: ga4.overview.prevSessions > 0 ? `${ga4.overview.sessions >= ga4.overview.prevSessions ? "+" : ""}${Math.round(((ga4.overview.sessions - ga4.overview.prevSessions) / ga4.overview.prevSessions) * 100)}%` : null },
                { label: "Total Users", value: ga4.overview.totalUsers.toLocaleString(),
                  sub: `${ga4.overview.newUsers.toLocaleString()} new · ${ga4.overview.returningUsers.toLocaleString()} returning`,
                  icon: Users, iconBg: "bg-green-100", iconColor: "text-green-600",
                  trendUp: ga4.overview.totalUsers >= ga4.overview.prevUsers,
                  trend: ga4.overview.prevUsers > 0 ? `${ga4.overview.totalUsers >= ga4.overview.prevUsers ? "+" : ""}${Math.round(((ga4.overview.totalUsers - ga4.overview.prevUsers) / ga4.overview.prevUsers) * 100)}% vs prev` : null },
                { label: "Page Views", value: ga4.overview.pageViews.toLocaleString(),
                  sub: `${ga4.overview.sessions > 0 ? (ga4.overview.pageViews / ga4.overview.sessions).toFixed(1) : 0} pages/session`,
                  icon: Eye, iconBg: "bg-purple-100", iconColor: "text-purple-600",
                  trendUp: ga4.overview.pageViews >= ga4.overview.prevPageViews,
                  trend: ga4.overview.prevPageViews > 0 ? `${ga4.overview.pageViews >= ga4.overview.prevPageViews ? "+" : ""}${Math.round(((ga4.overview.pageViews - ga4.overview.prevPageViews) / ga4.overview.prevPageViews) * 100)}% vs prev` : null },
                { label: "Bounce Rate", value: `${ga4.overview.bounceRate}%`,
                  sub: `avg ${Math.floor(ga4.overview.avgSessionDuration / 60)}m ${ga4.overview.avgSessionDuration % 60}s session`,
                  icon: TrendingDown, iconBg: "bg-amber-100", iconColor: "text-amber-600",
                  trendUp: ga4.overview.bounceRate < 50,
                  trend: ga4.overview.bounceRate < 50 ? "Good bounce rate" : "High bounce rate" },
              ].map((k, i) => (
                <div key={i} className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/80 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs text-slate-500 font-medium">{k.label}</p>
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${k.iconBg}`}>
                      <k.icon className={`w-4 h-4 ${k.iconColor}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 leading-none mb-1">{k.value}</p>
                  <p className="text-[11px] text-slate-400">{k.sub}</p>
                  {k.trend && (
                    <div className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${k.trendUp ? "text-green-600" : "text-red-600"}`}>
                      {k.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {k.trend}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* New vs Returning / Peak Hour / Devices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/80 shadow-sm">
                <p className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> New vs Returning</p>
                {[{ label: "New Users", value: ga4.overview.newUsers, color: "bg-blue-500" },
                  { label: "Returning", value: ga4.overview.returningUsers, color: "bg-green-500" }].map((u, i) => {
                  const pct = ga4.overview.totalUsers > 0 ? (u.value / ga4.overview.totalUsers) * 100 : 0;
                  return (
                    <div key={i} className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-600">{u.label}</span>
                        <span className="font-semibold text-slate-800">{u.value.toLocaleString()} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="bg-slate-100 rounded-full h-2">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${u.color}`} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/80 shadow-sm">
                <p className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Peak Traffic Hour</p>
                <p className="text-3xl font-bold text-blue-700">{ga4.peakHour}</p>
                <p className="text-xs text-slate-400 mt-1">Most active hour in last {ga4Days} days</p>
                <div className="mt-3 flex gap-1 flex-wrap">
                  {(ga4.hourly || []).filter((_, i) => i % 3 === 0).slice(0, 8).map((h, i) => {
                    const max = Math.max(...(ga4.hourly || []).map(x => x.sessions));
                    const pct = max > 0 ? (h.sessions / max) * 100 : 0;
                    return (
                      <div key={i} className="flex flex-col items-center gap-0.5">
                        <div className="w-4 bg-slate-100 rounded-sm overflow-hidden" style={{ height: 32 }}>
                          <div className="w-full bg-blue-400 rounded-sm" style={{ height: `${pct}%`, marginTop: `${100 - pct}%` }} />
                        </div>
                        <span className="text-[9px] text-slate-400">{h.hour.replace(":00","h")}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/80 shadow-sm">
                <p className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5"><Monitor className="w-3.5 h-3.5" /> Devices</p>
                {(ga4.devices || []).map((d, i) => {
                  const tot = (ga4.devices || []).reduce((s, x) => s + x.sessions, 0);
                  const pct = tot > 0 ? (d.sessions / tot) * 100 : 0;
                  const DevIcon = d.device === "mobile" || d.device === "tablet" ? Smartphone : Monitor;
                  return (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <DevIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="text-xs text-slate-600 capitalize w-16">{d.device}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: i * 0.1 }} className="h-full rounded-full bg-blue-500" />
                      </div>
                      <span className="text-xs font-semibold text-slate-700 w-10 text-right">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GA4 Chart tabs */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-100 overflow-x-auto">
                {[{ id:"daily",label:"📅 Daily Traffic"},{id:"sources",label:"🔗 Traffic Sources"},{id:"pages",label:"📄 Top Pages"},{id:"geo",label:"🌍 Geography"},{id:"browser",label:"🌐 Browser / OS"}].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTraffic(tab.id)}
                    className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all ${activeTraffic === tab.id ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-slate-500 hover:text-slate-700"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {activeTraffic === "daily" && (ga4.daily || []).length > 0 && (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={ga4.daily}>
                      <defs>
                        <linearGradient id="sG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                        <linearGradient id="uG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.12}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
                      <Area type="monotone" dataKey="sessions"  stroke="#3B82F6" fill="url(#sG)" strokeWidth={2} name="Sessions" />
                      <Area type="monotone" dataKey="users"     stroke="#10B981" fill="url(#uG)" strokeWidth={2} name="Users" />
                      <Area type="monotone" dataKey="pageViews" stroke="#8B5CF6" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Page Views" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                {activeTraffic === "sources" && (
                  <div className="space-y-3">
                    {(ga4.sources || []).map((s, i) => {
                      const max = Math.max(...(ga4.sources||[]).map(x=>x.sessions));
                      const pct = max > 0 ? (s.sessions/max)*100 : 0;
                      const colors = [PC.blue,PC.green,PC.amber,PC.purple,PC.red,PC.teal,PC.pink,PC.gray];
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs text-slate-600 w-32 truncate font-medium">{s.source}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                            <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{delay:i*0.05,duration:0.6}} className="h-full rounded-full" style={{backgroundColor:colors[i%colors.length]}} />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-20 text-right">{s.sessions.toLocaleString()} sessions</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {activeTraffic === "pages" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                      <span className="col-span-1">#</span><span className="col-span-7">Page</span><span className="col-span-2 text-right">Views</span><span className="col-span-2 text-right">Avg Time</span>
                    </div>
                    {(ga4.topPages||[]).map((p, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 text-xs py-2 border-b border-slate-50 hover:bg-slate-50/50 rounded-lg px-1 transition">
                        <span className="col-span-1 text-slate-400 font-bold">{i+1}</span>
                        <span className="col-span-7 text-slate-700 truncate font-medium">{p.page||"/"}</span>
                        <span className="col-span-2 text-right font-semibold text-slate-800">{p.views.toLocaleString()}</span>
                        <span className="col-span-2 text-right text-slate-400">{Math.floor(p.avgDuration/60)}m {Math.round(p.avgDuration%60)}s</span>
                      </div>
                    ))}
                  </div>
                )}
                {activeTraffic === "geo" && (
                  <div className="space-y-2">
                    {(ga4.countries||[]).map((c, i) => {
                      const max = Math.max(...(ga4.countries||[]).map(x=>x.sessions));
                      const pct = max > 0 ? (c.sessions/max)*100 : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-400 w-5 text-right">{i+1}</span>
                          <span className="text-xs text-slate-700 w-28 truncate font-medium">{c.country}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{delay:i*0.05,duration:0.6}} className="h-full rounded-full bg-teal-500" />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-24 text-right">{c.sessions.toLocaleString()} sessions</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {activeTraffic === "browser" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-3">🌐 Browsers</p>
                      {(ga4.browsers||[]).map((b,i) => {
                        const max = Math.max(...(ga4.browsers||[]).map(x=>x.sessions));
                        const pct = max>0?(b.sessions/max)*100:0;
                        const colors=[PC.blue,PC.red,PC.green,PC.amber,PC.purple,PC.teal];
                        return (<div key={i} className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-slate-600 w-24 truncate">{b.browser}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2"><motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{delay:i*0.05}} className="h-full rounded-full" style={{backgroundColor:colors[i%colors.length]}} /></div>
                          <span className="text-xs font-semibold text-slate-700 w-12 text-right">{b.sessions.toLocaleString()}</span>
                        </div>);
                      })}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-3">💻 Operating Systems</p>
                      {(ga4.oses||[]).map((o,i) => {
                        const max = Math.max(...(ga4.oses||[]).map(x=>x.sessions));
                        const pct = max>0?(o.sessions/max)*100:0;
                        const colors=[PC.purple,PC.blue,PC.green,PC.amber,PC.red,PC.teal];
                        return (<div key={i} className="flex items-center gap-2 mb-2">
                          <span className="text-xs text-slate-600 w-24 truncate">{o.os}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2"><motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{delay:i*0.05}} className="h-full rounded-full" style={{backgroundColor:colors[i%colors.length]}} /></div>
                          <span className="text-xs font-semibold text-slate-700 w-12 text-right">{o.sessions.toLocaleString()}</span>
                        </div>);
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Booking & Revenue Trends */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-4 pb-0 flex-wrap gap-3">
          <h3 className="text-sm font-bold text-slate-700">Booking & Revenue Trends</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-400">Period:</span>
            {["Monthly","Quarterly","Annual","Overall"].map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${range === r ? "bg-red-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{r}</button>
            ))}
          </div>
        </div>
        <div className="flex border-b border-slate-100 mt-3 overflow-x-auto">
          {CHART_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveChart(tab.id)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all ${activeChart === tab.id ? "text-red-600 border-b-2 border-red-600 bg-red-50/50" : "text-slate-500 hover:text-slate-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {activeChart === "trend" && trendData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData}>
                <defs><linearGradient id="tG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#DC2626" stopOpacity={0.15}/><stop offset="95%" stopColor="#DC2626" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="period" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} /><Tooltip />
                <Area type="monotone" dataKey="count" stroke="#DC2626" fill="url(#tG)" strokeWidth={2.5} name="Bookings" dot={{r:3,fill:"#DC2626"}} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {activeChart === "revenue" && revTrend.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revTrend}>
                <defs><linearGradient id="rG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="period" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} tickFormatter={v=>`₹${(v/1000).toFixed(0)}K`} />
                <Tooltip formatter={v=>[`₹${Number(v).toLocaleString()}`,"Revenue"]} />
                <Area type="monotone" dataKey="revenue" stroke="#10B981" fill="url(#rG)" strokeWidth={2.5} name="Revenue" dot={{r:3,fill:"#10B981"}} />
              </AreaChart>
            </ResponsiveContainer>
          )}
          {activeChart === "hostels" && hostelData.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hostelData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="name" tick={{fontSize:10}} /><YAxis tick={{fontSize:11}} /><Tooltip />
                <Bar dataKey="bookings" fill="#3B82F6" radius={[4,4,0,0]} name="Bookings">
                  {hostelData.map((_,i) => <Cell key={i} fill={["#3B82F6","#10B981","#F59E0B","#8B5CF6","#DC2626","#14B8A6","#EC4899","#6B7280"][i%8]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {activeChart === "rev-hostel" && hostelData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-500">Showing top {Math.min(hostelData.length,12)} hostels by revenue</p>
                <p className="text-xs font-semibold text-slate-700">Total: ₹{(hostelData.reduce((s,h)=>s+h.revenue,0)/1000).toFixed(1)}K</p>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={[...hostelData].sort((a,b)=>b.revenue-a.revenue).slice(0,12)} layout="vertical" margin={{left:10,right:30}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>v>=1000?`₹${(v/1000).toFixed(0)}K`:`₹${v}`} />
                  <YAxis dataKey="name" type="category" tick={{fontSize:10}} width={100} />
                  <Tooltip formatter={v=>[`₹${v.toLocaleString()}`,"Revenue"]} contentStyle={{borderRadius:8,fontSize:12}} />
                  <Bar dataKey="revenue" radius={[0,4,4,0]} name="Revenue (₹)">
                    {[...hostelData].sort((a,b)=>b.revenue-a.revenue).slice(0,12).map((_,i) => (
                      <Cell key={i} fill={i===0?"#DC2626":i===1?"#F59E0B":i===2?"#10B981":["#3B82F6","#8B5CF6","#14B8A6","#EC4899","#6B7280","#F97316","#06B6D4","#84CC16","#A855F7"][i%9]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                {[...hostelData].sort((a,b)=>b.revenue-a.revenue).slice(0,6).map((h,i) => (
                  <div key={i} className="bg-slate-50/80 rounded-xl p-3 border border-slate-100">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:i===0?"#DC2626":i===1?"#F59E0B":i===2?"#10B981":["#3B82F6","#8B5CF6","#14B8A6"][i-3]}} />
                      <span className="text-[11px] text-slate-600 truncate font-medium">#{i+1} {h.name}</span>
                    </div>
                    <p className="text-base font-bold text-slate-800">₹{(h.revenue/1000).toFixed(1)}K</p>
                    <p className="text-[10px] text-slate-400">{h.bookings} bookings</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {activeChart === "dow" && (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="day" tick={{fontSize:11}} /><YAxis tick={{fontSize:11}} /><Tooltip />
                <Bar dataKey="bookings" radius={[4,4,0,0]} name="Bookings">
                  {dowData.map((_,i) => <Cell key={i} fill={["#DC2626","#3B82F6","#10B981","#F59E0B","#8B5CF6","#14B8A6","#EC4899"][i%7]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {(activeChart === "status" || activeChart === "payment") && (
            <div className="flex items-center justify-center gap-8 flex-wrap">
              <ResponsiveContainer width={260} height={260}>
                <PieChart>
                  <Pie data={activeChart==="status"?statusPie:payPie} cx="50%" cy="50%" outerRadius={100} dataKey="value"
                    label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {(activeChart==="status"?statusPie:payPie).map((e,i) => <Cell key={i} fill={e.color} />)}
                  </Pie><Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {(activeChart==="status"?statusPie:payPie).map((d,i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{backgroundColor:d.color}} />
                    <span className="text-slate-600">{d.name}:</span>
                    <span className="font-bold text-slate-900">{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hostel Leaderboard */}
      {hostelData.length > 0 && (
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm p-5">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-slate-500" /> Hostel Leaderboard
          </h3>
          <div className="space-y-2">
            {hostelData.slice(0,8).map((h,i) => {
              const pct = total > 0 ? (h.bookings/total)*100 : 0;
              const colors = [PC.red,PC.blue,PC.green,PC.amber,PC.purple,PC.teal,PC.pink,PC.gray];
              return (
                <div key={h.name} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5 text-right">{i+1}</span>
                  <span className="text-xs text-slate-700 w-28 truncate font-medium">{h.name}</span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{delay:i*0.05,duration:0.6,ease:"easeOut"}}
                      className="h-full rounded-full" style={{backgroundColor:colors[i%colors.length]}} />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 w-12 text-right">{h.bookings}</span>
                  <span className="text-xs text-slate-400 w-20 text-right">₹{(h.revenue/1000).toFixed(1)}K</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PLACEHOLDER SECTIONS FOR FUTURE EXPANSION ──────────────────────
          Add these when backend endpoints are ready:
          - Server Cost: /api/analytics/server-cost
          - DB Space:    /api/analytics/db-space
          - CPU/Memory:  /api/analytics/system-health
          - Uptime:      /api/analytics/uptime
      ─────────────────────────────────────────────────────────────────────── */}
      <div className="bg-white/40 backdrop-blur-sm rounded-2xl border border-dashed border-slate-300 p-5">
        <div className="flex items-center gap-3 text-slate-400">
          <Zap className="w-5 h-5" />
          <div>
            <p className="text-sm font-semibold text-slate-500">Expandable Analytics Sections</p>
            <p className="text-xs text-slate-400 mt-0.5">Future: Server Cost · DB Space · CPU/Memory Usage · System Health · Uptime Monitor</p>
          </div>
        </div>
      </div>

    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// PUBLIC FORMS MODAL
// ════════════════════════════════════════════════════════════════════════════
const PublicFormsModal = ({ open, onClose }) => {
  if (!open) return null;

  const forms = [
    {
      title: "Guest Room Booking Form",
      description: "Book guest rooms for visitors",
      url: "http://guestapp.in/guest-enquiry",
      icon: Building2,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-200",
      hover: "hover:border-blue-400"
    },
    {
      title: "Guest Room Feedback Form",
      description: "Submit feedback for your stay",
      url: "http://guestapp.in/guest-feedback",
      icon: MessageSquare,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-200",
      hover: "hover:border-green-400"
    },
    {
      title: "Venue Booking Form",
      description: "Book venues for events",
      url: "http://guestapp.in/venue-guest-enquiry",
      icon: Calendar,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-200",
      hover: "hover:border-purple-400"
    },
    {
      title: "Event Calendar Page",
      description: "View upcoming events",
      url: "http://guestapp.in/venue-event-calendar",
      icon: CalendarDays,
      color: "text-orange-600",
      bg: "bg-orange-50",
      border: "border-orange-200",
      hover: "hover:border-orange-400"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Globe className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                Public Forms
              </h2>
              <p className="text-sm text-slate-500">Access public booking portals and calendars</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/50">
          {forms.map((form, index) => (
            <motion.a
              key={index}
              href={form.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-300 group bg-white ${form.border} ${form.hover} hover:shadow-lg cursor-pointer`}
            >
              <div className={`p-3 rounded-lg ${form.bg} ${form.color} group-hover:scale-110 transition-transform duration-300`}>
                <form.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {form.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {form.description}
                </p>
              </div>
            </motion.a>
          ))}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">
            These links open in a new tab
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD SELECTOR
// ════════════════════════════════════════════════════════════════════════════
const DashboardSelector = () => {
  const [showPublicForms, setShowPublicForms] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showEcho, setShowEcho] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const role = (currentUser?.role || currentUser?.user?.role || "").toLowerCase();
  const email = (currentUser?.email || currentUser?.user?.email || "").toLowerCase();
  const permissions = currentUser?.permissions || currentUser?.user?.permissions || {};
  const isAdmin = role === "admin";
  const userName = currentUser?.name || "User";

  // ════════════════════════════════════════════════════════════════════════════
  // DASHBOARD CARD CONFIGURATION (Hardcoded Visibility Logic)
  // ════════════════════════════════════════════════════════════════════════════
  
  // Helper to check visibility
  const canSeeCard = (cardId) => {
    // 1. Admin sees ALL dashboards
    if (role === 'admin') {
      return ["guest-room", "venue-booking", "night-permissions"].includes(cardId);
    }

    // 2. Adosa Logic
    if (role === 'adosa') {
      // adosa2 -> Guest Room ONLY (though they should bypass this page via redirect)
      if (email === "adosa2@thapar.edu") {
        return ["guest-room"].includes(cardId);
      }
      // adosa3 (and others) -> Venue + Night (NO Guest Room)
      return ["venue-booking", "night-permissions"].includes(cardId);
    }

    // 3. Assistant -> Selector -> Venue + Night
    if (role === 'assistant') {
      return ["venue-booking", "night-permissions"].includes(cardId);
    }

    // 4. Caretaker -> Selector -> Guest + Night
    if (role === 'caretaker') {
      return ["guest-room", "night-permissions"].includes(cardId);
    }

    // 5. Default Fallback (should not happen for selector roles, but safe to hide)
    return false;
  };

  const allDashboards = [
    {
      id: "guest-room",
      title: "Guest Room Dashboard",
      description: "Manage hostel rooms, bookings, and guest information",
      icon: Building2,
      gradient: "from-blue-600 via-blue-500 to-cyan-500",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
      available: true,
      features: ["Room Management", "Guest Tracking", "Booking System"],
      onClick: () => navigate("/dashboard"),
    },
    {
      id: "venue-booking",
      title: "Venue Booking Dashboard",
      description: "Manage institute venues, events, and hall bookings",
      icon: Calendar,
      gradient: "from-purple-600 via-purple-500 to-pink-500",
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
      available: true,
      features: ["Venue Management", "Event Calendar", "Enquiry System"],
      onClick: () => navigate("/venue-booking"),
    },
    {
      id: "night-permissions",
      title: "Night Permissions",
      description: "Manage student night-out requests, approvals, and QR scanning",
      icon: Moon,
      gradient: "from-amber-600 via-amber-500 to-yellow-400",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
      available: true,
      badge: { label: "NEW", bg: "bg-amber-100", text: "text-amber-700" },
      features: ["Permission Lists", "QR Scan Entry/Exit", "Defaulter Tracking"],
      onClick: () => navigate("/night-pass"),
    }
  ];

  // Filter dashboards based on hardcoded logic
  const dashboards = allDashboards.filter(d => canSeeCard(d.id));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { y: 40, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  // If Analytics view is active (Admin only)
  if (showAnalytics && isAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 relative">
        <div className="fixed top-4 left-4 z-50">
           <button onClick={() => setShowAnalytics(false)} 
             className="bg-white border border-slate-200 shadow-lg px-4 py-2 rounded-xl flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-all hover:scale-105">
             <ArrowRight className="w-4 h-4 rotate-180" /> Back to Dashboard
           </button>
        </div>
        <div className="p-8 pt-16">
          <AdminAnalyticsDashboard userName={userName} />
        </div>
        {/* Echo FAB still visible in Analytics */}
        <EchoOrb onClick={() => setShowEcho(true)} />
        <AnimatePresence>
          {showEcho && <EchoModal open={showEcho} onClose={()=>setShowEcho(false)} role={role} userName={userName}/>}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.03, 0.06, 0.03]
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            rotate: [0, -90, 0],
            opacity: [0.03, 0.06, 0.03]
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-gradient-to-br from-red-400 to-orange-400 rounded-full blur-3xl"
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pt-12 pb-64">
        {/* Header Section */}
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-16 relative w-full max-w-7xl mx-auto"
        >
          {/* Admin Analytics Button - Top Right */}
          {isAdmin && (
             <div className="absolute top-0 right-0 hidden md:block">
               <motion.button
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => setShowAnalytics(true)}
                 className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm text-slate-600 hover:text-red-600 hover:border-red-200 transition-colors"
               >
                 <BarChart3 className="w-4 h-4" />
                 <span className="text-sm font-semibold">System Analytics</span>
               </motion.button>
             </div>
          )}

          {/* Thapar Logo */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              delay: 0.2
            }}
            className="inline-flex items-center justify-center mb-6"
          >
            <img
              src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
              alt="Thapar Institute Logo"
              className="h-24 w-auto object-contain"
            />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 bg-clip-text text-transparent"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Hostel Management
          </motion.h1>

          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-xl md:text-2xl text-slate-600 font-light"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            Select your administrative dashboard
          </motion.p>

          {/* Mobile Admin Analytics Button */}
          {isAdmin && (
             <div className="mt-6 md:hidden">
               <button
                 onClick={() => setShowAnalytics(true)}
                 className="flex items-center justify-center w-full gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl shadow-sm text-slate-600 hover:text-red-600"
               >
                 <BarChart3 className="w-4 h-4" />
                 <span className="text-sm font-semibold">View System Analytics</span>
               </button>
             </div>
          )}

          {/* Decorative Line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="w-24 h-1 bg-gradient-to-r from-blue-600 to-red-600 mx-auto mt-6 rounded-full"
          />
        </motion.div>

        {/* Dashboard Cards Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl w-full"
        >
          {dashboards.map((dashboard, index) => {
            const Icon = dashboard.icon;
            const isHovered = hoveredCard === dashboard.id;

            return (
              <motion.div
                key={dashboard.id}
                variants={itemVariants}
                onMouseEnter={() => setHoveredCard(dashboard.id)}
                onMouseLeave={() => setHoveredCard(null)}
                whileHover={{ y: -8, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="relative group"
              >
                <button
                  disabled={!dashboard.available}
                  onClick={dashboard.onClick}
                  className={`
                    w-full h-full p-8 rounded-3xl border-2 shadow-xl
                    transition-all duration-500 text-left
                    ${dashboard.available
                      ? 'bg-white/80 backdrop-blur-sm border-slate-200 hover:border-slate-300 hover:shadow-2xl cursor-pointer'
                      : 'bg-slate-50/50 backdrop-blur-sm border-slate-200 cursor-not-allowed opacity-60'
                    }
                  `}
                >
                  {/* Top Section - Icon & Status */}
                  <div className="flex items-start justify-between mb-6">
                    {/* Icon Container */}
                    <motion.div
                      animate={isHovered && dashboard.available ? {
                        rotate: [0, -5, 5, -5, 0],
                        scale: [1, 1.05, 1]
                      } : {}}
                      transition={{ duration: 0.5 }}
                      className={`
                        w-16 h-16 rounded-2xl flex items-center justify-center
                        ${dashboard.iconBg} shadow-lg
                      `}
                    >
                      <Icon className={`w-8 h-8 ${dashboard.iconColor}`} />
                    </motion.div>

                    {/* Lock Icon for Coming Soon */}
                    {!dashboard.available && (
                      <div className="bg-slate-200 text-slate-500 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Locked
                      </div>
                    )}

                    {/* NEW Badge for Venue Booking */}
                    {dashboard.id === "venue-booking" && (
                      <div className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        NEW
                      </div>
                    )}

                    {/* Generic badge support (e.g. Night Permissions) */}
                    {dashboard.badge && dashboard.id !== "venue-booking" && (
                      <div className={`${dashboard.badge.bg} ${dashboard.badge.text} px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1`}>
                        <Sparkles className="w-3 h-3" />
                        {dashboard.badge.label}
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-slate-900 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {dashboard.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    {dashboard.description}
                  </p>

                  {/* Features List */}
                  <div className="space-y-2 mb-6">
                    {dashboard.features.map((feature, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.8 + (idx * 0.1) }}
                        className="flex items-center gap-2 text-xs text-slate-500"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-r ${dashboard.gradient}`} />
                        {feature}
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA Section */}
                  {dashboard.available ? (
                    <motion.div
                      animate={isHovered ? { x: 5 } : { x: 0 }}
                      className={`
                        flex items-center gap-2 text-sm font-semibold
                        bg-gradient-to-r ${dashboard.gradient} bg-clip-text text-transparent
                      `}
                    >
                      Open Dashboard
                      <ArrowRight className={`w-4 h-4 text-${dashboard.iconColor.split('-')[1]}-600`} />
                    </motion.div>
                  ) : (
                    <div className="text-sm text-slate-400 font-medium">
                      Stay tuned for updates
                    </div>
                  )}

                  {/* Gradient Overlay on Hover */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered && dashboard.available ? 0.05 : 0 }}
                    className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${dashboard.gradient} pointer-events-none`}
                  />
                </button>

                {/* Glow Effect on Hover */}
                {dashboard.available && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: isHovered ? 0.2 : 0 }}
                    className={`
                      absolute inset-0 -z-10 rounded-3xl blur-2xl
                      bg-gradient-to-br ${dashboard.gradient}
                    `}
                  />
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ECHO FAB */}
      <EchoOrb onClick={() => setShowEcho(true)} />

      <AnimatePresence>
        {showEcho && <EchoModal open={showEcho} onClose={()=>setShowEcho(false)} role={role} userName={userName}/>}
      </AnimatePresence>
      
      <PublicFormsModal open={showPublicForms} onClose={() => setShowPublicForms(false)} />
      
      <DashboardFooter />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@300;400;600;700&display=swap');
      `}</style>
    </div>
  );
};

export default DashboardSelector;
