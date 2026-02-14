// src/components/VenueBookings/VenueUpcomingBookings.jsx
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

export default function VenueUpcomingBookings({ hallData, venueData, theme, onRefresh, setExtensionModal }) {
  const [upcomingBookings, setUpcomingBookings] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  useEffect(() => {
    const bookings = [];
    const now = new Date();
    const nextWeek = addDays(now, 7);

    const sourceData = venueData || hallData || {};

    Object.keys(sourceData).forEach(hallName => {
      const hall = sourceData[hallName];
      hall.rooms?.forEach(room => {
        room.bookings?.forEach(booking => {
          try {
            // Parse Dates
            const dateStr = booking.checkInDate; // YYYY-MM-DD
            const timeStr = booking.checkInTime || "00:00";
            const checkInDateTime = new Date(`${dateStr}T${timeStr}`);
            
            const endDateStr = booking.checkOutDate;
            const endTimeStr = booking.checkOutTime || "23:59";
            const checkOutDateTime = new Date(`${endDateStr}T${endTimeStr}`);

            // Filter Logic:
            // 1. Must be valid status (booked or checked_in)
            // 2. Must not be finished (CheckOut > Now)
            // 3. Must be within next 7 days (CheckIn < NextWeek)
            
            const isValidStatus = booking.status === "booked" || booking.status === "checked_in";
            const isNotFinished = isAfter(checkOutDateTime, now);
            const isWithinRange = isBefore(checkInDateTime, nextWeek);

            if (isValidStatus && isNotFinished && isWithinRange) {
              // Determine if Live/Active (Start <= Now <= End)
              const isLive = isBefore(checkInDateTime, now) && isAfter(checkOutDateTime, now);

              bookings.push({
                ...booking,
                hall: hallName,
                roomNo: room.roomNo,
                checkInDateTime: checkInDateTime,
                checkOutDateTime: checkOutDateTime,
                isLive: isLive || booking.status === "checked_in"
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
  }, [hallData, venueData]);

  // Increased limit to 10 as per user feedback
  const displayedBookings = showAll ? upcomingBookings : upcomingBookings.slice(0, 10);

  if (upcomingBookings.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`
          rounded-lg p-8 text-center transition-all duration-200
          ${theme === "dark"
            ? "bg-[#292a2d]"
            : "bg-white border border-[#dadce0]"
          }
        `}
      >
        <Calendar className={`w-16 h-16 mx-auto mb-4 ${
          theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
        }`} />
        <h3 className={`text-xl font-normal mb-2 ${
          theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
        }`}>
          No Upcoming Bookings
        </h3>
        <p className={`text-sm ${
          theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
        }`}>
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
        className={`
          rounded-lg p-6 transition-all duration-200
          ${theme === "dark"
            ? "bg-[#292a2d]"
            : "bg-white border border-[#dadce0]"
          }
        `}
      >
        <h3 className={`text-lg font-normal mb-4 ${
          theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
        }`}>
          Upcoming Bookings
        </h3>
        
        {/* Bookings list with Google styling */}
        <div className="space-y-3">
          {displayedBookings.map((booking, index) => (
            <div
              key={booking._id || index}
              className={`
                p-4 rounded-lg transition-all cursor-pointer
                ${theme === "dark"
                  ? "bg-[#3c4043] hover:bg-[#4a4d50]"
                  : "bg-[#f8f9fa] hover:bg-[#f1f3f4]"
                }
              `}
              onClick={() => setSelectedBooking(booking)}
            >
              {/* Booking details */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* User Info */}
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                      ${theme === "dark" 
                        ? "bg-[#8ab4f8] text-[#202124]" 
                        : "bg-[#1a73e8] text-white"
                      }
                    `}>
                      {booking.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-medium text-sm truncate ${
                        theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                      }`}>
                        {booking.name}
                      </h4>
                      <p className={`text-xs truncate ${
                        theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                      }`}>
                        {booking.societyName || "BTECH"}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className={`w-4 h-4 ${
                      theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                    }`} />
                    <span className={`text-sm ${
                      theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                    }`}>
                      {booking.hall} - Room {booking.roomNo}
                    </span>
                  </div>

                  {/* Date & Time */}
                  <div className="flex items-center gap-2">
                    <Calendar className={`w-4 h-4 ${
                      theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                    }`} />
                    <span className={`text-sm ${
                      theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                    }`}>
                      {format(parseISO(booking.checkInDate), "dd MMM yyyy")} • {booking.checkInTime}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <div className={`
                  px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap
                  ${booking.isLive
                    ? "bg-green-100 text-green-700 border border-green-200 animate-pulse"
                    : booking.status === "checked_in"
                    ? theme === "dark"
                      ? "bg-[#1e4620] text-[#81c995]"
                      : "bg-[#e6f4ea] text-[#137333]"
                    : theme === "dark"
                    ? "bg-[#8ab4f8]/20 text-[#8ab4f8]"
                    : "bg-[#d3e3fd] text-[#1967d2]"
                  }
                `}>
                  {booking.isLive ? "Live Now" : booking.status === "checked_in" ? "Checked In" : "Upcoming"}
                </div>
              </div>
            </div>
          ))}
        </div>

        {upcomingBookings.length > 5 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className={`
              w-full mt-4 py-2 rounded-lg text-sm font-medium transition-colors
              flex items-center justify-center gap-2
              ${theme === "dark"
                ? "text-[#8ab4f8] hover:bg-[#3c4043]"
                : "text-[#1a73e8] hover:bg-[#f1f3f4]"
              }
            `}
          >
            {showAll ? "Show Less" : `Show All (${upcomingBookings.length})`}
            <ChevronRight className={`w-4 h-4 transition-transform ${showAll ? "rotate-90" : ""}`} />
          </button>
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
        className={`
          rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto
          ${theme === "dark" ? "bg-[#292a2d]" : "bg-white"}
        `}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        {/* Header */}
        <div className={`
          p-6 border-b
          ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}
        `}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`text-2xl font-normal mb-1 ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}>
                {booking.eventName || "Venue Booking"}
              </h3>
              <p className={`text-sm ${
                theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
              }`}>
                Booking Details
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
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Guest Information */}
          <div>
            <h4 className={`text-base font-medium mb-4 flex items-center gap-2 ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
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
            <h4 className={`text-base font-medium mb-4 flex items-center gap-2 ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}>
              <Building2 className="w-5 h-5" />
              Location Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem
                icon={<Building2 className="w-4 h-4" />}
                label="Venue"
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
            <h4 className={`text-base font-medium mb-4 flex items-center gap-2 ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
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
              <h4 className={`text-base font-medium mb-3 ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}>
                Purpose
              </h4>
              <div className={`p-4 rounded-lg ${
                theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa]"
              }`}>
                <p className={`text-sm ${
                  theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                }`}>
                  {booking.purpose}
                </p>
              </div>
            </div>
          )}

          {/* Status */}
          <div>
            <h4 className={`text-base font-medium mb-3 ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}>
              Status
            </h4>
            <span className={`
              inline-block px-4 py-2 rounded-lg text-sm font-medium
              ${booking.status === "checked_in"
                ? theme === "dark"
                  ? "bg-[#1e4620] text-[#81c995]"
                  : "bg-[#e6f4ea] text-[#137333]"
                : booking.status === "booked"
                ? theme === "dark"
                  ? "bg-[#8ab4f8]/20 text-[#8ab4f8]"
                  : "bg-[#d3e3fd] text-[#1967d2]"
                : theme === "dark"
                ? "bg-[#3c4043] text-[#9aa0a6]"
                : "bg-[#f1f3f4] text-[#5f6368]"
              }
            `}>
              {booking.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className={`
          p-6 border-t flex gap-3
          ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}
        `}>
          <button
            onClick={onClose}
            className={`
              flex-1 py-3 rounded-lg font-medium transition-colors
              ${theme === "dark"
                ? "bg-[#3c4043] hover:bg-[#4a4d50] text-[#e8eaed]"
                : "bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124]"
              }
            `}
          >
            Close
          </button>
          {["booked", "checked_in"].includes(booking.status) && (
            <button
              onClick={onExtend}
              className={`
                flex-1 py-3 rounded-lg font-medium transition-colors
                ${theme === "dark"
                  ? "bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124]"
                  : "bg-[#1a73e8] hover:bg-[#1967d2] text-white"
                }
              `}
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
    <div className={`
      p-3 rounded-lg
      ${theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa]"}
    `}>
      <div className="flex items-center gap-2 mb-1">
        <span className={theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}>
          {icon}
        </span>
        <span className={`text-xs ${
          theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
        }`}>
          {label}
        </span>
      </div>
      <p className={`text-sm font-medium ml-6 ${
        theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
      }`}>
        {value}
      </p>
    </div>
  );
}
