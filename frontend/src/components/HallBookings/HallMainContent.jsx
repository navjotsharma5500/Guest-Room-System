// src/components/HallBookings/HallMainContent.jsx - UPDATED VERSION
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Users, TrendingUp, Clock } from "lucide-react";
import Calendar from "react-calendar";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import HallUpcomingBookings from "./HallUpcomingBookings";
// ❌ REMOVED: import HallGrid from "./HallGrid";

import "react-calendar/dist/Calendar.css";
import "../../styles/calendarCustom.css";

export default function HallMainContent({ hallData, theme, currentUser, onRefresh, setExtensionModal, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateBookings, setDateBookings] = useState([]);

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

  // ✅ NEW: Handle calendar click - navigate to calendar page
  const handleCalendarClick = () => {
    if (onNavigate) {
      onNavigate("calendar");
    }
  };

  // Calendar tile styling
  const tileClassName = ({ date, view }) => {
    if (view !== "month") return "";

    const bookingsOnDate = [];
    const targetDate = startOfDay(date);

    Object.keys(hallData || {}).forEach(hallName => {
      const hall = hallData[hallName];
      hall.rooms?.forEach(room => {
        room.bookings?.forEach(booking => {
          try {
            const checkIn = startOfDay(parseISO(booking.checkInDate));
            const checkOut = endOfDay(parseISO(booking.checkOutDate));

            if (isWithinInterval(targetDate, { start: checkIn, end: checkOut })) {
              bookingsOnDate.push(booking);
            }
          } catch (error) {}
        });
      });
    });

    if (bookingsOnDate.length === 0) return "";

    const hasActive = bookingsOnDate.some(b => ["booked", "checked_in"].includes(b.status));
    return hasActive ? "has-bookings" : "has-inactive-bookings";
  };

  return (
    <div className="p-6 space-y-6">
      {/* ✅ Stats Cards - Made smaller and more compact */}
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

      {/* Calendar Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mini Calendar - ✅ Now clickable to navigate to calendar page */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl backdrop-blur-xl border shadow-xl cursor-pointer hover:shadow-2xl transition ${
            theme === "dark"
              ? "bg-gray-800/60 border-gray-700 hover:border-red-500"
              : "bg-white/60 border-gray-200 hover:border-red-500"
          }`}
          onClick={handleCalendarClick}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Booking Calendar
            </h3>
            <button
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              View Full
            </button>
          </div>
          
          <div className="hall-calendar-mini pointer-events-none">
            <Calendar
              value={selectedDate}
              onChange={setSelectedDate}
              tileClassName={tileClassName}
              className={theme === "dark" ? "dark-calendar" : ""}
            />
          </div>

          {dateBookings.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {dateBookings.length} booking{dateBookings.length !== 1 ? "s" : ""} on{" "}
                {format(selectedDate, "MMM dd, yyyy")}
              </p>
            </div>
          )}
          
          {/* ✅ Click hint */}
          <p className={`text-xs text-center mt-3 ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}>
            Click to view detailed calendar →
          </p>
        </motion.div>
      </div>

      {/* Upcoming Bookings */}
      <HallUpcomingBookings
        hallData={hallData}
        theme={theme}
        onRefresh={onRefresh}
        setExtensionModal={setExtensionModal}
      />

      {/* ❌ REMOVED: Hall Grid completely - no rooms shown on dashboard */}
    </div>
  );
}

// Stats Card Component - ✅ Made smaller
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