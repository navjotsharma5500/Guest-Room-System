// src/components/HallBookings/UnifiedBookingDetailsModal.jsx - LARGE UNIFIED MODAL
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Calendar, Clock, User, Mail, Phone, Building, FileText, 
  XCircle, Edit2, CheckCircle, MapPin, Users as UsersIcon,
  MessageSquare, Paperclip, ArrowRight, Building2
} from "lucide-react";

export default function UnifiedBookingDetailsModal({
  theme,
  modal,
  onClose,
  onExtend,
  onCancel,
}) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  
  if (!modal || !modal.booking) return null;

  const { booking, hall, room } = modal;

  // Format date and time
  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "—";

    try {
      let dateObj;
      
      if (dateString.includes('T')) {
        dateObj = new Date(dateString);
      } else {
        const [y, m, d] = dateString.split("-").map(Number);
        if (!y || !m || !d) return dateString;
        dateObj = new Date(y, m - 1, d);
      }

      if (isNaN(dateObj)) return dateString;

      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const day = dateObj.getDate();
      const month = months[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      const formattedDate = `${String(day).padStart(2, "0")} ${month} ${year}`;

      if (!timeString) return formattedDate;

      const timeParts = timeString.split(":");
      const hh = parseInt(timeParts[0], 10);
      const mm = parseInt(timeParts[1], 10);

      if (isNaN(hh) || isNaN(mm)) return formattedDate;

      const period = hh >= 12 ? "PM" : "AM";
      const hours = hh % 12 || 12;

      return `${formattedDate} • ${String(hours).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period}`;
    } catch {
      return dateString;
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    const statusConfig = {
      booked: { bg: "bg-yellow-100", text: "text-yellow-800", label: "UPCOMING", darkBg: "bg-yellow-900/30", darkText: "text-yellow-400" },
      checked_in: { bg: "bg-red-100", text: "text-red-800", label: "ACTIVE", darkBg: "bg-red-900/30", darkText: "text-red-400" },
      checked_out: { bg: "bg-green-100", text: "text-green-800", label: "COMPLETED", darkBg: "bg-green-900/30", darkText: "text-green-400" },
      cancelled: { bg: "bg-gray-100", text: "text-gray-800", label: "CANCELLED", darkBg: "bg-gray-900/30", darkText: "text-gray-400" },
    };

    const config = statusConfig[status] || statusConfig.booked;
    return (
      <span className={`px-5 py-2 rounded-full text-sm font-bold ${
        theme === "dark" ? `${config.darkBg} ${config.darkText}` : `${config.bg} ${config.text}`
      }`}>
        {config.label}
      </span>
    );
  };

  const canExtend = new Date(booking.to || booking.checkOutDate) >= new Date();

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex justify-center items-center z-[9999] p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`rounded-3xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden ${
          theme === "dark" ? "bg-gray-900" : "bg-white"
        }`}
        initial={{ scale: 0.9, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 50 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-red-600 via-red-700 to-red-800 text-white px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <User size={40} className="text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{booking.name || booking.guest}</h2>
                <p className="text-red-100 text-lg mt-1">{booking.eventName || booking.societyName || "Hall Booking"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {getStatusBadge(booking.status)}
              <button
                onClick={onClose}
                className="p-3 hover:bg-white/20 rounded-full transition-all hover:rotate-90 duration-300"
              >
                <X size={28} />
              </button>
            </div>
          </div>
        </div>

        {/* Content - Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-8 max-h-[calc(95vh-200px)] overflow-y-auto">
          {/* Left Column - Guest Information */}
          <div className="space-y-6">
            <div className={`p-6 rounded-2xl ${
              theme === "dark" ? "bg-gray-800" : "bg-gradient-to-br from-gray-50 to-gray-100"
            }`}>
              <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                <User size={24} className="text-red-600" />
                Guest Information
              </h3>
              
              <div className="space-y-4">
                <InfoItem 
                  icon={<User size={18} />}
                  label="Full Name"
                  value={booking.name || booking.guest}
                  theme={theme}
                />
                <InfoItem 
                  icon={<UsersIcon size={18} />}
                  label="Society/Department"
                  value={booking.societyName || "—"}
                  theme={theme}
                />
                <InfoItem 
                  icon={<Mail size={18} />}
                  label="Email Address"
                  value={booking.email || "—"}
                  theme={theme}
                  copyable
                />
                <InfoItem 
                  icon={<Phone size={18} />}
                  label="Contact Number"
                  value={booking.contact || "—"}
                  theme={theme}
                  copyable
                />
              </div>
            </div>

            {/* Additional Details */}
            {booking.purpose && (
              <div className={`p-6 rounded-2xl ${
                theme === "dark" ? "bg-gray-800" : "bg-gradient-to-br from-blue-50 to-blue-100"
              }`}>
                <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  <FileText size={24} className="text-blue-600" />
                  Purpose
                </h3>
                <p className={`text-sm leading-relaxed ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  {booking.purpose}
                </p>
              </div>
            )}

            {booking.description && (
              <div className={`p-6 rounded-2xl ${
                theme === "dark" ? "bg-gray-800" : "bg-gradient-to-br from-purple-50 to-purple-100"
              }`}>
                <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  <MessageSquare size={24} className="text-purple-600" />
                  Description
                </h3>
                <p className={`text-sm leading-relaxed ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  {booking.description}
                </p>
              </div>
            )}
          </div>

          {/* Middle Column - Booking Details */}
          <div className="space-y-6">
            {/* Location */}
            <div className={`p-6 rounded-2xl ${
              theme === "dark" ? "bg-gray-800" : "bg-gradient-to-br from-red-50 to-red-100"
            }`}>
              <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                <Building2 size={24} className="text-red-600" />
                Location Details
              </h3>
              
              <div className="space-y-4">
                <InfoItem 
                  icon={<Building size={18} />}
                  label="Hall Name"
                  value={hall || booking.hall}
                  theme={theme}
                />
                <InfoItem 
                  icon={<MapPin size={18} />}
                  label="Room Number"
                  value={`Guest Room ${room?.roomNo || booking.roomNo}`}
                  theme={theme}
                />
              </div>
            </div>

            {/* Timeline */}
            <div className={`p-6 rounded-2xl ${
              theme === "dark" ? "bg-gray-800" : "bg-gradient-to-br from-green-50 to-green-100"
            }`}>
              <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                <Calendar size={24} className="text-green-600" />
                Booking Timeline
              </h3>
              
              <div className="space-y-4">
                <div>
                  <p className={`text-xs font-medium mb-2 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    CHECK-IN
                  </p>
                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-gray-700" : "bg-white"
                  }`}>
                    <p className={`font-bold text-lg ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>
                      {formatDateTime(booking.from || booking.checkInDate, booking.checkInTime)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <ArrowRight size={24} className="text-green-600" />
                </div>

                <div>
                  <p className={`text-xs font-medium mb-2 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    CHECK-OUT
                  </p>
                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-gray-700" : "bg-white"
                  }`}>
                    <p className={`font-bold text-lg ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>
                      {formatDateTime(booking.to || booking.checkOutDate, booking.checkOutTime)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks if cancelled */}
            {booking.cancelRemarks && (
              <div className={`p-6 rounded-2xl border-2 ${
                theme === "dark" 
                  ? "bg-red-900/20 border-red-800" 
                  : "bg-red-50 border-red-200"
              }`}>
                <h3 className={`text-xl font-bold mb-3 flex items-center gap-2 ${
                  theme === "dark" ? "text-red-400" : "text-red-800"
                }`}>
                  <XCircle size={24} />
                  Cancellation Remarks
                </h3>
                <p className={`text-sm ${
                  theme === "dark" ? "text-red-300" : "text-red-700"
                }`}>
                  {booking.cancelRemarks}
                </p>
              </div>
            )}
          </div>

          {/* Right Column - Actions & Attachments */}
          <div className="space-y-6">
            {/* Quick Actions */}
            {(booking.status === "booked" || booking.status === "checked_in") && (
              <div className={`p-6 rounded-2xl ${
                theme === "dark" ? "bg-gray-800" : "bg-gradient-to-br from-orange-50 to-orange-100"
              }`}>
                <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  <Edit2 size={24} className="text-orange-600" />
                  Quick Actions
                </h3>
                
                <div className="space-y-3">
                  {canExtend && (
                    <button
                      onClick={() => {
                        onExtend && onExtend({
                          hall,
                          room,
                          booking,
                        });
                        onClose();
                      }}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                      <Clock size={20} />
                      Extend Booking
                    </button>
                  )}
                  
                  <button
                    onClick={() => {
                      onCancel && onCancel({
                        hall,
                        room,
                        booking,
                      });
                      onClose();
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 shadow-lg"
                  >
                    <XCircle size={20} />
                    Cancel Booking
                  </button>
                </div>
              </div>
            )}

            {/* Attachments */}
            {booking.attachments && booking.attachments.length > 0 && (
              <div className={`p-6 rounded-2xl ${
                theme === "dark" ? "bg-gray-800" : "bg-gradient-to-br from-indigo-50 to-indigo-100"
              }`}>
                <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  <Paperclip size={24} className="text-indigo-600" />
                  Attachments ({booking.attachments.length})
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {booking.attachments.map((url, index) => (
                    <a
                      key={index}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-3 rounded-lg text-center hover:scale-105 transition-transform ${
                        theme === "dark" ? "bg-gray-700 text-gray-200" : "bg-white text-gray-800"
                      }`}
                    >
                      <Paperclip size={24} className="mx-auto mb-2 text-indigo-600" />
                      <p className="text-xs font-medium">File {index + 1}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Booking Stats */}
            <div className={`p-6 rounded-2xl ${
              theme === "dark" ? "bg-gradient-to-br from-gray-800 to-gray-700" : "bg-gradient-to-br from-gray-100 to-gray-200"
            }`}>
              <h3 className={`text-xl font-bold mb-4 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                Booking Summary
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Booking ID
                  </span>
                  <span className={`text-sm font-mono font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    #{booking._id?.slice(-8) || "N/A"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Status
                  </span>
                  <span className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {booking.status.replace("_", " ").toUpperCase()}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Duration
                  </span>
                  <span className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {Math.ceil((new Date(booking.to || booking.checkOutDate) - new Date(booking.from || booking.checkInDate)) / (1000 * 60 * 60 * 24))} days
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`px-8 py-5 border-t ${
          theme === "dark" ? "bg-gray-800/50 border-gray-700" : "bg-gray-50 border-gray-200"
        }`}>
          <div className="flex justify-between items-center">
            <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Last updated: {new Date().toLocaleString()}
            </p>
            <button
              onClick={onClose}
              className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Info Item Component
function InfoItem({ icon, label, value, theme, copyable }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (copyable && value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`p-4 rounded-xl ${
      theme === "dark" ? "bg-gray-700/50" : "bg-white/80"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
          {icon}
        </span>
        <span className={`text-xs font-medium uppercase tracking-wide ${
          theme === "dark" ? "text-gray-400" : "text-gray-600"
        }`}>
          {label}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-semibold ${
          theme === "dark" ? "text-white" : "text-gray-900"
        }`}>
          {value}
        </p>
        {copyable && (
          <button
            onClick={handleCopy}
            className={`text-xs px-2 py-1 rounded transition-all ${
              copied
                ? "bg-green-500 text-white"
                : theme === "dark"
                ? "bg-gray-600 text-gray-300 hover:bg-gray-500"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        )}
      </div>
    </div>
  );
}