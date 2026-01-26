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
  const { showToast } = useToast();
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

      console.log("✅ Room blocked:", result);
      showToast("✅ Room blocked successfully!", "success");
      
      if (onSuccess) onSuccess(result);
      onClose();

    } catch (err) {
      console.error("❌ Block room error:", err);
      showToast(`❌ Failed to block room: ${err.message}`, "error");
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
                    alert("Failed to upload file");
                  }}
                  onSuccess={(res) => {
                    const fileData = {
                      url: res.url,
                      name: res.name,
                      type: res.fileType
                    };
                    setAttachments(prev => [...prev, fileData]);
                    setUploading(false);
                  }}
                  validateFile={(file) => {
                    if (attachments.length >= 5) {
                      alert("Maximum 5 files allowed");
                      return false;
                    }
                    if (file.size > 5 * 1024 * 1024) {
                      alert("Maximum file size is 5 MB");
                      return false;
                    }
                    const allowedTypes = [
                      "image/jpeg",
                      "image/png",
                      "image/webp",
                      "application/pdf",
                    ];
                    if (!allowedTypes.includes(file.type)) {
                      alert("Only JPG, PNG, WEBP or PDF files allowed");
                      return false;
                    }
                    return true;
                  }}
                  className="border-2 border-dashed border-red-300 p-4 rounded-xl w-full bg-white cursor-pointer hover:border-red-500 hover:bg-red-50 transition-all"
                />
                {attachments.length < 5 && !uploading && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Upload className="w-5 h-5" />
                      <span>Click to upload ({attachments.length}/5)</span>
                    </div>
                  </div>
                )}
              </div>
            </IKContext>

            {uploading && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-300 rounded-lg flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <p className="text-sm text-blue-700 font-medium">Uploading...</p>
              </div>
            )}

            {/* Display uploaded files */}
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file, index) => (
                  <div
                    key={index}
                    className="p-3 bg-green-50 border border-green-300 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-green-700 font-semibold truncate flex items-center gap-2">
                        <FileText className="w-4 h-4" /> {file.name}
                      </p>
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          View Document →
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
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
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);

  const handleUnblock = async () => {
    // Direct submission without extra confirm since the modal itself is the confirmation
    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

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
        throw new Error(result.message || "Failed to unblock room");
      }

      console.log("✅ Room unblocked:", result);
      showToast("✅ Room unblocked successfully!", "success");
      
      if (onSuccess) onSuccess(result);
      onClose();

    } catch (err) {
      console.error("❌ Unblock room error:", err);
      showToast(`❌ Failed to unblock room: ${err.message}`, "error");
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
                ? new Date(blockInfo.blockedTill).toLocaleDateString()
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
// BLOCKED ROOM INFO MODAL (View Only)
// ========================================
export function BlockedRoomInfoModal({ hostelName, roomNo, blockInfo, onClose, theme }) {
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
                ? new Date(blockInfo.blockedTill).toLocaleDateString()
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

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 text-gray-800 rounded-xl hover:bg-gray-300 transition font-semibold"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}