// src/components/HallBookings/BookingDetailsModal.jsx
import React from "react";
import { motion } from "framer-motion";
import { X, Calendar, Clock, User, Mail, Phone, Building, FileText, XCircle } from "lucide-react";
import AttachmentGrid from "../AttachmentGrid";

export default function BookingDetailsModal({
  theme,
  modal,
  onClose,
  onExtend,
  onCancel,
}) {
  if (!modal || !modal.booking) return null;

  const { booking, hall, room } = modal;

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
      const formattedDate = `${String(day).padStart(2, "0")}-${month}-${year}`;

      if (!timeString) return formattedDate;

      const timeParts = timeString.split(":");
      const hh = parseInt(timeParts[0], 10);
      const mm = parseInt(timeParts[1], 10);

      if (isNaN(hh) || isNaN(mm)) return formattedDate;

      const period = hh >= 12 ? "PM" : "AM";
      const hours = hh % 12 || 12;

      return `${formattedDate} (${String(hours).padStart(2, "0")}:${String(mm).padStart(2, "0")} ${period})`;
    } catch {
      return dateString;
    }
  };

  const handleCancel = () => {
    onCancel({
      hall,
      room,
      booking,
    });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`rounded-2xl shadow-2xl p-6 w-[780px] max-h-[85vh] overflow-y-auto ${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        }`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2
            className={`text-2xl font-bold ${
              theme === "dark" ? "text-red-400" : "text-red-700"
            }`}
          >
            Hall Booking Details
          </h2>

          <div className="flex items-center gap-2">
            {new Date(booking.to || booking.checkOutDate) >= new Date() && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Extend Booking"
                onClick={() => onExtend(booking)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg text-sm font-medium"
              >
                Extend
              </motion.button>
            )}
            <motion.button
              whileHover={{ rotate: 90, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={
                theme === "dark"
                  ? "text-gray-400 hover:text-red-400"
                  : "text-gray-500 hover:text-red-700"
              }
              onClick={onClose}
            >
              <X size={24} />
            </motion.button>
          </div>
        </div>

        {/* Booking Information */}
        <div className="space-y-4">
          {/* Hall & Room */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Hall</p>
              <p className="font-semibold text-blue-700">{hall}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Room</p>
              <p className="font-semibold text-blue-700">{room?.roomNo}</p>
            </div>
          </div>

          {/* Name & Society & Event */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <User className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="text-xs text-gray-600">Name</p>
                <p className="font-semibold">{booking.name || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="text-xs text-gray-600">Society</p>
                <p className="font-semibold">{booking.societyName || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="text-xs text-gray-600">Event</p>
                <p className="font-semibold">{booking.eventName || "—"}</p>
              </div>
            </div>
          </div>

          {/* Contact & Email */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Phone className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="text-xs text-gray-600">Contact</p>
                <p className="font-semibold">{booking.contact || "—"}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="text-xs text-gray-600">Email</p>
                <p className="font-semibold">{booking.email || "—"}</p>
              </div>
            </div>
          </div>

          {/* Check-in & Check-out */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2">
              <Calendar className="w-5 h-5 text-green-600 mt-1" />
              <div>
                <p className="text-xs text-gray-600">Check-in</p>
                <p className="font-semibold text-green-700">
                  {formatDateTime(booking.from || booking.checkInDate, booking.checkInTime)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Calendar className="w-5 h-5 text-red-600 mt-1" />
              <div>
                <p className="text-xs text-gray-600">Check-out</p>
                <p className="font-semibold text-red-700">
                  {formatDateTime(booking.to || booking.checkOutDate, booking.checkOutTime)}
                </p>
              </div>
            </div>
          </div>

          {/* Purpose */}
          {booking.purpose && (
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="text-xs text-gray-600">Purpose</p>
                <p className="font-semibold">{booking.purpose}</p>
              </div>
            </div>
          )}

          {/* Description */}
          {booking.description && (
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-gray-500 mt-1" />
              <div>
                <p className="text-xs text-gray-600">Description</p>
                <p className="font-semibold">{booking.description}</p>
              </div>
            </div>
          )}

          {/* Attachments */}
          {booking.attachments && booking.attachments.length > 0 && (
            <div>
              <p className="text-sm font-semibold mb-2 text-gray-700">Attachments</p>
              <AttachmentGrid files={booking.attachments} theme={theme} />
            </div>
          )}

          {/* Status */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600 mb-1">Status</p>
            <p className="font-semibold text-gray-700 capitalize">{booking.status || "booked"}</p>
          </div>
        </div>

        <div className="flex justify-end mt-6 gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCancel}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Cancel Booking
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium ${
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Close
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}