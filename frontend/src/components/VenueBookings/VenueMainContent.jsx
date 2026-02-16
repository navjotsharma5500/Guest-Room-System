// src/components/VenueBookings/VenueMainContent.jsx - UPDATED VERSION
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Users, TrendingUp, Clock } from "lucide-react";
import Calendar from "react-calendar";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import VenueUpcomingBookings from "./VenueUpcomingBookings";
// âŒ REMOVED: import HallGrid from "./VenueGrid";

import "react-calendar/dist/Calendar.css";
import "../../styles/calendarCustom.css";

export default function VenueMainContent({ venueData, theme, currentUser, onRefresh, setExtensionModal, onNavigate }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateBookings, setDateBookings] = useState([]);

  // Calculate stats
  const calculateStats = useCallback(() => {
    const halls = Object.keys(venueData || {});
    let totalRooms = 0;
    let occupiedRooms = 0;
    let totalBookings = 0;
    let activeBookings = 0;

    halls.forEach(hallName => {
      const hall = venueData[hallName];
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
  }, [venueData]);

  const stats = calculateStats();

  // Get bookings for selected date
  useEffect(() => {
    const bookings = [];
    const targetDate = startOfDay(selectedDate);

    Object.keys(venueData || {}).forEach(hallName => {
      const hall = venueData[hallName];
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
  }, [selectedDate, venueData]);

  // âœ… NEW: Handle calendar click - navigate to calendar page
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

    Object.keys(venueData || {}).forEach(hallName => {
      const hall = venueData[hallName];
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
      {/* âœ… Stats Cards - Made smaller and more compact */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Venues"
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

      {/* Calendar & Upcoming Bookings Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Side: Calendar (Clickable) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl backdrop-blur-xl border shadow-xl cursor-pointer hover:shadow-2xl transition h-full flex flex-col ${
            theme === "dark"
              ? "bg-gray-800/60 border-gray-700 hover:border-blue-500"
              : "bg-white/60 border-gray-200 hover:border-blue-500"
          }`}
          onClick={handleCalendarClick}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Booking Calendar
            </h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View Full
            </button>
          </div>
          
          <div className="hall-calendar-mini pointer-events-none flex-grow">
            <Calendar
              value={selectedDate}
              onChange={setSelectedDate}
              tileClassName={tileClassName}
              className={`${theme === "dark" ? "dark-calendar" : ""} w-full h-full`}
            />
          </div>

          {dateBookings.length > 0 && (
            <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                {dateBookings.length} booking{dateBookings.length !== 1 ? "s" : ""} on{" "}
                {format(selectedDate, "MMM dd, yyyy")}
              </p>
            </div>
          )}
          
          <p className={`text-xs text-center mt-3 ${
            theme === "dark" ? "text-gray-400" : "text-gray-500"
          }`}>
            Click to view detailed calendar →
          </p>
        </motion.div>

        {/* Right Side: Upcoming Bookings List */}
        <div className="h-full">
            <VenueUpcomingBookings
                venueData={venueData}
                theme={theme}
                onRefresh={onRefresh}
                setExtensionModal={setExtensionModal}
            />
        </div>
      </div>

      {/* Venue Grid intentionally removed on dashboard */}
    </div>
  );
}

// Google-inspired Stats Card
function StatCard({ title, value, icon, color, theme }) {
  const colorClasses = {
    blue: theme === "dark" ? "text-[#8ab4f8]" : "text-[#1a73e8]",
    green: theme === "dark" ? "text-[#81c995]" : "text-[#1e8e3e]",
    purple: theme === "dark" ? "text-[#c58af9]" : "text-[#9334e6]",
    orange: theme === "dark" ? "text-[#ffa726]" : "text-[#e37400]",
  };

  return (
    <div className={`
      p-6 rounded-lg transition-all duration-200
      ${theme === "dark" 
        ? "bg-[#292a2d] hover:shadow-lg hover:shadow-black/20" 
        : "bg-white hover:shadow-lg hover:shadow-gray-200 border border-[#dadce0]"
      }
    `}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm font-normal mb-2 ${
            theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
          }`}>
            {title}
          </p>
          <p className={`text-3xl font-normal ${
            theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
          }`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-full ${
          theme === "dark" ? "bg-[#3c4043]" : "bg-[#f1f3f4]"
        }`}>
          <div className={colorClasses[color]}>
            {icon}
          </div>
        </div>
      </div>
    </div>
  );
}
