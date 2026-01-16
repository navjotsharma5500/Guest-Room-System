import React, { useState } from "react";
import { motion } from "framer-motion";
import { IKContext, IKUpload } from "imagekitio-react";
import AttachmentGrid from "./AttachmentGrid";
import { BACKEND_URL } from '../utils/apiConfig';

const API = BACKEND_URL;
const IMAGEKIT_URL_ENDPOINT = "https://ik.imagekit.io/7khjnlfow";
const IMAGEKIT_AUTH_ENDPOINT = `${API}/api/imagekit/auth`;

const authenticator = async () => {
  try {
    const r = await fetch(IMAGEKIT_AUTH_ENDPOINT, { method: "GET" });
    if (!r.ok) throw new Error(`Auth request failed ${r.status}`);
    const data = await r.json();
    return {
      signature: data.signature,
      expire: data.expire,
      token: data.token,
      publicKey: data.publicKey,
    };
  } catch (err) {
    console.error("ImageKit authenticator error:", err);
    throw err;
  }
};

// Wrapper component so hooks are never conditional
export default function ExtensionModalWrapper(props) {
  if (!props.modal) return null;
  return <ExtensionModal {...props} />;
}

function ExtensionModal({ modal, onClose, onExtend }) {
  const [newTo, setNewTo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  // ✅ FIXED: Get minimum date (current checkout date + 1 day)
  const getMinDate = () => {
    if (!modal.booking?.to) return "";
    
    try {
      // Parse the current checkout date
      const currentCheckout = new Date(modal.booking.to);
      
      // Add 1 day for minimum selectable date
      currentCheckout.setDate(currentCheckout.getDate() + 1);
      
      // Return in YYYY-MM-DD format for date input
      return currentCheckout.toISOString().split('T')[0];
    } catch (err) {
      console.error("Date parsing error:", err);
      return "";
    }
  };

  const minDate = getMinDate();

  const handleIKSuccess = (response) => {
    console.log("✅ ImageKit Upload Success:", response);

    let finalUrl =
      response.url ||
      (response.response && response.response.url) ||
      (response.filePath ? `${IMAGEKIT_URL_ENDPOINT}${response.filePath}` : null);

    if (!finalUrl) {
      finalUrl = response?.data?.url || response?.response?.data?.url || null;
    }

    if (!finalUrl) {
      console.error("❌ No URL received from ImageKit:", response);
      setUploading(false);
      setUploadError("Upload failed: Could not get file URL");
      return;
    }

    console.log("📎 Final URL:", finalUrl);
    setUploading(false);
    setFiles((prev) => [...prev, finalUrl]);
  };

  const handleIKError = (err) => {
    console.error("❌ ImageKit Upload Error:", err);
    setUploading(false);
    const msg = err?.message || err?.details || "Upload failed. Please try again.";
    setUploadError(msg);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExtend = async () => {
    if (!newTo) {
      setError("Please select a new checkout date");
      return;
    }

    console.log("================================================================================");
    console.log("🔥 EXTENSION MODAL: handleExtend triggered");
    console.log("📦 Data:", {
      modal: modal ? "present" : "null",
      newTo,
      remarks,
      filesCount: files.length,
      files: files
    });
    console.log("================================================================================");

    setLoading(true);
    setError("");

    try {
      // ✅ CRITICAL FIX: Pass modal as first parameter (contains extensionData)
      console.log("📤 Calling onExtend with 4 parameters:", {
        modal: { hostel: modal.hostel, roomNo: modal.roomNo, bookingId: modal.booking?._id },
        newTo,
        remarks,
        filesCount: files.length,
        files: files
      });

      await onExtend(
        {
          hostel: modal.hostel,
          roomNo: modal.roomNo,
          booking: modal.booking,
        },
        newTo,
        remarks,
        files
      );
      
      console.log("✅ onExtend completed successfully");
      
      setLoading(false);
      // Modal will be closed by parent after success
    } catch (err) {
      console.error("================================================================================");
      console.error("❌ EXTENSION MODAL: Extension error:", err);
      console.error("================================================================================");
      setError(err.message || "Failed to extend booking. Please try again.");
      setLoading(false);
    }
  };

  // ✅ Format date as DD-MM-YYYY for display
  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  return (
    <IKContext
      publicKey={process.env.REACT_APP_IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={IMAGEKIT_URL_ENDPOINT}
      authenticationEndpoint={IMAGEKIT_AUTH_ENDPOINT}
      authenticator={authenticator}
    >
      <motion.div
        className="fixed inset-0 bg-black/40 flex justify-center items-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="bg-white rounded-xl p-5 w-[450px] shadow-xl max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
        >
          <h2 className="text-lg font-semibold text-red-700 mb-3">
            Extend Booking
          </h2>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              <strong>Current Checkout:</strong> {formatDate(modal.booking?.to)}
            </p>
            <p className="text-sm text-gray-600 mb-3">
              <strong>Guest:</strong> {modal.booking?.guest || "Guest"}
            </p>
            <p className="text-xs text-gray-500 mb-3">
              Select a date after {formatDate(modal.booking?.to)}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm mb-1 font-medium">New Checkout Date</label>
              <input
                type="date"
                className="border rounded px-3 py-2 w-full"
                value={newTo}
                min={minDate}
                onChange={(e) => {
                  setNewTo(e.target.value);
                  setError("");
                }}
              />
            </div>

            <div>
              <label className="block text-sm mb-1 font-medium">Extension Remarks</label>
              <textarea
                className="border rounded px-3 py-2 w-full h-20 resize-none"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Reason for extension..."
              />
            </div>

            <div>
              <label className="block text-sm mb-1 font-medium">
                Extension Attachments (Max 5) - {files.length} uploaded
              </label>
              <IKUpload
                fileName={`extension_${Date.now()}_${Math.random()
                  .toString(36)
                  .substring(2)}`}
                folder="/extension"
                useUniqueFileName={true}
                isPrivateFile={false}
                tags={["extension"]}
                overwriteFile={false}
                onUploadStart={() => {
                  setUploading(true);
                  setUploadError("");
                }}
                onError={handleIKError}
                onSuccess={handleIKSuccess}
                validateFile={(file) => {
                  if (files.length >= 5) {
                    alert("Max 5 files allowed");
                    return false;
                  }
                  if (file.size > 5 * 1024 * 1024) {
                    alert("File size must be under 5MB");
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

              {files.length > 0 && (
                <div className="mt-3 space-y-2">
                  {files.map((file, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-gray-50 border px-3 py-1.5 rounded text-sm"
                    >
                      <div className="flex items-center gap-2 truncate max-w-[200px]">
                        📄 File {i + 1}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-gray-500 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="mt-2">
                    <AttachmentGrid files={files} />
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
              onClick={handleExtend}
              disabled={loading || uploading}
              className={`px-4 py-2 rounded text-white transition ${
                loading || uploading
                  ? "bg-red-400 cursor-not-allowed"
                  : "bg-red-600 hover:bg-red-700"
              }`}
            >
              {loading ? "Extending..." : "Confirm Extension"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </IKContext>
  );
}