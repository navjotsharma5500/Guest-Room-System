import React from "react";

const flagStyle = {
  yellow: "bg-yellow-100 text-yellow-800",
  orange: "bg-orange-100 text-orange-800",
  red: "bg-red-100 text-red-800",
};

export default function GuestFlagHistory({ flags = [], canOverride = false, onOverride }) {
  if (!Array.isArray(flags) || flags.length === 0) return null;

  return (
    <div className="border-b border-gray-200 px-6 py-5">
      <h3 className="mb-3 font-semibold text-gray-900">Guest Flag History</h3>
      <div className="space-y-3">
        {flags.map((flag) => {
          const overridden = flag.override?.isOverridden === true;
          return (
            <div key={flag._id} className={`rounded-xl border p-4 ${overridden ? "bg-gray-50 opacity-75" : "bg-white"}`}>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${flagStyle[flag.flagType] || "bg-gray-100 text-gray-700"}`}>
                    {String(flag.flagType || "").toUpperCase()}
                  </span>
                  {overridden && <span className="ml-2 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">Overridden</span>}
                  <p className="mt-2 text-sm text-gray-700">{flag.remarks}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    By {flag.flaggedBy?.name || "User"} · {flag.createdAt ? new Date(flag.createdAt).toLocaleString() : ""}
                  </p>
                  {overridden && (
                    <p className="mt-1 text-xs text-green-700">
                      Override: {flag.override?.remarks || "No remarks"}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {(flag.attachments || []).map((url, index) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700"
                    >
                      File {index + 1}
                    </a>
                  ))}
                  {canOverride && !overridden && (
                    <button
                      onClick={() => onOverride?.(flag)}
                      className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Override
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
