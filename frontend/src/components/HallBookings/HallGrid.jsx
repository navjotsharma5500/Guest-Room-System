// src/components/HallBookings/HallGrid.jsx
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Users, CheckCircle2, Clock, AlertCircle, User, Calendar } from "lucide-react";

// Hall data structure configuration
const HALL_STRUCTURE = {
  "Hall": {
    rooms: ["MAIN AUDITORIUM", "TAN AUDITORIUM", "C-Hall"],
    icon: "🎭",
    color: "purple"
  },
  "Rooms": {
    rooms: ["T105", "T106"],
    icon: "🚪",
    color: "blue"
  },
  "Creativity Rooms": {
    rooms: ["CR-1", "CR-2", "CR-5 (Sur Room)", "CR-6", "CR-7", "CR-8"],
    icon: "🎨",
    color: "pink"
  },
  "Green Rooms": {
    rooms: ["GR-1", "GR-2"],
    icon: "🌿",
    color: "green"
  },
  "Open Area": {
    rooms: ["SBI Lawns", "FETE Area", "OAT (Open Air Theater)"],
    icon: "🏞️",
    color: "teal"
  },
  "Desk Area": {
    rooms: ["Street Cafe", "Jaggi", "Street Cafe & Jaggi Area"],
    icon: "☕",
    color: "orange"
  },
  "Common Rooms": {
    rooms: ["G-Block", "Tan Rooms", "E-Block", "F-Block", "Activity Room", "Activity Space", "LP Rooms"],
    icon: "🛋️",
    color: "indigo"
  }
};

// Get room status based on booking dates/times
const getRoomStatus = (room) => {
  const now = new Date();
  
  const activeBookings = (room.bookings || []).filter(b => {
    const activeStatuses = ["booked", "checked_in"];
    return activeStatuses.includes(b.status);
  });

  if (activeBookings.length === 0) {
    return { status: "available", color: "green", label: "Available" };
  }

  // Check if any booking has started (check-in time passed)
  const hasActiveBooking = activeBookings.some(b => {
    const checkInDate = new Date(b.from || b.checkInDate);
    const checkInTime = b.checkInTime || "00:00";
    const [hours, minutes] = checkInTime.split(':').map(Number);
    checkInDate.setHours(hours, minutes, 0, 0);
    
    return now >= checkInDate;
  });

  if (hasActiveBooking) {
    return { status: "active", color: "red", label: "Active" };
  }

  // Upcoming booking
  return { status: "upcoming", color: "yellow", label: "Upcoming" };
};

// Format date/time helper
const formatDateTime = (dateString, timeString) => {
  if (!dateString) return "—";
  try {
    const date = new Date(dateString);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const formattedDate = `${String(day).padStart(2, "0")} ${month}`;

    if (!timeString) return formattedDate;

    const [hours, minutes] = timeString.split(":").map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours % 12 || 12;

    return `${formattedDate}, ${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
  } catch {
    return dateString;
  }
};

export default function HallGrid({
  hallData,
  theme,
  selectedRooms,
  toggleRoomSelect,
  selectionMode,
  hallBookingModal,
  bookingCompleted,
  onRoomClick,
  showToast,
}) {

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  // Helper function to filter only ACTIVE bookings
  const getActiveBookings = (bookings = []) => {
    return bookings.filter(booking => {
      const activeStatuses = ["booked", "checked_in"];
      return activeStatuses.includes(booking.status);
    });
  };

  // Sort halls in the defined order
  const sortedHalls = Object.keys(HALL_STRUCTURE);

  // Calculate total statistics
  const totalStats = useMemo(() => {
    let totalRooms = 0;
    let totalAvailable = 0;
    let totalActive = 0;
    let totalUpcoming = 0;

    sortedHalls.forEach(hallName => {
      const hallDataEntry = hallData?.[hallName] || {};
      const rooms = hallDataEntry.rooms || [];
      
      totalRooms += rooms.length;
      
      rooms.forEach(room => {
        const status = getRoomStatus(room);
        if (status.status === "available") totalAvailable++;
        else if (status.status === "active") totalActive++;
        else if (status.status === "upcoming") totalUpcoming++;
      });
    });

    return { totalRooms, totalAvailable, totalActive, totalUpcoming };
  }, [hallData, sortedHalls]);

  console.log("🎯 HallGrid Render:", {
    hallDataKeys: Object.keys(hallData || {}),
    sortedHalls,
    hasData: !!hallData,
    totalStats
  });

  return (
    <div className="space-y-8">
      {/* Statistics Overview */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
      >
        <div className={`p-4 rounded-2xl border-2 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600"
            : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{totalStats.totalRooms}</p>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Total Rooms
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border-2 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600"
            : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-xl">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{totalStats.totalAvailable}</p>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Available
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border-2 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600"
            : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{totalStats.totalActive}</p>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Active Now
              </p>
            </div>
          </div>
        </div>

        <div className={`p-4 rounded-2xl border-2 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600"
            : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-100 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-600">{totalStats.totalUpcoming}</p>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                Upcoming
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Hall Cards Grid */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
        {sortedHalls.map((hallName, hallIndex) => {
          const hallConfig = HALL_STRUCTURE[hallName];
          const hallDataEntry = hallData?.[hallName] || {};
          const rooms = hallDataEntry.rooms || [];
          
          console.log(`📋 Hall "${hallName}":`, {
            hasDataEntry: !!hallDataEntry,
            roomsCount: rooms.length,
            configRooms: hallConfig.rooms
          });
          
          // Count rooms by status
          const availableCount = rooms.filter(r => getRoomStatus(r).status === "available").length;
          const activeCount = rooms.filter(r => getRoomStatus(r).status === "active").length;
          const upcomingCount = rooms.filter(r => getRoomStatus(r).status === "upcoming").length;

          return (
            <motion.div
              key={hallName}
              variants={itemVariants}
              initial="hidden"
              animate="show"
              transition={{ delay: hallIndex * 0.1 }}
              whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(220, 38, 38, 0.15)" }}
              className={`rounded-3xl shadow-xl border-2 overflow-hidden transition-all duration-300 ${
                theme === "dark"
                  ? "border-gray-600 bg-gradient-to-br from-gray-800 via-gray-750 to-gray-800"
                  : "border-red-100 bg-gradient-to-br from-white via-red-25 to-white"
              }`}
            >
              {/* Header */}
              <div
                className={`px-6 py-5 border-b-2 ${
                  theme === "dark"
                    ? "border-gray-700 bg-gradient-to-r from-red-900/20 to-orange-900/20"
                    : "border-red-100 bg-gradient-to-r from-red-50 to-orange-50"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div 
                      whileHover={{ rotate: 360, scale: 1.15 }} 
                      transition={{ duration: 0.5 }}
                      className="text-4xl"
                    >
                      {hallConfig.icon}
                    </motion.div>
                    <div>
                      <h2 className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                        {hallName}
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">{rooms.length} Total Rooms</p>
                    </div>
                  </div>
                </div>
                
                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {availableCount > 0 && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-green-100 to-green-200 border border-green-300 shadow-sm"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="font-bold text-green-700">Available: {availableCount}</span>
                    </motion.div>
                  )}
                  {activeCount > 0 && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-red-100 to-red-200 border border-red-300 shadow-sm"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <span className="font-bold text-red-700">Active: {activeCount}</span>
                    </motion.div>
                  )}
                  {upcomingCount > 0 && (
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-yellow-100 to-yellow-200 border border-yellow-300 shadow-sm"
                    >
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <span className="font-bold text-yellow-700">Upcoming: {upcomingCount}</span>
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Rooms Grid - New Card-based Layout */}
              <div className="p-5">
                {rooms.length > 0 ? (
                  <div className="space-y-3">
                    {rooms.map((room) => {
                      const activeBookings = getActiveBookings(room.bookings || []);
                      const roomStatus = getRoomStatus(room);
                      const isSelected = selectedRooms.some(
                        (r) => r.hall === hallName && r.roomNo === room.roomNo
                      );

                      return (
                        <motion.div
                          key={`${hallName}_${room.roomNo}`}
                          whileHover={{ scale: 1.02, x: 4 }}
                          onClick={() => {
                            if (selectionMode) {
                              toggleRoomSelect(hallName, room.roomNo);
                            } else {
                              onRoomClick(hallName, room, activeBookings.length > 0);
                            }
                          }}
                          className={`p-4 rounded-xl cursor-pointer transition-all border-2 ${
                            isSelected
                              ? "border-red-600 bg-red-50 dark:bg-red-900/20"
                              : roomStatus.status === "available"
                              ? theme === "dark"
                                ? "border-green-700 bg-green-900/20 hover:bg-green-800/30"
                                : "border-green-300 bg-green-50 hover:bg-green-100"
                              : roomStatus.status === "active"
                              ? theme === "dark"
                                ? "border-red-700 bg-red-900/20 hover:bg-red-800/30"
                                : "border-red-300 bg-red-50 hover:bg-red-100"
                              : theme === "dark"
                              ? "border-yellow-700 bg-yellow-900/20 hover:bg-yellow-800/30"
                              : "border-yellow-300 bg-yellow-50 hover:bg-yellow-100"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {selectionMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                                />
                              )}
                              <span className={`font-bold text-lg ${
                                theme === "dark" ? "text-gray-100" : "text-gray-900"
                              }`}>
                                {room.roomNo}
                              </span>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                              roomStatus.status === "available"
                                ? "bg-green-500 text-white"
                                : roomStatus.status === "active"
                                ? "bg-red-500 text-white"
                                : "bg-yellow-500 text-white"
                            }`}>
                              {roomStatus.label}
                            </div>
                          </div>

                          {/* Show booking info if exists */}
                          {activeBookings.length > 0 && (
                            <div className={`mt-3 pt-3 border-t ${
                              theme === "dark" ? "border-gray-700" : "border-gray-200"
                            }`}>
                              <div className="flex items-center gap-2 mb-1">
                                <User className="w-4 h-4 text-gray-500" />
                                <span className={`text-sm font-semibold ${
                                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                                }`}>
                                  {activeBookings[0].name || activeBookings[0].guest || "—"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-gray-500" />
                                <span className={`text-xs ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                                }`}>
                                  {formatDateTime(activeBookings[0].from || activeBookings[0].checkInDate, activeBookings[0].checkInTime)}
                                </span>
                              </div>
                              {activeBookings.length > 1 && (
                                <div className="mt-2 text-xs text-center bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                  +{activeBookings.length - 1} more booking{activeBookings.length > 2 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                        <Users className="w-8 h-8 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-600">No Rooms Available</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Expected: {hallConfig.rooms.slice(0, 3).join(", ")}
                          {hallConfig.rooms.length > 3 && "..."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}