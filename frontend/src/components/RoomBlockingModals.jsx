// src/components/RoomBlockingModals.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "../context/ToastContext";
import { X, Upload, CheckCircle, Trash2, AlertTriangle, Lock, Unlock, Building, FileText } from "lucide-react";
import { IKContext, IKUpload } from "imagekitio-react";
import { BACKEND_URL, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT } from "../utils/apiConfig";

const API = BACKEND_URL;

const imagekitAuthenticator = async () => {
  const response = await fetch(`${API}/api/imagekit/auth`, { credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch ImageKit auth parameters");
  return response.json();
};

// ========================================
// BLOCK ROOM MODAL
// ========================================
export function BlockRoomModal({ hostelName, roomNo, onClose, onSuccess, theme }) {
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };
  const [blockedTill, setBlockedTill] = useState("");
  const [remarks, setRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleRemoveFile = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    // Validation
    if (!blockedTill) {
      showToast("⚠️ Please select blocked till date", "error");
      return;
    }

    if (!remarks.trim()) {
      showToast("⚠️ Remarks are required", "error");
      return;
    }

    if (attachments.length === 0) {
      showToast("⚠️ At least one attachment is required", "error");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(
        `${API}/api/hostels/${encodeURIComponent(hostelName)}/rooms/${encodeURIComponent(roomNo)}/block`,
        {
          method: "PUT",
          credentials: "include",
          headers,
          body: JSON.stringify({
            blockedTill,
            blockRemarks: remarks,
            blockAttachments: attachments.map(f => f.url)
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to block room");
      }

      console.log("✅ Room blocked successfully:", result);
      showToast("✅ Room blocked successfully!", "success");
      
      if (onSuccess) onSuccess(result);
      onClose();

    } catch (err) {
      console.error("❌ Block room error:", err);
      showToast(`❌ ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`rounded-2xl p-6 w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl ${
          theme === "dark" ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"
        }`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <Lock className="w-6 h-6" />
            Block Room
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Room Info */}
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-700">
            🏢 {hostelName} - Room {roomNo}
          </p>
          <p className="text-xs text-red-600 mt-1">
            This room will be unavailable for booking until the specified date and time.
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Blocked Till Date & Time */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Blocked Till (Date & Time) <span className="text-red-600">*</span>
            </label>
            <input
              type="datetime-local"
              value={blockedTill}
              onChange={(e) => setBlockedTill(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className={`w-full border-2 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 ${
                theme === "dark" 
                  ? "bg-gray-700 border-gray-600 text-gray-100" 
                  : "bg-white border-red-300"
              }`}
              required
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Remarks <span className="text-red-600">*</span>
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Enter reason for blocking (e.g., Maintenance, Renovation, etc.)"
              className={`w-full border-2 p-3 rounded-xl h-24 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 ${
                theme === "dark" 
                  ? "bg-gray-700 border-gray-600 text-gray-100" 
                  : "bg-white border-red-300"
              }`}
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Attachments (Up to 5) <span className="text-red-600">*</span>
            </label>
            
            <IKContext
              publicKey={IMAGEKIT_PUBLIC_KEY}
              urlEndpoint={IMAGEKIT_URL_ENDPOINT}
              authenticator={imagekitAuthenticator}
            >
              <div className="relative">
                <IKUpload
                  folder="/room-blocking"
                  useUniqueFileName={true}
                  isPrivateFile={false}
                  tags={["blocking", hostelName, roomNo]}
                  onUploadStart={() => setUploading(true)}
                  onError={(err) => {
                    console.error("Upload failed:", err);
                    setUploading(false);
                    showToast("❌ Failed to upload file", "error");
                  }}
                  onSuccess={(res) => {
                    const fileData = {
                      url: res.url,
                      name: res.name,
                      type: res.fileType
                    };
                    setAttachments(prev => [...prev, fileData]);
                    setUploading(false);
                    showToast("✅ File uploaded successfully", "success");
                  }}
                  validateFile={(file) => {
                    if (attachments.length >= 5) {
                      showToast("⚠️ Maximum 5 files allowed", "warning");
                      return false;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      showToast("⚠️ Maximum file size is 5 MB", "warning");
                      return false;
                    }
                    const allowedTypes = [
                      "image/jpeg",
                      "image/png",
                      "image/webp",
                      "application/pdf"
                    ];
                    if (!allowedTypes.includes(file.type)) {
                      showToast("⚠️ Only images and PDFs are allowed", "warning");
                      return false;
                    }
                    return true;
                  }}
                  className={`w-full border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                    uploading
                      ? "bg-gray-100 border-gray-400 cursor-not-allowed"
                      : theme === "dark"
                      ? "bg-gray-700 border-gray-600 hover:border-red-500"
                      : "bg-white border-red-300 hover:border-red-500"
                  }`}
                  disabled={uploading || attachments.length >= 5}
                />
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-red-500 border-t-transparent mb-2"></div>
                      <p className="text-sm text-gray-600">Uploading...</p>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-red-500 mb-2" />
                      <p className="text-sm font-medium">
                        Click to upload or drag & drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Images or PDF (max 5 MB)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </IKContext>

            {/* Uploaded Files */}
            {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600"
                        : "bg-gray-50 border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm truncate">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="text-red-500 hover:text-red-700 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="px-8 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Blocking...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Block Room
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========================================
// UNBLOCK ROOM MODAL
// ========================================
export function UnblockRoomModal({ hostelName, roomNo, blockInfo, onClose, onSuccess, theme }) {
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };
  const [submitting, setSubmitting] = useState(false);

  // ✅ Pre-flight check: Verify room is actually blocked
  React.useEffect(() => {
    if (!blockInfo?.isBlocked) {
      console.warn("⚠️ WARNING: Trying to unblock a room that appears unblocked");
      console.log("Block info:", blockInfo);
    }
  }, [blockInfo]);

  const handleUnblock = async () => {
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      console.log("🔓 Attempting to unblock room:", {
        hostel: hostelName,
        room: roomNo,
        blockInfo: blockInfo
      });

      const response = await fetch(
        `${API}/api/hostels/${encodeURIComponent(hostelName)}/rooms/${encodeURIComponent(roomNo)}/unblock`,
        {
          method: "PUT",
          credentials: "include",
          headers
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // ✅ Handle "already unblocked" gracefully
        if (response.status === 400 && result.message === "Room is not blocked") {
          console.warn("⚠️ Room is already unblocked (may have auto-unblocked)");
          showToast("ℹ️ Room is already unblocked", "info");
          
          // Still trigger success to refresh the UI
          if (onSuccess) onSuccess(result);
          onClose();
          return;
        }
        
        throw new Error(result.message || "Failed to unblock room");
      }

      console.log("✅ Room unblocked successfully:", result);
      showToast("✅ Room unblocked successfully!", "success");
      
      if (onSuccess) onSuccess(result);
      onClose();

    } catch (err) {
      console.error("❌ Unblock room error:", err);
      showToast(`❌ ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`rounded-2xl p-6 w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl ${
          theme === "dark" ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"
        }`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-green-600 flex items-center gap-2">
            <Unlock className="w-6 h-6" />
            Unblock Room
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Room Info */}
        <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
          <p className="text-sm font-semibold text-yellow-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Room is currently BLOCKED
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            🏢 {hostelName} - Room {roomNo}
          </p>
        </div>

        {/* Block Details */}
        <div className="mb-6 space-y-4">
          <div className={`p-4 rounded-xl ${
            theme === "dark" ? "bg-gray-700" : "bg-gray-50"
          }`}>
            <p className="text-sm font-semibold mb-2">Blocked Till:</p>
            <p className="text-lg font-bold text-red-600">
              {blockInfo?.blockedTill 
                ? new Date(blockInfo.blockedTill).toLocaleString()
                : "N/A"
              }
            </p>
          </div>

          <div className={`p-4 rounded-xl ${
            theme === "dark" ? "bg-gray-700" : "bg-gray-50"
          }`}>
            <p className="text-sm font-semibold mb-2">Remarks:</p>
            <p className="text-sm">
              {blockInfo?.blockRemarks || "No remarks provided"}
            </p>
          </div>

          {blockInfo?.blockAttachments && blockInfo.blockAttachments.length > 0 && (
            <div className={`p-4 rounded-xl ${
              theme === "dark" ? "bg-gray-700" : "bg-gray-50"
            }`}>
              <p className="text-sm font-semibold mb-2">Attachments:</p>
              <div className="space-y-2">
                {blockInfo.blockAttachments.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-blue-600 hover:underline"
                  >
                    📄 Attachment {index + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition font-semibold disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUnblock}
            disabled={submitting}
            className="px-8 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl shadow-lg transition font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Unblocking...
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                Unblock Room
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========================================
// BLOCKED ROOM INFO MODAL (View Only with Unblock Option)
// ========================================
export function BlockedRoomInfoModal({ hostelName, roomNo, blockInfo, onClose, onUnblock, theme }) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`rounded-2xl p-6 w-[600px] max-h-[90vh] overflow-y-auto shadow-2xl ${
          theme === "dark" ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"
        }`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <Lock className="w-6 h-6" />
            Room Blocked
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-600 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            This room is currently BLOCKED and unavailable for booking
          </p>
          <p className="text-xs text-red-600 mt-1">
            🏢 {hostelName} - Room {roomNo}
          </p>
        </div>

        {/* Block Details */}
        <div className="space-y-4">
          <div className={`p-4 rounded-xl ${
            theme === "dark" ? "bg-gray-700" : "bg-gray-50"
          }`}>
            <p className="text-sm font-semibold mb-2">Blocked Till:</p>
            <p className="text-lg font-bold text-red-600">
              {blockInfo?.blockedTill 
                ? new Date(blockInfo.blockedTill).toLocaleString()
                : "N/A"
              }
            </p>
          </div>

          <div className={`p-4 rounded-xl ${
            theme === "dark" ? "bg-gray-700" : "bg-gray-50"
          }`}>
            <p className="text-sm font-semibold mb-2">Remarks:</p>
            <p className="text-sm">
              {blockInfo?.blockRemarks || "No remarks provided"}
            </p>
          </div>

          {blockInfo?.blockAttachments && blockInfo.blockAttachments.length > 0 && (
            <div className={`p-4 rounded-xl ${
              theme === "dark" ? "bg-gray-700" : "bg-gray-50"
            }`}>
              <p className="text-sm font-semibold mb-2">Attachments:</p>
              <div className="space-y-2">
                {blockInfo.blockAttachments.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-sm text-blue-600 hover:underline flex items-center gap-2"
                  >
                    📄 Attachment {index + 1} →
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Buttons with Unblock option */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition font-semibold"
          >
            Close
          </button>
          
          {/* Only show unblock button if room is actually blocked */}
          {onUnblock && blockInfo?.isBlocked && (
            <button
              onClick={onUnblock}
              className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:shadow-lg transition font-semibold flex items-center gap-2"
            >
              <Unlock className="w-4 h-4" />
              Unblock Room
            </button>
          )}

          {/* Show different message if already unblocked */}
          {onUnblock && !blockInfo?.isBlocked && (
            <div className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Room Already Unblocked
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}