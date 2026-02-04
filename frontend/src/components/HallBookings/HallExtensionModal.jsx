// src/components/HallBookings/HallExtensionModal.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useEscapeKey } from "../../hooks/useEscapeKey";

export default function HallExtensionModal({ modal, onClose, onExtend }) {
  useEscapeKey(onClose);
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [newCheckOutTime, setNewCheckOutTime] = useState("");
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (modal?.booking) {
      setNewCheckOutDate(modal.booking.checkOutDate || "");
      setNewCheckOutTime(modal.booking.checkOutTime || "");
    }
  }, [modal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!newCheckOutDate || !newCheckOutTime) {
      setError("Please select both date and time");
      return;
    }

    const originalCheckOut = new Date(`${modal.booking.checkOutDate}T${modal.booking.checkOutTime}`);
    const newCheckOut = new Date(`${newCheckOutDate}T${newCheckOutTime}`);

    if (newCheckOut <= originalCheckOut) {
      setError("New checkout must be after the original checkout time");
      return;
    }

    setLoading(true);
    try {
      await onExtend({
        bookingId: modal.booking._id,
        newCheckOutDate,
        newCheckOutTime,
        remarks,
      });
      onClose();
    } catch (err) {
      setError(err.message || "Failed to extend booking");
    } finally {
      setLoading(false);
    }
  };

  if (!modal?.open) return null;

  const booking = modal.booking;
  const theme = "dark"; // Use dark theme for glassmorphism

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full max-w-2xl rounded-2xl p-6 ${
            theme === "dark"
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className={`text-2xl font-bold mb-1 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                Extend Hall Booking
              </h2>
              <p className={`text-sm ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}>
                {booking?.hall} - Room {booking?.roomNo}
              </p>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-gray-700 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Current Booking Info */}
          <div className={`p-4 rounded-xl mb-6 ${
            theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
          }`}>
            <h3 className={`text-sm font-bold mb-3 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              Current Booking Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Event Name
                </p>
                <p className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {booking?.eventName}
                </p>
              </div>
              <div>
                <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Guest Name
                </p>
                <p className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {booking?.name}
                </p>
              </div>
              <div>
                <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Check-In
                </p>
                <p className={`font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {booking?.checkInDate && format(parseISO(booking.checkInDate), "MMM dd, yyyy")} at {booking?.checkInTime}
                </p>
              </div>
              <div>
                <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  Current Check-Out
                </p>
                <p className={`font-medium text-red-500`}>
                  {booking?.checkOutDate && format(parseISO(booking.checkOutDate), "MMM dd, yyyy")} at {booking?.checkOutTime}
                </p>
              </div>
            </div>
          </div>

          {/* Extension Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  <Calendar className="w-4 h-4 inline mr-2" />
                  New Check-Out Date
                </label>
                <input
                  type="date"
                  value={newCheckOutDate}
                  onChange={(e) => setNewCheckOutDate(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  <Clock className="w-4 h-4 inline mr-2" />
                  New Check-Out Time
                </label>
                <input
                  type="time"
                  value={newCheckOutTime}
                  onChange={(e) => setNewCheckOutTime(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Remarks (Optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
                className={`w-full px-4 py-2 rounded-lg border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
              >
                <AlertCircle className="w-5 h-5 text-red-500" />
                <p className="text-sm text-red-500">{error}</p>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 py-3 rounded-xl font-medium ${
                  theme === "dark"
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-900"
                }`}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 rounded-xl font-medium bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Extending...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Extend Booking
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Extension History */}
          {booking?.extensionHistory && booking.extensionHistory.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <h3 className={`text-sm font-bold mb-3 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                Extension History
              </h3>
              <div className="space-y-2">
                {booking.extensionHistory.map((ext, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm ${
                      theme === "dark" ? "bg-gray-700/30" : "bg-gray-50"
                    }`}
                  >
                    <p className={`${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                      Extended from <strong>{ext.originalCheckOutDate} {ext.originalCheckOutTime}</strong> to{" "}
                      <strong>{ext.newCheckOutDate} {ext.newCheckOutTime}</strong>
                    </p>
                    {ext.remarks && (
                      <p className={`mt-1 text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        Remarks: {ext.remarks}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}