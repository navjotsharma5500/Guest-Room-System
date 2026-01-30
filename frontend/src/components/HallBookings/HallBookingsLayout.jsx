// src/components/HallBookings/HallBookingsLayout.jsx
import React from "react";
import { motion } from "framer-motion";
import { Home, Users, Search, Filter, Download, Calendar } from "lucide-react";

export default function HallBookingsLayout({ 
  theme, 
  onBackHome, 
  children,
  onSearchClick,
  onFilterClick,
  onDownloadClick,
  onAddBooking
}) {
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div
        className={`h-full w-full overflow-y-auto ${
          theme === "dark"
            ? "bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100"
            : "bg-gradient-to-b from-red-50 to-white text-gray-900"
        }`}
      >
        {/* Enhanced Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`flex flex-col lg:flex-row justify-between items-center px-6 py-4 border-b-2 shadow-lg sticky top-0 z-30 backdrop-blur-md ${
            theme === "dark"
              ? "bg-gray-800/95 border-gray-700"
              : "bg-white/95 border-gray-200"
          }`}
        >
          {/* Left Section - Logo */}
          <div className="flex items-center gap-4 mb-4 lg:mb-0">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.6 }}
            >
              <Users className="w-8 h-8 text-red-600" />
            </motion.div>
            
            <motion.h1
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="text-2xl lg:text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent"
            >
              Common Hall Booking Portal
            </motion.h1>
          </div>

          {/* Right Section - Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Add Booking Button */}
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(220, 38, 38, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onAddBooking}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
            >
              <Calendar size={18} />
              <span className="hidden sm:inline">Add Booking</span>
            </motion.button>

            {/* Search Button */}
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 5px 15px rgba(0, 0, 0, 0.1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onSearchClick}
              className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl shadow hover:shadow-lg transition-all ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
              title="Search Bookings"
            >
              <Search size={18} />
              <span className="hidden sm:inline">Search</span>
            </motion.button>

            {/* Filter Button */}
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 5px 15px rgba(0, 0, 0, 0.1)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onFilterClick}
              className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl shadow hover:shadow-lg transition-all ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
              title="Filter by Date Range"
            >
              <Filter size={18} />
              <span className="hidden sm:inline">Filter</span>
            </motion.button>

            {/* Download Button */}
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 5px 15px rgba(34, 197, 94, 0.2)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onDownloadClick}
              className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl shadow hover:shadow-lg transition-all ${
                theme === "dark"
                  ? "bg-green-900 border-green-700 text-green-100 hover:bg-green-800"
                  : "bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
              }`}
              title="Download Booking Data"
            >
              <Download size={18} />
              <span className="hidden sm:inline">Download</span>
            </motion.button>

            {/* Home Button */}
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(220, 38, 38, 0.3)" }}
              whileTap={{ scale: 0.95 }}
              onClick={onBackHome}
              className={`flex items-center gap-2 border-2 px-4 py-2.5 rounded-xl shadow transition ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
                  : "bg-white border-red-400 text-red-700 hover:bg-red-50"
              }`}
            >
              <Home size={18} /> 
              <span className="hidden sm:inline">Home</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}