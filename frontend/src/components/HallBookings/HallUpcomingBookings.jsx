// src/components/HallBookings/HallUpcomingBookings.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, User, Mail, Phone, ChevronRight } from "lucide-react";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";

export default function HallUpcomingBookings({ hallData, theme, onRefresh, setExtensionModal }) {
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const bookings = [];
    const now = new Date();
    const nextWeek = addDays(now, 7);

    Object.keys(hallData || {}).forEach(hallName => {
      const hall = hallData[hallName];
      hall.rooms?.forEach(room => {
        room.bookings?.forEach(booking => {
          try {
            const checkInDate = parseISO(booking.checkInDate);
            
            // Get upcoming bookings (within next 7 days) or currently active
            if (
              (isAfter(checkInDate, now) && isBefore(checkInDate, nextWeek)) ||
              booking.status === "booked" ||
              booking.status === "checked_in"
            ) {
              bookings.push({
                ...booking,
                hall: hallName,
                roomNo: room.roomNo,
                checkInDateTime: checkInDate
              });
            }
          } catch (error) {
            console.error("Date parsing error:", error);
          }
        });
      });
    });

    // Sort by check-in date
    bookings.sort((a, b) => a.checkInDateTime - b.checkInDateTime);
    setUpcomingBookings(bookings);
  }, [hallData]);

  const displayedBookings = showAll ? upcomingBookings : upcomingBookings.slice(0, 5);

  if (upcomingBookings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-8 rounded-2xl backdrop-blur-xl border shadow-xl text-center ${
          theme === "dark"
            ? "bg-gray-800/60 border-gray-700"
            : "bg-white/60 border-gray-200"
        }`}
      >
        <Calendar className={`w-16 h-16 mx-auto mb-4 ${
          theme === "dark" ? "text-gray-600" : "text-gray-400"
        }`} />
        <h3 className={`text-xl font-bold mb-2 ${
          theme === "dark" ? "text-white" : "text-gray-900"
        }`}>
          No Upcoming Bookings
        </h3>
        <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
          There are no bookings scheduled for the next 7 days
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-2xl backdrop-blur-xl border shadow-xl ${
        theme === "dark"
          ? "bg-gray-800/60 border-gray-700"
          : "bg-white/60 border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Upcoming Bookings
        </h2>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          theme === "dark"
            ? "bg-red-900/30 text-red-400"
            : "bg-red-100 text-red-700"
        }`}>
          {upcomingBookings.length} Total
        </span>
      </div>

      <div className="space-y-4">
        {displayedBookings.map((booking, index) => (
          <BookingCard
            key={booking._id || index}
            booking={booking}
            theme={theme}
            onRefresh={onRefresh}
            setExtensionModal={setExtensionModal}
          />
        ))}
      </div>

      {upcomingBookings.length > 5 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAll(!showAll)}
          className={`w-full mt-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
            theme === "dark"
              ? "bg-gray-700 hover:bg-gray-600 text-white"
              : "bg-gray-100 hover:bg-gray-200 text-gray-900"
          }`}
        >
          {showAll ? "Show Less" : `Show All (${upcomingBookings.length})`}
          <ChevronRight className={`w-4 h-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
        </motion.button>
      )}
    </motion.div>
  );
}

function BookingCard({ booking, theme, onRefresh, setExtensionModal }) {
  const getStatusColor = (status) => {
    const colors = {
      booked: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      checked_in: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      checked_out: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
      cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      no_show: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    };
    return colors[status] || colors.booked;
  };

  const handleExtend = () => {
    setExtensionModal({
      open: true,
      hall: booking.hall,
      roomNo: booking.roomNo,
      booking: booking
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}
      className={`p-5 rounded-xl border ${
        theme === "dark"
          ? "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
          : "bg-white/80 border-gray-200 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {booking.eventName}
            </h3>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
              {booking.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
            <User className="w-4 h-4" />
            <span>{booking.name} • {booking.societyName}</span>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{booking.hall} - Room {booking.roomNo}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className={`flex items-center gap-2 text-sm ${
          theme === "dark" ? "text-gray-300" : "text-gray-700"
        }`}>
          <Calendar className="w-4 h-4 text-blue-500" />
          <span>
            {format(parseISO(booking.checkInDate), "MMM dd, yyyy")} - {format(parseISO(booking.checkOutDate), "MMM dd, yyyy")}
          </span>
        </div>

        <div className={`flex items-center gap-2 text-sm ${
          theme === "dark" ? "text-gray-300" : "text-gray-700"
        }`}>
          <Clock className="w-4 h-4 text-green-500" />
          <span>
            {booking.checkInTime} - {booking.checkOutTime}
          </span>
        </div>

        <div className={`flex items-center gap-2 text-sm ${
          theme === "dark" ? "text-gray-300" : "text-gray-700"
        }`}>
          <Mail className="w-4 h-4 text-purple-500" />
          <span>{booking.email}</span>
        </div>

        <div className={`flex items-center gap-2 text-sm ${
          theme === "dark" ? "text-gray-300" : "text-gray-700"
        }`}>
          <Phone className="w-4 h-4 text-orange-500" />
          <span>{booking.contact}</span>
        </div>
      </div>

      {booking.purpose && (
        <div className={`p-3 rounded-lg mb-4 ${
          theme === "dark" ? "bg-gray-800" : "bg-gray-50"
        }`}>
          <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
            <strong>Purpose:</strong> {booking.purpose}
          </p>
        </div>
      )}

      {["booked", "checked_in"].includes(booking.status) && (
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleExtend}
            className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
          >
            Extend Booking
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}