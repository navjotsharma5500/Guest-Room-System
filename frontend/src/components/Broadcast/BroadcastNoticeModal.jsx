import React from "react";
import { Eye, FileText, Info, X } from "lucide-react";

const labelize = (value = "") =>
  String(value)
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleString();
};

export default function BroadcastNoticeModal({ notice, mode = "detail", onOpen, onClose }) {
  if (!notice) return null;

  const isEmergency = notice.messageType === "emergency";

  return (
    <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-white rounded-[22px] shadow-2xl overflow-hidden border border-slate-200">
        <div className={`${isEmergency ? "bg-red-600" : "bg-cyan-500"} px-6 py-5 text-white flex items-center justify-between`}>
          <div>
            <h2 className="text-2xl font-black">
              {notice.createdByName || "DoSA Office"}
              {notice.createdByRole ? ` (${labelize(notice.createdByRole)})` : ""}
            </h2>
            <p className="text-sm opacity-90 mt-1">{labelize(notice.messageType)} Broadcast</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/15">
            <X className="w-7 h-7" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-lg">
              <span className="font-bold">Recipient:</span>{" "}
              <span className="text-slate-700">
                {notice.specificHostel || (notice.recipientGroups || []).map(labelize).join(", ") || "Selected Users"}
              </span>
            </div>
            <span className={`px-3 py-1 rounded-lg text-sm font-black ${isEmergency ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
              Published
            </span>
          </div>

          <div className={`${isEmergency ? "bg-red-50 border-red-100" : "bg-cyan-50 border-cyan-100"} border rounded-2xl p-5`}>
            <h3 className="text-xl font-black text-slate-900 border-b border-slate-300 pb-3 mb-3">
              {notice.title}
            </h3>
            <div
              className="text-slate-800 text-lg leading-8 prose max-w-none"
              dangerouslySetInnerHTML={{ __html: notice.bodyHtml }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
            <p><span className="font-black">Published Date:</span> {formatDate(notice.sentAt)}</p>
            <p><span className="font-black">Valid Till:</span> {formatDate(notice.noticeEndAt)}</p>
            <p className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              <span className="font-black">Read By:</span> You
              <Info className="w-4 h-4 text-blue-600" />
            </p>
            {(notice.attachments || []).length > 0 && (
              <p className="flex flex-wrap items-center gap-2">
                <span className="font-black">Attached File:</span>
                {notice.attachments.map((file, index) => (
                  <a
                    key={`${file.url}-${index}`}
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 font-bold"
                  >
                    <FileText className="w-4 h-4" />
                    {file.name || `File ${index + 1}`}
                  </a>
                ))}
              </p>
            )}
          </div>

          {mode === "preview" && (
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={onClose}
                className="px-5 py-3 rounded-xl border font-bold text-slate-700 hover:bg-slate-50"
              >
                Later
              </button>
              <button
                onClick={onOpen}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700"
              >
                Open
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
