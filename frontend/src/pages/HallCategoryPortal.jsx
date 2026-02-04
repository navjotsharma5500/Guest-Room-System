// src/pages/HallCategoryPortal.jsx - GOOGLE MATERIAL DESIGN 3
import React, { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Plus, Calendar, Users, CheckCircle, AlertCircle, Building2, X } from "lucide-react";
import { useToast } from "../context/ToastContext";

// Component Imports
import BookingDetailsModal from "../components/HallBookings/BookingDetailsModal";
import BookingListModal from "../components/HallBookings/BookingListModal";
import HallBookingModal from "../components/HallBookings/HallBookingModal";
import HallCancelModal from "../components/HallBookings/HallCancelModal";
import HallExtensionModal from "../components/HallBookings/HallExtensionModal";

// Custom Hooks
import useHallBookingHandlers from "../hooks/useHallBookingHandlers";

export default function HallCategoryPortal({
  hallData = {},
  theme,
  categoryId,
  categoryName,
  currentUser,
  onRefresh,
  setExtensionModal,
  onBackHome,
}) {
  const { showToast } = useToast();

  // State Management
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [hallBookingModal, setHallBookingModal] = useState(false);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [bookingListModal, setBookingListModal] = useState(null);
  const [bookingDetailsModal, setBookingDetailsModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [selectedRoomForPanel, setSelectedRoomForPanel] = useState(null);

  // Get rooms for this specific category
  const categoryRooms = useMemo(() => {
    if (!categoryName || !hallData[categoryName]) {
      console.warn(`⚠️ Category "${categoryName}" not found in hallData`);
      return [];
    }
    return hallData[categoryName].rooms || [];
  }, [hallData, categoryName]);

  // Stable callbacks for handlers
  const stableSetSelectedRooms = useCallback(setSelectedRooms, []);
  const stableSetHallBookingModal = useCallback(setHallBookingModal, []);
  const stableSetSelectionMode = useCallback(setSelectionMode, []);
  const stableSetBookingCompleted = useCallback(setBookingCompleted, []);
  const stableSetBookingDetailsModal = useCallback(setBookingDetailsModal, []);
  const stableSetBookingListModal = useCallback(setBookingListModal, []);
  const stableSetCancelModal = useCallback(setCancelModal, []);
  const stableSetExtensionModal = useCallback(setExtensionModal, []);

  // Booking handlers
  const bookingHandlers = useHallBookingHandlers({
    hallData,
    selectedRooms,
    showToast,
    setSelectedRooms: stableSetSelectedRooms,
    setHallBookingModal: stableSetHallBookingModal,
    setSelectionMode: stableSetSelectionMode,
    setBookingCompleted: stableSetBookingCompleted,
    setBookingDetailsModal: stableSetBookingDetailsModal,
    setBookingListModal: stableSetBookingListModal,
    setCancelModal: stableSetCancelModal,
    setExtensionModal: stableSetExtensionModal,
  });

  // Check if room has active bookings
  const hasActiveBookings = useCallback((room) => {
    return (room.bookings || []).some(b => 
      ["booked", "checked_in"].includes(b.status)
    );
  }, []);

  // Get active bookings count
  const getActiveBookingsCount = useCallback((room) => {
    return (room.bookings || []).filter(
      b => ["booked", "checked_in"].includes(b.status)
    ).length;
  }, []);

  // Handle room click
  const handleRoomClick = useCallback((room) => {
    if (selectionMode) return;

    const hasActive = hasActiveBookings(room);
    
    if (!hasActive) {
      showToast("ℹ️ This room is vacant", "info");
      return;
    }

    bookingHandlers.onRoomClick(categoryName, room, hasActive);
  }, [categoryName, selectionMode, hasActiveBookings, bookingHandlers, showToast]);

  // Handle direct booking
  const handleDirectBooking = useCallback((e, room) => {
    e.stopPropagation();
    setSelectedRooms([{ hall: categoryName, roomNo: room.roomNo }]);
    setSelectionMode(false);
    setHallBookingModal(true);
  }, [categoryName]);

  // Toggle room selection
  const toggleRoomSelect = useCallback((e, room) => {
    e.stopPropagation();
    setSelectedRooms(prev => {
      const exists = prev.find(
        r => r.hall === categoryName && r.roomNo === room.roomNo
      );
      
      if (exists) {
        return prev.filter(
          r => !(r.hall === categoryName && r.roomNo === room.roomNo)
        );
      } else {
        return [...prev, { hall: categoryName, roomNo: room.roomNo }];
      }
    });
  }, [categoryName]);

  // Check if room is selected
  const isRoomSelected = useCallback((room) => {
    return selectedRooms.some(
      r => r.hall === categoryName && r.roomNo === room.roomNo
    );
  }, [selectedRooms, categoryName]);

  // Handle Add Booking
  const handleAddBooking = useCallback(() => {
    setSelectionMode(true);
    setSelectedRooms([]);
    setSelectedRoomForPanel(null);
    showToast("✅ Select rooms for booking", "info");
  }, [showToast]);

  // Handle Done Selection
  const handleDoneSelection = useCallback(() => {
    if (selectedRooms.length === 0) {
      showToast("⚠️ Please select at least one room", "warning");
      return;
    }
    setHallBookingModal(true);
  }, [selectedRooms, showToast]);

  // Cancel selection
  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedRooms([]);
    showToast("Selection cancelled", "info");
  }, [showToast]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === "dark" ? "bg-[#202124]" : "bg-[#f8f9fa]"
    }`}>
      {/* Header */}
      <header className={`
        border-b transition-colors duration-200 sticky top-0 z-50
        ${theme === "dark" ? "bg-[#292a2d] border-[#3c4043]" : "bg-white border-[#dadce0]"}
      `}>
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div>
              <h1 className={`text-xl font-normal ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}>
                {categoryName}
              </h1>
              <p className={`text-sm ${
                theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
              }`}>
                {categoryRooms.length} room{categoryRooms.length !== 1 ? "s" : ""} available
              </p>
            </div>
            
            {/* Right Section */}
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleCancelSelection}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${theme === "dark"
                        ? "bg-[#3c4043] hover:bg-[#4a4d50] text-[#e8eaed]"
                        : "bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124]"
                      }
                    `}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: selectedRooms.length > 0 ? 1.01 : 1 }}
                    whileTap={{ scale: selectedRooms.length > 0 ? 0.99 : 1 }}
                    onClick={handleDoneSelection}
                    disabled={selectedRooms.length === 0}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${selectedRooms.length > 0
                        ? theme === "dark"
                          ? "bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124]"
                          : "bg-[#1a73e8] hover:bg-[#1967d2] text-white"
                        : theme === "dark"
                        ? "bg-[#3c4043] text-[#5f6368] cursor-not-allowed"
                        : "bg-[#f1f3f4] text-[#5f6368] cursor-not-allowed"
                      }
                    `}
                  >
                    Done ({selectedRooms.length})
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleAddBooking}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${theme === "dark"
                        ? "bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124]"
                        : "bg-[#1a73e8] hover:bg-[#1967d2] text-white"
                      }
                    `}
                  >
                    <Calendar size={16} />
                    Add Booking
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={onBackHome}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${theme === "dark"
                        ? "bg-[#3c4043] hover:bg-[#4a4d50] text-[#e8eaed]"
                        : "bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124]"
                      }
                    `}
                  >
                    <Home size={16} />
                    Back
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {categoryRooms.length === 0 ? (
          <div className={`
            rounded-lg p-12 text-center border
            ${theme === "dark" ? "bg-[#292a2d] border-[#3c4043]" : "bg-white border-[#dadce0]"}
          `}>
            <AlertCircle className={`w-16 h-16 mx-auto mb-4 ${
              theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
            }`} />
            <h3 className={`text-lg font-medium mb-2 ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}>
              No Rooms Available
            </h3>
            <p className={`text-sm ${
              theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
            }`}>
              This category doesn't have any rooms configured yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {categoryRooms.map((room, index) => {
              const isActive = hasActiveBookings(room);
              const bookingsCount = getActiveBookingsCount(room);
              const isSelected = isRoomSelected(room);

              return (
                <motion.div
                  key={room.roomNo || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleRoomClick(room)}
                  className={`
                    relative rounded-lg p-4 border cursor-pointer
                    transition-all duration-200
                    ${isSelected 
                      ? theme === "dark"
                        ? "bg-[#8ab4f8]/10 border-[#8ab4f8]"
                        : "bg-[#d3e3fd] border-[#1a73e8]"
                      : theme === "dark"
                      ? "bg-[#3c4043] hover:bg-[#4a4d50] border-[#3c4043]"
                      : "bg-white hover:bg-[#f8f9fa] border-[#dadce0]"
                    }
                  `}
                >
                  {/* Selection Checkbox */}
                  {selectionMode && (
                    <div
                      onClick={(e) => toggleRoomSelect(e, room)}
                      className="absolute top-3 right-3"
                    >
                      <div className={`
                        w-5 h-5 rounded border-2 flex items-center justify-center
                        transition-colors duration-200
                        ${isSelected
                          ? theme === "dark"
                            ? "bg-[#8ab4f8] border-[#8ab4f8]"
                            : "bg-[#1a73e8] border-[#1a73e8]"
                          : theme === "dark"
                          ? "border-[#9aa0a6]"
                          : "border-[#5f6368]"
                        }
                      `}>
                        {isSelected && <CheckCircle size={14} className="text-[#202124]" />}
                      </div>
                    </div>
                  )}

                  {/* Room Number */}
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Building2 size={18} className={
                        theme === "dark" ? "text-[#8ab4f8]" : "text-[#1a73e8]"
                      } />
                      <h3 className={`font-medium ${
                        theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                      }`}>
                        Room {room.roomNo}
                      </h3>
                    </div>
                  </div>

                  {/* Status & Bookings */}
                  <div className="space-y-2">
                    {isActive ? (
                      <>
                        <div className={`
                          flex items-center gap-2 text-sm px-2 py-1 rounded
                          ${theme === "dark"
                            ? "bg-[#1e4620] text-[#81c995]"
                            : "bg-[#e6f4ea] text-[#137333]"
                          }
                        `}>
                          <CheckCircle size={14} />
                          <span>Active</span>
                        </div>
                        <div className={`
                          flex items-center gap-2 text-sm px-2 py-1 rounded
                          ${theme === "dark" ? "bg-[#292a2d]" : "bg-[#f8f9fa]"}
                        `}>
                          <Users size={14} className={
                            theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                          } />
                          <span className={
                            theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                          }>
                            {bookingsCount} booking{bookingsCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div className={`
                        flex items-center justify-between text-sm px-2 py-1 rounded
                        ${theme === "dark" ? "bg-[#292a2d]" : "bg-[#f8f9fa]"}
                      `}>
                        <span className={
                          theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                        }>
                          Vacant
                        </span>
                        {!selectionMode && (
                          <button
                            onClick={(e) => handleDirectBooking(e, room)}
                            className={`
                              p-1 rounded transition-colors
                              ${theme === "dark"
                                ? "hover:bg-[#8ab4f8] hover:text-[#202124] text-[#8ab4f8]"
                                : "hover:bg-[#1a73e8] hover:text-white text-[#1a73e8]"
                              }
                            `}
                          >
                            <Plus size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {hallBookingModal && (
          <HallBookingModal
            theme={theme}
            selectedRooms={selectedRooms}
            onClose={() => {
              setHallBookingModal(false);
              setSelectionMode(false);
              setSelectedRooms([]);
            }}
            onSubmit={bookingHandlers.handleHallBooking}
          />
        )}

        {bookingListModal && (
          <BookingListModal
            theme={theme}
            modal={bookingListModal}
            onClose={() => setBookingListModal(null)}
            onSelectBooking={(booking) => {
              setBookingListModal(null);
              setBookingDetailsModal({
                hall: bookingListModal.hall,
                room: bookingListModal.room,
                booking: booking
              });
            }}
          />
        )}

        {bookingDetailsModal && (
          <BookingDetailsModal
            theme={theme}
            modal={bookingDetailsModal}
            onClose={() => setBookingDetailsModal(null)}
            onCancel={() => {
              setCancelModal(bookingDetailsModal);
              setBookingDetailsModal(null);
            }}
            onExtend={() => {
              setExtensionModal(bookingDetailsModal);
              setBookingDetailsModal(null);
            }}
          />
        )}

        {cancelModal && (
          <HallCancelModal
            theme={theme}
            modal={cancelModal}
            onClose={() => setCancelModal(null)}
            onConfirm={(remarks) => bookingHandlers.onCancelDone(remarks, cancelModal)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}