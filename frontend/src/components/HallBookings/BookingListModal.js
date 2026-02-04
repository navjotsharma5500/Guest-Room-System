// src/components/HallBookings/BookingListModal.js
import React from "react";
import { motion } from "framer-motion";
import { X, Calendar, CalendarDays, Clock, CheckCircle2, User2 } from "lucide-react";
import { useEscapeKey } from "../../hooks/useEscapeKey";

export default function BookingListModal({
  theme,
  modal,
  onClose,
  onSelectBooking,
}) {
  useEscapeKey(onClose);
  if (!modal || !modal.bookings) {
    console.error("❌ BookingListModal: Invalid modal data", modal);
    return null;
  }

  const getName = (booking) => {
    return booking.name || booking.fullName || "Guest";
  };

  const isActiveBooking = (b) => {
    return b.status === "checked_in";
  };

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

  const handleSelectBooking = (booking) => {
    console.log("✅ Booking selected:", booking);
    if (onSelectBooking && typeof onSelectBooking === 'function') {
      onSelectBooking(booking);
    } else {
      console.error("❌ onSelectBooking is not a function");
    }
  };

  // Filter out past bookings
  const activeBookings = modal.bookings.filter((b) => {
    if (b.status === "checked_out" || b.status === "cancelled" || b.status === "no_show") {
      return false;
    }
    if (b.to || b.checkOutDate) {
      const checkoutDate = new Date(b.to || b.checkOutDate);
      const checkoutTime = b.checkOutTime || "23:59";
      const [hours, minutes] = checkoutTime.split(':').map(Number);
      checkoutDate.setHours(hours || 23, minutes || 59, 0, 0);
      const now = new Date();
      if (now > checkoutDate) {
        return false;
      }
    }
    return true;
  });

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className={`
          w-full max-w-md max-h-[90vh] overflow-hidden rounded-lg shadow-2xl
          ${theme === "dark" ? "bg-[#292a2d]" : "bg-white"}
        `}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        {/* Header */}
        <div className={`
          px-6 py-4 border-b flex items-center justify-between
          ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}
        `}>
          <div>
            <h3 className={`text-lg font-normal flex items-center gap-2 ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}>
              <CalendarDays className="w-5 h-5" />
              Room {modal.room?.roomNo || "N/A"}
            </h3>
            <p className={`text-sm mt-1 ${
              theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
            }`}>
              {activeBookings.length} bookings found
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

        {/* Booking Cards */}
        <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
          {activeBookings.map((b, idx) => {
            const bookingId = b._id || b.id || idx;
            const isActive = isActiveBooking(b);

            return (
              <motion.div
                key={bookingId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => handleSelectBooking(b)}
                className={`
                  relative rounded-lg p-4 cursor-pointer transition-all
                  ${isActive
                    ? theme === "dark"
                      ? "bg-[#5f1111] hover:bg-[#6f1a1a] border border-[#f28b82]"
                      : "bg-[#fce8e6] hover:bg-[#fad2cf] border border-[#f28b82]"
                    : theme === "dark"
                      ? "bg-[#194d19] hover:bg-[#1f5c1f] border border-[#81c995]"
                      : "bg-[#e6f4ea] hover:bg-[#ceead6] border border-[#81c995]"
                  }
                `}
              >
                {/* Status Badge */}
                <div className={`
                  absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-medium
                  ${isActive 
                    ? "bg-[#d93025] text-white" 
                    : "bg-[#1e8e3e] text-white"
                  }
                `}>
                  {isActive ? "ACTIVE" : "UPCOMING"}
                </div>

                {/* Booking Details */}
                <div className="pr-20">
                  <p className={`text-sm font-medium flex items-center gap-1.5 mb-2 ${
                    theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                  }`}>
                    <User2 className="w-4 h-4" />
                    {getName(b)}
                  </p>

                  <div className={`space-y-1 text-xs ${
                    theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                  }`}>
                    <div className="flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 mt-0.5" />
                      <div>
                        <span className="font-medium">Check-in: </span>
                        <span>{formatDateTime(b.from || b.checkInDate, b.checkInTime)}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 mt-0.5" />
                      <div>
                        <span className="font-medium">Check-out: </span>
                        <span>{formatDateTime(b.to || b.checkOutDate, b.checkOutTime)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className={`
          p-4 border-t
          ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}
        `}>
          <button
            onClick={onClose}
            className={`
              w-full py-2 rounded text-sm font-medium transition-colors
              ${theme === "dark"
                ? "bg-transparent border border-[#5f6368] text-[#e8eaed] hover:bg-[#3c4043]"
                : "bg-transparent border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]"
              }
            `}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}