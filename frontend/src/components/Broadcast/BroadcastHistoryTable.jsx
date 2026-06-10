import React from "react";
import { Eye, Send, XCircle } from "lucide-react";

const statusStyles = {
  draft: "bg-slate-100 text-slate-700",
  scheduled: "bg-blue-100 text-blue-700",
  sending: "bg-amber-100 text-amber-700",
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-zinc-200 text-zinc-700",
};

const labelize = (value = "") =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function BroadcastHistoryTable({
  messages,
  loading,
  onView,
  onSendNow,
  onCancel,
}) {
  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center text-slate-500">
        Loading broadcast history...
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="rounded-2xl border bg-white p-12 text-center">
        <p className="text-lg font-bold text-slate-800">No broadcasts found</p>
        <p className="text-sm text-slate-500 mt-1">Create a draft, send now, or schedule a broadcast.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-5 py-4 font-bold">Message</th>
              <th className="text-left px-5 py-4 font-bold">Type</th>
              <th className="text-left px-5 py-4 font-bold">Status</th>
              <th className="text-left px-5 py-4 font-bold">Delivery</th>
              <th className="text-left px-5 py-4 font-bold">Schedule</th>
              <th className="text-right px-5 py-4 font-bold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {messages.map((message) => (
              <tr key={message._id} className="hover:bg-slate-50/70">
                <td className="px-5 py-4">
                  <p className="font-bold text-slate-900">{message.title}</p>
                  <p className="text-xs text-slate-500">{message.subject}</p>
                </td>
                <td className="px-5 py-4 text-slate-700">{labelize(message.messageType)}</td>
                <td className="px-5 py-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyles[message.status] || statusStyles.draft}`}>
                    {labelize(message.status)}
                  </span>
                </td>
                <td className="px-5 py-4 text-slate-700">
                  <div className="font-semibold">{message.sentCount || 0}/{message.totalRecipients || 0} sent</div>
                  {(message.failedCount || 0) > 0 && (
                    <div className="text-xs text-red-600">{message.failedCount} failed</div>
                  )}
                </td>
                <td className="px-5 py-4 text-slate-600">
                  {message.scheduledAt
                    ? new Date(message.scheduledAt).toLocaleString()
                    : message.sentAt
                      ? new Date(message.sentAt).toLocaleString()
                      : "-"}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onView(message)}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-blue-700 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </button>
                    {["draft", "scheduled", "failed"].includes(message.status) && (
                      <button
                        onClick={() => onSendNow(message)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Send className="w-4 h-4" />
                        Send
                      </button>
                    )}
                    {message.status === "scheduled" && (
                      <button
                        onClick={() => onCancel(message)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
