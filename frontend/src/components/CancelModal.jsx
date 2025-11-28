import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { XCircle } from "lucide-react";
import { useToast } from "../context/ToastContext";

// -------------------- CANCEL MODAL --------------------
export default function CancelModal({
  modal,
  remarksText,
  setRemarksText,
  onClose,
  onDone,
}) {
  const { showToast } = useToast();
  const [localRemarks, setLocalRemarks] = useState(remarksText || "");

  // ✅ Sync external remarksText → local state
  useEffect(() => {
    setLocalRemarks(remarksText || "");
  }, [remarksText]);

  if (!modal) return null;

  const safeTrim = (val) => {
    if (val === null || val === undefined) return "";
    return typeof val === "string" ? val.trim() : String(val).trim();
  };

  const handleDone = () => {
    if (!safeTrim(localRemarks)) {
      showToast("⚠️ Please enter cancellation remarks.", "warning");
      return;
    }

    // ✅ Trigger success toast and global sync events
    showToast("❌ Booking cancelled successfully", "error");
    window.dispatchEvent(new Event("hostelBookingChanged"));
    window.dispatchEvent(new StorageEvent("storage", { key: "hostelData" }));

    // ✅ Run parent cancel logic
    if (typeof onDone === "function") onDone();

    // ✅ Reset remarks
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
        className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl p-6 w-96 shadow-xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* ===== Header ===== */}
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2">
              <XCircle size={20} /> Cancel Booking
            </h3>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-red-700"
              title="Close"
            >
              ✖
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-3">
            Room: <strong>{modal.room?.roomNo || "—"}</strong> —{" "}
            {modal.hostel || "—"}
          </p>

          {/* ===== Remarks Input ===== */}
          <textarea
            value={localRemarks}
            onChange={(e) => {
              setLocalRemarks(e.target.value);
              setRemarksText(e.target.value);
            }}
            placeholder="Enter cancellation remarks..."
            className="w-full border p-2 rounded mb-4 focus:ring-2 focus:ring-red-300 outline-none resize-none"
            rows={3}
          />

          {/* ===== Buttons ===== */}
          <div className="flex justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
            >
              Close
            </button>

            <button
              onClick={handleDone}
              disabled={!safeTrim(localRemarks)}
              className={`px-3 py-1 rounded text-white transition ${
                safeTrim(localRemarks)
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Done
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
