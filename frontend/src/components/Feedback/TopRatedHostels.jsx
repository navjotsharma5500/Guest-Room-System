import React from "react";

export default function TopRatedHostels({ hostels = [] }) {
  const topHostels = hostels.slice(0, 8);

  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Top Rated Hostels</h3>
          <p className="text-sm text-slate-500">Ranking by average guest rating and review volume.</p>
        </div>
      </div>

      <div className="space-y-3">
        {topHostels.map((hostel, index) => (
          <div key={hostel.hostel} className="rounded-xl border bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">
                  #{index + 1} {hostel.hostel}
                </p>
                <p className="text-xs text-slate-500">
                  {hostel.totalReviews} review(s) · {hostel.internalReviews} internal · {hostel.publicReviews} public
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-yellow-100 px-3 py-1 text-sm font-semibold text-yellow-800">
                ⭐ {Number(hostel.averageRating || 0).toFixed(1)}
              </span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-red-500"
                style={{ width: `${Math.min(100, (Number(hostel.averageRating || 0) / 5) * 100)}%` }}
              />
            </div>
          </div>
        ))}

        {topHostels.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-slate-500">
            No hostel rating data available yet.
          </div>
        )}
      </div>
    </div>
  );
}
