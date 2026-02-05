// src/components/AllHostels/FilterModal.jsx
import React from "react";
import { motion } from "framer-motion";
import { X, Search, Calendar } from "lucide-react";

export default function FilterModal({
  theme,
  checkIn,
  checkOut,
  setCheckIn,
  setCheckOut,
  onClose,
  onSubmit,
}) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`rounded-2xl p-4 sm:p-6 w-full max-w-[95%] sm:max-w-[480px] mx-4 shadow-2xl ${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        }`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2
            className={`text-xl sm:text-2xl font-bold flex items-center gap-2 ${
              theme === "dark" ? "text-red-400" : "text-red-700"
            }`}
          >
            <Search className="w-6 h-6" />
            Check Vacancy
          </h2>
          <motion.button
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className={
              theme === "dark"
                ? "text-gray-400 hover:text-red-400"
                : "text-gray-500 hover:text-red-700"
            }
          >
            <X size={24} />
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Check-In Date */}
          <div>
            <label
              className={`block text-xs sm:text-sm font-semibold mb-2 flex items-center gap-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Check-In Date
            </label>
            <motion.input
              whileFocus={{ scale: 1.01 }}
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base rounded-xl border-2 transition-all focus:outline-none focus:ring-2 ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-gray-100 focus:ring-red-500"
                  : "bg-white border-red-300 text-gray-900 focus:ring-red-500"
              }`}
              required
            />
          </div>

          {/* Check-Out Date */}
          <div>
            <label
              className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Check-Out Date
            </label>
            <motion.input
              whileFocus={{ scale: 1.01 }}
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn || undefined}
              className={`w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:ring-2 ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-gray-100 focus:ring-red-500"
                  : "bg-white border-red-300 text-gray-900 focus:ring-red-500"
              }`}
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className={`px-6 py-2.5 w-full sm:w-auto text-sm sm:text-base rounded-xl font-medium transition ${
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 10px 25px rgba(220, 38, 38, 0.3)",
              }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-2.5 w-full sm:w-auto text-sm sm:text-base bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg font-semibold transition"
            >
              Search Rooms
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}