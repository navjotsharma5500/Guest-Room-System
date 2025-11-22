import React, { useState } from "react";
import { motion } from "framer-motion";
import { CalendarPlus, User2, CalendarDays } from "lucide-react";

export default function RoomCard({
  hostel,
  room,
  onSelect,
  onCancel,
  onDirectBooking,
  theme,
}) {
  const [showBookings, setShowBookings] = useState(false);
  const activeBookings = room.bookings || [];
  const isBooked = activeBookings.length > 0;

  const handleCardClick = () => {
    if (activeBookings.length === 1) {
      onSelect(hostel, room.roomNo, activeBookings[0].id);
    } else if (activeBookings.length > 1) {
      setShowBookings(true);
    } else {
      alert(`Room ${room.roomNo} is currently available.`);
    }
  };

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        animate={
          isBooked
            ? { boxShadow: "0 0 0 3px rgba(220,38,38,0.12)" }
            : {}
        }
        onClick={handleCardClick}
        className={`relative border rounded-lg p-4 mb-3 transition-all cursor-pointer shadow-sm ${
          isBooked
            ? theme === "dark"
              ? "bg-gray-700 border-red-500 hover:bg-gray-600"
              : "bg-red-50 border-red-400 hover:bg-red-100"
            : theme === "dark"
            ? "bg-gray-700 border-green-500 hover:bg-gray-600"
            : "bg-green-50 border-green-300 hover:bg-green-100"
        }`}
      >
        <div className="flex justify-between items-center">
          <h3
            className={`text-lg font-semibold flex items-center gap-1 ${
              theme === "dark" ? "text-red-400" : "text-red-700"
            }`}
          >
            <CalendarDays className="w-4 h-4" /> Room {room.roomNo}
          </h3>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDirectBooking(hostel, room);
            }}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded-lg"
          >
            <CalendarPlus className="w-4 h-4" /> Direct Booking
          </button>
        </div>

        {/* ⭐ EXTEND BOOKING BUTTON — ADDED, WITHOUT DELETING ANYTHING */}
        {isBooked &&
          new Date(activeBookings[0].to) >= new Date() && (
            <button
              className="mt-2 px-4 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              onClick={(e) => {
                e.stopPropagation();

                // Fire event → Dashboard catches it and opens the modal
                window.dispatchEvent(
                  new CustomEvent("open-extension-modal", {
                    detail: {
                      hostel,
                      roomNo: room.roomNo,
                      booking: activeBookings[0],
                    },
                  })
                );
              }}
            >
              Extend Booking
            </button>
          )}

        <p className="text-sm mt-1">
          Status:{" "}
          {isBooked ? (
            <span
              className={`font-semibold ${
                theme === "dark" ? "text-red-400" : "text-red-600"
              }`}
            >
              Booked
            </span>
          ) : (
            <span
              className={`font-semibold ${
                theme === "dark" ? "text-green-400" : "text-green-600"
              }`}
            >
              Available
            </span>
          )}
        </p>

        {isBooked && (
          <p
            className={`text-xs mt-2 ${
              theme === "dark" ? "text-gray-300" : "text-gray-600"
            }`}
          >
            {activeBookings.length === 1 ? (
              <>
                Booked by{" "}
                <span className="font-medium">
                  {activeBookings[0].guest}
                </span>{" "}
                ({activeBookings[0].from} → {activeBookings[0].to})
              </>
            ) : (
              <span className="italic">
                {activeBookings.length} active bookings — click to view list
              </span>
            )}
          </p>
        )}
      </motion.div>

      {/* EXISTING MULTI-BOOKING MODAL — UNTOUCHED */}
      {showBookings && (
        <motion.div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setShowBookings(false)}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            className={`rounded-2xl p-6 w-[420px] shadow-lg ${
              theme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
          >
            <h3
              className={`text-lg font-semibold mb-4 ${
                theme === "dark" ? "text-red-400" : "text-red-700"
              }`}
            >
              Select a booking — Room {room.roomNo}
            </h3>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {activeBookings.map((b, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    onSelect(hostel, room.roomNo, b.id);
                    setShowBookings(false);
                  }}
                  className={`border rounded-lg p-3 cursor-pointer ${
                    theme === "dark"
                      ? "border-gray-700 hover:bg-gray-700"
                      : "border-gray-200 hover:bg-red-50"
                  }`}
                >
                  <p
                    className={`text-sm font-medium flex items-center gap-1 ${
                      theme === "dark" ? "text-red-400" : "text-red-700"
                    }`}
                  >
                    <User2 className="w-4 h-4" /> {b.guest}
                  </p>
                  <p
                    className={`text-xs ${
                      theme === "dark" ? "text-gray-300" : "text-gray-600"
                    }`}
                  >
                    {b.from} → {b.to}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 text-right">
              <button
                onClick={() => setShowBookings(false)}
                className={`px-3 py-1 rounded ${
                  theme === "dark"
                    ? "bg-gray-700 hover:bg-gray-600"
                    : "bg-gray-200 hover:bg-gray-300"
                }`}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
