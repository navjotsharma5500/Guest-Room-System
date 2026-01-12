// src/pages/AllHostelsPortal.jsx - NO INDEPENDENT FETCHING
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";

// Component Imports
import AllHostelsLayout from "../components/AllHostels/AllHostelsLayout";
import HostelGrid from "../components/AllHostels/HostelGrid";
import SelectionFooter from "../components/AllHostels/SelectionFooter";
import FilterModal from "../components/AllHostels/FilterModal";
import VacantRoomsModal from "../components/AllHostels/VacantRoomsModal";
import ConsolidatedBookingModal from "../components/AllHostels/ConsolidatedBookingModal";
import BookingListModal from "../components/AllHostels/BookingListModal";
import BookingDetailsModal from "../components/AllHostels/BookingDetailsModal";
import DirectBookingModal from "../components/DirectBookingModal";
import CancelModal from "../components/CancelModal";
import ExtensionModal from "../components/ExtensionModal";

// Custom Hooks
import useBookingHandlers from "../hooks/useBookingHandlers";
import useVacancyCheck from "../hooks/useVacancyCheck";
import { BACKEND_URL } from '../utils/apiConfig';

const API = BACKEND_URL;

const filterActiveBookingsFromHostelData = (hostelData) => {
  if (!hostelData || typeof hostelData !== 'object') {
    return hostelData;
  }

  const activeStatuses = ["booked", "checked_in"]; // Only these are active
  
  const filtered = {};
  
  Object.keys(hostelData).forEach(hostelName => {
    const hostel = hostelData[hostelName];
    
    if (!hostel || !hostel.rooms) {
      filtered[hostelName] = hostel;
      return;
    }

    // Deep clone to avoid mutating original
    filtered[hostelName] = {
      ...hostel,
      rooms: hostel.rooms.map(room => ({
        ...room,
        bookings: (room.bookings || []).filter(booking => {
          const isActive = activeStatuses.includes(booking.status);
          
          if (!isActive) {
            console.log(`⏭️ Frontend filter: Removing ${booking.status} booking:`, {
              guest: booking.guest,
              room: room.roomNo,
              hostel: hostelName
            });
          }
          
          return isActive;
        })
      }))
    };
  });

  return filtered;
};

export default function AllHostelsPortal({
  hostelData = {},
  setHostelData,
  prefillGuest,
  theme,
  onBackHome,
  handleStartDirectBooking,
}) {
  const { showToast } = useToast();

  // State Management
  const [filterModal, setFilterModal] = useState(false);
  const [vacantRooms, setVacantRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [directBookingModal, setDirectBookingModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [extensionModal, setExtensionModal] = useState(null);
  const [consolidateModal, setConsolidateModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [bookingCompleted, setBookingCompleted] = useState(false);
  const [bookingListModal, setBookingListModal] = useState(null);
  const [bookingDetailsModal, setBookingDetailsModal] = useState(null);

  const suppressToastRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // ✅ FILTER STEP: Apply safety filter to incoming data
  const filteredHostelData = useMemo(() => {
    console.log("🔍 Applying frontend safety filter to hostelData");
    return filterActiveBookingsFromHostelData(hostelData);
  }, [hostelData]);

  // ✅ STABLE: Memoize hostelData to prevent re-render cascade
  const stableHostelData = useMemo(() => {
    return filteredHostelData;
  }, [JSON.stringify(filteredHostelData)]);

  // ✅ Memoize callbacks to prevent re-creating functions
  const stableSetSelectedRooms = useCallback(setSelectedRooms, []);
  const stableSetConsolidateModal = useCallback(setConsolidateModal, []);
  const stableSetSelectionMode = useCallback(setSelectionMode, []);
  const stableSetBookingCompleted = useCallback(setBookingCompleted, []);
  const stableSetBookingDetailsModal = useCallback(setBookingDetailsModal, []);
  const stableSetBookingListModal = useCallback(setBookingListModal, []);
  const stableSetCancelModal = useCallback(setCancelModal, []);
  const stableSetDirectBookingModal = useCallback(setDirectBookingModal, []);
  const stableSetExtensionModal = useCallback(setExtensionModal, []);
  const stableSetVacantRooms = useCallback(setVacantRooms, []);
  const stableSetFilterModal = useCallback(setFilterModal, []);

  // Custom Hooks - Use stable references
  const bookingHandlers = useBookingHandlers({
    hostelData: stableHostelData, 
    setHostelData,
    prefillGuest,
    selectedRooms,
    showToast,
    setSelectedRooms: stableSetSelectedRooms,
    setConsolidateModal: stableSetConsolidateModal,
    setSelectionMode: stableSetSelectionMode,
    setBookingCompleted: stableSetBookingCompleted,
    setBookingDetailsModal: stableSetBookingDetailsModal,
    setBookingListModal: stableSetBookingListModal,
    setCancelModal: stableSetCancelModal,
    setDirectBookingModal: stableSetDirectBookingModal,
    setExtensionModal: stableSetExtensionModal,
  });

  const { handleExtendBooking } = bookingHandlers;

  const vacancyHandlers = useVacancyCheck({
    hostelData: stableHostelData, 
    checkIn,
    checkOut,
    selectedRooms,
    setSelectedRooms: stableSetSelectedRooms,
    setVacantRooms: stableSetVacantRooms,
    setFilterModal: stableSetFilterModal,
    showToast,
  });

  // ✅ NO MORE FETCHING - Data comes from parent (GuestRoomDashboard)
  // Parent already handles Socket.IO + polling via useHostelDataPolling
  
  useEffect(() => {
    if (!hasInitializedRef.current) {
      console.log("🚀 AllHostelsPortal initialized - using parent data");
      hasInitializedRef.current = true;
    }
  }, []);

  // ✅ Handle prefillGuest (NO fetch trigger)
  useEffect(() => {
    if (prefillGuest && prefillGuest.from && prefillGuest.to) {
      console.log("✅ PrefillGuest detected - activating selection mode");
      
      setSelectionMode(true);
      setBookingCompleted(false);
      setSelectedRooms([]);
      setConsolidateModal(false);
      setDirectBookingModal(null);
      setBookingDetailsModal(null);
      setBookingListModal(null);
      
      if (!suppressToastRef.current) {
        showToast("✅ Select guest rooms for booking", "info");
        suppressToastRef.current = true;
        setTimeout(() => {
          suppressToastRef.current = false;
        }, 3000);
      }
    }
  }, [prefillGuest?.from, prefillGuest?.to, showToast]);

  // ✅ Listen for booking completion from other components
  useEffect(() => {
    const handleBookingComplete = () => {
      console.log("📢 Booking completed");
      
      setSelectionMode(false);
      setSelectedRooms([]);
      setConsolidateModal(false);
      setBookingCompleted(true);
      
      // Parent will handle data refresh via Socket.IO
      setTimeout(() => {
        setBookingCompleted(false);
      }, 1000);
    };

    window.addEventListener("bookingCompleted", handleBookingComplete);
    
    return () => {
      window.removeEventListener("bookingCompleted", handleBookingComplete);
    };
  }, []);

  // ✅ Auto-exit selection mode
  useEffect(() => {
    if (bookingCompleted) {
      const timer = setTimeout(() => {
        setBookingCompleted(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [bookingCompleted]);

  // ✅ Memoize handlers to prevent re-creating functions
  const openDirectBookingForVacant = useCallback(({ hostel, room, prefill = null }) => {
    setDirectBookingModal({ open: true, hostel, room, prefill });
  }, []);

  const onDoneSelection = useCallback(() => {
    if (!selectedRooms || selectedRooms.length === 0) {
      showToast("⚠️ Select at least one room.", "warning");
      return;
    }
    setConsolidateModal(true);
  }, [selectedRooms, showToast]);

  const handleDirectBookingClick = useCallback((hostel, room) => {
    setDirectBookingModal({
      open: true,
      hostel,
      room,
      prefill: null,
    });
  }, []);

  const handleHomeClick = useCallback(() => {
    setSelectionMode(false);
    setSelectedRooms([]);
    try {
      localStorage.removeItem("lastApprovedGuest");
      window.dispatchEvent(new Event("lastApprovedGuestCleared"));
    } catch (err) {
      console.warn("Failed to clear lastApprovedGuest:", err);
    }
    onBackHome && onBackHome();
  }, [onBackHome]);

  const handleRoomCardClick = useCallback((hostel, room, bookedAny) => {
    console.log("🎯 Room card clicked:", { hostel, roomNo: room.roomNo, bookedAny });
    
    if (selectionMode && prefillGuest && prefillGuest.from && prefillGuest.to) {
      // In selection mode - toggle room selection
      vacancyHandlers.toggleRoomSelect(hostel, room.roomNo);
      return;
    }
    
    if (bookedAny) {
      // ✅ CRITICAL FIX: Pass bookingHandlers object correctly
      if (bookingHandlers && typeof bookingHandlers.handleBookedRoomClick === 'function') {
        bookingHandlers.handleBookedRoomClick(hostel, room);
      } else {
        console.error("❌ bookingHandlers.handleBookedRoomClick is not available");
        showToast("⚠️ Cannot open booking details", "error");
      }
    } else {
      // Empty room - open direct booking modal
      openDirectBookingForVacant({ hostel, room, prefill: null });
    }
  }, [selectionMode, prefillGuest, vacancyHandlers, bookingHandlers, openDirectBookingForVacant, showToast]);

  // ✅ Check if data is empty
  const hasData = Object.keys(stableHostelData).length > 0;

  // ✅ Filter out deactivated hostels for display
  const activeHostelData = useMemo(() => {
    const filtered = {};
    Object.keys(stableHostelData).forEach(hostelName => {
      const hostel = stableHostelData[hostelName];
      // Only show active hostels (or if active field is missing, show by default)
      if (hostel?.active !== false) {
        filtered[hostelName] = hostel;
      }
    });
    return filtered;
  }, [stableHostelData]);

  // ✅ Show simple message if no data (parent is loading)
  if (!hasData) {
    return (
      <AllHostelsLayout theme={theme} onBackHome={handleHomeClick}>
        <HostelGrid
          hostelData={stableHostelData} 
          theme={theme}
          selectedRooms={selectedRooms}
          toggleRoomSelect={vacancyHandlers.toggleRoomSelect}
          selectionMode={selectionMode}
          consolidateModal={consolidateModal}
          bookingCompleted={bookingCompleted}
          prefillGuest={prefillGuest}
          onRoomClick={handleRoomCardClick}
          onDirectBooking={handleDirectBookingClick}
          showToast={showToast}
        />
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-red-200 border-t-red-600 rounded-full animate-spin"></div>
          </div>
          <div className="text-center">
            <h3 className={`text-xl font-semibold mb-2 ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>
              Loading Hostels & Rooms...
            </h3>
            <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Fetching latest data from server
            </p>
          </div>
        </div>
      </AllHostelsLayout>
    );
  }

  return (
    <AllHostelsLayout theme={theme} onBackHome={handleHomeClick}>
      {/* Main Grid */}
      <HostelGrid
        hostelData={stableHostelData}
        theme={theme}
        selectedRooms={selectedRooms}
        toggleRoomSelect={vacancyHandlers.toggleRoomSelect}
        selectionMode={selectionMode}
        consolidateModal={consolidateModal}
        bookingCompleted={bookingCompleted}
        prefillGuest={prefillGuest}
        onRoomClick={handleRoomCardClick}
        onDirectBooking={handleDirectBookingClick}
        showToast={showToast}
      />

      {/* Selection Footer */}
      {selectionMode && 
       !consolidateModal && 
       !bookingCompleted && 
       selectedRooms.length > 0 && 
       prefillGuest && 
       prefillGuest.from && 
       prefillGuest.to && (
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
        {consolidateModal && (
          <ConsolidatedBookingModal
            theme={theme}
            prefillGuest={prefillGuest}
            selectedRooms={selectedRooms}
            checkIn={checkIn}
            checkOut={checkOut}
            onClose={() => setConsolidateModal(false)}
            onSubmit={bookingHandlers.handleConsolidatedBooking}
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
                hostel: bookingListModal.hostel,
                room: bookingListModal.room,
                booking,
              });
            }}

            onAddNewBooking={() => {
              openDirectBookingForVacant({
                hostel: bookingListModal.hostel,
                room: bookingListModal.room,
                prefill: null,
              });
              setBookingListModal(null);
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
                hostel: bookingDetailsModal.hostel,
                roomNo: bookingDetailsModal.room.roomNo,
                booking: {
                  ...booking,
                  _originalTo: booking.to, // snapshot original checkout
                },
              });
            }}

            onCancel={(payload) => {
              setBookingDetailsModal(null);

              setTimeout(() => {
                setCancelModal({
                  hostel: payload.hostel,
                  room: payload.room,
                  booking: payload.booking,
                  remarksText: "",
                });
              }, 100);
            }}

            onAddNewBooking={() => {
              openDirectBookingForVacant({
                hostel: bookingDetailsModal.hostel,
                room: bookingDetailsModal.room,
              });
            }}
          />
        )}
      </AnimatePresence>

      {directBookingModal && directBookingModal.open && (
        <DirectBookingModal
          modal={directBookingModal}
          onClose={() => setDirectBookingModal(null)}
          onSubmit={(b) => bookingHandlers.onDirectBookingSubmit(directBookingModal, b)}
        />
      )}

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
          <ExtensionModal
            modal={extensionModal}
            onClose={() => setExtensionModal(null)}
            onExtend={handleExtendBooking}
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
    </AllHostelsLayout>
  );
}