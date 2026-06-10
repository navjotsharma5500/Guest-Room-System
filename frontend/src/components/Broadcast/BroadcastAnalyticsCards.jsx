import React from "react";
import { AlertTriangle, Clock, MailCheck, MailX, PencilLine } from "lucide-react";

const cards = [
  { key: "sent", label: "Sent", icon: MailCheck, color: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  { key: "scheduled", label: "Scheduled", icon: Clock, color: "bg-blue-50 text-blue-700 border-blue-100" },
  { key: "draft", label: "Drafts", icon: PencilLine, color: "bg-slate-50 text-slate-700 border-slate-100" },
  { key: "failed", label: "Failed", icon: MailX, color: "bg-red-50 text-red-700 border-red-100" },
];

export default function BroadcastAnalyticsCards({ stats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className={`rounded-2xl border p-5 shadow-sm ${color}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold opacity-80">{label}</p>
              <p className="text-3xl font-black mt-2">{stats?.[key] || 0}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      ))}

      <div className="sm:col-span-2 xl:col-span-4 rounded-2xl border border-amber-100 bg-amber-50 text-amber-800 px-5 py-3 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm font-medium">
          Broadcast emails are sent through the existing institutional email system with per-recipient delivery logs.
        </span>
      </div>
    </div>
  );
}
