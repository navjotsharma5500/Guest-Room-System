// src/components/UnifiedCalendar.jsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, Building2 } from "lucide-react";
import { apiFetchUnifiedBookingsByDateRange } from "../utils/api";
import { useAuth } from "../context/AuthContext";

export default function UnifiedCalendar({ theme, onDateClick }) {
  const { currentUser } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const userRole = currentUser?.role;

  // Fetch bookings for current month
  useEffect(() => {
    const fetchMonthBookings = async () => {
      setLoading(true);
      try {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        
        const startDate = new Date(year, month, 1).toISOString().split("T")[0];
        const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];

        console.log("📅 Fetching unified bookings:", { startDate, endDate });

        const response = await apiFetchUnifiedBookingsByDateRange(startDate, endDate);
        
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

    fetchMonthBookings();
  }, [currentMonth]);

  // Get bookings for a specific date
  const getBookingsForDate = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    
    return bookings.filter((booking) => {
      const checkIn = new Date(booking.from || booking.checkInDate);
      const checkOut = new Date(booking.to || booking.checkOutDate);
      
      const checkInStr = checkIn.toISOString().split("T")[0];
      const checkOutStr = checkOut.toISOString().split("T")[0];
      
      return dateStr >= checkInStr && dateStr <= checkOutStr;
    });
  };

  // Count bookings by type for a date
  const getBookingCounts = (date) => {
    const dayBookings = getBookingsForDate(date);
    
    const guestCount = dayBookings.filter(b => 
      b.bookingType === 'guest' || !b.isHallBooking
    ).length;
    
    const hallCount = dayBookings.filter(b => 
      b.bookingType === 'hall' || b.isHallBooking
    ).length;
    
    return { guestCount, hallCount, total: dayBookings.length };
  };

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Empty cells before first day
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Actual days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  }, [currentMonth]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    if (!date) return;
    setSelectedDate(date);
    if (onDateClick) {
      const dayBookings = getBookingsForDate(date);
      onDateClick(date, dayBookings);
    }
  };

  const monthName = currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
          <CalendarIcon className="w-6 h-6 text-red-600" />
          <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
            Unified Calendar
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevMonth}
            className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </motion.button>

          <div className="px-4 py-2 bg-red-50 rounded-lg">
            <p className="text-sm font-bold text-red-700">{monthName}</p>
          </div>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleNextMonth}
            className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span className={theme === "dark" ? "text-gray-300" : "text-gray-600"}>
            Guest Rooms
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500"></div>
          <span className={theme === "dark" ? "text-gray-300" : "text-gray-600"}>
            Hall Bookings
          </span>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-gray-500 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-2">
        <AnimatePresence mode="wait">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} />;
            }

            const { guestCount, hallCount, total } = getBookingCounts(date);
            const isToday = date.getTime() === today.getTime();
            const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
            const isPast = date < today;

            return (
              <motion.button
                key={date.toISOString()}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.01 }}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDateClick(date)}
                disabled={loading}
                className={`
                  relative aspect-square p-2 rounded-xl transition-all
                  ${isToday ? "ring-2 ring-red-500" : ""}
                  ${isSelected ? "bg-red-100 border-2 border-red-500" : ""}
                  ${isPast ? "opacity-50" : ""}
                  ${
                    theme === "dark"
                      ? "bg-gray-700 hover:bg-gray-600"
                      : "bg-white hover:bg-gray-50 border border-gray-200"
                  }
                `}
              >
                {/* Date number */}
                <div className={`text-sm font-semibold ${
                  isToday ? "text-red-600" : theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  {date.getDate()}
                </div>

                {/* Booking indicators */}
                {total > 0 && (
                  <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 justify-center">
                    {guestCount > 0 && (
                      <div
                        className="flex-1 h-1 rounded-full bg-blue-500"
                        title={`${guestCount} guest booking(s)`}
                      />
                    )}
                    {hallCount > 0 && (
                      <div
                        className="flex-1 h-1 rounded-full bg-purple-500"
                        title={`${hallCount} hall booking(s)`}
                      />
                    )}
                  </div>
                )}

                {/* Count badge */}
                {total > 0 && (
                  <div className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {total}
                  </div>
                )}
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="text-center mt-4">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
        </div>
      )}
    </motion.div>
  );
}