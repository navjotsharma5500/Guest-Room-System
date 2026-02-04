// src/pages/HallCategoryPortal.jsx
import React, { useState, useCallback, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Plus, Calendar, Users, CheckCircle, AlertCircle, Building2 } from "lucide-react";
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

  // Get active bookings for room
  const getActiveBookings = useCallback((room) => {
    return (room.bookings || []).filter(
      b => ["booked", "checked_in"].includes(b.status)
    );
  }, []);

  // Handle room click - show booking details
  const handleRoomClick = useCallback((room) => {
    if (selectionMode) return; // Don't open details in selection mode

    console.log("🖱️ Room clicked:", room.roomNo);
    setSelectedRoomForPanel(room);
    
    const hasActive = hasActiveBookings(room);
    
    if (!hasActive) {
      showToast("ℹ️ This room is vacant", "info");
      return;
    }

    // Use the booking handler to open modals
    bookingHandlers.onRoomClick(categoryName, room, hasActive);
  }, [categoryName, selectionMode, hasActiveBookings, bookingHandlers, showToast]);

  // Handle direct booking (+ button)
  const handleDirectBooking = useCallback((e, room) => {
    e.stopPropagation();
    console.log("📅 Direct booking for:", categoryName, room.roomNo);
    setSelectedRooms([{ hall: categoryName, roomNo: room.roomNo }]);
    setSelectionMode(false);
    setHallBookingModal(true);
  }, [categoryName]);

  // Toggle room selection (checkbox)
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
    console.log("📋 Entering selection mode for:", categoryName);
    setSelectionMode(true);
    setSelectedRooms([]);
    setSelectedRoomForPanel(null);
    showToast("✅ Select rooms for booking (checkboxes enabled)", "info");
  }, [categoryName, showToast]);

  // Handle Done Selection
  const handleDoneSelection = useCallback(() => {
    if (selectedRooms.length === 0) {
      showToast("⚠️ Please select at least one room", "warning");
      return;
    }
    console.log("✅ Opening booking modal with rooms:", selectedRooms);
    setHallBookingModal(true);
  }, [selectedRooms, showToast]);

  // Cancel selection
  const handleCancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedRooms([]);
    showToast("Selection cancelled", "info");
  }, [showToast]);

  // View full booking details
  const handleViewFullDetails = useCallback((room) => {
    bookingHandlers.onRoomClick(categoryName, room, true);
  }, [categoryName, bookingHandlers]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden pb-8">
      {/* Glassmorphism Background */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute inset-0 ${
          theme === "dark"
            ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
            : "bg-gradient-to-br from-red-50 via-white to-orange-50"
        }`} />
        
        {/* Animated Blobs */}
        <div className={`absolute top-0 -left-4 w-72 h-72 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob ${
          theme === "dark" ? "opacity-10" : ""
        }`} />
        <div className={`absolute top-0 -right-4 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000 ${
          theme === "dark" ? "opacity-10" : ""
        }`} />
        <div className={`absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000 ${
          theme === "dark" ? "opacity-10" : ""
        }`} />
      </div>

      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className={`backdrop-blur-xl border-b shadow-lg sticky top-0 z-50 ${
          theme === "dark"
            ? "bg-gray-800/80 border-gray-700"
            : "bg-white/80 border-gray-200"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                {categoryName}
              </h2>
              <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {categoryRooms.length} room{categoryRooms.length !== 1 ? "s" : ""} available
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              {selectionMode ? (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancelSelection}
                    className={`px-4 py-2 rounded-xl border transition ${
                      theme === "dark"
                        ? "border-gray-600 hover:bg-gray-700 text-gray-300"
                        : "border-gray-300 hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: selectedRooms.length > 0 ? 1.02 : 1 }}
                    whileTap={{ scale: selectedRooms.length > 0 ? 0.98 : 1 }}
                    onClick={handleDoneSelection}
                    disabled={selectedRooms.length === 0}
                    className={`px-5 py-2.5 rounded-xl shadow-lg font-semibold transition ${
                      selectedRooms.length > 0
                        ? "bg-gradient-to-r from-red-600 to-red-700 text-white hover:shadow-xl"
                        : "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
                    }`}
                  >
                    Done ({selectedRooms.length})
                  </motion.button>
                </>
              ) : (
                <>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleAddBooking}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition font-semibold"
                  >
                    <Calendar size={18} />
                    Add Booking
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onBackHome}
                    className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-xl transition ${
                      theme === "dark"
                        ? "border-red-600 text-red-400 hover:bg-red-900/20"
                        : "border-red-400 text-red-700 hover:bg-red-50"
                    }`}
                  >
                    <Home size={18} />
                    Back
                  </motion.button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content - Rooms Grid + Booking Details Panel */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Side - Rooms Grid (2/3 width) */}
          <div className="lg:col-span-2">
            {categoryRooms.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`backdrop-blur-xl rounded-2xl border shadow-xl p-12 text-center ${
                  theme === "dark"
                    ? "bg-gray-800/60 border-gray-700"
                    : "bg-white/60 border-gray-200"
                }`}
              >
                <AlertCircle className={`w-16 h-16 mx-auto mb-4 ${
                  theme === "dark" ? "text-gray-600" : "text-gray-400"
                }`} />
                <h3 className={`text-xl font-bold mb-2 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  No Rooms Found
                </h3>
                <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  This category doesn't have any rooms configured yet
                </p>
              </motion.div>
            ) : (
              <>
              {/* Hall Name Header */}
              <div className={`mb-4 p-4 rounded-xl border-2 ${
                theme === "dark"
                  ? "bg-gradient-to-r from-blue-900/30 to-blue-800/30 border-blue-700"
                  : "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300"
              }`}>
                <h2 className={`text-xl font-bold flex items-center gap-2 ${
                  theme === "dark" ? "text-blue-400" : "text-blue-700"
                }`}>
                  <Building2 className="w-6 h-6" />
                  {categoryName}
                </h2>
                <p className={`text-sm mt-1 ${
                  theme === "dark" ? "text-blue-300" : "text-blue-600"
                }`}>
                  {categoryRooms.length} room{categoryRooms.length !== 1 ? 's' : ''} available
                </p>
              </div>

              {/* Rooms as Tiles */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {categoryRooms.map((room, index) => {
                  const hasActive = hasActiveBookings(room);
                  const isSelected = isRoomSelected(room);
                  const activeCount = getActiveBookingsCount(room);

                  return (
                    <motion.div
                      key={room.roomNo}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: selectionMode ? 1 : 1.05, y: -3 }}
                      className={`relative p-3 rounded-lg border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 shadow-lg shadow-blue-500/50"
                          : hasActive
                          ? "border-red-400 bg-red-50 dark:bg-red-900/20 hover:shadow-lg hover:shadow-red-500/30"
                          : "border-green-400 bg-green-50 dark:bg-green-900/20 hover:shadow-lg hover:shadow-green-500/30"
                      }`}
                      onClick={() => handleRoomClick(room)}
                    >
                      {/* Selection Checkbox */}
                      {selectionMode && (
                        <div
                          className="absolute top-1 left-1 z-10"
                          onClick={(e) => toggleRoomSelect(e, room)}
                        >
                          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer transition ${
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                          }`}>
                            {isSelected && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                      )}

                      {/* Direct Booking Button */}
                      {!selectionMode && (
                        <motion.button
                          whileHover={{ scale: 1.1, rotate: 90 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleDirectBooking(e, room)}
                          className="absolute top-1 right-1 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-1 shadow-lg transition z-10"
                          title="Direct Booking"
                        >
                          <Plus size={14} />
                        </motion.button>
                      )}

                      {/* Room Number - Centered */}
                      <div className="text-center mb-2">
                        <p className={`text-lg font-bold ${
                          hasActive 
                            ? "text-red-700 dark:text-red-400" 
                            : "text-green-700 dark:text-green-400"
                        }`}>
                          {room.roomNo}
                        </p>
                      </div>

                      {/* Status Badge - Full width */}
                      <div className={`text-center py-1 rounded-md text-xs font-bold shadow-sm ${
                        hasActive
                          ? "bg-red-500 text-white"
                          : "bg-green-500 text-white"
                      }`}>
                        {hasActive ? "OCCUPIED" : "VACANT"}
                      </div>

                      {/* Active Count */}
                      {activeCount > 0 && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 text-center font-semibold">
                          {activeCount} Active
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
              </>
            )}
          </div>

          {/* Right Side - Booking Details Panel (1/3 width) */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`sticky top-24 backdrop-blur-xl rounded-2xl border shadow-xl p-6 ${
                theme === "dark"
                  ? "bg-gray-800/60 border-gray-700"
                  : "bg-white/60 border-gray-200"
              }`}
            >
              <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                <Users className="w-5 h-5 text-red-600" />
                Booking Details
              </h3>

              {selectedRoomForPanel && hasActiveBookings(selectedRoomForPanel) ? (
                <div className="space-y-4">
                  {/* Room Info */}
                  <div className={`p-3 rounded-lg ${
                    theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
                  }`}>
                    <p className={`text-sm font-medium ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Room: <strong className="text-red-600">{selectedRoomForPanel.roomNo}</strong>
                    </p>
                    <p className={`text-sm mt-2 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}>
                      Active Bookings: <strong>{getActiveBookingsCount(selectedRoomForPanel)}</strong>
                    </p>
                  </div>

                  {/* Show active bookings */}
                  {getActiveBookings(selectedRoomForPanel).slice(0, 2).map((booking, idx) => (
                    <motion.div
                      key={booking._id || idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={`p-4 rounded-lg border ${
                        theme === "dark"
                          ? "bg-gray-700/30 border-gray-600"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          booking.status === "checked_in"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}>
                          {booking.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      
                      <p className={`text-sm font-semibold mb-2 ${
                        theme === "dark" ? "text-white" : "text-gray-900"
                      }`}>
                        {booking.name}
                      </p>
                      <p className={`text-xs ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        {booking.eventName || "No event name"}
                      </p>
                      <div className="mt-3 space-y-1">
                        <p className={`text-xs ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}>
                          <strong>Check-in:</strong> {booking.checkInDate}
                        </p>
                        <p className={`text-xs ${
                          theme === "dark" ? "text-gray-400" : "text-gray-600"
                        }`}>
                          <strong>Check-out:</strong> {booking.checkOutDate}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {/* View Full Details Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleViewFullDetails(selectedRoomForPanel)}
                    className="w-full py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition shadow-lg"
                  >
                    View Full Details
                  </motion.button>

                  {/* Show more bookings indicator */}
                  {getActiveBookingsCount(selectedRoomForPanel) > 2 && (
                    <p className={`text-xs text-center ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      +{getActiveBookingsCount(selectedRoomForPanel) - 2} more booking{getActiveBookingsCount(selectedRoomForPanel) - 2 !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                      theme === "dark" ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <Users className={`w-10 h-10 ${
                      theme === "dark" ? "text-gray-500" : "text-gray-400"
                    }`} />
                  </motion.div>
                  <p className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    Click on an occupied room
                  </p>
                  <p className={`text-xs mt-1 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-400"
                  }`}>
                    to view booking details
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence mode="wait">
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
      </AnimatePresence>

      <AnimatePresence mode="wait">
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
                booking,
              });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {bookingDetailsModal && (
          <BookingDetailsModal
            theme={theme}
            modal={bookingDetailsModal}
            onClose={() => {
              setBookingDetailsModal(null);
            }}
            onExtend={() => {
              const booking = bookingDetailsModal.booking;
              setExtensionModal({
                open: true,
                hall: bookingDetailsModal.hall,
                roomNo: bookingDetailsModal.room.roomNo,
                booking,
              });
            }}
            onCancel={(payload) => {
              setBookingDetailsModal(null);
              setTimeout(() => {
                setCancelModal({
                  hall: payload.hall,
                  room: payload.room,
                  booking: payload.booking,
                  remarksText: "",
                });
              }, 100);
            }}
          />
        )}
      </AnimatePresence>

      {cancelModal && (
        <HallCancelModal
          key={`cancel-${cancelModal.booking?.id || Date.now()}`}
          modal={cancelModal}
          remarksText={cancelModal.remarksText || ""}
          setRemarksText={(val) =>
            setCancelModal((prev) => {
              if (!prev) return null;
              return { ...prev, remarksText: val };
            })
          }
          onClose={() => {
            setCancelModal(null);
            setBookingDetailsModal(null);
            setBookingListModal(null);
          }}
          onDone={(remarks) => bookingHandlers.onCancelDone(remarks, cancelModal)}
        />
      )}
    </div>
  );
}