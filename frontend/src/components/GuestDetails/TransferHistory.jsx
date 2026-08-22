import React from "react";
import { ArrowRight, ArrowRightLeft, CheckCircle, Clock } from "lucide-react";

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const sourceStatusLabel = (entry) => {
  const reported = entry.sourceReportedStatus === "reported";
  const checkedIn = entry.sourceStatus === "checked_in";
  if (reported && checkedIn) return "Reported / Checked In";
  if (reported) return "Reported";
  return entry.sourceStatus === "booked" ? "Booked / Not Reported" : entry.sourceStatus || "—";
};

export default function TransferHistory({ history = [], theme = "light" }) {
  if (!Array.isArray(history) || history.length === 0) return null;

  return (
    <section className={`border-b p-6 ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
      <h3 className={`mb-4 flex items-center gap-2 font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
        <ArrowRightLeft className="h-5 w-5 text-blue-600" />
        Transfer History
      </h3>

      <div className="space-y-4">
        {history.map((entry, index) => (
          <div
            key={`${entry.segmentTo || entry.transferredAt}-${index}`}
            className={`rounded-xl border p-4 ${
              theme === "dark" ? "border-gray-700 bg-gray-800" : "border-blue-100 bg-blue-50/50"
            }`}
          >
            <p className={`mb-3 text-sm font-semibold ${theme === "dark" ? "text-blue-300" : "text-blue-800"}`}>
              {formatDateTime(entry.transferredAt || entry.segmentTo)}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span>{entry.fromHostel} · Room {entry.fromRoomNo}</span>
              <ArrowRight className="h-4 w-4 text-blue-600" />
              <span>{entry.toHostel} · Room {entry.toRoomNo}</span>
            </div>

            <div className={`mt-3 grid gap-2 text-sm sm:grid-cols-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              <p>
                <span className="font-medium">Source stay:</span>{" "}
                {formatDateTime(entry.segmentFrom)} → {formatDateTime(entry.segmentTo)}
              </p>
              <p className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span><span className="font-medium">Status at source:</span> {sourceStatusLabel(entry)}</span>
              </p>
              <p className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-amber-600" />
                <span><span className="font-medium">Destination:</span> Awaiting Report In</span>
              </p>
              <p>
                <span className="font-medium">Transferred by:</span>{" "}
                {entry.transferredByName || entry.transferredByEmail || "Authorized user"}
              </p>
            </div>

            {entry.remarks && (
              <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-white text-gray-700"}`}>
                <span className="font-medium">Remarks:</span> {entry.remarks}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

