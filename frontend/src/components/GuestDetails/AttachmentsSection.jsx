// src/components/GuestDetails/AttachmentsSection.jsx - âœ… COMPLETE FIX
import React, { useState } from "react";
import { Loader, Paperclip, Plus, Upload, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IKContext, IKUpload } from "imagekitio-react";
import AttachmentGrid from "../AttachmentGrid";
import {
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
  IMAGEKIT_AUTH_ENDPOINT,
} from "../../utils/apiConfig";

const authenticator = async () => {
  const response = await fetch(IMAGEKIT_AUTH_ENDPOINT, { method: "GET", credentials: "include" });
  if (!response.ok) throw new Error("Failed to fetch ImageKit auth parameters");
  return response.json();
};

export default function AttachmentsSection({
  enquiryFiles = [],
  approvalFiles = [],
  paymentFiles = [],
  extensionFiles = [],
  cancelFiles = [],
  theme,
  onAddAttachments = null,
}) {
  const [activeTab, setActiveTab] = useState("enquiry");
  const [showAddModal, setShowAddModal] = useState(false);

  // âœ… Calculate total attachments
  const hasAnyAttachments =
    enquiryFiles.length ||
    approvalFiles.length ||
    paymentFiles.length ||
    extensionFiles.length ||
    cancelFiles.length;

  console.log("ðŸ” ATTACHMENTS SECTION RENDER:", {
    enquiryFiles: enquiryFiles.length,
    approvalFiles: approvalFiles.length,
    paymentFiles: paymentFiles.length,
    extensionFiles: extensionFiles.length,
    cancelFiles: cancelFiles.length,
    hasAnyAttachments,
  });

  return (
    <div className={`px-6 py-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Paperclip className="w-5 h-5 text-gray-500" />
          <h3 className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Attachments
          </h3>
        </div>
        {onAddAttachments && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <Plus size={14} />
            Add Attachments
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Tab 
          label="Enquiry" 
          count={enquiryFiles.length} 
          active={activeTab === "enquiry"} 
          onClick={() => setActiveTab("enquiry")}
          theme={theme}
        />
        <Tab 
          label="Approval" 
          count={approvalFiles.length} 
          active={activeTab === "approval"} 
          onClick={() => setActiveTab("approval")}
          theme={theme}
        />
        <Tab 
          label="Paid" 
          count={paymentFiles.length} 
          active={activeTab === "payment"} 
          onClick={() => setActiveTab("payment")}
          theme={theme}
        />
        <Tab 
          label="Extension" 
          count={extensionFiles.length}
          active={activeTab === "extension"}
          onClick={() => setActiveTab("extension")}
          theme={theme}
        />
        <Tab 
          label="Cancel" 
          count={cancelFiles.length}
          active={activeTab === "cancel"}
          onClick={() => setActiveTab("cancel")}
          theme={theme}
        />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {!hasAnyAttachments && (
          <motion.p
            key="empty"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm italic text-gray-500"
          >
            No attachments uploaded
          </motion.p>
        )}
        {hasAnyAttachments && activeTab === "enquiry" && <AnimatedGrid files={enquiryFiles} theme={theme} label="Enquiry" />}
        {hasAnyAttachments && activeTab === "approval" && <AnimatedGrid files={approvalFiles} theme={theme} label="Approval" />}
        {hasAnyAttachments && activeTab === "payment" && <AnimatedGrid files={paymentFiles} theme={theme} label="Payment" />}
        {hasAnyAttachments && activeTab === "extension" && <AnimatedGrid files={extensionFiles} theme={theme} label="Extension" />}
        {hasAnyAttachments && activeTab === "cancel" && <AnimatedGrid files={cancelFiles} theme={theme} label="Cancellation" />}
      </AnimatePresence>

      <AnimatePresence>
        {showAddModal && (
          <AddAttachmentModal
            theme={theme}
            onClose={() => setShowAddModal(false)}
            onSubmit={async ({ type, files }) => {
              await onAddAttachments({ type, files });
              setActiveTab(type === "paid" ? "payment" : type);
              setShowAddModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Tab({ label, count, active, onClick, theme }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active 
          ? "bg-blue-600 text-white shadow-md" 
          : theme === "dark"
            ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
      }`}
    >
      {label} ({count})
    </button>
  );
}

function AnimatedGrid({ files, theme, label }) {
  console.log(`ðŸŽ¯ Rendering ${label} grid with ${files.length} files`);

  return (
    <motion.div
      key={label}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {files.length > 0 ? (
        <AttachmentGrid files={files} theme={theme} />
      ) : (
        <p className={`text-sm italic ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
          No {label.toLowerCase()} documents
        </p>
      )}
    </motion.div>
  );
}

function AddAttachmentModal({ theme, onClose, onSubmit }) {
  const [type, setType] = useState("enquiry");
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSuccess = (response) => {
    if (response?.url) {
      setFiles((prev) => [...prev, response.url]);
      setError("");
    }
    setUploading(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (files.length === 0) {
      setError("Upload at least one attachment");
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ type, files });
    } catch (err) {
      setError(err.message || "Failed to add attachments");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.96 }}
        onClick={(event) => event.stopPropagation()}
        className={`w-full max-w-lg rounded-2xl p-6 shadow-2xl ${theme === "dark" ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Add Attachments</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X size={18} />
          </button>
        </div>

        <IKContext publicKey={IMAGEKIT_PUBLIC_KEY} urlEndpoint={IMAGEKIT_URL_ENDPOINT} authenticator={authenticator}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-500">Attachment Tab</label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ["enquiry", "Enquiry"],
                  ["approval", "Approval"],
                  ["paid", "Paid"],
                  ["extension", "Extension"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setType(value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      type === value
                        ? "border-blue-600 bg-blue-600 text-white"
                        : theme === "dark"
                        ? "border-gray-600 bg-gray-700 text-gray-200"
                        : "border-gray-200 bg-gray-50 text-gray-700"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-500">Upload File</label>
              <div className={`rounded-xl border-2 border-dashed p-5 text-center ${theme === "dark" ? "border-gray-600" : "border-gray-200"}`}>
                {uploading ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-blue-500">
                    <Loader className="animate-spin" size={16} />
                    Uploading to ImageKit...
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center gap-2">
                    <Upload size={22} className="text-gray-400" />
                    <span className="text-sm text-gray-500">Click to upload document</span>
                    <IKUpload
                      folder="/guest-booking-attachments"
                      useUniqueFileName
                      isPrivateFile={false}
                      onUploadStart={() => {
                        setUploading(true);
                        setError("");
                      }}
                      onSuccess={handleSuccess}
                      onError={(err) => {
                        setUploading(false);
                        setError(err?.message || "ImageKit upload failed");
                      }}
                      validateFile={(file) => {
                        if (file.size > 10 * 1024 * 1024) {
                          setError("Maximum file size is 10MB");
                          return false;
                        }
                        return true;
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-500">Uploaded ({files.length})</p>
                <AttachmentGrid files={files} theme={theme} />
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm hover:bg-gray-100">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Submit"}
              </button>
            </div>
          </form>
        </IKContext>
      </motion.div>
    </motion.div>
  );
}
