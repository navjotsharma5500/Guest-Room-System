import React, { useMemo, useRef, useState } from "react";
import { IKContext, IKUpload } from "imagekitio-react";
import { Bold, CalendarClock, Italic, List, Paperclip, Send, Save, X } from "lucide-react";
import {
  IMAGEKIT_AUTH_ENDPOINT,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
} from "../../utils/apiConfig";

const messageTypes = [
  ["general", "General"],
  ["emergency", "Emergency"],
  ["checkout_reminder", "Checkout Reminder"],
  ["payment_reminder", "Payment Reminder"],
  ["maintenance_alert", "Maintenance Alert"],
  ["defaulter_reminder", "Defaulter Reminder"],
  ["extension_reminder", "Extension Reminder"],
];

const recipientGroups = [
  ["all_caretakers", "All Caretakers"],
  ["all_wardens", "All Wardens"],
  ["all_active_guests", "All Active Guests"],
  ["all_defaulters", "All Defaulters"],
  ["specific_hostel", "Specific Hostel"],
  ["custom", "Custom Email List"],
];

const authenticator = async () => {
  const res = await fetch(IMAGEKIT_AUTH_ENDPOINT, { method: "GET" });
  if (!res.ok) throw new Error(`ImageKit auth failed ${res.status}`);
  const data = await res.json();
  return {
    signature: data.signature,
    expire: data.expire,
    token: data.token,
    publicKey: data.publicKey,
  };
};

const toText = (html) =>
  String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export default function BroadcastComposerModal({ onClose, onSaved }) {
  const editorRef = useRef(null);
  const [form, setForm] = useState({
    messageType: "general",
    title: "",
    subject: "",
    bodyHtml: "",
    recipientGroups: [],
    specificHostel: "",
    customEmails: "",
    scheduledAt: "",
    noticeEnabled: true,
    noticeStartAt: "",
    noticeEndAt: "",
  });
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const hasSpecificHostel = form.recipientGroups.includes("specific_hostel");
  const hasCustomEmails = form.recipientGroups.includes("custom");
  const canCreateNotice = ["general", "emergency"].includes(form.messageType);

  const payload = useMemo(
    () => ({
      ...form,
      customEmails: form.customEmails,
      attachments,
      bodyText: toText(form.bodyHtml),
    }),
    [form, attachments]
  );

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleGroup = (group) => {
    setForm((prev) => ({
      ...prev,
      recipientGroups: prev.recipientGroups.includes(group)
        ? prev.recipientGroups.filter((item) => item !== group)
        : [...prev.recipientGroups, group],
    }));
  };

  const applyEditorCommand = (command) => {
    editorRef.current?.focus();
    document.execCommand(command, false, null);
    updateField("bodyHtml", editorRef.current?.innerHTML || "");
  };

  const submit = async (mode) => {
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/broadcasts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Broadcast request failed");
      onSaved(data.message || "Broadcast saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const loadPreview = async () => {
    setError("");
    try {
      const res = await fetch("/api/broadcasts/preview", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Recipient preview failed");
      setPreview(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUploadSuccess = (response) => {
    const url =
      response.url ||
      (response.filePath ? `${IMAGEKIT_URL_ENDPOINT}${response.filePath}` : null) ||
      response?.data?.url;

    if (!url) {
      setError("Upload failed: no file URL returned.");
      setUploading(false);
      return;
    }

    setAttachments((prev) => [
      ...prev,
      {
        url,
        name: response.name || response.fileName || "Broadcast attachment",
        type: response.fileType || "",
        size: response.size || 0,
      },
    ]);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-slate-900">Create Broadcast</h2>
            <p className="text-sm text-slate-500">Send operational communication to hostel teams and guests.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(92vh-84px)] space-y-6">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-100 text-red-700 px-4 py-3 text-sm font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">Message Type</span>
              <select
                value={form.messageType}
                onChange={(event) => updateField("messageType", event.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              >
                {messageTypes.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">Title</span>
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                className="w-full border rounded-xl px-4 py-3"
                placeholder="Internal title"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-sm font-bold text-slate-700">Email Subject</span>
            <input
              value={form.subject}
              onChange={(event) => updateField("subject", event.target.value)}
              className="w-full border rounded-xl px-4 py-3"
              placeholder="Subject shown to recipients"
            />
          </label>

          {canCreateNotice && (
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4 space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.noticeEnabled}
                  onChange={(event) => updateField("noticeEnabled", event.target.checked)}
                />
                <span className="text-sm font-black text-cyan-900">
                  Also show this broadcast as a dashboard notice
                </span>
              </label>
              {form.noticeEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-cyan-900">Notice Start Date</span>
                    <input
                      type="datetime-local"
                      value={form.noticeStartAt}
                      onChange={(event) => updateField("noticeStartAt", event.target.value)}
                      className="w-full border rounded-xl px-4 py-3"
                    />
                    <span className="text-xs text-cyan-700">Blank means show immediately after sending.</span>
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-bold text-cyan-900">Notice End Date</span>
                    <input
                      type="datetime-local"
                      value={form.noticeEndAt}
                      onChange={(event) => updateField("noticeEndAt", event.target.value)}
                      className="w-full border rounded-xl px-4 py-3"
                    />
                    <span className="text-xs text-cyan-700">The dashboard card is hidden after this date.</span>
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <span className="text-sm font-bold text-slate-700">Recipients</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recipientGroups.map(([value, label]) => (
                <label key={value} className="flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={form.recipientGroups.includes(value)}
                    onChange={() => toggleGroup(value)}
                  />
                  <span className="text-sm font-semibold text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {(hasSpecificHostel || hasCustomEmails) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {hasSpecificHostel && (
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Hostel Name</span>
                  <input
                    value={form.specificHostel}
                    onChange={(event) => updateField("specificHostel", event.target.value)}
                    className="w-full border rounded-xl px-4 py-3"
                    placeholder="Example: Tejas Hall (J)"
                  />
                </label>
              )}

              {hasCustomEmails && (
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Custom Emails</span>
                  <textarea
                    value={form.customEmails}
                    onChange={(event) => updateField("customEmails", event.target.value)}
                    className="w-full border rounded-xl px-4 py-3 min-h-[96px]"
                    placeholder="Comma or line separated emails"
                  />
                </label>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-bold text-slate-700">Message Body</span>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => applyEditorCommand("bold")} className="p-2 rounded-lg border hover:bg-slate-50">
                  <Bold className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => applyEditorCommand("italic")} className="p-2 rounded-lg border hover:bg-slate-50">
                  <Italic className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => applyEditorCommand("insertUnorderedList")} className="p-2 rounded-lg border hover:bg-slate-50">
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div
              ref={editorRef}
              contentEditable
              onInput={(event) => updateField("bodyHtml", event.currentTarget.innerHTML)}
              className="min-h-[180px] rounded-2xl border px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-200 prose max-w-none"
              data-placeholder="Write the broadcast message..."
            />
          </div>

          <div className="rounded-2xl border bg-slate-50 p-4 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <Paperclip className="w-4 h-4" />
              Attachments
            </div>
            <IKContext
              publicKey={IMAGEKIT_PUBLIC_KEY}
              urlEndpoint={IMAGEKIT_URL_ENDPOINT}
              authenticator={authenticator}
            >
              <IKUpload
                folder="/broadcast-attachments"
                useUniqueFileName
                onUploadStart={() => setUploading(true)}
                onSuccess={handleUploadSuccess}
                onError={(err) => {
                  setUploading(false);
                  setError(err?.message || "Attachment upload failed.");
                }}
              />
            </IKContext>
            {uploading && <p className="text-sm text-blue-600">Uploading attachment...</p>}
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, index) => (
                <button
                  key={`${file.url}-${index}`}
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                  className="px-3 py-2 rounded-lg bg-white border text-sm text-slate-700 hover:bg-red-50"
                >
                  {file.name} x
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
            <label className="space-y-2">
              <span className="text-sm font-bold text-slate-700">Schedule Send</span>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(event) => updateField("scheduledAt", event.target.value)}
                className="w-full border rounded-xl px-4 py-3"
              />
            </label>
            <button
              type="button"
              onClick={loadPreview}
              className="px-4 py-3 rounded-xl border font-bold text-slate-700 hover:bg-slate-50"
            >
              Preview Recipients
            </button>
          </div>

          {preview && (
            <div className="rounded-2xl border bg-blue-50 border-blue-100 p-4">
              <p className="font-black text-blue-800">{preview.count} recipient(s) resolved</p>
              <p className="text-xs text-blue-700 mt-1">
                Showing first {preview.recipients?.length || 0} recipients for review.
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => submit("draft")}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => submit("schedule")}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 disabled:opacity-60"
            >
              <CalendarClock className="w-4 h-4" />
              Schedule
            </button>
            <button
              type="button"
              onClick={() => submit("send_now")}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-60"
            >
              <Send className="w-4 h-4" />
              Send Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
