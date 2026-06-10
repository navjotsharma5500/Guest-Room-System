// src/components/HostelMenuButton.jsx
import React, { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import useSystemSettings from "../hooks/useSystemSettings";

export default function HostelMenuButton({ 
  hostelName, 
  rooms = [], 
  onBlockRoom, 
  onUnblockRoom,
  theme 
}) {
  console.log("ðŸ” HostelMenuButton DEBUG:", { 
    hostelName, 
    roomsReceived: rooms,
    roomsCount: rooms?.length || 0,
    roomsIsArray: Array.isArray(rooms),
    firstRoom: rooms?.[0]
  });

  const [isOpen, setIsOpen] = useState(false);
  const { settings } = useSystemSettings();
  const cleaningEnabled = settings?.operations?.enableCleaningWorkflow !== false;
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
      onUnblockRoom(hostelName, room.roomNo, {
        blockedTill: room.blockedTill,
        blockRemarks: room.blockRemarks,
        blockAttachments: room.blockAttachments
      });
    } else {
      onBlockRoom(hostelName, room.roomNo);
    }
    setIsOpen(false);
  };

  // âœ… Filter for Guest Rooms only
  const guestRooms = rooms.filter(room => 
    room.roomNo && room.roomNo.toLowerCase().includes("guest room")
  );

  console.log("âœ… Guest Rooms After Filter:", {
    hostelName,
    totalRooms: rooms.length,
    guestRoomsFound: guestRooms.length,
    guestRoomDetails: guestRooms.map(r => ({
      roomNo: r.roomNo,
      roomType: r.roomType,
      isBlocked: r.isBlocked,
      roomState: r.roomState
    }))
  });

  // âœ… FIX: Don't return null if no rooms. Show button but with empty state.
  // This ensures the 3-dots menu always appears for authorized users.
  
  return (
    <div
      ref={menuRef}
      className="relative flex-shrink-0 z-50" 
      style={{ minWidth: "32px" }}
    >
      {/* Three Dots Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-2 rounded-full transition-colors ${
          theme === "dark"
            ? "hover:bg-gray-700 text-gray-400 hover:text-gray-200"
            : "hover:bg-gray-200 text-gray-600 hover:text-gray-900"
        }`}
        title="Room Management"
      >
        <MoreVertical className="w-5 h-5" />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 top-full mt-1 w-64 rounded-lg shadow-xl border z-50 ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700"
                : "bg-white border-gray-200"
            }`}
          >
            {/* Header */}
            <div className={`px-4 py-3 border-b ${
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}>
              <p className={`text-sm font-semibold ${
                theme === "dark" ? "text-gray-200" : "text-gray-800"
              }`}>
                Manage Guest Rooms
              </p>
            </div>

            {/* Room List */}
            <div className="max-h-80 overflow-y-auto">
              {guestRooms.length === 0 ? (
                <div className={`p-4 text-center text-sm ${
                  theme === "dark" ? "text-gray-500" : "text-gray-400"
                }`}>
                  No guest rooms found
                  {rooms.length > 0 && (
                    <p className="text-xs mt-1 opacity-60">
                      ({rooms.length} other room types available)
                    </p>
                  )}
                </div>
              ) : (
                guestRooms.map((room) => (
                  <button
                    key={room.roomNo}
                    onClick={() => handleRoomClick(room)}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between ${
                      theme === "dark"
                        ? "hover:bg-gray-700 text-gray-300"
                        : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {room.isBlocked ? (
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" 
                              title="Blocked" />
                      ) : cleaningEnabled && room.roomState === "cleaning_pending" ? (
                        <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"
                              title="Cleaning Pending" />
                      ) : (
                        <span className="w-2 h-2 bg-green-500 rounded-full" 
                              title="Available" />
                      )}
                      Room {room.roomNo}
                    </span>
                    
                    {room.isBlocked && (
                      <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                        Blocked
                      </span>
                    )}
                    {!room.isBlocked && cleaningEnabled && room.roomState === "cleaning_pending" && (
                      <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium">
                        Cleaning
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
