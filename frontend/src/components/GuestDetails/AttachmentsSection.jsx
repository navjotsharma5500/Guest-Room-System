// src/components/GuestDetails/AttachmentsSection.jsx - ✅ COMPLETE FIX
import React, { useState } from "react";
import { Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AttachmentGrid from "../AttachmentGrid";

export default function AttachmentsSection({
  enquiryFiles = [],
  approvalFiles = [],
  paymentFiles = [],
  extensionFiles = [],
  theme,
}) {
  const [activeTab, setActiveTab] = useState("enquiry");

  // ✅ Calculate total attachments
  const hasAnyAttachments =
    enquiryFiles.length ||
    approvalFiles.length ||
    paymentFiles.length ||
    extensionFiles.length;

  console.log("🔍 ATTACHMENTS SECTION RENDER:", {
    enquiryFiles: enquiryFiles.length,
    approvalFiles: approvalFiles.length,
    paymentFiles: paymentFiles.length,
    extensionFiles: extensionFiles.length,
    hasAnyAttachments,
  });

  // ✅ Show empty state if no attachments
  if (!hasAnyAttachments) {
    return (
      <div className={`px-6 py-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
        <div className="flex items-center gap-2 mb-2">
          <Paperclip className="w-5 h-5 text-gray-500" />
          <h3 className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Attachments
          </h3>
        </div>
        <p className="text-sm italic text-gray-500">
          No attachments uploaded
        </p>
      </div>
    );
  }

  return (
    <div className={`px-6 py-4 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
      <div className="flex items-center gap-2 mb-4">
        <Paperclip className="w-5 h-5 text-gray-500" />
        <h3 className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Attachments
        </h3>
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
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === "enquiry" && <AnimatedGrid files={enquiryFiles} theme={theme} label="Enquiry" />}
        {activeTab === "approval" && <AnimatedGrid files={approvalFiles} theme={theme} label="Approval" />}
        {activeTab === "payment" && <AnimatedGrid files={paymentFiles} theme={theme} label="Payment" />}
        {activeTab === "extension" && <AnimatedGrid files={extensionFiles} theme={theme} label="Extension" />}
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
  console.log(`🎯 Rendering ${label} grid with ${files.length} files`);

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