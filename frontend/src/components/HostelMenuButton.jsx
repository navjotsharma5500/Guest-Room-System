// src/components/HostelMenuButton.jsx
import React, { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function HostelMenuButton({ 
  hostelName, 
  rooms = [], 
  onBlockRoom, 
  onUnblockRoom,
  theme 
}) {
    console.log("🔍 HostelMenuButton rendered:", { 
        hostelName, 
        roomsCount: rooms.length,
        theme 
    });
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleRoomClick = (room) => {
    if (room.isBlocked) {
      // Open unblock modal
      onUnblockRoom(hostelName, room.roomNo, {
        blockedTill: room.blockedTill,
        blockRemarks: room.blockRemarks,
        blockAttachments: room.blockAttachments
      });
    } else {
      // Open block modal
      onBlockRoom(hostelName, room.roomNo);
    }
    setIsOpen(false);
  };

  // Filter to show only guest rooms (exclude blocked status indication here)
  const guestRooms = rooms.filter(r => r.roomType === "Guest Room" || !r.roomType);

  if (guestRooms.length === 0) {
    return null; // Don't show button if no guest rooms
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Three Dots Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-1 rounded-full transition-colors ${
          theme === "dark"
            ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
            : "hover:bg-gray-200 text-gray-600 hover:text-gray-900"
        }`}
        title="Room Management"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className={`absolute left-0 top-full mt-1 w-56 rounded-lg shadow-xl border z-50 ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            {/* Header */}
            <div className={`px-3 py-2 border-b ${
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <p className={`text-xs font-semibold ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}>
                Guest Rooms
              </p>
            </div>

            {/* Room List */}
            <div className="max-h-64 overflow-y-auto">
              {guestRooms.map((room) => (
                <button
                  key={room.roomNo}
                  onClick={() => handleRoomClick(room)}
                  className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                    theme === "dark"
                      ? "hover:bg-gray-700 text-gray-200"
                      : "hover:bg-gray-50 text-gray-900"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {room.isBlocked && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" 
                            title="Blocked" />
                    )}
                    Room {room.roomNo}
                  </span>
                  
                  {room.isBlocked && (
                    <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                      Blocked
                    </span>
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}