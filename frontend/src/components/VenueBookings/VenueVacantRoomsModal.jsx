// src/components/HallBookings/VacantRoomsModal.jsx - Google Material Design
import React from "react";
import { motion } from "framer-motion";
import { X, CheckCircle } from "lucide-react";
import { useEscapeKey } from "../../hooks/useEscapeKey";

export default function VenueVacantRoomsModal({ theme, vacantRooms, onClose, onBookRoom }) {
  useEscapeKey(onClose);
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className={`
          rounded-lg p-6 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[80vh]
          ${theme === "dark" ? "bg-[#292a2d]" : "bg-white"}
        `}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-normal flex items-center gap-2 ${
            theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
          }`}>
            <CheckCircle className="w-6 h-6" /> Available Venue Rooms
          </h2>
          <button
            onClick={onClose}
            className={`
              p-2 rounded-full transition-colors
              ${theme === "dark" 
                ? "hover:bg-[#3c4043] text-[#9aa0a6]" 
                : "hover:bg-[#f1f3f4] text-[#5f6368]"
              }
            `}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          {vacantRooms.map((v, i) => (
            <motion.div
              key={`${v.hall}_${v.room.roomNo}_${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`
                p-4 rounded-lg flex justify-between items-center transition-all
                ${theme === "dark"
                  ? "bg-[#3c4043] hover:bg-[#4a4d50]"
                  : "bg-[#f8f9fa] hover:bg-[#f1f3f4] border border-[#dadce0]"
                }
              `}
            >
              <div>
                <p className={`font-medium text-base ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  {v.hall} — {v.room.roomNo}
                </p>
                <p className={`text-sm ${
                  theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                }`}>
                  Venue Room
                </p>
              </div>
              <button
                onClick={() => onBookRoom({ hall: v.hall, room: v.room })}
                className={`
                  px-4 py-2 rounded text-sm font-medium transition-colors
                  ${theme === "dark"
                    ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                    : "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                  }
                `}
              >
                Book Now
              </button>
            </motion.div>
          ))}
        </div>

        {vacantRooms.length === 0 && (
          <div className={`text-center py-12 ${
            theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
          }`}>
            <p className="text-base">No vacant venue rooms found for the selected dates.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
