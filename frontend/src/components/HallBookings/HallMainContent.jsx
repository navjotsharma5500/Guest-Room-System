// src/components/HallBookings/HallMainContent.jsx
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar as CalendarIcon, Users, TrendingUp, Clock } from "lucide-react";
import Calendar from "react-calendar";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import HallLiveBookingCounter from "./HallLiveBookingCounter";
import HallUpcomingBookings from "./HallUpcomingBookings";
import HallGrid from "./HallGrid";

import "react-calendar/dist/Calendar.css";
import "../../styles/calendarCustom.css";

export default function HallMainContent({ hallData, theme, currentUser, onRefresh, setExtensionModal }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateBookings, setDateBookings] = useState([]);
  const [showCalendarModal, setShowCalendarModal] = useState(false);

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
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Halls"
          value={stats.totalHalls}
          icon={<CalendarIcon className="w-6 h-6" />}
          color="blue"
          theme={theme}
        />
        <StatCard
          title="Active Bookings"
          value={stats.activeBookings}
          icon={<Users className="w-6 h-6" />}
          color="green"
          theme={theme}
        />
        <StatCard
          title="Occupancy Rate"
          value={`${stats.occupancyRate}%`}
          icon={<TrendingUp className="w-6 h-6" />}
          color="purple"
          theme={theme}
        />
        <StatCard
          title="Available Rooms"
          value={stats.availableRooms}
          icon={<Clock className="w-6 h-6" />}
          color="orange"
          theme={theme}
        />
      </div>

      {/* Live Booking Counter & Calendar Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Counter */}
        <div className="lg:col-span-2">
          <HallLiveBookingCounter theme={theme} currentUser={currentUser} hallData={hallData} />
        </div>

        {/* Mini Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-2xl backdrop-blur-xl border shadow-xl ${
            theme === "dark"
              ? "bg-gray-800/60 border-gray-700"
              : "bg-white/60 border-gray-200"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Booking Calendar
            </h3>
            <button
              onClick={() => setShowCalendarModal(true)}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
            >
              View Full
            </button>
          </div>
          
          <div className="hall-calendar-mini">
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
        </motion.div>
      </div>

      {/* Upcoming Bookings */}
      <HallUpcomingBookings
        hallData={hallData}
        theme={theme}
        onRefresh={onRefresh}
        setExtensionModal={setExtensionModal}
      />

      {/* Hall Grid */}
      <HallGrid
        hallData={hallData}
        theme={theme}
        onRefresh={onRefresh}
        setExtensionModal={setExtensionModal}
      />

      {/* Full Calendar Modal */}
      <AnimatePresence>
        {showCalendarModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCalendarModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className={`w-full max-w-4xl rounded-2xl p-6 ${
                theme === "dark" ? "bg-gray-800" : "bg-white"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  Full Calendar View
                </h2>
                <button
                  onClick={() => setShowCalendarModal(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  ✕
                </button>
              </div>

              <Calendar
                value={selectedDate}
                onChange={setSelectedDate}
                tileClassName={tileClassName}
                className={`w-full ${theme === "dark" ? "dark-calendar" : ""}`}
              />

              {dateBookings.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className={`font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    Bookings on {format(selectedDate, "MMMM dd, yyyy")}
                  </h3>
                  {dateBookings.map((booking, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${
                        theme === "dark"
                          ? "bg-gray-700 border-gray-600"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                            {booking.name} - {booking.eventName}
                          </p>
                          <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                            {booking.hall} - Room {booking.roomNo}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            booking.status === "booked"
                              ? "bg-blue-100 text-blue-700"
                              : booking.status === "checked_in"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {booking.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
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
      className={`p-6 rounded-2xl backdrop-blur-xl border shadow-xl ${
        theme === "dark"
          ? "bg-gray-800/60 border-gray-700"
          : "bg-white/60 border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            {title}
          </p>
          <p className={`text-3xl font-bold mt-2 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} text-white`}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}