// src/components/AllHostels/HostelGrid.jsx - FIXED VERSION
import React from "react";
import { motion } from "framer-motion";
import { Building2 } from "lucide-react";
import RoomCard from "../RoomCard";

export default function HostelGrid({
  hostelData,
  theme,
  selectedRooms,
  toggleRoomSelect,
  selectionMode,
  consolidateModal,
  bookingCompleted,
  prefillGuest,
  onRoomClick,
  onDirectBooking,
  onBlockedClick,
  showToast,
}) {

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 },
  };

  // ✅ CRITICAL FIX: Helper function to filter only ACTIVE bookings
  const getActiveBookings = (bookings = []) => {
    return bookings.filter(booking => {
      // Only count bookings that are:
      // 1. "booked" (not yet reported)
      // 2. "reported" or "checked_in" (currently staying)
      // 
      // Do NOT count:
      // - "cancelled" bookings
      // - "checked_out" bookings
      // - "no_show" bookings
      // - "not_reported" bookings
      const activeStatuses = ["booked", "reported", "checked_in"];
      return activeStatuses.includes(booking.status);
    });
  };

  // Helper function to extract initial/letter from parentheses (e.g., "Agita Hall (A)" -> "A")
  const extractInitial = (hostelName) => {
    const match = hostelName.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].trim().toUpperCase();
    }
    // If no parentheses found, use first letter of hostel name as fallback
    return hostelName.charAt(0).toUpperCase();
  };

  // ✅ Sort hostels alphabetically by initial in parentheses
  const sortedHostels = Object.entries(hostelData || {}).sort(([nameA], [nameB]) => {
    const initialA = extractInitial(nameA);
    const initialB = extractInitial(nameB);
    return initialA.localeCompare(initialB, undefined, { sensitivity: 'base', numeric: true });
  });

  return (
    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">

      {sortedHostels.map(([hostelName, hostel]) => {
        const rooms = hostel.rooms || [];
        
        // ✅ FIXED: Count only rooms with ACTIVE bookings
        const occupied = rooms.filter((r) => {
          const activeBookings = getActiveBookings(r.bookings || []);
          return activeBookings.length > 0;
        }).length;
        
        const available = rooms.length - occupied;

        return (
          <motion.div
            key={hostelName}
            variants={itemVariants}
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
                    <Building2 className="w-5 h-5 text-red-600" />
                  </motion.div>
                  <h2 className="text-lg font-bold tracking-wide text-red-700">
                    {hostelName}
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <motion.span
                    whileHover={{ scale: 1.1 }}
                    className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700 font-medium"
                  >
                    Rooms: {rooms.length}
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
              {rooms.map((room, idx) => {
                // ✅ FIXED: Pass only ACTIVE bookings to RoomCard
                const activeBookings = getActiveBookings(room.bookings || []);
                
                // Create a modified room object with only active bookings
                const roomWithActiveBookings = {
                  ...room,
                  bookings: activeBookings,
                  // Explicitly preserve blocking properties
                  isBlocked: room.isBlocked ?? false,
                  blockedTill: room.blockedTill,
                  blockRemarks: room.blockRemarks,
                  blockAttachments: room.blockAttachments,
                  blockedAt: room.blockedAt,
                  blockedBy: room.blockedBy
                };

                return (
                  <RoomCard
                    key={`${hostelName}_${room.roomNo}`}
                    hostelName={hostelName}
                    room={roomWithActiveBookings} // ✅ Pass filtered room
                    theme={theme}
                    isSelected={selectedRooms.some(
                      (r) => r.hostel === hostelName && r.roomNo === room.roomNo
                    )}
                    selectionMode={selectionMode}
                    consolidateModal={consolidateModal}
                    bookingCompleted={bookingCompleted}
                    prefillGuest={prefillGuest}
                    onToggleSelect={() => toggleRoomSelect(hostelName, room.roomNo)}
                    onClick={(bookedAny) => onRoomClick(hostelName, room, bookedAny)}
                    onDirectBooking={onDirectBooking}
                    onBlockedClick={onBlockedClick}
                    showToast={showToast}
                  />
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}