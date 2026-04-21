import React, { useState } from "react";
import { motion } from "framer-motion";
import { IKContext, IKUpload } from "imagekitio-react";
import AttachmentGrid from "./AttachmentGrid";
import { useToast } from "../context/ToastContext";
import {
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
  IMAGEKIT_AUTH_ENDPOINT,
} from "../utils/apiConfig";

const authenticator = async () => {
  const response = await fetch(IMAGEKIT_AUTH_ENDPOINT, { method: "GET" });
  if (!response.ok) throw new Error(`Auth request failed ${response.status}`);
  const data = await response.json();
  return {
    signature: data.signature,
    expire: data.expire,
    token: data.token,
    publicKey: data.publicKey,
  };
};

export default function EarlyCheckInPaymentModal({ open, booking, onClose, onSubmit }) {
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };

  const [paymentType, setPaymentType] = useState("Paid");
  const [amount, setAmount] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");

  if (!open) return null;

  const handleIKSuccess = (response) => {
    let finalUrl =
      response.url ||
      (response.response && response.response.url) ||
      (response.filePath ? `${IMAGEKIT_URL_ENDPOINT}${response.filePath}` : null);

    if (!finalUrl) {
      finalUrl = response?.data?.url || response?.response?.data?.url || null;
    }

    if (!finalUrl) {
      setUploading(false);
      setUploadError("Upload failed: Could not get file URL");
      return;
    }

    setUploading(false);
    setAttachments((prev) => [...prev, finalUrl]);
  };

  const handleIKError = (err) => {
    setUploading(false);
    setUploadError(err?.message || err?.details || "Upload failed. Please try again.");
  };

  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const canSubmit = () => {
    if (paymentType === "Paid") {
      return Number(amount) > 0;
    }
    return remarks.trim().length > 0 && attachments.length > 0;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) {
      setError(
        paymentType === "Paid"
          ? "Early check-in amount is required"
          : "Remarks and at least one attachment are required"
      );
      return;
    }

    try {
      setLoading(true);
      setError("");
      await onSubmit({
        paymentType,
        amount: paymentType === "Paid" ? Number(amount) : 0,
        remarks: remarks.trim(),
        attachments,
      });
    } catch (err) {
      setError(err.message || "Failed to submit early check-in payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <IKContext
      publicKey={IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={IMAGEKIT_URL_ENDPOINT}
      authenticationEndpoint={IMAGEKIT_AUTH_ENDPOINT}
      authenticator={authenticator}
    >
      <motion.div
        className="fixed inset-0 bg-black/40 flex justify-center items-center z-[70]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="bg-white rounded-xl p-5 w-[500px] shadow-xl max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
        >
          <h2 className="text-lg font-semibold text-red-700 mb-3">
            Early Check-In Payment Details
          </h2>

          <div className="space-y-4">
            <div className="text-sm text-gray-600">
              <p><strong>Guest:</strong> {booking?.guest || "Guest"}</p>
              <p><strong>Original Check-In:</strong> {booking?.from ? new Date(booking.from).toLocaleDateString("en-GB") : "—"}</p>
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                Payment Type <span className="text-red-600">*</span>
              </label>
              <select
                className="border p-2 rounded w-full"
                value={paymentType}
                onChange={(e) => {
                  setPaymentType(e.target.value);
                  setAmount("");
                  setRemarks("");
                  setAttachments([]);
                  setError("");
                }}
              >
                <option value="Paid">Paid</option>
                <option value="Free">Without Charges Subject to Approval</option>
              </select>
            </div>

            {paymentType === "Paid" && (
              <div>
                <label className="text-sm font-medium block mb-2">
                  Extra Amount <span className="text-red-600">*</span>
                </label>
                <input
                  className="border p-2 rounded w-full"
                  type="number"
                  min={1}
                  placeholder="Enter early check-in amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium block mb-2">
                Remarks {paymentType === "Free" && <span className="text-red-600">*</span>}
              </label>
              <textarea
                className="border p-2 rounded w-full h-24 resize-none"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add remarks for early check-in..."
              />
            </div>

            <div>
              <label className="text-sm font-medium block mb-2">
                Attachments {paymentType === "Free" && <span className="text-red-600">*</span>}
              </label>
              <IKUpload
                fileName={`early_checkin_${Date.now()}_${Math.random().toString(36).slice(2)}`}
                folder="/early-checkin"
                useUniqueFileName={true}
                isPrivateFile={false}
                tags={["early-checkin"]}
                overwriteFile={false}
                onUploadStart={() => {
                  setUploading(true);
                  setUploadError("");
                }}
                onError={handleIKError}
                onSuccess={handleIKSuccess}
                validateFile={(file) => {
                  if (attachments.length >= 5) {
                    showToast("Max 5 files allowed", "error");
                    return false;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    showToast("File size must be under 5MB", "error");
                    return false;
                  }
                  return true;
                }}
                className="text-sm border p-2 rounded w-full"
              />

              {uploading && (
                <div className="mt-2 text-sm text-blue-600 flex items-center gap-2">
                  <span className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></span>
                  Uploading file...
                </div>
              )}

              {uploadError && (
                <p className="text-red-600 text-xs mt-2">{uploadError}</p>
              )}

              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-gray-50 border px-3 py-1.5 rounded text-sm"
                    >
                      <div className="flex items-center gap-2 truncate max-w-[200px]">
                        📄 File {i + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="mt-2">
                    <AttachmentGrid files={attachments} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

          <div className="flex justify-end gap-3 mt-5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 transition"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit() || loading}
              className={`px-4 py-2 rounded text-white transition ${
                canSubmit() && !loading
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              {loading ? "Processing..." : "Confirm Early Check-In"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </IKContext>
  );
}
