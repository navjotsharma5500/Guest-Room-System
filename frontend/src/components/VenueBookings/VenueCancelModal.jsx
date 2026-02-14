// src/components/HallBookings/HallCancelModal.jsx - Google Material Design Version
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, AlertTriangle, X } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { useEscapeKey } from "../../hooks/useEscapeKey";

export default function VenueCancelModal({
  modal,
  remarksText,
  setRemarksText,
  onClose,
  onDone,
  onConfirm,
  theme = "dark",
}) {
  useEscapeKey(onClose);
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };
  const [localRemarks, setLocalRemarks] = useState(remarksText || "");

  // Sync external remarksText → local state
  useEffect(() => {
    setLocalRemarks(remarksText || "");
  }, [remarksText]);

  if (!modal) return null;

  const safeTrim = (val) => {
    if (val === null || val === undefined) return "";
    return typeof val === "string" ? val.trim() : String(val).trim();
  };

  const handleDone = async () => {
    if (!safeTrim(localRemarks)) {
      showToast("⚠️ Please enter cancellation remarks.", "warning");
      return;
    }

    // Run parent cancel logic
    const doneHandler = onDone || onConfirm;
    if (typeof doneHandler === "function") {
      await doneHandler(localRemarks);
    }

    // Reset remarks after successful cancellation
    setLocalRemarks("");
    if (typeof setRemarksText === "function") setRemarksText("");
  };

  const handleClose = () => {
    setLocalRemarks("");
    if (typeof setRemarksText === "function") setRemarksText("");
    if (typeof onClose === "function") onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          className={`
            rounded-lg p-6 w-full max-w-md shadow-2xl
            ${theme === "dark" ? "bg-[#292a2d]" : "bg-white"}
          `}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                theme === "dark" ? "bg-[#5f1111]" : "bg-[#fce8e6]"
              }`}>
                <XCircle className={`w-6 h-6 ${
                  theme === "dark" ? "text-[#f28b82]" : "text-[#d93025]"
                }`} />
              </div>
              <div>
                <h3 className={`text-xl font-normal ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  Cancel Booking
                </h3>
                <p className={`text-sm mt-0.5 ${
                  theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                }`}>
                  This action cannot be undone
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className={`
                p-2 rounded-full transition-colors
                ${theme === "dark" 
                  ? "hover:bg-[#3c4043] text-[#9aa0a6]" 
                  : "hover:bg-[#f1f3f4] text-[#5f6368]"
                }
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Booking Info Card */}
          <div className={`mb-5 p-4 rounded-lg border ${
            theme === "dark"
              ? "bg-[#3c4043] border-[#5f6368]"
              : "bg-[#fce8e6] border-[#f28b82]"
          }`}>
            <div className="flex items-start gap-2">
              <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                theme === "dark" ? "text-[#f28b82]" : "text-[#d93025]"
              }`} />
              <div>
                <p className={`text-sm font-medium ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  {modal.booking?.name || "Guest"} - {modal.booking?.eventName || "Event"}
                </p>
                <p className={`text-xs mt-1 ${
                  theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                }`}>
                  Hall: <span className="font-medium">{modal.hall || "—"}</span>
                  {" • "}
                  Room: <span className="font-medium">{modal.room?.roomNo || "—"}</span>
                </p>
                {modal.booking?.checkInDate && (
                  <p className={`text-xs mt-0.5 ${
                    theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                  }`}>
                    Check-in: <span className="font-medium">{modal.booking.checkInDate}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Remarks Input */}
          <div className="mb-5">
            <label className={`block text-sm font-medium mb-2 ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}>
              Cancellation Reason *
            </label>
            <textarea
              value={localRemarks}
              onChange={(e) => {
                setLocalRemarks(e.target.value);
                if (typeof setRemarksText === "function") setRemarksText(e.target.value);
              }}
              placeholder="Please provide a reason for cancellation..."
              className={`
                w-full px-4 py-3 rounded border text-sm
                transition-all duration-200 outline-none resize-none
                ${theme === "dark"
                  ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8] placeholder-[#9aa0a6]"
                  : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] placeholder-[#5f6368]"
                }
              `}
              rows={4}
            />
            <p className={`text-xs mt-2 ${
              theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
            }`}>
              Required field - Please explain why this booking is being cancelled
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className={`
                px-5 py-2.5 rounded text-sm font-medium
                transition-all duration-200
                ${theme === "dark"
                  ? "bg-transparent border border-[#5f6368] text-[#e8eaed] hover:bg-[#3c4043]"
                  : "bg-transparent border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]"
                }
              `}
            >
              Cancel
            </button>

            <button
              onClick={handleDone}
              disabled={!safeTrim(localRemarks)}
              className={`
                px-5 py-2.5 rounded text-sm font-medium
                transition-all duration-200
                ${safeTrim(localRemarks)
                  ? theme === "dark"
                    ? "bg-[#f28b82] text-[#202124] hover:bg-[#fca19a]"
                    : "bg-[#d93025] text-white hover:bg-[#c5221f]"
                  : "opacity-50 cursor-not-allowed bg-[#5f6368] text-[#9aa0a6]"
                }
              `}
            >
              Confirm Cancellation
            </button>
          </div>

          {/* Warning Footer */}
          {safeTrim(localRemarks) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-3 rounded-lg border ${
                theme === "dark"
                  ? "bg-[#5f1111] border-[#f28b82]"
                  : "bg-[#fce8e6] border-[#f28b82]"
              }`}
            >
              <p className={`text-xs font-medium text-center ${
                theme === "dark" ? "text-[#f28b82]" : "text-[#d93025]"
              }`}>
                ⚠️ This booking will be permanently cancelled
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
