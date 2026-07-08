import React from "react";

export default function PublicStats({ stats = [] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div key={`${stat.label}-${stat.value}`} className="guest-card rounded-3xl p-6">
          <p className="guest-heading text-3xl font-semibold text-[var(--guest-red)]">{stat.value}</p>
          <p className="mt-2 text-sm font-semibold text-[var(--guest-blue)]">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
