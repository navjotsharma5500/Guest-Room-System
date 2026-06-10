import React from "react";

export default function HostelRatingCard({ title, hostel, rating, reviews, tone = "blue" }) {
  const color = tone === "red" ? "from-red-600 to-orange-500" : "from-blue-600 to-cyan-500";

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className={`bg-gradient-to-r ${color} p-4 text-white`}>
        <p className="text-xs uppercase tracking-[0.2em] opacity-80">{title}</p>
        <h3 className="text-xl font-semibold mt-1">{hostel || "No hostel yet"}</h3>
      </div>
      <div className="p-5">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-semibold text-slate-900">⭐ {Number(rating || 0).toFixed(1)}</span>
          <span className="pb-1 text-slate-500 font-medium">/ 5</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">{reviews || 0} review(s)</p>
      </div>
    </div>
  );
}
