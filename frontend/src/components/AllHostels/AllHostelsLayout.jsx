// src/components/AllHostels/AllHostelsLayout.jsx
import React from "react";
import { motion } from "framer-motion";
import { Building2, Home } from "lucide-react";

export default function AllHostelsLayout({ theme, onBackHome, children }) {
  return (
    <div
      className={`min-h-screen overflow-x-hidden ${
        theme === "dark"
          ? "bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100"
          : "bg-gradient-to-b from-red-50 to-white text-gray-900"
      }`}
    >
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`flex flex-col sm:flex-row justify-between items-center px-3 sm:px-6 py-3 sm:py-4 gap-3 sm:gap-0 border-b shadow-sm sticky top-0 
          theme === "dark"
            ? "bg-gray-800/95 border-gray-700"
            : "bg-white/95 border-gray-200"
        }`}
      >
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.6 }}
          >
            <Building2 className="w-8 h-8 text-red-600" />
          </motion.div>
        </div>

        <motion.h1
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent flex items-center gap-2"
        >
          <Building2 /> All Hostels Portal
        </motion.h1>

        <motion.button
          whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(220, 38, 38, 0.3)" }}
          whileTap={{ scale: 0.95 }}
          onClick={onBackHome}
          className={`flex items-center gap-2 border px-3 sm:px-4 py-1.5 sm:py-2 text-sm sm:text-base rounded-full shadow transition ${
            theme === "dark"
              ? "bg-gray-700 border-gray-600 text-gray-100 hover:bg-gray-600"
              : "bg-white border-red-400 text-red-700 hover:bg-red-50"
          }`}
        >
          <Home size={18} /> Home
        </motion.button>
      </motion.div>

      {/* Main Content */}
      <div className="p-3 sm:p-6">{children}</div>
    </div>
  );
}