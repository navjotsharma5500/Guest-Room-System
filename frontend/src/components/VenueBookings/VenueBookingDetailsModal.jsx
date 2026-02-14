// src/components/VenueBookings/VenueBookingDetailsModal.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  X, Calendar, Clock, User, Mail, Phone, Building, FileText, 
  XCircle, Edit2, CheckCircle, MapPin, Users as UsersIcon,
  MessageSquare, Paperclip, ArrowRight
} from "lucide-react";
import AttachmentGrid from "../AttachmentGrid";
import { useEscapeKey } from "../../hooks/useEscapeKey";

export default function VenueBookingDetailsModal({
  theme,
  modal,
  onClose,
  onExtend,
  onCancel,
}) {
  useEscapeKey(onClose);
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
      booked: { bg: "bg-yellow-100", text: "text-yellow-800", label: "UPCOMING" },
      checked_in: { bg: "bg-red-100", text: "text-red-800", label: "ACTIVE" },
      checked_out: { bg: "bg-green-100", text: "text-green-800", label: "COMPLETED" },
      cancelled: { bg: "bg-gray-100", text: "text-gray-800", label: "CANCELLED" },
    };

    const config = statusConfig[status] || statusConfig.booked;
    return (
      <span className={`px-4 py-1.5 rounded-full text-xs font-bold ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  // Check if booking can be extended
  const canExtend = new Date(booking.to || booking.checkOutDate) >= new Date();

  const handleCancel = () => {
    onCancel({
      hall,
      room,
      booking,
    });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden ${
          theme === "dark" 
            ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" 
            : "bg-gradient-to-br from-white via-gray-50 to-white"
        }`}
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
      >
        {/* Header */}
        <div className={`px-8 py-6 border-b-2 ${
          theme === "dark" 
            ? "border-gray-700 bg-gradient-to-r from-red-900/30 to-orange-900/30" 
            : "border-red-100 bg-gradient-to-r from-red-600 to-red-700"
        }`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Building className={`w-8 h-8 ${
                    theme === "dark" ? "text-red-400" : "text-white"
                  }`} />
                </motion.div>
                <h2 className={`text-3xl font-bold ${
                  theme === "dark" ? "text-red-400" : "text-white"
                }`}>
                  Venue Booking Details
                </h2>
              </div>
              <p className={`text-sm ${
                theme === "dark" ? "text-red-300" : "text-red-100"
              }`}>
                {hall} • {room?.roomNo}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Status Badge */}
              <div>
                {getStatusBadge(booking.status || "booked")}
              </div>

              {/* Extend Button - FIX: Call onExtend correctly */}
              {canExtend && (booking.status === "booked" || booking.status === "checked_in") && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  title="Extend Booking"
                  onClick={onExtend} // ✅ CORRECT - onExtend is already a function
                  className={`px-4 py-2 rounded-xl font-semibold transition-all ${
                    theme === "dark"
                      ? "bg-blue-700 hover:bg-blue-600 text-white"
                      : "bg-white hover:bg-blue-50 text-blue-700"
                  }`}
                >
                  <Edit2 className="w-4 h-4" />
                </motion.button>
              )}

              {/* Close Button */}
              <motion.button
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-red-400 hover:bg-gray-800"
                    : "text-white hover:text-red-200 hover:bg-red-600"
                }`}
              >
                <X size={24} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Details Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-6 rounded-2xl border-2 ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-blue-50 border-blue-200"
                }`}
              >
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                  theme === "dark" ? "text-gray-100" : "text-gray-800"
                }`}>
                  <UsersIcon className="w-5 h-5 text-red-600" />
                  Event Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Contact Person</p>
                    <p className={`font-semibold ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      {booking.name || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Society Name</p>
                    <p className={`font-semibold ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      {booking.societyName || "—"}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Event Name</p>
                    <p className={`font-semibold text-lg ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      {booking.eventName || "—"}
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Contact Details Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={`p-6 rounded-2xl border-2 ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                  theme === "dark" ? "text-gray-100" : "text-gray-800"
                }`}>
                  <Phone className="w-5 h-5 text-blue-600" />
                  Contact Information
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-blue-700 font-medium">Phone</p>
                      <p className="font-semibold text-blue-800">{booking.contact || "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                    <Mail className="w-5 h-5 text-purple-600" />
                    <div>
                      <p className="text-xs text-purple-700 font-medium">Email</p>
                      <p className="font-semibold text-purple-800 break-all">{booking.email || "—"}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Purpose & Description */}
              {(booking.purpose || booking.description) && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className={`p-6 rounded-2xl border-2 ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                  }`}>
                    <MessageSquare className="w-5 h-5 text-green-600" />
                    Additional Details
                  </h3>

                  {booking.purpose && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">Purpose</p>
                      <p className={`font-semibold ${
                        theme === "dark" ? "text-gray-100" : "text-gray-800"
                      }`}>
                        {booking.purpose}
                      </p>
                    </div>
                  )}

                  {booking.description && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Description</p>
                      <div className={`${
                        !showFullDescription && booking.description.length > 200 ? "relative" : ""
                      }`}>
                        <p className={`${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        } ${!showFullDescription && booking.description.length > 200 ? "line-clamp-3" : ""}`}>
                          {booking.description}
                        </p>
                        {booking.description.length > 200 && (
                          <button
                            onClick={() => setShowFullDescription(!showFullDescription)}
                            className="text-sm text-red-600 hover:text-red-700 font-semibold mt-2"
                          >
                            {showFullDescription ? "Show Less" : "Read More"}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Attachments */}
              {booking.attachments && booking.attachments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`p-6 rounded-2xl border-2 ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-700"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                  }`}>
                    <Paperclip className="w-5 h-5 text-orange-600" />
                    Attachments ({booking.attachments.length})
                  </h3>
                  <AttachmentGrid files={booking.attachments} theme={theme} />
                </motion.div>
              )}
            </div>

            {/* Right Column - Schedule & Location */}
            <div className="space-y-6">
              {/* Location Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-6 rounded-2xl border-2 ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                }`}
              >
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                  theme === "dark" ? "text-gray-100" : "text-gray-800"
                }`}>
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Location
                </h3>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                    <Building className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-600">Venue</p>
                      <p className="font-bold text-blue-700">{hall}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                    <MapPin className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-xs text-gray-600">Room</p>
                      <p className="font-bold text-indigo-700">{room?.roomNo}</p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Schedule Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className={`p-6 rounded-2xl border-2 ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                  theme === "dark" ? "text-gray-100" : "text-gray-800"
                }`}>
                  <Calendar className="w-5 h-5 text-purple-600" />
                  Schedule
                </h3>

                <div className="space-y-4">
                  {/* Check-in */}
                  <div className="flex items-start gap-3 p-4 bg-green-50 rounded-xl border-2 border-green-200">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ArrowRight className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-green-700 mb-1">CHECK-IN</p>
                      <p className="font-bold text-green-800 text-sm">
                        {formatDateTime(booking.from || booking.checkInDate, booking.checkInTime)}
                      </p>
                    </div>
                  </div>

                  {/* Check-out */}
                  <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border-2 border-red-200">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <ArrowRight className="w-5 h-5 text-red-600 rotate-180" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-red-700 mb-1">CHECK-OUT</p>
                      <p className="font-bold text-red-800 text-sm">
                        {formatDateTime(booking.to || booking.checkOutDate, booking.checkOutTime)}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Booking ID */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={`p-4 rounded-xl ${
                  theme === "dark"
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-gray-100 border border-gray-300"
                }`}
              >
                <p className="text-xs text-gray-500 mb-1">Booking ID</p>
                <p className={`font-mono text-xs font-semibold ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  {booking._id || booking.id || "—"}
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`px-8 py-5 border-t-2 flex justify-between items-center ${
          theme === "dark" 
            ? "border-gray-700 bg-gray-900" 
            : "border-gray-200 bg-gray-50"
        }`}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                : "bg-gray-200 hover:bg-gray-300 text-gray-800"
            }`}
          >
            Close
          </motion.button>

          {(booking.status === "booked" || booking.status === "checked_in") && (
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(220, 38, 38, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCancel}
              className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              Cancel Booking
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
