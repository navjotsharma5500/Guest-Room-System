// src/components/HallBookings/HallGrid.jsx
import React from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";
import RoomCard from "../RoomCard";

// Hall data structure configuration
const HALL_STRUCTURE = {
  "Hall": {
    rooms: ["MAIN AUDITORIUM", "TAN AUDITORIUM", "C-Hall"]
  },
  "Rooms": {
    rooms: ["T105", "T106"]
  },
  "Creativity Rooms": {
    rooms: ["CR-1", "CR-2", "CR-5 (Sur Room)", "CR-6", "CR-7", "CR-8"]
  },
  "Green Rooms": {
    rooms: ["GR-1", "GR-2"]
  },
  "Open Area": {
    rooms: ["SBI Lawns", "FETE Area", "OAT (Open Air Theater)"]
  },
  "Desk Area": {
    rooms: ["Street Cafe", "Jaggi", "Street Cafe & Jaggi Area"]
  },
  "Common Rooms": {
    rooms: ["G-Block", "Tan Rooms", "E-Block", "F-Block", "Activity Room", "Activity Space", "LP Rooms"]
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

  console.log("🎯 HallGrid Render:", {
    hallDataKeys: Object.keys(hallData || {}),
    sortedHalls,
    hasData: !!hallData
  });

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
      {sortedHalls.map((hallName) => {
        const hallConfig = HALL_STRUCTURE[hallName];
        const hallDataEntry = hallData?.[hallName] || {};
        const rooms = hallDataEntry.rooms || [];
        
        console.log(`📋 Hall "${hallName}":`, {
          hasDataEntry: !!hallDataEntry,
          roomsCount: rooms.length,
          configRooms: hallConfig.rooms
        });
        
        // Count occupied rooms
        const occupied = rooms.filter((r) => {
          const activeBookings = getActiveBookings(r.bookings || []);
          return activeBookings.length > 0;
        }).length;
        
        const available = rooms.length - occupied;

        return (
          <motion.div
            key={hallName}
            variants={itemVariants}
            initial="hidden"
            animate="show"
            whileHover={{ y: -8, boxShadow: "0 25px 50px rgba(220, 38, 38, 0.15)" }}
            className={`rounded-3xl shadow-2xl border-2 overflow-hidden transition-all duration-300 ${
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    whileHover={{ rotate: 360, scale: 1.15 }} 
                    transition={{ duration: 0.5 }}
                    className="bg-gradient-to-br from-red-500 to-red-600 p-2.5 rounded-xl shadow-lg"
                  >
                    <Users className="w-6 h-6 text-white" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                      {hallName}
                    </h2>
                    <p className="text-xs text-gray-500 mt-0.5">{rooms.length} Total Rooms</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-1.5">
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-green-100 to-green-200 border border-green-300 shadow-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="font-bold text-green-700">Available: {available}</span>
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.08 }}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-full bg-gradient-to-r from-red-100 to-red-200 border border-red-300 shadow-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <span className="font-bold text-red-700">Occupied: {occupied}</span>
                  </motion.div>
                </div>
              </div>
            </div>

            {/* Rooms Grid */}
            <div className="p-5 grid grid-cols-2 gap-3.5">
              {rooms.length > 0 ? (
                rooms.map((room) => {
                  const activeBookings = getActiveBookings(room.bookings || []);
                  
                  const roomWithActiveBookings = {
                    ...room,
                    bookings: activeBookings
                  };

                  return (
                    <RoomCard
                      key={`${hallName}_${room.roomNo}`}
                      hostelName={hallName}
                      room={roomWithActiveBookings}
                      theme={theme}
                      isSelected={selectedRooms.some(
                        (r) => r.hall === hallName && r.roomNo === room.roomNo
                      )}
                      selectionMode={selectionMode}
                      consolidateModal={hallBookingModal}
                      bookingCompleted={bookingCompleted}
                      onToggleSelect={() => toggleRoomSelect(hallName, room.roomNo)}
                      onClick={(bookedAny) => onRoomClick(hallName, room, bookedAny)}
                      showToast={showToast}
                    />
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-600">No Rooms Available</p>
                      <p className="text-xs text-gray-400 mt-1">Expected: {hallConfig.rooms.slice(0, 3).join(", ")}...</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}