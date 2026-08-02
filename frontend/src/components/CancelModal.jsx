// src/components/CancelModal.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, Info } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { IMAGEKIT_AUTH_ENDPOINT } from "../utils/apiConfig";

const authenticator = async () => {
  const r = await fetch(IMAGEKIT_AUTH_ENDPOINT, { method: "GET" });
  if (!r.ok) {
    const body = await r.json().catch(() => null);
    throw new Error(body?.message || `Upload authentication failed (${r.status})`);
  }
  const data = await r.json();
  if (!data.signature || !data.expire || !data.token || !data.publicKey) {
    throw new Error("Upload authentication response is incomplete");
  }
  return data;
};

const uploadAttachment = async (file) => {
  const auth = await authenticator();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", `cancel_consent_${Date.now()}_${file.name}`);
  formData.append("folder", "/cancel-attachments");
  formData.append("useUniqueFileName", "true");
  formData.append("tags", "cancel,consent");
  formData.append("publicKey", auth.publicKey);
  formData.append("signature", auth.signature);
  formData.append("expire", String(auth.expire));
  formData.append("token", auth.token);

  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(result?.message || `Upload failed (${response.status})`);
  }
  if (!result?.url) throw new Error("Upload completed without a file URL");
  return result.url;
};

export default function CancelModal({ modal, remarksText, setRemarksText, onClose, onDone }) {
  const { showToast } = useToast();
  const [localRemarks, setLocalRemarks] = useState(remarksText || "");
  const [attachments, setAttachments] = useState([]);   // array of ImageKit URLs
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLocalRemarks(remarksText || "");
  }, [remarksText]);

  if (!modal) return null;

  // ── ImageKit handlers ──────────────────────────────────────────────
  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (attachments.length >= 5) {
      showToast("⚠️ Maximum 5 attachments allowed", "warning");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("⚠️ File size must be under 5MB", "warning");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadAttachment(file);
      setAttachments((prev) => [...prev, url]);
    } catch (err) {
      console.error("ImageKit upload error:", err);
      showToast(`❌ ${err.message || "Upload failed. Please try again."}`, "error");
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit ─────────────────────────────────────────────────────────
  const handleDone = async () => {
    if (!localRemarks.trim()) {
      showToast("⚠️ Please enter cancellation remarks.", "warning");
      return;
    }
    if (attachments.length === 0) {
      showToast("⚠️ Please upload at least 1 guest consent document.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      if (typeof onDone === "function") {
        await onDone(localRemarks.trim(), attachments);
      }
      setLocalRemarks("");
      setAttachments([]);
      if (typeof setRemarksText === "function") setRemarksText("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setLocalRemarks("");
    setAttachments([]);
    if (typeof setRemarksText === "function") setRemarksText("");
    if (typeof onClose === "function") onClose();
  };

  const canSubmit = localRemarks.trim() && attachments.length >= 1 && !uploading && !submitting;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
              <XCircle size={20} /> Cancel Booking
            </h3>
            <button onClick={handleClose} className="text-gray-400 hover:text-red-600 text-xl leading-none">✕</button>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            Room <strong>{modal.room?.roomNo || "—"}</strong> — {modal.hostel || "—"}
          </p>

          {/* Remarks */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cancellation Remarks <span className="text-red-500">*</span>
            </label>
            <textarea
              value={localRemarks}
              onChange={(e) => {
                setLocalRemarks(e.target.value);
                if (typeof setRemarksText === "function") setRemarksText(e.target.value);
              }}
              placeholder="Enter reason for cancellation..."
              className="w-full border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-red-300 outline-none resize-none text-sm"
              rows={3}
            />
          </div>

          {/* Attachments */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Guest Consent Document <span className="text-red-500">*</span>
                <span className="text-gray-400 font-normal ml-1">({attachments.length}/5)</span>
              </label>
              {/* Info tooltip */}
              <div className="relative group">
                <Info size={14} className="text-blue-400 cursor-help" />
                <div className="absolute left-5 top-0 w-64 text-xs bg-gray-800 text-white rounded-lg p-2 hidden group-hover:block z-10 shadow-lg leading-relaxed">
                  Guest consent for cancellation is required. Kindly upload the same.
                </div>
              </div>
            </div>

            <input
              type="file"
              onChange={handleFileChange}
              className="text-sm border border-dashed border-gray-300 p-2 rounded-lg w-full cursor-pointer hover:border-red-400 transition disabled:cursor-not-allowed disabled:opacity-60"
              disabled={attachments.length >= 5 || uploading}
            />

            {uploading && (
              <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                <span className="animate-spin h-3 w-3 border-2 border-blue-600 border-t-transparent rounded-full" />
                Uploading...
              </div>
            )}

            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((url, i) => (
                  <div key={i} className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-1.5 rounded text-sm">
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate flex-1">
                      📎 Document {i + 1}
                    </a>
                    <button onClick={() => removeAttachment(i)} className="ml-2 text-gray-400 hover:text-red-600 text-lg leading-none">✕</button>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 mt-1">
              Min 1 document required. Max 5, each under 5MB.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition text-sm"
            >
              Close
            </button>
            <button
              onClick={handleDone}
              disabled={!canSubmit}
              className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition ${
                canSubmit ? "bg-red-600 hover:bg-red-700" : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              {submitting ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
