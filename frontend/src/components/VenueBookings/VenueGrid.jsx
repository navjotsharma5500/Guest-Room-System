import React from "react";
import { motion } from "framer-motion";
import { Home } from "lucide-react";

export default function VenueGrid({
  hallData,
  venueData,
  theme,
  selectedRooms = [],
  toggleRoomSelect,
  selectionMode,
  onRoomClick,
  onDirectBook,
}) {
  const sourceData = venueData || hallData || {};

  const extractInitial = (name) => {
    const match = name.match(/\(([^)]+)\)/);
    return match?.[1] ? match[1].trim().toUpperCase() : name.charAt(0).toUpperCase();
  };

  const sortedVenues = Object.entries(sourceData).sort(([a], [b]) =>
    extractInitial(a).localeCompare(extractInitial(b), undefined, { sensitivity: "base", numeric: true })
  );

  const isRoomSelected = (hallName, roomNo) => selectedRooms.some((r) => r.hall === hallName && r.roomNo === roomNo);

  const getActiveBookings = (bookings = []) =>
    bookings.filter((b) => ["booked", "checked_in"].includes(b.status));

  return (
    <div className="grid gap-8 grid-cols-1">
      {sortedVenues.map(([hallName, hall]) => {
        const rooms = hall.rooms || [];
        const occupied = rooms.filter((room) => getActiveBookings(room.bookings).length > 0).length;
        const available = rooms.length - occupied;

        return (
          <motion.div
            key={hallName}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className={`rounded-2xl overflow-hidden border shadow-sm ${
              theme === "dark"
                ? "bg-[#292a2d] border-[#3c4043]"
                : "bg-white border-[#dadce0]"
            }`}
          >
            {/* Venue Header */}
            <div className={`px-6 py-4 border-b ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className={`text-xl font-bold ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
                    {hallName}
                  </h3>
                  <p className={`text-sm mt-1 ${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>
                    Total Rooms: {rooms.length}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className={`px-3 py-1.5 rounded-lg ${theme === "dark" ? "bg-[#3c4043]" : "bg-blue-50"}`}>
                    <span className={theme === "dark" ? "text-[#8ab4f8]" : "text-[#2563eb]"} style={{ fontWeight: 600 }}>
                      Available: {available}
                    </span>
                  </div>
                  <div className={`px-3 py-1.5 rounded-lg ${theme === "dark" ? "bg-[#3c4043]" : "bg-red-50"}`}>
                    <span className={theme === "dark" ? "text-[#f28482]" : "text-[#d32f2f]"} style={{ fontWeight: 600 }}>
                      Occupied: {occupied}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Rooms Grid */}
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {rooms.map((room) => {
                const activeBookings = getActiveBookings(room.bookings || []);
                const hasActiveBooking = activeBookings.length > 0;
                const selected = isRoomSelected(hallName, room.roomNo);
                const firstBooking = activeBookings[0];

                return (
                  <motion.div
                    key={`${hallName}_${room.roomNo}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ y: -4 }}
                    transition={{ duration: 0.2 }}
                    onClick={(e) => {
                      if (e.target.closest(".direct-book-button")) return;
                      if (selectionMode) {
                        toggleRoomSelect(hallName, room.roomNo);
                      } else if (hasActiveBooking) {
                        // open booking details / existing booking view
                        onRoomClick(hallName, room, true);
                      } else {
                        // vacant room -> open direct booking modal
                        onDirectBook(hallName, room);
                      }
                    }}
                    className={`
                      relative rounded-2xl border-2 p-4 cursor-pointer transition-all shadow-sm hover:shadow-md
                      ${selected ? "ring-2 ring-blue-500 border-blue-400" : ""}
                      ${theme === "dark" 
                        ? `bg-[#3c4043] border-[#5f6368] hover:border-[#5f6368]` 
                        : `bg-white border-[#e0e0e0] hover:border-blue-300`
                      }
                    `}
                  >
                    {/* Room Icon and Number */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-2 rounded-lg ${theme === "dark" ? "bg-[#292a2d]" : "bg-blue-50"}`}>
                        <Home className={`w-5 h-5 ${theme === "dark" ? "text-[#8ab4f8]" : "text-[#2563eb]"}`} />
                      </div>
                      <h4 className={`text-base font-bold ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
                        Room {room.roomNo}
                      </h4>
                    </div>

                    {/* Status */}
                    <div className="mt-2">
                      {hasActiveBooking ? (
                        <p className={`text-sm font-medium ${theme === "dark" ? "text-[#81c995]" : "text-[#0d652d]"}`}>
                          {activeBookings.length} active booking{activeBookings.length > 1 ? 's' : ''}
                        </p>
                      ) : (
                        <p className={`text-sm font-medium ${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>
                          Vacant
                        </p>
                      )}
                    </div>

                    {/* Plus Button (Black) - Only show if room has active booking */}
                    {!selectionMode && hasActiveBooking && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDirectBook(hallName, room);
                        }}
                        className="direct-book-button absolute -top-3 -right-3 text-black text-2xl font-bold hover:opacity-70 transition-opacity"
                        title="Add another booking"
                      >
                        +
                      </button>
                    )}

                    {/* Selection Mode Checkmark */}
                    {selectionMode && selected && (
                      <div className="absolute top-3 right-3">
                        <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
