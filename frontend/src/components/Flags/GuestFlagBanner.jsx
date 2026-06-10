import React from "react";
import { AlertOctagon, ShieldAlert } from "lucide-react";

export default function GuestFlagBanner({ risk, onOverrideAll, canOverride = false }) {
  if (!risk || risk.disabled) return null;
  const hasFlags = Number(risk.severityScore || 0) > 0 || (risk.flags || []).length > 0;
  if (!hasFlags) return null;

  return (
    <div
      className={`border-b px-6 py-4 ${
        risk.blocked ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {risk.blocked ? (
            <AlertOctagon className="mt-0.5 h-5 w-5 text-red-700" />
          ) : (
            <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
          )}
          <div>
            <p className={`font-bold ${risk.blocked ? "text-red-800" : "text-amber-800"}`}>
              {risk.blocked ? "Guest Blocked" : "Guest Has Active Flags"}
            </p>
            <p className="text-sm text-gray-700">
              Yellow: {risk.counts?.yellow || 0} · Orange: {risk.counts?.orange || 0} · Red: {risk.counts?.red || 0} · Severity:{" "}
              {risk.severityScore || 0}/{risk.blockScore || 0}
            </p>
            {risk.reason && <p className="mt-1 text-sm text-red-700">{risk.reason}</p>}
          </div>
        </div>
        {canOverride && risk.blocked && onOverrideAll && (
          <button
            onClick={onOverrideAll}
            className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100"
          >
            Admin Override
          </button>
        )}
      </div>
    </div>
  );
}
