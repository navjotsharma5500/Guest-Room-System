import React from "react";

const styles = {
  occupied: "bg-red-100 text-red-700 border-red-200",
  cleaning_pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  available: "bg-green-100 text-green-700 border-green-200",
  maintenance_blocked: "bg-gray-200 text-gray-700 border-gray-300",
};

const labels = {
  occupied: "🔴 Occupied",
  cleaning_pending: "🟡 Cleaning Pending",
  available: "🟢 Available",
  maintenance_blocked: "⚫ Maintenance Blocked",
};

export default function RoomCleaningStatusBadge({ state = "available", className = "" }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold ${styles[state] || styles.available} ${className}`}>
      {labels[state] || labels.available}
    </span>
  );
}
