// src/components/HallBookings/HallUpcomingBookings.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Mail, 
  Phone, 
  ChevronRight,
  Building2,
  X,
  CalendarDays,
  Users
} from "lucide-react";
import { format, parseISO, isAfter, isBefore, addDays } from "date-fns";

export default function HallUpcomingBookings({ hallData, theme, onRefresh, setExtensionModal }) {
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

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
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-6 rounded-2xl backdrop-blur-xl border shadow-xl ${
          theme === "dark"
            ? "bg-gray-800/60 border-gray-700"
            : "bg-white/60 border-gray-200"
        }`}
      >
        <div className="flex items-center gap-3 mb-6">
          <CalendarDays className={`w-8 h-8 ${theme === "dark" ? "text-red-400" : "text-red-600"}`} />
          <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Upcoming Bookings
          </h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            theme === "dark"
              ? "bg-red-900/30 text-red-400"
              : "bg-red-100 text-red-700"
          }`}>
            {upcomingBookings.length} Booking{upcomingBookings.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {displayedBookings.map((booking, index) => (
            <CompactBookingCard
              key={booking._id || index}
              booking={booking}
              theme={theme}
              onClick={() => setSelectedBooking(booking)}
            />
          ))}
        </div>

        {upcomingBookings.length > 5 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAll(!showAll)}
            className={`w-full mt-6 py-3 rounded-xl font-medium flex items-center justify-center gap-2 ${
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

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            theme={theme}
            onClose={() => setSelectedBooking(null)}
            onExtend={() => {
              setExtensionModal({
                open: true,
                hall: selectedBooking.hall,
                roomNo: selectedBooking.roomNo,
                booking: selectedBooking
              });
              setSelectedBooking(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Compact Card Component (like the image)
function CompactBookingCard({ booking, theme, onClick }) {
  const getStatusColor = (status) => {
    if (status === "checked_in") return "bg-green-500";
    if (status === "booked") return "bg-green-500";
    return "bg-gray-500";
  };

  const getStatusLabel = (status) => {
    if (status === "checked_in") return "ACTIVE";
    if (status === "booked") return "UPCOMING";
    return status.toUpperCase();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}
      onClick={onClick}
      className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all ${
        theme === "dark"
          ? "bg-gray-800/80 border-gray-700 hover:border-red-500"
          : "bg-white border-gray-200 hover:border-red-500"
      }`}
    >
      {/* Status Badge */}
      <div className={`absolute top-3 right-3 px-2 py-1 rounded-md text-xs font-bold text-white ${getStatusColor(booking.status)}`}>
        {getStatusLabel(booking.status)}
      </div>

      {/* User Icon & Name */}
      <div className="mb-3 pr-20">
        <div className="flex items-center gap-2 mb-1">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            theme === "dark" ? "bg-purple-900/50" : "bg-purple-100"
          }`}>
            <User className={`w-5 h-5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
          </div>
        </div>
        <h3 className={`font-bold text-sm ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          {booking.name}
        </h3>
        <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
          {booking.societyName || "BTECH"}
        </p>
      </div>

      {/* Hall & Room */}
      <div className={`mb-3 p-2 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
        <div className="flex items-start gap-2">
          <Building2 className={`w-4 h-4 mt-0.5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Hostel
            </p>
            <p className={`text-xs font-bold ${theme === "dark" ? "text-white" : "text-gray-900"} truncate`}>
              {booking.hall}
            </p>
          </div>
        </div>
      </div>

      <div className={`mb-3 p-2 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
        <div className="flex items-start gap-2">
          <MapPin className={`w-4 h-4 mt-0.5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-medium ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
              Room Number
            </p>
            <p className={`text-xs font-bold ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>
              Guest Room {booking.roomNo}
            </p>
          </div>
        </div>
      </div>

      {/* Check-in/Check-out */}
      <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-blue-900/20" : "bg-blue-50"}`}>
        <div className="flex items-center gap-2 mb-1.5">
          <Calendar className={`w-3.5 h-3.5 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`} />
          <span className={`text-xs font-medium ${theme === "dark" ? "text-blue-300" : "text-blue-700"}`}>
            Check-in:
          </span>
        </div>
        <p className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"} ml-5`}>
          {format(parseISO(booking.checkInDate), "dd-MMM-yyyy")} ({booking.checkInTime})
        </p>
      </div>

      <div className={`p-2 rounded-lg mt-2 ${theme === "dark" ? "bg-purple-900/20" : "bg-purple-50"}`}>
        <div className="flex items-center gap-2 mb-1.5">
          <Calendar className={`w-3.5 h-3.5 ${theme === "dark" ? "text-purple-400" : "text-purple-600"}`} />
          <span className={`text-xs font-medium ${theme === "dark" ? "text-purple-300" : "text-purple-700"}`}>
            Check-out:
          </span>
        </div>
        <p className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"} ml-5`}>
          {format(parseISO(booking.checkOutDate), "dd-MMM-yyyy")} ({booking.checkOutTime})
        </p>
      </div>

      {/* Contact */}
      <div className={`mt-3 pt-3 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
        <div className="flex items-center gap-2">
          <Phone className={`w-3.5 h-3.5 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`} />
          <span className={`text-xs ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
            {booking.contact}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Detailed Modal Component
function BookingDetailsModal({ booking, theme, onClose, onExtend }) {
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
        className={`rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto ${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        }`}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-2xl font-bold mb-1">{booking.eventName || "Hall Booking"}</h3>
              <p className="text-red-100 text-sm">Booking Details</p>
            </div>
            <button
              onClick={onClose}
              className="hover:bg-white/20 p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Guest Information */}
          <div>
            <h4 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              <User className="w-5 h-5" />
              Guest Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem
                icon={<User className="w-4 h-4" />}
                label="Name"
                value={booking.name}
                theme={theme}
              />
              <InfoItem
                icon={<Users className="w-4 h-4" />}
                label="Society/Department"
                value={booking.societyName}
                theme={theme}
              />
              <InfoItem
                icon={<Mail className="w-4 h-4" />}
                label="Email"
                value={booking.email}
                theme={theme}
              />
              <InfoItem
                icon={<Phone className="w-4 h-4" />}
                label="Contact"
                value={booking.contact}
                theme={theme}
              />
            </div>
          </div>

          {/* Location Information */}
          <div>
            <h4 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              <Building2 className="w-5 h-5" />
              Location Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem
                icon={<Building2 className="w-4 h-4" />}
                label="Hall"
                value={booking.hall}
                theme={theme}
              />
              <InfoItem
                icon={<MapPin className="w-4 h-4" />}
                label="Room Number"
                value={`Guest Room ${booking.roomNo}`}
                theme={theme}
              />
            </div>
          </div>

          {/* Booking Timeline */}
          <div>
            <h4 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              <Calendar className="w-5 h-5" />
              Booking Timeline
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem
                icon={<Calendar className="w-4 h-4" />}
                label="Check-in Date"
                value={format(parseISO(booking.checkInDate), "dd-MMM-yyyy")}
                theme={theme}
              />
              <InfoItem
                icon={<Clock className="w-4 h-4" />}
                label="Check-in Time"
                value={booking.checkInTime}
                theme={theme}
              />
              <InfoItem
                icon={<Calendar className="w-4 h-4" />}
                label="Check-out Date"
                value={format(parseISO(booking.checkOutDate), "dd-MMM-yyyy")}
                theme={theme}
              />
              <InfoItem
                icon={<Clock className="w-4 h-4" />}
                label="Check-out Time"
                value={booking.checkOutTime}
                theme={theme}
              />
            </div>
          </div>

          {/* Purpose */}
          {booking.purpose && (
            <div>
              <h4 className={`text-lg font-bold mb-3 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                Purpose
              </h4>
              <div className={`p-4 rounded-lg ${
                theme === "dark" ? "bg-gray-700" : "bg-gray-50"
              }`}>
                <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                  {booking.purpose}
                </p>
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <h4 className={`text-lg font-bold mb-3 ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              Status
            </h4>
            <span className={`inline-block px-4 py-2 rounded-lg font-medium ${
              booking.status === "checked_in"
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : booking.status === "booked"
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
            }`}>
              {booking.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`p-6 border-t ${theme === "dark" ? "border-gray-700" : "border-gray-200"} flex gap-3`}>
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-900"
            }`}
          >
            Close
          </button>
          {["booked", "checked_in"].includes(booking.status) && (
            <button
              onClick={onExtend}
              className="flex-1 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors"
            >
              Extend Booking
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper Component for Info Items
function InfoItem({ icon, label, value, theme }) {
  return (
    <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={theme === "dark" ? "text-gray-400" : "text-gray-500"}>
          {icon}
        </span>
        <span className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
          {label}
        </span>
      </div>
      <p className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"} ml-6`}>
        {value}
      </p>
    </div>
  );
}