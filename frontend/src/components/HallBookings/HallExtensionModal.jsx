// src/components/HallBookings/HallExtensionModal.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Clock } from "lucide-react";
import { useToast } from "../../context/ToastContext";

export default function HallExtensionModal({ modal, onClose, onExtend, theme }) {
  const { showToast } = useToast();
  const [extendedDate, setExtendedDate] = useState("");
  const [extendedTime, setExtendedTime] = useState("");
  const [remarks, setRemarks] = useState("");

  if (!modal) return null;

  const { booking, hall, roomNo } = modal;

  const handleExtend = async () => {
    if (!extendedDate) {
      showToast("⚠️ Please select extended check-out date", "warning");
      return;
    }
    if (!extendedTime) {
      showToast("⚠️ Please select extended check-out time", "warning");
      return;
    }

    const payload = {
      hall,
      roomNo,
      booking,
      extendedDate,
      extendedTime,
      remarks: remarks.trim(),
    };

    await onExtend(payload);
    onClose();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`rounded-2xl shadow-2xl p-6 w-[480px] ${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        }`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2
            className={`text-2xl font-bold ${
              theme === "dark" ? "text-red-400" : "text-red-700"
            }`}
          >
            Extend Booking
          </h2>
          <motion.button
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className={
              theme === "dark"
                ? "text-gray-400 hover:text-red-400"
                : "text-gray-500 hover:text-red-700"
            }
          >
            <X size={24} />
          </motion.button>
        </div>

        {/* Current Details */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">Current Check-out</p>
          <p className="font-semibold text-gray-800">
            {booking?.to || booking?.checkOutDate} {booking?.checkOutTime}
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Extended Check-out Date */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              New Check-out Date
            </label>
            <input
              type="date"
              value={extendedDate}
              onChange={(e) => setExtendedDate(e.target.value)}
              min={booking?.to || booking?.checkOutDate}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none"
              required
            />
          </div>

          {/* Extended Check-out Time */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              New Check-out Time
            </label>
            <input
              type="time"
              value={extendedTime}
              onChange={(e) => setExtendedTime(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none"
              required
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none resize-none"
              placeholder="Extension remarks (optional)"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-6">
          <motion.button
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl font-medium transition ${
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                : "bg-gray-200 hover:bg-gray-300 text-gray-800"
            }`}
          >
            Cancel
          </motion.button>
          <motion.button
            type="button"
            whileHover={{
              scale: 1.05,
              boxShadow: "0 10px 25px rgba(220, 38, 38, 0.3)",
            }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExtend}
            className="px-8 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg font-semibold transition"
          >
            Extend
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}