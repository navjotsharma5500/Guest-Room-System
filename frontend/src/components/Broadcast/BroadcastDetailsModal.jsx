import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const statusStyles = {
  sent: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-amber-100 text-amber-700",
  skipped: "bg-slate-100 text-slate-700",
};

export default function BroadcastDetailsModal({ message, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!message?._id) return;

    const loadDetails = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/broadcasts/${message._id}`, { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to load broadcast");
        setDetails(data);
      } catch (err) {
        setDetails({ message, logs: [], error: err.message });
      } finally {
        setLoading(false);
      }
    };

    loadDetails();
  }, [message]);

  if (!message) return null;

  const logs = details?.logs || [];
  const filteredLogs = filter === "all" ? logs : logs.filter((log) => log.status === filter);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-black text-slate-900">{message.title}</h2>
            <p className="text-sm text-slate-500">{message.subject}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-76px)] space-y-6">
          {loading ? (
            <div className="text-center text-slate-500 py-10">Loading delivery details...</div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 font-bold">Recipients</p>
                  <p className="text-2xl font-black">{message.totalRecipients || 0}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700">
                  <p className="text-xs font-bold">Sent</p>
                  <p className="text-2xl font-black">{message.sentCount || 0}</p>
                </div>
                <div className="rounded-2xl bg-red-50 p-4 text-red-700">
                  <p className="text-xs font-bold">Failed</p>
                  <p className="text-2xl font-black">{message.failedCount || 0}</p>
                </div>
                <div className="rounded-2xl bg-blue-50 p-4 text-blue-700">
                  <p className="text-xs font-bold">Status</p>
                  <p className="text-lg font-black capitalize">{message.status}</p>
                </div>
              </div>

              <div>
                <h3 className="font-black text-slate-900 mb-2">Message Body</h3>
                <div
                  className="rounded-2xl border bg-slate-50 p-4 prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: details?.message?.bodyHtml || message.bodyHtml }}
                />
              </div>

              {(details?.message?.attachments || message.attachments || []).length > 0 && (
                <div>
                  <h3 className="font-black text-slate-900 mb-2">Attachments</h3>
                  <div className="flex flex-wrap gap-2">
                    {(details?.message?.attachments || message.attachments).map((file, index) => (
                      <a
                        key={`${file.url}-${index}`}
                        href={file.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-sm font-semibold"
                      >
                        {file.name || `Attachment ${index + 1}`}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <h3 className="font-black text-slate-900">Delivery Logs</h3>
                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    className="border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="sent">Sent</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <div className="rounded-2xl border overflow-hidden">
                  <div className="max-h-80 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="text-left px-4 py-3">Recipient</th>
                          <th className="text-left px-4 py-3">Group</th>
                          <th className="text-left px-4 py-3">Status</th>
                          <th className="text-left px-4 py-3">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {filteredLogs.map((log) => (
                          <tr key={log._id}>
                            <td className="px-4 py-3">
                              <div className="font-semibold">{log.recipientName || "-"}</div>
                              <div className="text-xs text-slate-500">{log.recipientEmail}</div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{log.recipientGroup || "-"}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${statusStyles[log.status] || statusStyles.pending}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-red-600 text-xs">{log.errorMessage || "-"}</td>
                          </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                          <tr>
                            <td colSpan="4" className="px-4 py-8 text-center text-slate-500">
                              No delivery logs found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
