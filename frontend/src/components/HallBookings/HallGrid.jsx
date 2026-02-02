// src/components/HallBookings/HallGrid.jsx
import React from "react";
import { motion } from "framer-motion";
import { Building2, Users, Calendar, MapPin, Plus } from "lucide-react";

export default function HallGrid({ 
  hallData, 
  theme, 
  selectedRooms = [],
  toggleRoomSelect,
  selectionMode,
  onRoomClick,
  onDirectBook, // NEW: For + button click
  showToast 
}) {
  const extractInitial = (hallName) => {
    const match = hallName.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].trim().toUpperCase();
    }
    return hallName.charAt(0).toUpperCase();
  };

  const sortedHalls = Object.entries(hallData || {}).sort(([nameA], [nameB]) => {
    const initialA = extractInitial(nameA);
    const initialB = extractInitial(nameB);
    return initialA.localeCompare(initialB, undefined, { sensitivity: 'base', numeric: true });
  });

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  const isRoomSelected = (hallName, roomNo) => {
    return selectedRooms.some(r => r.hall === hallName && r.roomNo === roomNo);
  };

  const handleRoomClick = (hallName, room, hasActiveBooking, e) => {
    // Don't trigger if clicking the + button
    if (e.target.closest('.direct-book-button')) {
      return;
    }

    if (selectionMode) {
      toggleRoomSelect(hallName, room.roomNo);
    } else if (hasActiveBooking) {
      // Show booking details
      onRoomClick(hallName, room, true);
    }
  };

  const handleDirectBook = (hallName, room, e) => {
    e.stopPropagation();
    onDirectBook(hallName, room);
  };

  return (
    <div className="space-y-4">
      <h2 className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
        All Halls
      </h2>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {sortedHalls.map(([hallName, hall]) => {
          const rooms = hall.rooms || [];
          
          const activeBookings = rooms.reduce((count, room) => {
            const active = (room.bookings || []).filter(
              b => ["booked", "checked_in"].includes(b.status)
            );
            return count + active.length;
          }, 0);

          const totalBookings = rooms.reduce((count, room) => {
            return count + (room.bookings?.length || 0);
          }, 0);

          const occupiedRooms = rooms.filter((r) => {
            const activeBookings = (r.bookings || []).filter(
              b => ["booked", "checked_in"].includes(b.status)
            );
            return activeBookings.length > 0;
          }).length;

          const available = rooms.length - occupiedRooms;

          return (
            <motion.div
              key={hallName}
              variants={itemVariants}
              whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
              className={`rounded-2xl backdrop-blur-xl border shadow-xl overflow-hidden ${
                theme === "dark"
                  ? "border-gray-700 bg-gray-800/60"
                  : "border-red-200 bg-white/60"
              }`}
            >
              {/* Header */}
              <div
                className={`px-5 py-4 border-b ${
                  theme === "dark"
                    ? "border-gray-700 bg-gradient-to-r from-gray-800 to-gray-700"
                    : "border-red-200 bg-gradient-to-r from-red-50 to-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }}>
                      <Building2 className="w-5 h-5 text-red-600" />
                    </motion.div>
                    <h3 className="text-lg font-bold tracking-wide text-red-700">
                      {hallName}
                    </h3>
                  </div>
                  <div className="flex flex-col gap-2">
                    <motion.span
                      whileHover={{ scale: 1.1 }}
                      className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium"
                    >
                      {rooms.length} Rooms
                    </motion.span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className="w-4 h-4 text-green-500" />
                      <span className={`text-xs font-medium ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        Active
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>
                      {activeBookings}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className={`text-xs font-medium ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        Total
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>
                      {totalBookings}
                    </p>
                  </div>
                </div>

                <div className={`p-3 rounded-lg ${
                  theme === "dark" ? "bg-gray-700" : "bg-gray-50"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}>
                      Occupancy
                    </span>
                    <span className={`text-xs font-bold ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>
                      {rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${rooms.length > 0 ? (occupiedRooms / rooms.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-red-600 font-medium">{occupiedRooms} Occupied</span>
                    <span className="text-green-600 font-medium">{available} Available</span>
                  </div>
                </div>

                {/* Rooms Grid with + Button */}
                <div>
                  <h4 className={`text-sm font-bold mb-3 ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    Rooms
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {rooms.map((room) => {
                      const hasActiveBooking = (room.bookings || []).some(
                        b => ["booked", "checked_in"].includes(b.status)
                      );
                      const selected = isRoomSelected(hallName, room.roomNo);

                      return (
                        <motion.div
                          key={room.roomNo}
                          whileHover={{ scale: 1.05 }}
                          onClick={(e) => handleRoomClick(hallName, room, hasActiveBooking, e)}
                          className={`relative p-2 rounded-lg text-center text-sm font-medium cursor-pointer transition-all group ${
                            selected
                              ? "ring-2 ring-blue-500 ring-offset-2"
                              : ""
                          } ${
                            hasActiveBooking
                              ? "bg-red-500 text-white"
                              : theme === "dark"
                              ? "bg-gray-600 text-gray-300"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          <span className="block mb-1">{room.roomNo}</span>
                          
                          {/* + Button - shows on hover for vacant rooms */}
                          {!hasActiveBooking && (
                            <button
                              onClick={(e) => handleDirectBook(hallName, room, e)}
                              className="direct-book-button absolute -top-1 -right-1 w-5 h-5 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-blue-700"
                              title="Book this room"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}

                          {/* Selection checkbox */}
                          {selectionMode && (
                            <div className="absolute top-1 left-1">
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                                selected
                                  ? "bg-blue-600 border-blue-600"
                                  : "bg-white border-gray-300"
                              }`}>
                                {selected && (
                                  <svg className="w-3 h-3 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                    <path d="M5 13l4 4L19 7"></path>
                                  </svg>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}