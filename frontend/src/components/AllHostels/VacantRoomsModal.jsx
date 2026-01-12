// src/components/AllHostels/VacantRoomsModal.jsx
import React from "react";
import { motion } from "framer-motion";
import { X, CheckCircle } from "lucide-react";

export default function VacantRoomsModal({ theme, vacantRooms, onClose, onBookRoom }) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`rounded-2xl p-6 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[80vh] ${
          theme === "dark"
            ? "bg-gray-800 text-gray-100"
            : "bg-white text-gray-900"
        }`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2
            className={`text-2xl font-semibold flex items-center gap-2 ${
              theme === "dark" ? "text-red-400" : "text-red-700"
            }`}
          >
            <CheckCircle className="w-6 h-6" /> Available Rooms
          </h2>
          <motion.button
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className={
              theme === "dark"
                ? "text-gray-400 hover:text-red-400"
                : "text-gray-500 hover:text-red-600"
            }
          >
            <X size={22} />
          </motion.button>
        </div>

        <div className="space-y-3">
          {vacantRooms.map((v, i) => (
            <motion.div
              key={`${v.hostel}_${v.room.roomNo}_${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02, boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}
              className={`p-4 border-2 rounded-xl flex justify-between items-center transition-all ${
                theme === "dark"
                  ? "border-gray-700 bg-gray-700/50 hover:bg-gray-700"
                  : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              <div>
                <p
                  className={`font-semibold text-lg ${
                    theme === "dark" ? "text-gray-100" : "text-gray-800"
                  }`}
                >
                  {v.hostel} – Room {v.room.roomNo}
                </p>
                <p
                  className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  {v.room.roomType || "Guest Room"}
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onBookRoom({ hostel: v.hostel, room: v.room })}
                className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg font-medium shadow-lg hover:shadow-xl transition-all"
              >
                Book Now
              </motion.button>
            </motion.div>
          ))}
        </div>

        {vacantRooms.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg">No vacant rooms found for the selected dates.</p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}