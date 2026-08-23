import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Building2, Globe, IndianRupee, Users, AlertCircle, MessageSquare,
  FileText, Star, Eye, TrendingUp, TrendingDown, Activity, Clock,
  Wifi, Monitor, Smartphone, CheckCircle, XCircle, RefreshCw,
  Database, Zap, Globe2,
} from "lucide-react";
import { BACKEND_URL } from "../../utils/apiConfig";
import { parseISO, format, getQuarter, getYear, subDays, isAfter } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
} from "recharts";

const API = BACKEND_URL;

const PC = {
  red:    "#DC2626", blue:   "#3B82F6", green:  "#10B981", amber:  "#F59E0B",
  purple: "#8B5CF6", teal:   "#14B8A6", pink:   "#EC4899", gray:   "#6B7280",
};

const GA_PERIODS = [
  { value: "today", label: "Today Live" },
  { value: "7", label: "7 Days" },
  { value: "30", label: "30 Days" },
  { value: "90", label: "90 Days" },
];

const GA_SCOPES = [
  { value: "overall", label: "Overall" },
  { value: "campusconnect", label: "Campus Connect" },
  { value: "societies", label: "Student Societies" },
  { value: "permissions", label: "Society Night Permission" },
];

const GA_TABS = [
  { id: "daily", label: "📅 Daily Traffic" },
  { id: "applications", label: "🌐 Traffic by Application" },
  { id: "pages", label: "📄 Top Pages" },
  { id: "sources", label: "🔗 Traffic Sources" },
  { id: "geo", label: "🌍 Geography" },
  { id: "browser", label: "🌐 Browser / OS" },
];

const analyticsErrorDetails = (response, payload) => {
  const errorType = payload?.errorType || (response?.status === 503 ? "not_configured" : "permission_or_api");
  const messages = {
    not_configured: {
      title: "GA4 is not configured",
      message: payload?.message || "The backend analytics configuration is incomplete.",
    },
    permission_or_api: {
      title: "GA4 permission or API failure",
      message: payload?.message || "Google Analytics rejected the reporting request.",
    },
    network: {
      title: "Analytics network error",
      message: payload?.message || "The analytics service could not be reached.",
    },
    invalid_scope: {
      title: "Invalid analytics scope",
      message: payload?.message || "The selected application scope is not supported.",
    },
  };
  return messages[errorType] || {
    title: "Analytics unavailable",
    message: payload?.message || `Analytics request failed${response?.status ? ` (${response.status})` : ""}.`,
  };
};

const fetchGA4Dataset = async (period, scope, signal) => {
  const endpoint = period === "today"
    ? `${API}/api/analytics/ga4/realtime?scope=${encodeURIComponent(scope)}`
    : `${API}/api/analytics/ga4?days=${encodeURIComponent(period)}&scope=${encodeURIComponent(scope)}`;
  const response = await fetch(endpoint, {
    credentials: "include",
    cache: "no-store",
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.configured) {
    const requestError = new Error(payload?.message || "Analytics request failed");
    requestError.details = analyticsErrorDetails(response, payload);
    throw requestError;
  }
  const hasMatchingPeriod = period === "today" || Number(payload.days) === Number(period);
  const hasMatchingScope = payload.scope === scope;
  if (!hasMatchingPeriod || !hasMatchingScope) {
    const requestError = new Error("Analytics response did not match the requested period and scope");
    requestError.details = {
      title: "Analytics response mismatch",
      message: "The analytics service returned data for a different period or application scope. Please refresh and try again.",
    };
    throw requestError;
  }
  return payload;
};

const getOverallTraffic = (period, payload) => payload?.overall || (period !== "today" && payload ? {
  overview: payload.overview,
  peakHour: payload.peakHour,
  devices: payload.devices,
  hourly: payload.hourly,
} : null);

const AdvancedAnalyticsPage = () => {
  const [bookings, setBookings]   = useState([]);
  const [dashStats, setDashStats] = useState(null);
  const [awsStats, setAwsStats]   = useState(null);
  const [awsLoading, setAwsLoading] = useState(true);
  const [ga4Period, setGa4Period] = useState("30");
  const [ga4Scope, setGa4Scope] = useState("overall");
  const [ga4Overall, setGa4Overall] = useState({ period: null, data: null, payload: null });
  const [ga4Detail, setGa4Detail] = useState({ period: null, scope: null, payload: null });
  const [ga4RefreshKey, setGa4RefreshKey] = useState(0);
  const [loading, setLoading]     = useState(true);
  const [ga4OverallLoading, setGa4OverallLoading] = useState(true);
  const [ga4DetailLoading, setGa4DetailLoading] = useState(false);
  const [ga4OverallError, setGa4OverallError] = useState(null);
  const [ga4DetailError, setGa4DetailError] = useState(null);
  const [error, setError]         = useState(null);
  const [range, setRange]         = useState("Monthly");
  const [activeChart, setActiveChart]   = useState("trend");
  const [activeTraffic, setActiveTraffic] = useState("daily");
  const [lastRefresh, setLastRefresh]   = useState(new Date());

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [bookRes, dashRes] = await Promise.all([
        fetch(`${API}/api/bookings/all-for-download`, { credentials: "include" }),
        fetch(`${API}/api/dashboard/stats`, { credentials: "include" }),
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

  const fetchAWS = useCallback(async () => {
    setAwsLoading(true);
    try {
      const res = await fetch(`${API}/api/analytics/aws`, {
        credentials: "include",
      });
      if (res.ok) {
        setAwsStats(await res.json());
      }
    } catch (err) {
      console.error("AWS analytics error:", err);
    } finally {
      setAwsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchAWS();
  }, [fetchData, fetchAWS]);

  useEffect(() => {
    const controller = new AbortController();
    const requestedPeriod = ga4Period;
    setGa4OverallLoading(true);
    setGa4OverallError(null);

    fetchGA4Dataset(requestedPeriod, "overall", controller.signal)
      .then(payload => {
        if (controller.signal.aborted) return;
        setGa4Overall({
          period: requestedPeriod,
          data: getOverallTraffic(requestedPeriod, payload),
          payload,
        });
      })
      .catch(requestError => {
        if (controller.signal.aborted) return;
        setGa4OverallError(requestError?.details || {
          title: "Analytics network error",
          message: requestError?.message || "The analytics service could not be reached.",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setGa4OverallLoading(false);
      });

    return () => controller.abort();
  }, [ga4Period, ga4RefreshKey]);

  useEffect(() => {
    if (ga4Scope === "overall") {
      setGa4DetailLoading(false);
      setGa4DetailError(null);
      return undefined;
    }

    const controller = new AbortController();
    const requestedPeriod = ga4Period;
    const requestedScope = ga4Scope;
    setGa4DetailLoading(true);
    setGa4DetailError(null);

    fetchGA4Dataset(requestedPeriod, requestedScope, controller.signal)
      .then(payload => {
        if (controller.signal.aborted) return;
        setGa4Detail({ period: requestedPeriod, scope: requestedScope, payload });
      })
      .catch(requestError => {
        if (controller.signal.aborted) return;
        setGa4DetailError(requestError?.details || {
          title: "Analytics network error",
          message: requestError?.message || "The analytics service could not be reached.",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setGa4DetailLoading(false);
      });

    return () => controller.abort();
  }, [ga4Period, ga4Scope, ga4RefreshKey]);

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const total      = bookings.length;
  const cancelled  = bookings.filter(b => b.status === "cancelled").length;
  const checkedOut = bookings.filter(b => b.status === "checked_out").length;
  const checkedIn  = bookings.filter(b => b.reportedStatus === "reported" || b.status === "checked_in").length;
  const booked     = bookings.filter(b => b.status === "booked").length;
  const free       = bookings.filter(b => b.paymentType === "Free").length;
  const paid       = bookings.filter(b => b.paymentType === "Paid").length;
  const revenue    = bookings.reduce((s, b) => s + (b.paymentType === "Paid" ? Number(b.paidAmount) || 0 : 0), 0);
  const billed     = bookings.reduce((s, b) => {
    if (b.paymentType !== "Paid") return s;
    // If cancelled, billed = paid + discount so pending is 0
    if (b.status === "cancelled") {
      return s + (Number(b.paidAmount) || 0) + (Number(b.discount) || 0);
    }
    return s + (Number(b.totalAmount) || 0);
  }, 0);
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

  const isRealtime = ga4Period === "today";
  const gaData = ga4Scope === "overall"
    ? (ga4Overall.period === ga4Period ? ga4Overall.payload : null)
    : (ga4Detail.period === ga4Period && ga4Detail.scope === ga4Scope ? ga4Detail.payload : null);
  const overallTraffic = ga4Overall.period === ga4Period ? ga4Overall.data : null;
  const ga4Loading = ga4OverallLoading || (ga4Scope !== "overall" && ga4DetailLoading);
  const ga4Error = ga4OverallError || (ga4Scope !== "overall" ? ga4DetailError : null);
  const selectedScopeLabel = GA_SCOPES.find(scope => scope.value === ga4Scope)?.label || "Overall";
  const overallKpis = isRealtime && overallTraffic ? [
    { label: "Active Users Now", value: overallTraffic.activeUsers.toLocaleString(), sub: "genuine GA4 realtime users", icon: Activity, iconBg: "bg-emerald-100", iconColor: "text-emerald-600" },
    { label: "Page Views", value: overallTraffic.pageViews.toLocaleString(), sub: "views in the realtime window", icon: Eye, iconBg: "bg-purple-100", iconColor: "text-purple-600" },
    { label: "Events", value: overallTraffic.eventCount.toLocaleString(), sub: "events in the realtime window", icon: Zap, iconBg: "bg-blue-100", iconColor: "text-blue-600" },
    { label: "Key Events", value: overallTraffic.keyEvents.toLocaleString(), sub: "GA4 key events in realtime", icon: Star, iconBg: "bg-amber-100", iconColor: "text-amber-600" },
  ] : overallTraffic?.overview ? [
    { label: "Total Sessions", value: overallTraffic.overview.sessions.toLocaleString(),
      sub: `vs ${overallTraffic.overview.prevSessions.toLocaleString()} prev period`,
      icon: Activity, iconBg: "bg-blue-100", iconColor: "text-blue-600",
      trendUp: overallTraffic.overview.sessions >= overallTraffic.overview.prevSessions,
      trend: overallTraffic.overview.prevSessions > 0 ? `${overallTraffic.overview.sessions >= overallTraffic.overview.prevSessions ? "+" : ""}${Math.round(((overallTraffic.overview.sessions - overallTraffic.overview.prevSessions) / overallTraffic.overview.prevSessions) * 100)}%` : null },
    { label: "Total Users", value: overallTraffic.overview.totalUsers.toLocaleString(),
      sub: `${overallTraffic.overview.newUsers.toLocaleString()} new · ${overallTraffic.overview.returningUsers.toLocaleString()} returning`,
      icon: Users, iconBg: "bg-green-100", iconColor: "text-green-600",
      trendUp: overallTraffic.overview.totalUsers >= overallTraffic.overview.prevUsers,
      trend: overallTraffic.overview.prevUsers > 0 ? `${overallTraffic.overview.totalUsers >= overallTraffic.overview.prevUsers ? "+" : ""}${Math.round(((overallTraffic.overview.totalUsers - overallTraffic.overview.prevUsers) / overallTraffic.overview.prevUsers) * 100)}% vs prev` : null },
    { label: "Page Views", value: overallTraffic.overview.pageViews.toLocaleString(),
      sub: `${overallTraffic.overview.sessions > 0 ? (overallTraffic.overview.pageViews / overallTraffic.overview.sessions).toFixed(1) : 0} pages/session`,
      icon: Eye, iconBg: "bg-purple-100", iconColor: "text-purple-600",
      trendUp: overallTraffic.overview.pageViews >= overallTraffic.overview.prevPageViews,
      trend: overallTraffic.overview.prevPageViews > 0 ? `${overallTraffic.overview.pageViews >= overallTraffic.overview.prevPageViews ? "+" : ""}${Math.round(((overallTraffic.overview.pageViews - overallTraffic.overview.prevPageViews) / overallTraffic.overview.prevPageViews) * 100)}% vs prev` : null },
    { label: "Bounce Rate", value: `${overallTraffic.overview.bounceRate}%`,
      sub: `avg ${Math.floor(overallTraffic.overview.avgSessionDuration / 60)}m ${overallTraffic.overview.avgSessionDuration % 60}s session`,
      icon: TrendingDown, iconBg: "bg-amber-100", iconColor: "text-amber-600",
      trendUp: overallTraffic.overview.bounceRate < 50,
      trend: overallTraffic.overview.bounceRate < 50 ? "Good bounce rate" : "High bounce rate" },
  ] : [];

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
              { label: "Total Users",        value: dashStats.users,                  icon: Users,         color: "text-blue-700" },
              { label: "Total Bookings(DB)", value: dashStats.bookings,               icon: FileText,      color: "text-green-700" },
              { label: "Enquiries",          value: dashStats.enquiries,              icon: MessageSquare, color: "text-purple-700" },
              { label: "Pending Tokens",     value: dashStats.tokens?.pending ?? "—", icon: Clock,         color: "text-amber-700" },
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
          <div className="flex items-center gap-1.5 flex-wrap">
              {GA_PERIODS.map(option => (
                <button key={option.value} onClick={() => setGa4Period(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    ga4Period === option.value ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}>{option.label}</button>
              ))}
              <button onClick={() => setGa4RefreshKey(key => key + 1)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition" aria-label="Refresh Google Analytics">
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${ga4Loading ? "animate-spin" : ""}`} />
              </button>
          </div>
        </div>

        {ga4Loading ? (
          <div className="flex items-center justify-center py-10 bg-white/60 rounded-2xl border border-white/80">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">Loading traffic data…</p>
            </div>
          </div>
        ) : ga4Error ? (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-orange-800 mb-1">{ga4Error.title}</p>
                <p className="text-xs text-orange-600 mb-3 leading-relaxed">
                  {ga4Error.message}
                </p>
              </div>
            </div>
          </div>
        ) : !gaData?.configured ? (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
            Analytics returned no usable response.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold tracking-wider text-slate-500 uppercase">Overall Traffic</p>
              {isRealtime && <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">Live now</span>}
            </div>
            {/* GA4 KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {overallKpis.map((k, i) => (
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

            {/* Historical Overall details */}
            {!isRealtime && overallTraffic?.overview && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-4 border border-white/80 shadow-sm">
                <p className="text-xs font-bold text-slate-600 mb-3 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> New vs Returning</p>
                {[{ label: "New Users", value: overallTraffic.overview.newUsers, color: "bg-blue-500" },
                  { label: "Returning", value: overallTraffic.overview.returningUsers, color: "bg-green-500" }].map((u, i) => {
                  const pct = overallTraffic.overview.totalUsers > 0 ? (u.value / overallTraffic.overview.totalUsers) * 100 : 0;
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
                <p className="text-3xl font-bold text-blue-700">{overallTraffic.peakHour}</p>
                <p className="text-xs text-slate-400 mt-1">Most active hour across all applications</p>
                <div className="mt-3 flex gap-1 flex-wrap">
                  {(overallTraffic.hourly || []).filter((_, i) => i % 3 === 0).slice(0, 8).map((h, i) => {
                    const max = Math.max(...(overallTraffic.hourly || []).map(x => x.sessions));
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
                {(overallTraffic.devices || []).map((d, i) => {
                  const tot = (overallTraffic.devices || []).reduce((s, x) => s + x.sessions, 0);
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
            )}

            <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Application scope</span>
                {GA_SCOPES.map(scope => (
                  <button key={scope.value} onClick={() => setGa4Scope(scope.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      ga4Scope === scope.value ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:border-blue-300"
                    }`}>
                    {scope.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                Detail panels are filtered to {selectedScopeLabel}. Overall Traffic cards above always remain combined.
              </p>
            </div>

            {!gaData.hasData && (
              <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 text-sm text-slate-500">
                No Google Analytics data was returned for {selectedScopeLabel} in this period.
              </div>
            )}

            {/* GA4 Chart tabs */}
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-100 overflow-x-auto">
                {GA_TABS.map(tab => (
                  <button key={tab.id} onClick={() => setActiveTraffic(tab.id)}
                    className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-all ${activeTraffic === tab.id ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50" : "text-slate-500 hover:text-slate-700"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {activeTraffic === "daily" && (isRealtime ? (gaData.activity || []).length > 0 : (gaData.daily || []).length > 0) && (
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={isRealtime
                      ? (gaData.activity || []).map(item => ({ ...item, date: item.minutesAgo === 0 ? "Now" : `${item.minutesAgo}m ago`, sessions: item.activeUsers }))
                      : gaData.daily}>
                      <defs>
                        <linearGradient id="sG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient>
                        <linearGradient id="uG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.12}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" /><XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => isRealtime ? d : d.slice(5)} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
                      <Area type="monotone" dataKey="sessions"  stroke="#3B82F6" fill="url(#sG)" strokeWidth={2} name={isRealtime ? "Active Users" : "Sessions"} />
                      {!isRealtime && <Area type="monotone" dataKey="users" stroke="#10B981" fill="url(#uG)" strokeWidth={2} name="Users" />}
                      <Area type="monotone" dataKey="pageViews" stroke="#8B5CF6" fill="none" strokeWidth={1.5} strokeDasharray="4 2" name="Page Views" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                {activeTraffic === "daily" && (isRealtime ? (gaData.activity || []).length === 0 : (gaData.daily || []).length === 0) && (
                  <p className="text-sm text-slate-400">No traffic trend data is available for {selectedScopeLabel}.</p>
                )}
                {activeTraffic === "sources" && (
                  isRealtime ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Traffic-source dimensions are not supported by the GA4 Realtime API. Select 7, 30, or 90 Days for acquisition data.
                    </div>
                  ) : <div className="space-y-3">
                    {(gaData.sources || []).map((s, i) => {
                      const max = Math.max(...(gaData.sources||[]).map(x=>x.sessions));
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
                {activeTraffic === "applications" && (
                  <div className="space-y-3">
                    {(gaData.applications || []).map((application, i) => {
                      const metricValue = isRealtime ? application.activeUsers : application.sessions;
                      const totalMetric = (gaData.applications || []).reduce(
                        (sum, item) => sum + (isRealtime ? item.activeUsers : item.sessions),
                        0
                      );
                      const pct = totalMetric > 0 ? (metricValue / totalMetric) * 100 : 0;
                      const colors = [PC.blue, PC.purple, PC.amber];
                      return (
                        <div key={application.key} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <span className="text-xs font-semibold text-slate-700 truncate">{application.label}</span>
                            <span className="text-xs font-bold text-slate-800">{metricValue.toLocaleString()} {isRealtime ? "active users" : "sessions"}</span>
                          </div>
                          <div className="bg-slate-200/70 rounded-full h-2 overflow-hidden">
                            <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{delay:i*0.08,duration:0.6}} className="h-full rounded-full" style={{backgroundColor:colors[i%colors.length]}} />
                          </div>
                          <div className="flex gap-4 mt-2 text-[11px] text-slate-500">
                            <span>{pct.toFixed(1)}% of {isRealtime ? "active users" : "sessions"}</span>
                            {!isRealtime && <span>{application.users.toLocaleString()} users</span>}
                            <span>{application.pageViews.toLocaleString()} page views</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {activeTraffic === "pages" && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100">
                      <span className="col-span-1">#</span><span className="col-span-7">Application | Page</span><span className="col-span-2 text-right">{isRealtime ? "Active" : "Views"}</span><span className="col-span-2 text-right">{isRealtime ? "Views" : "Avg Time"}</span>
                    </div>
                    {((isRealtime ? gaData.activePages : gaData.topPages) || []).map((p, i) => (
                      <div key={i} className="grid grid-cols-12 gap-2 text-xs py-2 border-b border-slate-50 hover:bg-slate-50/50 rounded-lg px-1 transition">
                        <span className="col-span-1 text-slate-400 font-bold">{i+1}</span>
                        <span className="col-span-7 text-slate-700 truncate font-medium" title={`${p.application || p.domain} | ${p.page || "/"}`}>
                          <span className="text-slate-400">{p.application || p.domain} | </span>{p.page||"/"}
                        </span>
                        <span className="col-span-2 text-right font-semibold text-slate-800">{(isRealtime ? p.activeUsers : p.views).toLocaleString()}</span>
                        <span className="col-span-2 text-right text-slate-400">{isRealtime ? p.pageViews.toLocaleString() : `${Math.floor(p.avgDuration/60)}m ${Math.round(p.avgDuration%60)}s`}</span>
                      </div>
                    ))}
                    {((isRealtime ? gaData.activePages : gaData.topPages) || []).length === 0 && (
                      <p className="text-sm text-slate-400 py-3">No pages were reported for {selectedScopeLabel}.</p>
                    )}
                  </div>
                )}
                {activeTraffic === "geo" && (
                  <div className="space-y-2">
                    {(gaData.countries||[]).map((c, i) => {
                      const metricValue = isRealtime ? c.activeUsers : c.sessions;
                      const max = Math.max(...(gaData.countries||[]).map(x => isRealtime ? x.activeUsers : x.sessions));
                      const pct = max > 0 ? (metricValue/max)*100 : 0;
                      return (
                        <div key={i} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-400 w-5 text-right">{i+1}</span>
                          <span className="text-xs text-slate-700 w-28 truncate font-medium">{c.country}</span>
                          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{delay:i*0.05,duration:0.6}} className="h-full rounded-full bg-teal-500" />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 w-24 text-right">{metricValue.toLocaleString()} {isRealtime ? "active" : "sessions"}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                {activeTraffic === "browser" && (
                  isRealtime ? (
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-3">📱 Device Categories</p>
                      {(gaData.devices || []).map((device, index) => {
                        const max = Math.max(...(gaData.devices || []).map(item => item.activeUsers));
                        const pct = max > 0 ? (device.activeUsers / max) * 100 : 0;
                        return (
                          <div key={device.device} className="flex items-center gap-2 mb-2">
                            <span className="text-xs text-slate-600 capitalize w-24 truncate">{device.device}</span>
                            <div className="flex-1 bg-slate-100 rounded-full h-2"><motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{delay:index*0.05}} className="h-full rounded-full bg-blue-500" /></div>
                            <span className="text-xs font-semibold text-slate-700 w-16 text-right">{device.activeUsers.toLocaleString()} active</span>
                          </div>
                        );
                      })}
                      <p className="text-[11px] text-slate-400 mt-3">Browser and operating-system dimensions are not supported by the GA4 Realtime API; realtime device category is shown instead.</p>
                    </div>
                  ) : <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p className="text-xs font-bold text-slate-600 mb-3">🌐 Browsers</p>
                      {(gaData.browsers||[]).map((b,i) => {
                        const max = Math.max(...(gaData.browsers||[]).map(x=>x.sessions));
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
                      {(gaData.oses||[]).map((o,i) => {
                        const max = Math.max(...(gaData.oses||[]).map(x=>x.sessions));
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

      {/* ══════════════════════════════════════════════════════════
          AWS INFRASTRUCTURE
          ══════════════════════════════════════════════════════════ */}
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-white/80 shadow-sm p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-500" /> AWS Infrastructure
        </h3>

        {awsLoading ? (
          <div className="flex items-center gap-2 py-4">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-400">Loading AWS metrics…</p>
          </div>
        ) : !awsStats ? (
          <div className="flex items-center gap-2 py-4">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <p className="text-xs text-red-400">AWS analytics unavailable — check EC2_INSTANCE_ID and AWS credentials in .env</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <KpiCard
              label="CPU Usage"
              value={`${awsStats.cpu}%`}
              sub="EC2 CPU utilization"
              icon={Activity}
              iconBg="bg-blue-100"
              iconColor="text-blue-600"
            />
            <KpiCard
              label="Network In"
              value={`${Math.round(awsStats.networkIn / 1024 / 1024)} MB`}
              sub="Incoming traffic"
              icon={Wifi}
              iconBg="bg-green-100"
              iconColor="text-green-600"
            />
            <KpiCard
              label="Network Out"
              value={`${Math.round(awsStats.networkOut / 1024 / 1024)} MB`}
              sub="Outgoing traffic"
              icon={Globe}
              iconBg="bg-purple-100"
              iconColor="text-purple-600"
            />
            <KpiCard
              label="Server Status"
              value={awsStats.instanceStatus}
              sub="EC2 health"
              icon={CheckCircle}
              iconBg="bg-emerald-100"
              iconColor="text-emerald-600"
              color={awsStats.instanceStatus === "running" ? "text-emerald-600" : "text-red-600"}
            />
            <KpiCard
              label="Monthly Cost"
              value={`$${awsStats.monthlyCost}`}
              sub="AWS estimated bill"
              icon={IndianRupee}
              iconBg="bg-amber-100"
              iconColor="text-amber-600"
            />
          </div>
        )}
      </div>

    </div>
  );
};

export default AdvancedAnalyticsPage;
