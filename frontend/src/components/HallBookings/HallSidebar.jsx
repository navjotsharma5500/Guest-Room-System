// src/components/HallBookings/HallSidebar.jsx - UPDATED VERSION
import React from "react";
import { motion } from "framer-motion";
import { Home, Grid, Calendar, Building2 } from "lucide-react";
import Creator from "../Creator";

export default function HallSidebar({ theme, onNavigate, activeSection = "home" }) {
  // ❌ REMOVED: Logo section completely

  const menuItems = [
    {
      id: "home",
      label: "Dashboard",
      icon: Home,
      description: "Overview"
    },
    {
      id: "manage-bookings",  // ✅ NEW: Changed from "portal"
      label: "Manage Bookings",
      icon: Grid,
      description: "All Bookings"
    },
    {
      id: "calendar",  // ✅ NEW: Calendar page
      label: "Calendar",
      icon: Calendar,
      description: "View by Date"
    },
    // ✅ NEW: Hall Category Buttons
    {
      id: "hall",
      label: "Hall",
      icon: Building2,
      description: "Main Auditoriums",
      isCategory: true
    },
    {
      id: "rooms",
      label: "Rooms",
      icon: Building2,
      description: "T105, T106",
      isCategory: true
    },
    {
      id: "creativity-rooms",
      label: "Creativity Rooms",
      icon: Building2,
      description: "CR Spaces",
      isCategory: true
    },
    {
      id: "green-rooms",
      label: "Green Rooms",
      icon: Building2,
      description: "GR Spaces",
      isCategory: true
    },
    {
      id: "open-area",
      label: "Open Area",
      icon: Building2,
      description: "Lawns & OAT",
      isCategory: true
    },
    {
      id: "desk-area",
      label: "Desk Area",
      icon: Building2,
      description: "Cafe & Jaggi",
      isCategory: true
    },
    {
      id: "common-rooms",
      label: "Common Rooms",
      icon: Building2,
      description: "Block Rooms",
      isCategory: true
    }
  ];

  return (
    <motion.aside
      initial={{ x: -250, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="
        fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 flex flex-col z-20
        bg-white/70 backdrop-blur-xl
        dark:bg-gray-900/70
        border-r-4 border-red-500
        shadow-[0_18px_45px_rgba(15,23,42,0.18)]
        rounded-r-3xl
      "
    >
      {/* ❌ REMOVED: Logo Section - No logo anymore */}
      
      {/* ✅ NEW: Simple Title at top */}
      <div className={`px-4 py-4 border-b ${
        theme === "dark" ? "border-gray-700" : "border-slate-200"
      }`}>
        <h2 className={`text-lg font-bold ${
          theme === "dark" ? "text-white" : "text-gray-900"
        }`}>
          Hall Booking
        </h2>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto px-3 pt-3 pb-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate(item.id)}
              className={`
                relative group w-full text-left px-3 py-3 rounded-xl
                border bg-white/40 backdrop-blur-xl flex items-center gap-3
                dark:bg-gray-800/40
                ${
                  isActive
                    ? "border-red-500 shadow-md"
                    : "border-transparent hover:bg-white/80 dark:hover:bg-gray-700/80"
                }
                ${item.isCategory ? "mt-1" : ""}
              `}
            >
              <Icon className={`w-5 h-5 ${
                isActive 
                  ? "text-red-600" 
                  : theme === "dark" 
                    ? "text-gray-400" 
                    : "text-slate-600"
              }`} />
              <div className="flex-1">
                <span className={`text-sm block ${
                  isActive 
                    ? "font-semibold text-red-600" 
                    : theme === "dark"
                      ? "text-gray-300"
                      : "text-slate-700"
                }`}>
                  {item.label}
                </span>
                {isActive && (
                  <span className={`text-xs ${
                    theme === "dark" ? "text-gray-500" : "text-slate-500"
                  }`}>
                    {item.description}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </nav>

      {/* FOOTER */}
      <div className={`px-4 py-3 border-t ${
        theme === "dark" ? "border-gray-700" : "border-slate-200"
      } text-center mt-auto`}>
        <Creator variant="sidebar" />
      </div>
    </motion.aside>
  );
}