// src/pages/HallBookingsPortal.jsx - GOOGLE MATERIAL DESIGN 3
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToast } from "../context/ToastContext";
import { Filter, Search, Home, Calendar, X } from "lucide-react";

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

export default function HallBookingsPortal({
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
      console.log("🚀 HallBookingsPortal initialized");
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
    showToast("✅ Selection mode enabled - Click rooms to select", "info");
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

  // Handle direct booking via + button
  const handleDirectBook = (hallName, room) => {
    console.log("➕ Direct booking for:", hallName, room.roomNo);
    setSelectedRooms([{ hall: hallName, roomNo: room.roomNo }]);
    setSelectionMode(false);
    setHallBookingModal(true);
  };

  // Open direct booking for vacant room
  const openDirectBookingForVacant = ({ hall, room }) => {
    setSelectedRooms([{ hall, roomNo: room.roomNo }]);
    setHallBookingModal(true);
    setVacantRooms([]);
  };

  // Handle booking list selection
  const handleSelectBookingFromList = useCallback((booking) => {
    console.log("📋 Selected booking from list:", booking);
    setBookingListModal(null);
    setBookingDetailsModal({
      hall: bookingListModal?.hall,
      room: bookingListModal?.room,
      booking: booking
    });
  }, [bookingListModal]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === "dark" ? "bg-[#202124]" : "bg-[#f8f9fa]"
    }`}>
      {/* Google Design Header */}
      <header className={`
        sticky top-0 z-30 border-b transition-colors duration-200
        ${theme === "dark"
          ? "bg-[#292a2d] border-[#3c4043]"
          : "bg-white border-[#dadce0]"
        }
      `}>
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <h1 className={`text-xl font-normal ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}>
                Hall Booking Portal
              </h1>
              
              {selectionMode && (
                <span className={`
                  px-3 py-1 rounded-full text-xs font-medium
                  ${theme === "dark"
                    ? "bg-[#8ab4f8]/20 text-[#8ab4f8]"
                    : "bg-[#d3e3fd] text-[#1967d2]"
                  }
                `}>
                  Selection Mode
                </span>
              )}
            </div>
            
            {/* Right Section */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={handleAddBooking}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
                  transition-colors duration-200
                  ${theme === "dark"
                    ? "bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124]"
                    : "bg-[#1a73e8] hover:bg-[#1967d2] text-white"
                  }
                `}
              >
                <Calendar size={16} />
                <span>Add Booking</span>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={onBackHome}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium 
                  transition-colors duration-200
                  ${theme === "dark"
                    ? "bg-[#3c4043] hover:bg-[#4a4d50] text-[#e8eaed]"
                    : "bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124]"
                  }
                `}
              >
                <Home size={16} />
                <span>Back</span>
              </motion.button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        {/* Hall Grid */}
        <HallGrid
          hallData={stableHallData}
          theme={theme}
          selectedRooms={selectedRooms}
          toggleRoomSelect={vacancyHandlers.toggleRoomSelect}
          selectionMode={selectionMode}
          onRoomClick={bookingHandlers.onRoomClick}
          onDirectBook={handleDirectBook}
          showToast={showToast}
        />

        {/* Selection Footer */}
        {selectionMode && selectedRooms.length > 0 && (
          <SelectionFooter
            selectedCount={selectedRooms.length}
            onDone={onDoneSelection}
          />
        )}
      </main>

      {/* Floating Action Buttons - Google Style */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-40">
        {/* Search Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setSearchFilterModal(true)}
          className={`
            p-4 rounded-full shadow-lg transition-all duration-200
            ${theme === "dark"
              ? "bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124]"
              : "bg-[#1a73e8] hover:bg-[#1967d2] text-white"
            }
          `}
          title="Search Bookings"
        >
          <Search size={20} />
        </motion.button>

        {/* Filter Button */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setFilterModal(true)}
          className={`
            p-4 rounded-full shadow-lg transition-all duration-200
            ${theme === "dark"
              ? "bg-[#81c995] hover:bg-[#a8dab5] text-[#202124]"
              : "bg-[#137333] hover:bg-[#0d652d] text-white"
            }
          `}
          title="Filter by Date"
        >
          <Filter size={20} />
        </motion.button>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {filterModal && (
          <FilterModal
            theme={theme}
            onClose={() => setFilterModal(false)}
            checkIn={checkIn}
            checkOut={checkOut}
            setCheckIn={setCheckIn}
            setCheckOut={setCheckOut}
            onSubmit={vacancyHandlers.handleFilterSubmit}
          />
        )}

        {vacantRooms.length > 0 && (
          <VacantRoomsModal
            vacantRooms={vacantRooms}
            onClose={() => setVacantRooms([])}
            onBook={openDirectBookingForVacant}
            theme={theme}
          />
        )}

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
            onSelectBooking={handleSelectBookingFromList}
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

        {extensionModal && (
          <HallExtensionModal
            theme={theme}
            modal={extensionModal}
            onClose={() => setExtensionModal(null)}
            onSubmit={handleExtendBooking}
          />
        )}

        {searchFilterModal && (
          <SearchFilterModal
            theme={theme}
            hallData={stableHallData}
            onClose={() => setSearchFilterModal(false)}
            onSelectBooking={(booking) => {
              setBookingDetailsModal({
                hall: booking.hall,
                room: { roomNo: booking.roomNo },
                booking: booking
              });
              setSearchFilterModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}