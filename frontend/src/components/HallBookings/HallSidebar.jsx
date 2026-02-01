// src/components/HallBookings/HallSidebar.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Home, Grid } from "lucide-react";
import Creator from "../Creator";

export default function HallSidebar({ 
  theme, 
  onNavigate,
  activeSection = "home" // "home" or "portal"
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sidebarVariants = {
    expanded: { 
      width: "250px",
      transition: { duration: 0.3, ease: "easeInOut" }
    },
    collapsed: { 
      width: "80px",
      transition: { duration: 0.3, ease: "easeInOut" }
    }
  };

  const menuItems = [
    {
      id: "home",
      label: "Dashboard Home",
      icon: Home,
      description: "Main dashboard view"
    },
    {
      id: "portal",
      label: "Hall Bookings Portal",
      icon: Grid,
      description: "Manage all hall bookings"
    }
  ];

  return (
    <motion.aside
      variants={sidebarVariants}
      animate={isCollapsed ? "collapsed" : "expanded"}
      className={`fixed left-0 top-16 bottom-0 border-r shadow-xl z-20 overflow-hidden ${
        theme === "dark"
          ? "bg-gradient-to-b from-gray-800 to-gray-900 border-gray-700"
          : "bg-gradient-to-b from-white to-gray-50 border-gray-200"
      }`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={`absolute -right-3 top-6 p-1.5 rounded-full shadow-lg transition-all z-30 ${
          theme === "dark"
            ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
            : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
        }`}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Sidebar Header with Thapar Logo */}
      <div className="p-6 border-b border-gray-700">
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="expanded-header"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-2">
                {/* Thapar Logo */}
                <div className="flex-shrink-0">
                  <img 
                    src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
                    alt="Thapar Institute"
                    className="w-12 h-12 object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                    Hall Bookings
                  </h2>
                  <p className={`text-xs ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    Management System
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="collapsed-header"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex justify-center"
            >
              <img 
                src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
                alt="Thapar Institute"
                className="w-10 h-10 object-contain"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Menu Items */}
      <nav className="p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;

          return (
            <motion.button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              whileHover={{ scale: 1.02, x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg"
                  : theme === "dark"
                  ? "hover:bg-gray-700 text-gray-300"
                  : "hover:bg-red-50 text-gray-700"
              }`}
            >
              <Icon className={`${isCollapsed ? "w-6 h-6" : "w-5 h-5"} flex-shrink-0`} />
              
              <AnimatePresence>
                {!isCollapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-start overflow-hidden"
                  >
                    <span className="font-semibold text-sm whitespace-nowrap">
                      {item.label}
                    </span>
                    {isActive && (
                      <span className="text-xs opacity-80 whitespace-nowrap">
                        {item.description}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </nav>

      {/* Footer - Creator Link */}
      {!isCollapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700"
        >
          <Creator variant="sidebar" className="w-full justify-center" />
        </motion.div>
      )}
    </motion.aside>
  );
}