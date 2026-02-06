// BookingListModal.js - COMPLETE FIXED VERSION
import React from "react";
import { motion } from "framer-motion";
import { X, Calendar, CalendarDays, Clock, CheckCircle2, User2 } from "lucide-react";

export default function BookingListModal({
  theme,
  modal,
  onClose,
  onSelectBooking,
  onAddNewBooking,
}) {
  // Ã¢Å“â€¦ CRITICAL FIX: Safe navigation
  if (!modal || !modal.bookings) {
    console.error("Ã¢ÂÅ’ BookingListModal: Invalid modal data", modal);
    return null;
  }

  const getGuestName = (booking) => {
    return (
      booking.guest ||
      booking.name ||
      booking.fullName ||
      booking.contactName ||
      booking.guestName ||
      "Guest"
    );
  };

  // Helper to check if booking is active (checked_in or reported)
  const isActiveBooking = (b) => {
    return b.status === "checked_in" || b.reportedStatus === "reported";
  };

  // Format date and time like RoomCard
  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "Ã¢â‚¬â€";

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
    console.log("Ã¢Å“â€¦ Booking selected:", booking);
    if (onSelectBooking && typeof onSelectBooking === 'function') {
      onSelectBooking(booking);
    } else {
      console.error("Ã¢ÂÅ’ onSelectBooking is not a function");
    }
  };

  // Filter out past bookings
  const activeBookings = modal.bookings.filter((b) => {
    if (b.status === "checked_out" || b.status === "cancelled" || b.status === "no_show") {
      return false;
    }
    // Check if checkout date has passed
    if (b.to) {
      const checkoutDate = new Date(b.to);
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        {/* Header - Red gradient like RoomCard */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <CalendarDays className="w-5 h-5" />
                Room {modal.room?.roomNo || "N/A"}
              </h3>
              <p className="text-sm text-red-100 mt-0.5">
                {activeBookings.length} bookings found
              </p>
            </div>
            <button
              onClick={onClose}
              className="hover:bg-white/20 p-1.5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Booking Cards - Color coded like RoomCard */}
        <div className="p-4 space-y-2.5 max-h-96 overflow-y-auto">
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
                className={`relative rounded-xl p-3 cursor-pointer transition-all border-2 ${
                  isActive
                    ? "bg-red-50 border-red-300 hover:bg-red-100"
                    : "bg-green-50 border-green-300 hover:bg-green-100"
                }`}
              >
                {/* Status Badge */}
                <div
                  className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 ${
                    isActive ? "bg-red-500 text-white" : "bg-green-500 text-white"
                  }`}
                >
                  {isActive ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" />
                      ACTIVE
                    </>
                  ) : (
                    <>
                      <Calendar className="w-3 h-3" />
                      UPCOMING
                    </>
                  )}
                </div>

                {/* Booking Details */}
                <div className="pr-20">
                  <p className={`text-sm font-bold flex items-center gap-1.5 mb-2 ${
                    isActive ? "text-red-700" : "text-green-700"
                  }`}>
                    <User2 className="w-4 h-4" />
                    {getGuestName(b)}
                  </p>

                  <div className="space-y-1 text-xs text-gray-600">
                    <div className="flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                      <div>
                        <span className="font-medium">Check-in: </span>
                        <span>{formatDateTime(b.from, b.checkInTime || b.actualCheckInTime)}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                      <div>
                        <span className="font-medium">Check-out: </span>
                        <span>{formatDateTime(b.to, b.checkOutTime || b.actualCheckOutTime)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold transition-colors text-sm"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}