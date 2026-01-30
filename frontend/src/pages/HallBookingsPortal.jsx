// src/pages/HallBookingsPortal.jsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";
import * as XLSX from 'xlsx';

// Component Imports
import HallBookingsLayout from "../components/HallBookings/HallBookingsLayout";
import HallGrid from "../components/HallBookings/HallGrid";
import SelectionFooter from "../components/AllHostels/SelectionFooter";
import FilterModal from "../components/AllHostels/FilterModal";
import VacantRoomsModal from "../components/HallBookings/VacantRoomsModal";
import HallBookingModal from "../components/HallBookings/HallBookingModal";
import BookingListModal from "../components/HallBookings/BookingListModal";
import HallBookingDetailsModal from "../components/HallBookings/HallBookingDetailsModal";
import CancelModal from "../components/CancelModal";
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

  // Download all bookings data
  const handleDownloadData = () => {
    try {
      const allBookings = [];
      
      Object.entries(stableHallData).forEach(([hallName, hallInfo]) => {
        (hallInfo.rooms || []).forEach(room => {
          (room.bookings || []).forEach(booking => {
            allBookings.push({
              "Hall": hallName,
              "Room": room.roomNo,
              "Name": booking.name || "—",
              "Society": booking.societyName || "—",
              "Event": booking.eventName || "—",
              "Contact": booking.contact || "—",
              "Email": booking.email || "—",
              "Check-in Date": booking.checkInDate || booking.from || "—",
              "Check-in Time": booking.checkInTime || "—",
              "Check-out Date": booking.checkOutDate || booking.to || "—",
              "Check-out Time": booking.checkOutTime || "—",
              "Status": booking.status || "—",
              "Purpose": booking.purpose || "—",
              "Description": booking.description || "—",
            });
          });
        });
      });

      if (allBookings.length === 0) {
        showToast("⚠️ No bookings to download", "warning");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(allBookings);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Hall Bookings");

      // Auto-size columns
      const maxWidth = 30;
      const colWidths = Object.keys(allBookings[0] || {}).map(key => ({
        wch: Math.min(
          maxWidth,
          Math.max(
            key.length,
            ...allBookings.map(row => String(row[key] || "").length)
          )
        )
      }));
      worksheet['!cols'] = colWidths;

      const fileName = `All_Hall_Bookings_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      showToast("✅ Data downloaded successfully", "success");
    } catch (error) {
      console.error("❌ Download error:", error);
      showToast("❌ Failed to download data", "error");
    }
  };

  return (
    <HallBookingsLayout 
      theme={theme} 
      onBackHome={onBackHome}
      onSearchClick={() => setSearchFilterModal(true)}
      onFilterClick={() => setFilterModal(true)}
      onDownloadClick={handleDownloadData}
      onAddBooking={handleAddBooking}
    >
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
          <HallBookingDetailsModal
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
    </HallBookingsLayout>
  );
}