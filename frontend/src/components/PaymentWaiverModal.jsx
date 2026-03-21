// components/PaymentWaiverModal.jsx
import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Trash2, AlertTriangle, CheckCircle, Loader } from "lucide-react";
import { IKContext, IKUpload } from "imagekitio-react";
import { useToast } from "../context/ToastContext";
import { useDashboardRefresh } from "../context/DashboardRefreshContext";
import {
  BACKEND_URL,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
} from "../utils/apiConfig";

const API = BACKEND_URL;

const imagekitAuthenticator = async () => {
  const response = await fetch(`${API}/api/imagekit/auth`, {
    credentials: "include",
  });
  if (!response.ok) throw new Error("Failed to fetch ImageKit auth");
  return response.json();
};

export default function PaymentWaiverModal({ booking, onClose, onSuccess, theme = "light" }) {
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) toastContext.showToast(message, type);
  };
  const { refreshDashboard } = useDashboardRefresh();

  const ikUploadRef = useRef(null);

  const totalAmount = Number(booking?.totalAmount || 0);
  const paidAmount = Number(booking?.paidAmount || 0);
  const previousDiscount = Number(booking?.discount || booking?.waveOff || 0);
  const pendingBalance = Math.max(0, totalAmount - paidAmount - previousDiscount);

  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleUploadSuccess = (res) => {
    if (attachments.length >= 5) {
      showToast("Maximum 5 attachments allowed", "warning");
      return;
    }
    setAttachments((prev) => [
      ...prev,
      { url: res.url, fileId: res.fileId, name: res.name || res.filePath },
    ]);
    setUploading(false);
    showToast("✅ Attachment uploaded", "success");
  };

  const handleUploadError = (err) => {
    console.error("Upload error:", err);
    setUploading(false);
    showToast("Upload failed: " + (err?.message || "Unknown error"), "error");
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!remarks.trim()) {
      showToast("⚠️ Remarks are required", "warning");
      return;
    }
    if (attachments.length === 0) {
      showToast("⚠️ At least one attachment is required", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${API}/api/payments/bookings/${booking._id}/waiver`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          credentials: "include",
          body: JSON.stringify({
            remarks: remarks.trim(),
            waiverAmount: pendingBalance,
            attachments,
          }),
        }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Waiver failed");

      showToast("✅ Payment waived successfully", "success");
      setTimeout(() => {
        refreshDashboard(true);
        if (onSuccess) onSuccess(data.booking);
        onClose();
      }, 500);
    } catch (err) {
      console.error("Waiver error:", err);
      showToast(err.message || "Failed to process waiver", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[200] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${
            isDark ? "bg-gray-900" : "bg-white"
          }`}
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-5 text-white flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">💳 Payment Waiver</h2>
              <p className="text-sm text-orange-100 mt-0.5">
                Wave off pending balance for {booking?.guest || "Guest"}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/20 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Warning */}
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl p-4">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Irreversible Action</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  This will permanently waive off the entire pending balance. This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Amount Info */}
            <div className={`rounded-xl p-4 border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Total Bill</p>
                  <p className="text-lg font-bold text-gray-700 dark:text-gray-200">₹{totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Paid</p>
                  <p className="text-lg font-bold text-green-600">₹{paidAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>Waiver Amount</p>
                  <p className="text-lg font-bold text-orange-600">₹{pendingBalance.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter reason for waiving off this amount..."
                rows={3}
                className={`w-full p-3 border rounded-xl resize-none text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 ${
                  isDark
                    ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-400"
                }`}
              />
            </div>

            {/* Amount (auto-filled, read-only) */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                Waiver Amount <span className="text-red-500">*</span>
              </label>
              <div className={`flex items-center px-4 py-3 rounded-xl border ${
                isDark ? "bg-gray-800 border-gray-600 text-white" : "bg-gray-50 border-gray-200 text-gray-700"
              }`}>
                <span className="text-sm mr-2">₹</span>
                <span className="font-bold text-orange-600">{pendingBalance.toLocaleString()}</span>
                <span className={`ml-2 text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>(auto-fetched from pending balance)</span>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}>
                Attachments <span className="text-red-500">*</span>
                <span className={`ml-2 text-xs font-normal ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  ({attachments.length}/5)
                </span>
              </label>

              {/* Uploaded files */}
              {attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        isDark ? "bg-gray-800 border-gray-700" : "bg-green-50 border-green-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-xs truncate text-green-700 dark:text-green-400">
                          {file.name || `Attachment ${index + 1}`}
                        </span>
                      </div>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="p-1 text-red-500 hover:text-red-700 flex-shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {attachments.length < 5 && (
                <IKContext
                  publicKey={IMAGEKIT_PUBLIC_KEY}
                  urlEndpoint={IMAGEKIT_URL_ENDPOINT}
                  authenticator={imagekitAuthenticator}
                >
                  <IKUpload
                    ref={ikUploadRef}
                    onUploadStart={() => setUploading(true)}
                    onSuccess={handleUploadSuccess}
                    onError={handleUploadError}
                    folder="/waiver-attachments"
                    className="hidden"
                    accept="image/*,application/pdf"
                  />
                  <button
                    type="button"
                    onClick={() => ikUploadRef.current?.click()}
                    disabled={uploading}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed transition ${
                      uploading
                        ? "border-gray-300 text-gray-400 cursor-not-allowed"
                        : isDark
                        ? "border-gray-600 text-gray-400 hover:border-orange-500 hover:text-orange-400"
                        : "border-gray-300 text-gray-500 hover:border-orange-400 hover:text-orange-500"
                    }`}
                  >
                    {uploading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Upload Attachment (Image / PDF)</span>
                      </>
                    )}
                  </button>
                </IKContext>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`flex gap-3 px-6 pb-6`}>
            <button
              onClick={onClose}
              disabled={submitting}
              className={`flex-1 py-3 rounded-xl font-medium transition ${
                isDark ? "bg-gray-700 text-gray-200 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || uploading || !remarks.trim() || attachments.length === 0}
              className={`flex-1 py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${
                submitting || uploading || !remarks.trim() || attachments.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 shadow-lg"
              }`}
            >
              {submitting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "✅ Confirm Waiver"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}