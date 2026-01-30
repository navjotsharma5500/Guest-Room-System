// src/components/UnifiedUpcoming.jsx
import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, User, Building2, Users, MapPin } from "lucide-react";
import { apiFetchUnifiedBookings } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function UnifiedUpcoming({ theme, onBookingClick }) {
  const { currentUser } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all, guest, hall

  const userRole = currentUser?.role;

  // Fetch unified bookings
  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        console.log("📋 Fetching unified upcoming bookings...");
        
        const response = await apiFetchUnifiedBookings();
        
        if (response.success) {
          console.log("✅ Unified bookings fetched:", response.bookings);
          setBookings(response.bookings || []);
        } else {
          console.error("❌ Failed to fetch bookings");
          setBookings([]);
        }
      } catch (error) {
        console.error("🔥 Error fetching bookings:", error);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();

    // Refresh every 2 minutes
    const interval = setInterval(fetchBookings, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // Filter and sort bookings
  const upcomingBookings = useMemo(() => {
    const now = new Date();

    let filtered = bookings.filter((booking) => {
      // ✅ ONLY show bookings with "booked" status
      // Exclude: checked_in, checked_out, cancelled, no_show
      if (booking.status !== "booked") {
        return false;
      }

      // Exclude reported guests
      if (booking.reportedStatus === "reported") {
        return false;
      }

      // Get check-in date/time
      const fromDate = booking.actualCheckInDate || booking.from || booking.checkInDate;
      if (!fromDate) return false;

      const checkInDateTime = new Date(fromDate);
      
      // Set check-in time
      const checkInTime = booking.actualCheckInTime || booking.checkInTime || "00:00";
      const [hours, minutes] = (checkInTime || "00:00").split(':').map(Number);
      checkInDateTime.setHours(hours || 0, minutes || 0, 0, 0);

      // ✅ ONLY show FUTURE bookings (check-in time hasn't passed yet)
      if (checkInDateTime < now) {
        return false;
      }

      // Apply type filter
      if (filter === "guest") {
        return booking.bookingType === "guest" || !booking.isHallBooking;
      }
      if (filter === "hall") {
        return booking.bookingType === "hall" || booking.isHallBooking;
      }

      return true; // "all"
    });

    // Sort by check-in date
    filtered.sort((a, b) => {
      const dateA = new Date(a.from || a.checkInDate);
      const dateB = new Date(b.from || b.checkInDate);
      return dateA - dateB;
    });

    return filtered;
  }, [bookings, filter]);

  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "—";

    try {
      const date = new Date(dateString);
      
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      const formattedDate = `${String(day).padStart(2, "0")}-${month}-${year}`;

      if (!timeString) return formattedDate;

      const [hours, minutes] = timeString.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;

      return `${formattedDate} (${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period})`;
    } catch {
      return dateString;
    }
  };

  const getBookingTypeLabel = (booking) => {
    if (booking.bookingType === "hall" || booking.isHallBooking) {
      return { label: "Hall", color: "purple", icon: Users };
    }
    return { label: "Guest", color: "blue", icon: Building2 };
  };

  const handleBookingClick = (booking) => {
    if (onBookingClick) {
      onBookingClick(booking);
    }
  };

  // Count by type (from filtered upcoming bookings only)
  const guestCount = upcomingBookings.filter(b => b.bookingType === "guest" || !b.isHallBooking).length;
  const hallCount = upcomingBookings.filter(b => b.bookingType === "hall" || b.isHallBooking).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl shadow-xl p-6 ${
        theme === "dark"
          ? "bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700"
          : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
            Upcoming Bookings
          </h2>
        </div>

        {/* Filter buttons (only show for admin) */}
        {userRole === "admin" && (
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === "all"
                  ? "bg-red-600 text-white"
                  : theme === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All ({guestCount + hallCount})
            </button>
            <button
              onClick={() => setFilter("guest")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === "guest"
                  ? "bg-blue-600 text-white"
                  : theme === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Guest ({guestCount})
            </button>
            <button
              onClick={() => setFilter("hall")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filter === "hall"
                  ? "bg-purple-600 text-white"
                  : theme === "dark"
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Hall ({hallCount})
            </button>
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          <p className="mt-2 text-sm text-gray-500">Loading bookings...</p>
        </div>
      )}

      {/* Bookings List */}
      {!loading && upcomingBookings.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">No upcoming bookings</p>
        </div>
      )}

      {!loading && upcomingBookings.length > 0 && (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {upcomingBookings.map((booking, index) => {
            const { label, color, icon: Icon } = getBookingTypeLabel(booking);

            return (
              <motion.div
                key={booking._id || booking.id || index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ scale: 1.02, x: 5 }}
                onClick={() => handleBookingClick(booking)}
                className={`
                  p-4 rounded-xl cursor-pointer transition-all border-l-4
                  ${color === "blue" ? "border-l-blue-500" : "border-l-purple-500"}
                  ${
                    theme === "dark"
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-white hover:bg-gray-50 border border-gray-200"
                  }
                `}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${color === "blue" ? "text-blue-500" : "text-purple-500"}`} />
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      color === "blue" 
                        ? "bg-blue-100 text-blue-700" 
                        : "bg-purple-100 text-purple-700"
                    }`}>
                      {label}
                    </span>
                  </div>
                  
                  {/* Status badge - always UPCOMING since we only show "booked" status */}
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                    UPCOMING
                  </span>
                </div>

                {/* Guest Name */}
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className={`font-semibold ${
                    theme === "dark" ? "text-gray-200" : "text-gray-800"
                  }`}>
                    {booking.guest || booking.name || "—"}
                  </span>
                </div>

                {/* Location */}
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <span className={`text-sm ${
                    theme === "dark" ? "text-gray-300" : "text-gray-600"
                  }`}>
                    {booking.hostel || booking.hall} - Room {booking.roomNo}
                  </span>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="flex items-center gap-1 text-gray-500 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>Check-in</span>
                    </div>
                    <div className={`font-medium ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      {formatDateTime(booking.from || booking.checkInDate, booking.checkInTime)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-gray-500 mb-1">
                      <Clock className="w-3 h-3" />
                      <span>Check-out</span>
                    </div>
                    <div className={`font-medium ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      {formatDateTime(booking.to || booking.checkOutDate, booking.checkOutTime)}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}