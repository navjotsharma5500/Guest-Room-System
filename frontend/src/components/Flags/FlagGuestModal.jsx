import React, { useState } from "react";
import { IKContext, IKUpload } from "imagekitio-react";
import { AlertTriangle, Upload, X } from "lucide-react";
import {
  BACKEND_URL,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
  IMAGEKIT_AUTH_ENDPOINT,
} from "../../utils/apiConfig";

const API = BACKEND_URL || "";

const authenticator = async () => {
  const response = await fetch(IMAGEKIT_AUTH_ENDPOINT, { method: "GET", credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch ImageKit auth parameters");
  return response.json();
};

const FLAG_OPTIONS = [
  { value: "yellow", label: "Yellow", hint: "Minor indiscipline warning", color: "bg-yellow-100 text-yellow-800" },
  { value: "orange", label: "Orange", hint: "Serious warning", color: "bg-orange-100 text-orange-800" },
  { value: "red", label: "Red", hint: "Immediate block severity", color: "bg-red-100 text-red-800" },
];

export default function FlagGuestModal({ booking, onClose, onSuccess }) {
  const [flagType, setFlagType] = useState("yellow");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleUploadSuccess = (response) => {
    const fileUrl =
      response.url ||
      response?.response?.url ||
      response?.data?.url ||
      (response.filePath ? `${IMAGEKIT_URL_ENDPOINT}${response.filePath}` : "");
    setUploading(false);
    if (!fileUrl) {
      setError("Upload completed but no file URL was returned.");
      return;
    }
    setAttachments((prev) => [...prev, fileUrl]);
  };

  const handleSubmit = async () => {
    try {
      setError("");
      if (!remarks.trim()) throw new Error("Remarks are required.");
      if (attachments.length === 0) throw new Error("At least one attachment is required.");

      setSubmitting(true);
      const response = await fetch(`${API}/api/guest-flags`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking?._id || booking?.id,
          flagType,
          remarks,
          attachments,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to flag guest");
      }
      onSuccess?.(data);
      onClose?.();
    } catch (err) {
      setError(err.message || "Failed to flag guest");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IKContext
      publicKey={IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={IMAGEKIT_URL_ENDPOINT}
      authenticationEndpoint={IMAGEKIT_AUTH_ENDPOINT}
      authenticator={authenticator}
    >
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 px-4">
        <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <div>
              <h3 className="flex items-center gap-2 text-xl font-bold text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Flag Guest
              </h3>
              <p className="text-sm text-gray-500">
                {booking?.guest || "Guest"} · {booking?.hostel || "-"} · {booking?.roomNo || "-"}
              </p>
            </div>
            <button onClick={onClose} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Flag Type</label>
              <div className="grid gap-3 sm:grid-cols-3">
                {FLAG_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFlagType(option.value)}
                    className={`rounded-xl border p-3 text-left transition ${
                      flagType === option.value ? "border-red-500 ring-2 ring-red-100" : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-bold ${option.color}`}>
                      {option.label}
                    </span>
                    <p className="mt-2 text-xs text-gray-500">{option.hint}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Remarks *</label>
              <textarea
                value={remarks}
                onChange={(event) => setRemarks(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-red-500 focus:outline-none"
                placeholder="Describe the incident clearly..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">Attachment *</label>
              <div className="rounded-xl border border-dashed border-gray-300 p-4">
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-sm text-gray-600">
                  <Upload className="h-6 w-6 text-red-600" />
                  <span>{uploading ? "Uploading..." : "Upload proof to ImageKit"}</span>
                  <IKUpload
                    folder="/guest-flags"
                    tags={["guest-flag"]}
                    useUniqueFileName
                    className="hidden"
                    onUploadStart={() => setUploading(true)}
                    onSuccess={handleUploadSuccess}
                    onError={(err) => {
                      setUploading(false);
                      setError(err?.message || "Upload failed");
                    }}
                  />
                </label>
              </div>
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((url, index) => (
                    <div key={url} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                      <a className="truncate text-blue-600" href={url} target="_blank" rel="noreferrer">
                        Attachment {index + 1}
                      </a>
                      <button
                        onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== index))}
                        className="text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          </div>

          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <button onClick={onClose} className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || uploading}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-gray-400"
            >
              {submitting ? "Saving..." : "Submit Flag"}
            </button>
          </div>
        </div>
      </div>
    </IKContext>
  );
}
