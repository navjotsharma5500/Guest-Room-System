// src/components/HallBookings/HallMainContent.jsx - UPDATED WITH BIGGER CALENDAR
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Users, TrendingUp, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import HallUpcomingBookings from "./HallUpcomingBookings";
import BookingDetailsModal from "./BookingDetailsModal";

import "react-calendar/dist/Calendar.css";
import "../../styles/calendarCustom.css";

export default function HallMainContent({ hallData, theme, currentUser, onRefresh, setExtensionModal, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateBookings, setDateBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Calculate stats
  const calculateStats = useCallback(() => {
    const halls = Object.keys(hallData || {});
    let totalRooms = 0;
    let occupiedRooms = 0;
    let totalBookings = 0;
    let activeBookings = 0;

    halls.forEach(hallName => {
      const hall = hallData[hallName];
      if (hall.rooms) {
        totalRooms += hall.rooms.length;
        
        hall.rooms.forEach(room => {
          const activeRoomBookings = (room.bookings || []).filter(
            b => ["booked", "checked_in"].includes(b.status)
          );
          
          if (activeRoomBookings.length > 0) {
            occupiedRooms++;
          }
          
          totalBookings += room.bookings?.length || 0;
          activeBookings += activeRoomBookings.length;
        });
      }
    });

    return {
      totalHalls: halls.length,
      totalRooms,
      occupiedRooms,
      availableRooms: totalRooms - occupiedRooms,
      totalBookings,
      activeBookings,
      occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0
    };
  }, [hallData]);

  const stats = calculateStats();

  // Get bookings count for a specific date
  const getBookingsForDate = useCallback((date) => {
    const targetDate = startOfDay(date);
    let count = 0;

    Object.keys(hallData || {}).forEach(hallName => {
      const hall = hallData[hallName];
      hall.rooms?.forEach(room => {
        room.bookings?.forEach(booking => {
          try {
            const checkIn = startOfDay(parseISO(booking.checkInDate));
            const checkOut = endOfDay(parseISO(booking.checkOutDate));

            if (isWithinInterval(targetDate, { start: checkIn, end: checkOut })) {
              count++;
            }
          } catch (error) {}
        });
      });
    });

    return count;
  }, [hallData]);

  // Get bookings for selected date
  useEffect(() => {
    const bookings = [];
    const targetDate = startOfDay(selectedDate);

    Object.keys(hallData || {}).forEach(hallName => {
      const hall = hallData[hallName];
      hall.rooms?.forEach(room => {
        room.bookings?.forEach(booking => {
          try {
            const checkIn = startOfDay(parseISO(booking.checkInDate));
            const checkOut = endOfDay(parseISO(booking.checkOutDate));

            if (isWithinInterval(targetDate, { start: checkIn, end: checkOut })) {
              bookings.push({
                ...booking,
                hall: hallName,
                roomNo: room.roomNo
              });
            }
          } catch (error) {
            console.error("Date parsing error:", error);
          }
        });
      });
    });

    setDateBookings(bookings);
  }, [selectedDate, hallData]);

  // Generate calendar days
  const calendarDays = useCallback(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = prevLastDay.getDate();
    
    const days = [];
    
    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentMonth]);

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Halls"
          value={stats.totalHalls}
          icon={<CalendarIcon className="w-5 h-5" />}
          color="blue"
          theme={theme}
        />
        <StatCard
          title="Active Bookings"
          value={stats.activeBookings}
          icon={<Users className="w-5 h-5" />}
          color="green"
          theme={theme}
        />
        <StatCard
          title="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
          theme={theme}
        />
        <StatCard
          title="Available Rooms"
          value={stats.availableRooms}
          icon={<Clock className="w-5 h-5" />}
          color="orange"
          theme={theme}
        />
      </div>

      {/* Big Calendar with Booking Counts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-8 rounded-2xl backdrop-blur-xl border shadow-xl ${
          theme === "dark"
            ? "bg-gray-800/60 border-gray-700"
            : "bg-white/60 border-gray-200"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Booking Calendar
          </h3>
          <button
            onClick={() => onNavigate("calendar")}
            className="text-sm text-red-600 hover:text-red-700 font-medium px-4 py-2 rounded-lg hover:bg-red-50 transition"
          >
            View Full Calendar →
          </button>
        </div>

        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={handlePrevMonth}
            className={`p-3 rounded-xl transition-all hover:scale-110 ${
              theme === 'dark'
                ? 'hover:bg-gray-700 bg-gray-700/30 text-gray-300'
                : 'hover:bg-gray-100 bg-white/50 text-gray-700'
            }`}
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="text-center">
            <h3 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h3>
          </div>
          
          <button
            onClick={handleNextMonth}
            className={`p-3 rounded-xl transition-all hover:scale-110 ${
              theme === 'dark'
                ? 'hover:bg-gray-700 bg-gray-700/30 text-gray-300'
                : 'hover:bg-gray-100 bg-white/50 text-gray-700'
            }`}
          >
            <ChevronRight size={24} />
          </button>
        </div>

        {/* Day Names */}
        <div className="grid grid-cols-7 gap-3 mb-4">
          {dayNames.map(day => (
            <div
              key={day}
              className={`text-center text-sm font-bold py-3 rounded-lg ${
                theme === 'dark' 
                  ? 'text-gray-300 bg-gray-700/30' 
                  : 'text-gray-700 bg-gray-100/50'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-3">
          {calendarDays().map((day, index) => {
            const bookingCount = getBookingsForDate(day.date);
            const today = isToday(day.date);
            const selected = isSelected(day.date);
            
            return (
              <motion.button
                key={index}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleDateClick(day.date)}
                className={`
                  relative aspect-square rounded-xl p-3 transition-all
                  ${!day.isCurrentMonth && 'opacity-40'}
                  ${today && 'ring-2 ring-blue-500'}
                  ${selected 
                    ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg' 
                    : theme === 'dark'
                    ? 'hover:bg-gray-700/60 bg-gray-700/30 text-gray-200'
                    : 'hover:bg-white bg-gray-50/50 text-gray-800'
                  }
                `}
              >
                <div className="flex flex-col items-center justify-center h-full">
                  <span className={`text-lg font-bold ${selected ? 'text-white' : ''}`}>
                    {day.date.getDate()}
                  </span>
                  
                  {bookingCount > 0 && (
                    <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                      selected
                        ? 'bg-white/30 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      {bookingCount}
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Selected Date Info */}
        {dateBookings.length > 0 && (
          <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {dateBookings.length} booking{dateBookings.length !== 1 ? "s" : ""} on{" "}
              {format(selectedDate, "MMMM dd, yyyy")}
            </p>
          </div>
        )}
      </motion.div>

      {/* Upcoming Bookings */}
      <HallUpcomingBookings
        hallData={hallData}
        theme={theme}
        onRefresh={onRefresh}
        setExtensionModal={setExtensionModal}
        onBookingClick={setSelectedBooking}
      />

      {/* Unified Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailsModal
            theme={theme}
            modal={{
              hall: selectedBooking.hall,
              room: { roomNo: selectedBooking.roomNo },
              booking: selectedBooking
            }}
            onClose={() => setSelectedBooking(null)}
            onCancel={() => {
              // Handle cancel
              setSelectedBooking(null);
            }}
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
    </div>
  );
}

// Stats Card Component
function StatCard({ title, value, icon, color, theme }) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600",
    green: "from-green-500 to-green-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
      className={`p-4 rounded-2xl backdrop-blur-xl border shadow-xl ${
        theme === "dark"
          ? "bg-gray-800/60 border-gray-700"
          : "bg-white/60 border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            {title}
          </p>
          <p className={`text-2xl font-bold mt-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            {value}
          </p>
        </div>
        <div className={`p-2 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}