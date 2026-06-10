import React, { useEffect, useMemo, useState } from "react";
import HostelRatingCard from "./HostelRatingCard";
import RoomRatingCard from "./RoomRatingCard";
import TopRatedHostels from "./TopRatedHostels";
import { BACKEND_URL } from "../../utils/apiConfig";
import useSystemSettings from "../../hooks/useSystemSettings";

const API = BACKEND_URL || "";

export default function FeedbackAnalytics({ selectedHostel = "", dateFrom = "", dateTo = "", theme = "light" }) {
  const { settings } = useSystemSettings();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const enabled = settings?.operations?.enableHostelRatings !== false;

  useEffect(() => {
    if (!enabled) return;

    const loadAnalytics = async () => {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams();
        if (selectedHostel) params.set("hostel", selectedHostel);
        if (dateFrom) params.set("startDate", dateFrom);
        if (dateTo) params.set("endDate", dateTo);
        const response = await fetch(`${API}/api/feedback/analytics?${params.toString()}`, {
          credentials: "include",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Failed to load feedback analytics");
        setAnalytics(data.analytics);
      } catch (err) {
        setError(err.message || "Failed to load feedback analytics");
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [enabled, selectedHostel, dateFrom, dateTo]);

  const latestTrend = useMemo(() => {
    const trends = analytics?.ratingTrends || [];
    return trends[trends.length - 1] || null;
  }, [analytics]);

  if (!enabled) return null;

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-6 text-center text-slate-500">
        Loading rating analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
        {error}
      </div>
    );
  }

  if (!analytics) return null;

  return (
    <section className={`space-y-5 ${theme === "dark" ? "text-slate-900" : ""}`}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Average Hostel Rating" value={`⭐ ${Number(analytics.averageHostelRating || 0).toFixed(1)} / 5`} />
        <MetricCard label="Average Room Rating" value={`⭐ ${Number(analytics.averageRoomRating || 0).toFixed(1)} / 5`} />
        <MetricCard label="Total Reviews" value={analytics.totalReviews || 0} />
        <MetricCard label="Latest Trend" value={latestTrend ? `⭐ ${latestTrend.averageRating} / 5` : "No trend"} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <HostelRatingCard
          title="Top Rated Hostel"
          hostel={analytics.topRatedHostel?.hostel}
          rating={analytics.topRatedHostel?.averageRating}
          reviews={analytics.topRatedHostel?.totalReviews}
          tone="red"
        />
        <HostelRatingCard
          title="Most Reviewed Hostel"
          hostel={analytics.mostReviewedHostel?.hostel}
          rating={analytics.mostReviewedHostel?.averageRating}
          reviews={analytics.mostReviewedHostel?.totalReviews}
          tone="blue"
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <TopRatedHostels hostels={analytics.hostelRankings || []} />
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900">Top Rated Rooms</h3>
          <p className="mb-4 text-sm text-slate-500">Room rankings use booking-linked internal feedback.</p>
          <div className="space-y-3">
            {(analytics.roomRankings || []).slice(0, 8).map((room) => (
              <RoomRatingCard key={`${room.hostel}-${room.roomNo}`} room={room} />
            ))}
            {(!analytics.roomRankings || analytics.roomRankings.length === 0) && (
              <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">
                No room rating data available yet.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Rating Trends</h3>
        <p className="mb-4 text-sm text-slate-500">Monthly average rating and review count.</p>
        <div className="space-y-3">
          {(analytics.ratingTrends || []).slice(-12).map((trend) => (
            <div key={trend.period} className="grid items-center gap-3 md:grid-cols-[120px_1fr_120px]">
              <span className="font-bold text-slate-700">{trend.period}</span>
              <div className="h-3 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                  style={{ width: `${Math.min(100, (Number(trend.averageRating || 0) / 5) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-800">
                ⭐ {trend.averageRating} · {trend.totalReviews}
              </span>
            </div>
          ))}
          {(!analytics.ratingTrends || analytics.ratingTrends.length === 0) && (
            <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">
              No rating trend data available yet.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-400 font-semibold">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
