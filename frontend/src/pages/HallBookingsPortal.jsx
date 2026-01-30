// src/pages/HallBookingsPortal.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";

// Component Imports
import HallBookingsLayout from "../components/HallBookings/HallBookingsLayout";
import HallGrid from "../components/HallBookings/HallGrid";
import SelectionFooter from "../components/AllHostels/SelectionFooter";
import FilterModal from "../components/AllHostels/FilterModal";
import VacantRoomsModal from "../components/HallBookings/VacantRoomsModal";
import HallBookingModal from "../components/HallBookings/HallBookingModal";
import BookingListModal from "../components/HallBookings/BookingListModal";
import BookingDetailsModal from "../components/HallBookings/BookingDetailsModal";
import CancelModal from "../components/CancelModal";
import HallExtensionModal from "../components/HallBookings/HallExtensionModal";

// Custom Hooks
import useHallBookingHandlers from "../hooks/useHallBookingHandlers";
import useHallVacancyCheck from "../hooks/useHallVacancyCheck";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;

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
            console.log(`⭐️ Hall filter: Removing ${booking.status} booking:`, {
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
  setHallData,
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

  const suppressToastRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Filter and stabilize data
  const filteredHallData = useMemo(() => {
    console.log("🔍 Applying frontend safety filter to hallData");
    return filterActiveBookingsFromHallData(hallData);
  }, [hallData]);

  const stableHallData = useMemo(() => {
    return filteredHallData;
  }, [JSON.stringify(filteredHallData)]);

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
    // setHallData, // ❌ REMOVED - not needed, polling hook handles updates
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

  const onDoneSelection = () => {
    if (selectedRooms.length === 0) {
      showToast("⚠️ Please select at least one hall room", "warning");
      return;
    }
    
    setHallBookingModal(true);
  };

  const openDirectBookingForVacant = ({ hall, room }) => {
    setSelectedRooms([{ hall, roomNo: room.roomNo }]);
    setHallBookingModal(true);
    setVacantRooms([]);
  };

  return (
    <HallBookingsLayout theme={theme} onBackHome={onBackHome}>
      {/* Add Booking Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            setSelectionMode(true);
            setSelectedRooms([]);
            setBookingCompleted(false);
            showToast("✅ Select hall rooms for booking", "info");
          }}
          className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all font-semibold flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Booking
        </button>
      </div>

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

      {/* Selection Footer */}
      {selectionMode && 
       !hallBookingModal && 
       !bookingCompleted && 
       selectedRooms.length > 0 && (
        <SelectionFooter
          selectedCount={selectedRooms.length}
          onDone={onDoneSelection}
        />
      )}

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
        <CancelModal
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

      {/* Floating Filter Button */}
      <button
        onClick={() => setFilterModal(true)}
        className="fixed bottom-6 left-6 bg-red-600 text-white p-4 rounded-full shadow-2xl hover:bg-red-700 transition-all hover:scale-110 z-40"
        aria-label="Filter vacant rooms"
        title="Check vacancy by date range"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
      </button>
    </HallBookingsLayout>
  );
}