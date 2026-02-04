// src/components/HallBookings/HallExtensionModal.jsx - Google Material Design
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useEscapeKey } from "../../hooks/useEscapeKey";

export default function HallExtensionModal({ modal, onClose, onExtend, theme = "dark" }) {
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
          className={`w-full max-w-2xl rounded-lg p-6 shadow-2xl ${
            theme === "dark" ? "bg-[#292a2d]" : "bg-white"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className={`text-xl font-normal mb-1 ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}>
                Extend Hall Booking
              </h2>
              <p className={`text-sm ${
                theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
              }`}>
                {booking?.hall} - Room {booking?.roomNo}
              </p>
            </div>
            <button
              onClick={onClose}
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

          {/* Current Booking Info */}
          <div className={`p-4 rounded-lg mb-6 ${
            theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa] border border-[#dadce0]"
          }`}>
            <h3 className={`text-sm font-medium mb-3 ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}>
              Current Booking Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className={`${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>
                  Event Name
                </p>
                <p className={`font-medium ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
                  {booking?.eventName}
                </p>
              </div>
              <div>
                <p className={`${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>
                  Guest Name
                </p>
                <p className={`font-medium ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
                  {booking?.name}
                </p>
              </div>
              <div>
                <p className={`${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>
                  Check-In
                </p>
                <p className={`font-medium ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
                  {booking?.checkInDate && format(parseISO(booking.checkInDate), "MMM dd, yyyy")} at {booking?.checkInTime}
                </p>
              </div>
              <div>
                <p className={`${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>
                  Current Check-Out
                </p>
                <p className={`font-medium ${theme === "dark" ? "text-[#f28b82]" : "text-[#d93025]"}`}>
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
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  <Calendar className="w-4 h-4 inline mr-2" />
                  New Check-Out Date
                </label>
                <input
                  type="date"
                  value={newCheckOutDate}
                  onChange={(e) => setNewCheckOutDate(e.target.value)}
                  className={`
                    w-full px-4 py-2 rounded border text-sm
                    transition-all duration-200 outline-none
                    ${theme === "dark"
                      ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                      : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                    }
                  `}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  <Clock className="w-4 h-4 inline mr-2" />
                  New Check-Out Time
                </label>
                <input
                  type="time"
                  value={newCheckOutTime}
                  onChange={(e) => setNewCheckOutTime(e.target.value)}
                  className={`
                    w-full px-4 py-2 rounded border text-sm
                    transition-all duration-200 outline-none
                    ${theme === "dark"
                      ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                      : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                    }
                  `}
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}>
                Remarks (Optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any additional notes..."
                rows={3}
                className={`
                  w-full px-4 py-2 rounded border text-sm
                  transition-all duration-200 outline-none resize-none
                  ${theme === "dark"
                    ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8] placeholder-[#9aa0a6]"
                    : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] placeholder-[#5f6368]"
                  }
                `}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-center gap-2 p-3 rounded-lg border ${
                  theme === "dark"
                    ? "bg-[#5f1111] border-[#f28b82]"
                    : "bg-[#fce8e6] border-[#f28b82]"
                }`}
              >
                <AlertCircle className={`w-5 h-5 ${
                  theme === "dark" ? "text-[#f28b82]" : "text-[#d93025]"
                }`} />
                <p className={`text-sm ${
                  theme === "dark" ? "text-[#f28b82]" : "text-[#d93025]"
                }`}>{error}</p>
              </motion.div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`
                  flex-1 py-2.5 rounded text-sm font-medium transition-colors
                  ${theme === "dark"
                    ? "bg-transparent border border-[#5f6368] text-[#e8eaed] hover:bg-[#3c4043]"
                    : "bg-transparent border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]"
                  }
                `}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`
                  flex-1 py-2.5 rounded text-sm font-medium transition-colors
                  flex items-center justify-center gap-2
                  ${loading 
                    ? "opacity-50 cursor-not-allowed" 
                    : ""
                  }
                  ${theme === "dark"
                    ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                    : "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                  }
                `}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
            <div className={`mt-6 pt-6 border-t ${
              theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"
            }`}>
              <h3 className={`text-sm font-medium mb-3 ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}>
                Extension History
              </h3>
              <div className="space-y-2">
                {booking.extensionHistory.map((ext, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm ${
                      theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa] border border-[#dadce0]"
                    }`}
                  >
                    <p className={`${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
                      Extended from <strong>{ext.originalCheckOutDate} {ext.originalCheckOutTime}</strong> to{" "}
                      <strong>{ext.newCheckOutDate} {ext.newCheckOutTime}</strong>
                    </p>
                    {ext.remarks && (
                      <p className={`mt-1 text-xs ${
                        theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
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