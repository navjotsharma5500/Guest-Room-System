// src/components/HallBookings/HallCancelModal.jsx - Glassmorphism Version
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle, AlertTriangle, X } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { useEscapeKey } from "../../hooks/useEscapeKey";

export default function HallCancelModal({
  modal,
  remarksText,
  setRemarksText,
  onClose,
  onDone,
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
    if (typeof onDone === "function") {
      await onDone(localRemarks);
    }

    // Reset remarks after successful cancellation
    setLocalRemarks("");
    setRemarksText("");
  };

  const handleClose = () => {
    setLocalRemarks("");
    setRemarksText("");
    if (typeof onClose === "function") onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="glassmorphism-card rounded-2xl p-6 w-full max-w-md shadow-2xl border-2 border-white/40 relative overflow-hidden"
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ duration: 0.3, type: "spring" }}
        >
          {/* Decorative Background Pattern */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-br from-pink-500/10 to-red-500/10 rounded-full blur-3xl -z-10" />

          {/* Header */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg">
                <XCircle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold gradient-text">
                  Cancel Booking
                </h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  This action cannot be undone
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 rounded-lg hover:bg-red-100/50 text-gray-500 hover:text-red-700 transition-all"
              title="Close"
            >
              <X size={20} />
            </button>
          </div>

          {/* Booking Info Card */}
          <div className="mb-5 p-4 rounded-xl bg-gradient-to-br from-red-50/80 to-orange-50/80 backdrop-blur-sm border border-red-200/50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {modal.booking?.name || "Guest"} - {modal.booking?.eventName || "Event"}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Hall: <span className="font-medium">{modal.hall || "—"}</span>
                  {" • "}
                  Room: <span className="font-medium">{modal.room?.roomNo || "—"}</span>
                </p>
                {modal.booking?.checkInDate && (
                  <p className="text-xs text-gray-600 mt-0.5">
                    Check-in: <span className="font-medium">{modal.booking.checkInDate}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Remarks Input */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Cancellation Reason *
            </label>
            <textarea
              value={localRemarks}
              onChange={(e) => {
                setLocalRemarks(e.target.value);
                setRemarksText(e.target.value);
              }}
              placeholder="Please provide a reason for cancellation..."
              className="w-full border-2 border-gray-200 rounded-xl p-3 focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none resize-none transition-all bg-white/50 backdrop-blur-sm"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-2">
              Required field - Please explain why this booking is being cancelled
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleClose}
              className="px-5 py-2.5 glassmorphism-card border border-gray-300 rounded-xl hover:bg-gray-50/80 transition-all font-medium text-gray-700"
            >
              Cancel
            </motion.button>

            <motion.button
              whileHover={{ scale: safeTrim(localRemarks) ? 1.02 : 1 }}
              whileTap={{ scale: safeTrim(localRemarks) ? 0.98 : 1 }}
              onClick={handleDone}
              disabled={!safeTrim(localRemarks)}
              className={`px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg ${
                safeTrim(localRemarks)
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-xl hover:from-red-700 hover:to-red-800"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Confirm Cancellation
            </motion.button>
          </div>

          {/* Warning Footer */}
          {safeTrim(localRemarks) && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 rounded-xl bg-red-100/50 backdrop-blur-sm border border-red-200/50"
            >
              <p className="text-xs text-red-700 font-medium text-center">
                ⚠️ This booking will be permanently cancelled
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}