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
              className={`
                rounded-lg overflow-hidden transition-all duration-200
                ${theme === "dark"
                  ? "bg-[#292a2d] hover:shadow-lg hover:shadow-black/20"
                  : "bg-white hover:shadow-lg hover:shadow-gray-200 border border-[#dadce0]"
                }
              `}
            >
              {/* Header */}
              <div className={`
                px-5 py-4 border-b
                ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}
              `}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className={`w-5 h-5 ${
                      theme === "dark" ? "text-[#8ab4f8]" : "text-[#1a73e8]"
                    }`} />
                    <h3 className={`text-base font-medium ${
                      theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                    }`}>
                      {hallName}
                    </h3>
                  </div>
                  <span className={`
                    px-2 py-1 text-xs rounded
                    ${theme === "dark" 
                      ? "bg-[#3c4043] text-[#8ab4f8]" 
                      : "bg-[#e8f0fe] text-[#1967d2]"
                    }
                  `}>
                    {rooms.length} Rooms
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa] border border-[#dadce0]"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Users className={`w-4 h-4 ${
                        theme === "dark" ? "text-[#81c995]" : "text-[#1e8e3e]"
                      }`} />
                      <span className={`text-xs font-medium ${
                        theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                      }`}>
                        Active
                      </span>
                    </div>
                    <p className={`text-2xl font-normal ${
                      theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                    }`}>
                      {activeBookings}
                    </p>
                  </div>

                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa] border border-[#dadce0]"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className={`w-4 h-4 ${
                        theme === "dark" ? "text-[#8ab4f8]" : "text-[#1a73e8]"
                      }`} />
                      <span className={`text-xs font-medium ${
                        theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                      }`}>
                        Total
                      </span>
                    </div>
                    <p className={`text-2xl font-normal ${
                      theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                    }`}>
                      {totalBookings}
                    </p>
                  </div>
                </div>

                <div className={`p-3 rounded-lg ${
                  theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa] border border-[#dadce0]"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium ${
                      theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                    }`}>
                      Occupancy
                    </span>
                    <span className={`text-xs font-medium ${
                      theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                    }`}>
                      {rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0}%
                    </span>
                  </div>
                  <div className={`w-full rounded-full h-2 ${
                    theme === "dark" ? "bg-[#3c4043]" : "bg-[#e0e0e0]"
                  }`}>
                    <div
                      className={`h-2 rounded-full transition-all ${
                        theme === "dark" ? "bg-[#8ab4f8]" : "bg-[#1a73e8]"
                      }`}
                      style={{ width: `${rooms.length > 0 ? (occupiedRooms / rooms.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className={`font-medium ${
                      theme === "dark" ? "text-[#f28b82]" : "text-[#d93025]"
                    }`}>{occupiedRooms} Occupied</span>
                    <span className={`font-medium ${
                      theme === "dark" ? "text-[#81c995]" : "text-[#1e8e3e]"
                    }`}>{available} Available</span>
                  </div>
                </div>

                {/* Rooms Grid with + Button */}
                <div>
                  <h4 className={`text-sm font-medium mb-3 ${
                    theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
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
                          onClick={(e) => handleRoomClick(hallName, room, hasActiveBooking, e)}
                          className={`
                            relative p-3 rounded-lg text-center text-sm font-medium cursor-pointer 
                            transition-all group
                            ${selected ? "ring-2 ring-offset-2" : ""}
                            ${hasActiveBooking
                              ? theme === "dark"
                                ? "bg-[#5f1111] text-[#f28b82] ring-[#f28b82]"
                                : "bg-[#fce8e6] text-[#d93025] ring-[#d93025]"
                              : theme === "dark"
                                ? "bg-[#194d19] text-[#81c995] ring-[#81c995]"
                                : "bg-[#e6f4ea] text-[#1e8e3e] ring-[#1e8e3e]"
                            }
                          `}
                        >
                          <span className="block">{room.roomNo}</span>
                          
                          {/* + Button */}
                          <button
                            onClick={(e) => handleDirectBook(hallName, room, e)}
                            className={`
                              direct-book-button absolute -top-1 -right-1 w-5 h-5 rounded-full 
                              flex items-center justify-center transition-all shadow-md
                              ${theme === "dark"
                                ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                                : "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                              }
                            `}
                            title="Book this room"
                          >
                            <Plus className="w-3 h-3" />
                          </button>

                          {/* Selection checkbox */}
                          {selectionMode && (
                            <div className="absolute top-1 left-1">
                              <div className={`
                                w-4 h-4 rounded border-2 flex items-center justify-center
                                ${selected
                                  ? theme === "dark"
                                    ? "bg-[#8ab4f8] border-[#8ab4f8]"
                                    : "bg-[#1a73e8] border-[#1a73e8]"
                                  : theme === "dark"
                                    ? "bg-[#3c4043] border-[#5f6368]"
                                    : "bg-white border-[#dadce0]"
                                }
                              `}>
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