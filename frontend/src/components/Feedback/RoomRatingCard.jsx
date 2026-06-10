import React from "react";

export default function RoomRatingCard({ room }) {
  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-900">{room?.roomNo || "Room"}</h4>
          <p className="text-xs text-slate-500">{room?.hostel || "Hostel"}</p>
        </div>
        <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-700">
          ⭐ {Number(room?.averageRating || 0).toFixed(1)}
        </span>
      </div>
      <div className="mt-4 h-2 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          style={{ width: `${Math.min(100, (Number(room?.averageRating || 0) / 5) * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-500">{room?.totalReviews || 0} review(s)</p>
    </div>
  );
}
