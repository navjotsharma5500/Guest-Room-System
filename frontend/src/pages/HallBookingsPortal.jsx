// src/pages/HallBookingsPortal.jsx - Glassmorphism Version
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "../context/ToastContext";
import { Filter, Search, Home, Calendar, Sparkles } from "lucide-react";

// Component Imports
import HallGrid from "../components/HallBookings/HallGrid";
import SelectionFooter from "../components/AllHostels/SelectionFooter";
import FilterModal from "../components/HallBookings/HallFilterModal";
import VacantRoomsModal from "../components/HallBookings/VacantRoomsModal";
import HallBookingModal from "../components/HallBookings/HallBookingModal";
import BookingListModal from "../components/HallBookings/BookingListModal";
import BookingDetailsModal from "../components/HallBookings/BookingDetailsModal";
import HallCancelModal from "../components/HallBookings/HallCancelModal";
import HallExtensionModal from "../components/HallBookings/HallExtensionModal";
import SearchFilterModal from "../components/HallBookings/SearchFilterModal";

// Custom Hooks
import useHallBookingHandlers from "../hooks/useHallBookingHandlers";
import useHallVacancyCheck from "../hooks/useHallVacancyCheck";

// Filter active bookings
const filterActiveBookingsFromHallData = (hallData) => {
  if (!hallData || typeof hallData !== 'object') {
    return hallData;
  }

  const validStatuses = ["booked", "checked_in"];
  
  const filtered = {};
  
  Object.keys(hallData).forEach(hallName => {
    const hall = hallData[hallName];
    
    if (!hall || !hall.rooms) {
      filtered[hallName] = hall;
      return;
    }

    filtered[hallName] = {
      ...hall,
      rooms: hall.rooms.map(room => ({
        ...room,
        bookings: (room.bookings || []).filter(booking => {
          const isValid = validStatuses.includes(booking.status);
          
          if (!isValid) {
            console.log(`🗑️ Hall filter: Removing ${booking.status} booking:`, {
              name: booking.name,
              room: room.roomNo,
              hall: hallName
            });
          }
          
          return isValid;
        })
      }))
    };
  });

  return filtered;
};

export default function HallBookingsPortalGlass({
  hallData = {},
  setHallData = () => {}, 
  theme,
  onBackHome,
}) {
  const { showToast } = useToast();

  // State Management
  const [filterModal, setFilterModal] = useState(false);
  const [vacantRooms, setVacantRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [cancelModal, setCancelModal] = useState(null);
  const [extensionModal, setExtensionModal] = useState(null);
  const [hallBookingModal, setHallBookingModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [bookingListModal, setBookingListModal] = useState(null);
  const [bookingDetailsModal, setBookingDetailsModal] = useState(null);
  const [searchFilterModal, setSearchFilterModal] = useState(false);

  const suppressToastRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Filter and stabilize data
  const filteredHallData = useMemo(() => {
    console.log("🔍 Applying frontend safety filter to hallData");
    return filterActiveBookingsFromHallData(hallData);
  }, [hallData]);

  const stableHallData = useMemo(() => {
    return filteredHallData;
  }, [filteredHallData]);

  // Memoize callbacks
  const stableSetSelectedRooms = useCallback(setSelectedRooms, []);
  const stableSetHallBookingModal = useCallback(setHallBookingModal, []);
  const stableSetSelectionMode = useCallback(setSelectionMode, []);
  const stableSetBookingCompleted = useCallback(setBookingCompleted, []);
  const stableSetBookingDetailsModal = useCallback(setBookingDetailsModal, []);
  const stableSetBookingListModal = useCallback(setBookingListModal, []);
  const stableSetCancelModal = useCallback(setCancelModal, []);
  const stableSetExtensionModal = useCallback(setExtensionModal, []);
  const stableSetVacantRooms = useCallback(setVacantRooms, []);
  const stableSetFilterModal = useCallback(setFilterModal, []);

  // Custom Hooks
  const bookingHandlers = useHallBookingHandlers({
    hallData: stableHallData,
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

  const { handleExtendBooking } = bookingHandlers;

  const vacancyHandlers = useHallVacancyCheck({
    hallData: stableHallData,
    checkIn,
    checkOut,
    selectedRooms,
    setSelectedRooms: stableSetSelectedRooms,
    setVacantRooms: stableSetVacantRooms,
    setFilterModal: stableSetFilterModal,
    showToast,
  });

  useEffect(() => {
    if (!hasInitializedRef.current) {
      console.log("🚀 HallBookingsPortalGlass initialized");
      hasInitializedRef.current = true;
    }
  }, []);

  // Listen for booking completion
  useEffect(() => {
    const handleBookingComplete = () => {
      console.log("📋 Hall booking completed");
      
      setSelectionMode(false);
      setSelectedRooms([]);
      setHallBookingModal(false);
      setBookingCompleted(true);
      
      setTimeout(() => {
        setBookingCompleted(false);
      }, 1000);
    };

    window.addEventListener("hallBookingCompleted", handleBookingComplete);
    
    return () => {
      window.removeEventListener("hallBookingCompleted", handleBookingComplete);
    };
  }, []);

  // Auto-exit selection mode
  useEffect(() => {
    if (bookingCompleted) {
      const timer = setTimeout(() => {
        setBookingCompleted(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [bookingCompleted]);

  // Handle Add Booking button click
  const handleAddBooking = () => {
    console.log("📅 Add Booking clicked - entering selection mode");
    setSelectionMode(true);
    setSelectedRooms([]);
    setBookingCompleted(false);
    showToast("✅ Select hall rooms for booking (checkboxes enabled)", "info");
  };

  // Handle Done Selection
  const onDoneSelection = () => {
    if (selectedRooms.length === 0) {
      showToast("⚠️ Please select at least one hall room", "warning");
      return;
    }
    
    console.log("✅ Done selection - opening booking modal with rooms:", selectedRooms);
    setHallBookingModal(true);
  };

  // Open direct booking for vacant room
  const openDirectBookingForVacant = ({ hall, room }) => {
    setSelectedRooms([{ hall, roomNo: room.roomNo }]);
    setHallBookingModal(true);
    setVacantRooms([]);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Glassmorphism Background with Animated Blobs */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-white to-orange-50" />
        
        {/* Animated Background Blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-red-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-orange-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000" />
      </div>

      {/* Glassmorphism Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 mx-6 mt-6 mb-6"
      >
        <div className="glassmorphism-card rounded-2xl px-6 py-4 shadow-xl border-2 border-white/40">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Sparkles className="w-8 h-8 text-red-600" />
              <h2 className="text-2xl font-bold gradient-text">
                Hall Booking Portal
              </h2>
            </div>
            
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 10px 30px rgba(220, 38, 38, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddBooking}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                <Calendar size={18} />
                Add Booking
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onBackHome}
                className="flex items-center gap-2 px-4 py-2.5 glassmorphism-card border-2 border-red-400/50 text-red-700 hover:bg-red-50/50 rounded-xl shadow transition"
              >
                <Home size={18} />
                Back
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="px-6 pb-20">
        {/* Hall Grid */}
        <HallGrid
          hallData={stableHallData}
          theme={theme}
          selectedRooms={selectedRooms}
          toggleRoomSelect={vacancyHandlers.toggleRoomSelect}
          selectionMode={selectionMode}
          hallBookingModal={hallBookingModal}
          bookingCompleted={bookingCompleted}
          onRoomClick={bookingHandlers.onRoomClick}
          showToast={showToast}
        />

        {/* Selection Footer - Shows when in selection mode */}
        {selectionMode && 
        !hallBookingModal && 
        !bookingCompleted && 
        selectedRooms.length > 0 && (
          <SelectionFooter
            selectedCount={selectedRooms.length}
            onDone={onDoneSelection}
          />
        )}

        {/* Floating Action Buttons - Bottom Right with Glassmorphism */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-40">
          {/* Search Button */}
          <motion.button
            whileHover={{ 
              scale: 1.1, 
              boxShadow: "0 15px 40px rgba(59, 130, 246, 0.5)" 
            }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setSearchFilterModal(true)}
            className="glassmorphism-card p-4 rounded-full shadow-2xl transition-all bg-gradient-to-br from-blue-500/90 to-blue-600/90 text-white border-2 border-white/40"
            title="Search Bookings"
          >
            <Search size={24} />
          </motion.button>

          {/* Filter Button */}
          <motion.button
            whileHover={{ 
              scale: 1.1, 
              boxShadow: "0 15px 40px rgba(220, 38, 38, 0.5)" 
            }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setFilterModal(true)}
            className="glassmorphism-card p-4 rounded-full shadow-2xl transition-all bg-gradient-to-br from-red-500/90 to-red-600/90 text-white border-2 border-white/40 pulse-glow"
            title="Filter by Date Range (Check Vacancy)"
          >
            <Filter size={24} />
          </motion.button>
        </div>

        {/* Modals */}
        <AnimatePresence mode="wait">
          {filterModal && (
            <FilterModal
              theme={theme}
              checkIn={checkIn}
              checkOut={checkOut}
              setCheckIn={setCheckIn}
              setCheckOut={setCheckOut}
              onClose={() => setFilterModal(false)}
              onSubmit={vacancyHandlers.handleFilterSubmit}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {searchFilterModal && (
            <SearchFilterModal
              theme={theme}
              hallData={stableHallData}
              onClose={() => setSearchFilterModal(false)}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {vacantRooms && vacantRooms.length > 0 && (
            <VacantRoomsModal
              theme={theme}
              vacantRooms={vacantRooms}
              onClose={() => setVacantRooms([])}
              onBookRoom={openDirectBookingForVacant}
            />
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {hallBookingModal && (
            <HallBookingModal
              theme={theme}
              selectedRooms={selectedRooms}
              checkIn={checkIn}
              checkOut={checkOut}
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
              onClose={() => setBookingDetailsModal(null)}
              onExtend={() => {
                const booking = bookingDetailsModal.booking;
                setExtensionModal({
                  hall: bookingDetailsModal.hall,
                  roomNo: bookingDetailsModal.room.roomNo,
                  booking: {
                    ...booking,
                    _originalTo: booking.to,
                  },
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
            key={`cancel-${cancelModal.booking?.id || cancelModal.booking?._id || Date.now()}`}
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

        <AnimatePresence mode="wait">
          {extensionModal && (
            <HallExtensionModal
              modal={extensionModal}
              onClose={() => setExtensionModal(null)}
              onExtend={handleExtendBooking}
              theme={theme}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}