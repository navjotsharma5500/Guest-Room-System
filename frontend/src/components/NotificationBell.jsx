import React, { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Notification Bell Component
 * Shows badge count and dropdown with latest enquiries
 * Theme: Dark/Light support
 */
const NotificationBell = ({ 
  unreadCount = 0, 
  enquiries = [], 
  onEnquiryClick = () => {},
  onViewAll = () => {},
  theme = "dark" 
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const prevCountRef = useRef(0);
  const dropdownRef = useRef(null);

  // Play notification sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = "sine";

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log("🔔 Notification sound played");
    } catch (error) {
      console.warn("Could not play notification sound:", error);
    }
  };

  // Track unreadCount changes (don't play sound here - requires user gesture)
  useEffect(() => {
    console.log(`🔔 Unread count changed: ${prevCountRef.current} → ${unreadCount}`);
    prevCountRef.current = unreadCount;
  }, [unreadCount]);

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    if (!showDropdown) return;

    const handleClickOutside = (event) => {
      // Don't close if clicking inside the dropdown or the bell button
      if (dropdownRef.current && dropdownRef.current.contains(event.target)) {
        return;
      }
      
      // Check if clicking on the bell button itself
      const bellButton = dropdownRef.current?.previousElementSibling;
      if (bellButton && bellButton.contains(event.target)) {
        return;
      }

      console.log("📌 Closing dropdown (outside click detected)");
      setShowDropdown(false);
    };

    // Add event listener with capture phase to catch all clicks
    document.addEventListener("mousedown", handleClickOutside, true);
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, [showDropdown]);

  return (
    <div className="relative">
      {/* Bell Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (unreadCount > 0) {
            playNotificationSound();
          }
          setShowDropdown(!showDropdown);
        }}
        className={`
          relative p-2 rounded-lg transition focus:outline-none
          ${theme === "dark"
            ? "text-[#e8eaed] hover:bg-[#3c4043]"
            : "text-gray-700 hover:bg-gray-100"
          }
        `}
        aria-label="Notifications"
      >
        <Bell size={24} />

        {/* Badge */}
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
            className={`
              absolute -top-1 -right-1 text-white text-xs font-bold rounded-full 
              h-5 w-5 flex items-center justify-center shadow-lg
              ${theme === "dark" ? "bg-[#f28b82]" : "bg-red-500"}
            `}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`
              absolute right-0 mt-2 w-96 rounded-lg shadow-2xl z-50
              ${theme === "dark"
                ? "bg-[#292a2d] border border-[#3c4043]"
                : "bg-white border border-gray-200"
              }
            `}
          >
            {/* Header */}
            <div className={`
              p-4 border-b rounded-t-lg
              ${theme === "dark"
                ? "border-[#3c4043] bg-[#3c4043]"
                : "border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100"
              }
            `}>
              <h3 className={`font-bold text-lg ${
                theme === "dark" ? "text-[#e8eaed]" : "text-gray-800"
              }`}>
                Pending Enquiries
              </h3>
              <p className={`text-sm mt-1 ${
                theme === "dark" ? "text-[#9aa0a6]" : "text-gray-600"
              }`}>
                {unreadCount} new enquiry(ies)
              </p>
            </div>

            {/* Enquiries List - ✅ FILTERED TO SHOW ONLY PENDING */}
            <div className="max-h-96 overflow-y-auto">
              {enquiries && enquiries.length > 0 ? (
                enquiries
                  // ✅ Filter to only show PENDING enquiries
                  .filter(e => e.status && e.status.toLowerCase() === "pending")
                  .slice(0, 10)
                  .map((enquiry, idx) => (
                  <motion.div
                    key={enquiry._id || idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => {
                      onEnquiryClick(enquiry);
                      setShowDropdown(false);
                    }}
                    className={`
                      p-3 border-b cursor-pointer transition
                      ${theme === "dark"
                        ? "border-[#3c4043] hover:bg-[#3c4043]"
                        : "border-gray-50 hover:bg-blue-50"
                      }
                    `}
                  >
                    <p className={`font-semibold text-sm ${
                      theme === "dark" ? "text-[#e8eaed]" : "text-gray-800"
                    }`}>
                      {enquiry.name}
                    </p>
                    <p className={`text-xs mt-1 ${
                      theme === "dark" ? "text-[#9aa0a6]" : "text-gray-600"
                    }`}>
                      📍 {enquiry.hall} - {enquiry.roomNo}
                    </p>
                    <p className={`text-xs mt-1 ${
                      theme === "dark" ? "text-[#9aa0a6]" : "text-gray-500"
                    }`}>
                      📅 {enquiry.checkInDate} at {enquiry.checkInTime}
                    </p>
                    <p className={`text-xs font-medium mt-2 truncate ${
                      theme === "dark" ? "text-[#e8eaed]" : "text-gray-700"
                    }`}>
                      {enquiry.eventName}
                    </p>
                  </motion.div>
                ))
              ) : (
                <div className={`p-8 text-center text-sm ${
                  theme === "dark" ? "text-[#5f6368]" : "text-gray-500"
                }`}>
                  <Bell className={`mx-auto mb-3 ${
                    theme === "dark" ? "text-[#3c4043]" : "text-gray-300"
                  }`} size={32} />
                  <p>No new enquiries</p>
                </div>
              )}
            </div>

            {/* Footer - ✅ View All Enquiries button with onClick handler */}
            {enquiries && enquiries.filter(e => e.status && e.status.toLowerCase() === "pending").length > 10 && (
              <div 
                onClick={() => {
                  console.log("📋 View All Enquiries clicked");
                  onViewAll();
                  setShowDropdown(false);
                }}
                className={`
                  p-3 border-t text-center text-sm font-medium cursor-pointer transition
                  ${theme === "dark"
                    ? "border-[#3c4043] text-[#8ab4f8] hover:bg-[#3c4043]"
                    : "border-gray-100 text-blue-600 hover:bg-gray-50"
                  }
                `}
              >
                View all enquiries
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;
