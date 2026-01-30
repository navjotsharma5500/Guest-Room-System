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
            whileHover={{ y: -5, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}
            className={`rounded-2xl shadow-2xl border overflow-hidden ${
              theme === "dark"
                ? "border-gray-700 bg-gradient-to-br from-gray-800 to-gray-700"
                : "border-red-200 bg-gradient-to-br from-white to-red-50"
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
                    <Users className="w-5 h-5 text-red-600" />
                  </motion.div>
                  <h2 className="text-lg font-bold tracking-wide text-red-700">
                    {hallName}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium"
                  >
                    Total: {rooms.length}
                  </motion.span>
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-700 font-medium"
                  >
                    Occupied: {occupied}
                  </motion.span>
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700 font-medium"
                  >
                    Available: {available}
                  </motion.span>
                </div>
              </div>
            </div>

            {/* Rooms Grid */}
            <div className="p-5 grid grid-cols-2 gap-4">
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
                <div className="col-span-2 text-center py-8 text-gray-500">
                  <p className="text-sm">No rooms available</p>
                  <p className="text-xs mt-1">Expected rooms: {hallConfig.rooms.join(", ")}</p>
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}