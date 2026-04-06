import React, { useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Filter, Search, Calendar, RefreshCw, Download } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { isDailySlotOverlapping } from "../utils/dateUtils";

import VenueGrid from "../components/VenueBookings/VenueGrid";
import SelectionFooter from "../components/AllHostels/SelectionFooter";
import VenueFilterModal from "../components/VenueBookings/VenueFilterModal";
import VenueVacantRoomsModal from "../components/VenueBookings/VenueVacantRoomsModal";
import VenueBookingModal from "../components/VenueBookings/VenueBookingModal";
import VenueBookingListModal from "../components/VenueBookings/VenueBookingListModal";
import VenueBookingDetailsModal from "../components/VenueBookings/VenueBookingDetailsModal";
import VenueCancelModal from "../components/VenueBookings/VenueCancelModal";
import VenueExtensionModal from "../components/VenueBookings/VenueExtensionModal";
import VenueSearchFilterModal from "../components/VenueBookings/VenueSearchFilterModal";
import VenueDownloadModal from "../components/VenueBookings/VenueDownloadModal/VenueDownloadModal";

import useVenueBookingHandlers from "../hooks/useVenueBookingHandlers";
import useVenueVacancyCheck from "../hooks/useVenueVacancyCheck";

const filterActiveBookingsFromVenueData = (venueData) => {
  if (!venueData || typeof venueData !== "object") return venueData;

  const validStatuses = ["booked", "checked_in"];
  const filtered = {};
  const now = new Date(); // To check for past bookings

  Object.keys(venueData).forEach((venueName) => {
    const venue = venueData[venueName];
    if (!venue?.rooms) {
      filtered[venueName] = venue;
      return;
    }

    filtered[venueName] = {
      ...venue,
      rooms: venue.rooms.map((room) => ({
        ...room,
        bookings: (room.bookings || []).filter((booking) => {
           // 1. Must be active status
           if (!validStatuses.includes(booking.status)) return false;

           // 2. Must NOT be in the past (Client-side expiration check)
           // If backend cron hasn't run yet, we hide it from grid visually.
           const checkoutDate = booking.checkOutDate;
           const checkoutTime = booking.checkOutTime || "23:59";
           const checkoutDateTime = new Date(`${checkoutDate}T${checkoutTime}`);
           
           return checkoutDateTime >= now;
        }),
      })),
    };
  });

  return filtered;
};

export default function VenueBookingsPortal({ venueData = {}, theme, onRefresh, currentUser }) {
  const { showToast } = useToast();

  const [filterModal, setFilterModal] = useState(false);
  const [vacantRooms, setVacantRooms] = useState([]);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [dailyStart, setDailyStart] = useState("");
  const [dailyEnd, setDailyEnd] = useState("");
  const [cancelModal, setCancelModal] = useState(null);
  const [extensionModal, setExtensionModal] = useState(null);
  const [bookingModal, setBookingModal] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [bookingListModal, setBookingListModal] = useState(null);
  const [bookingDetailsModal, setBookingDetailsModal] = useState(null);
  const [searchFilterModal, setSearchFilterModal] = useState(false);
  const [downloadModal, setDownloadModal] = useState(false);
  const [remarksText, setRemarksText] = useState("");
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [approvedEnquiry, setApprovedEnquiry] = useState(null);

  const stableVenueData = useMemo(() => filterActiveBookingsFromVenueData(venueData), [venueData]);

  // For CSV Download: We need ALL data (including cancelled/rejected/completed)
  // but stableVenueData filters them out for the UI.
  // So we pass raw venueData to the Download Modal.
  const rawVenueData = useMemo(() => venueData, [venueData]);

  useEffect(() => {
    setLastUpdated(new Date());
  }, [venueData]);

  useEffect(() => {
    const hydrateApprovedEnquiry = () => {
      try {
        const raw = localStorage.getItem("lastApprovedVenueEnquiry");
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.enquiryId) {
          setApprovedEnquiry(parsed);
          setSelectionMode(true);
          showToast("Approved enquiry loaded. Select rooms and click Done.", "info");
        } else {
          setApprovedEnquiry(null);
        }
      } catch {
        setApprovedEnquiry(null);
      }
    };

    hydrateApprovedEnquiry();
    window.addEventListener("lastApprovedVenueEnquiryChanged", hydrateApprovedEnquiry);
    return () => window.removeEventListener("lastApprovedVenueEnquiryChanged", hydrateApprovedEnquiry);
  }, [showToast]);

  const clearApprovedEnquiry = useCallback(() => {
    localStorage.removeItem("lastApprovedVenueEnquiry");
    window.dispatchEvent(new Event("lastApprovedVenueEnquiryChanged"));
    setApprovedEnquiry(null);
  }, []);

  const bookingHandlers = useVenueBookingHandlers({
    hallData: stableVenueData,
    selectedRooms,
    showToast,
    setSelectedRooms,
    setHallBookingModal: setBookingModal,
    setSelectionMode,
    setBookingCompleted: () => {},
    setBookingDetailsModal,
    setBookingListModal,
    setCancelModal,
    setExtensionModal,
    approvedEnquiry,
    onApprovedEnquiryConsumed: clearApprovedEnquiry,
  });

  const vacancyHandlers = useVenueVacancyCheck({
    venueData: stableVenueData,
    checkIn,
    checkOut,
    dailyStart,
    dailyEnd,
    selectedRooms,
    setSelectedRooms,
    setVacantRooms,
    setFilterModal,
    showToast,
  });

  useEffect(() => {
    const handleBookingComplete = () => {
      setSelectionMode(false);
      setSelectedRooms([]);
      setBookingModal(false);
    };

    window.addEventListener("venueBookingCompleted", handleBookingComplete);
    window.addEventListener("hallBookingCompleted", handleBookingComplete);
    return () => {
      window.removeEventListener("venueBookingCompleted", handleBookingComplete);
      window.removeEventListener("hallBookingCompleted", handleBookingComplete);
    };
  }, []);

  const handleAddBooking = () => {
    setSelectionMode(true);
    setSelectedRooms([]);
    clearApprovedEnquiry();
    showToast("Selection mode enabled. Select venue rooms.", "info");
  };

  const handleDoneSelection = () => {
    if (selectedRooms.length === 0) {
      showToast("Please select at least one venue room", "warning");
      return;
    }
    setBookingModal(true);
  };

  const handleDirectBook = (hallName, room) => {
    setSelectedRooms([{ hall: hallName, roomNo: room.roomNo }]);
    setSelectionMode(false);
    setBookingModal(true);
  };

  const openDirectBookingForVacant = ({ hall, room }) => {
    setSelectedRooms([{ hall, roomNo: room.roomNo }]);
    setBookingModal(true);
    setVacantRooms([]);
  };

  const handleSelectBookingFromList = useCallback(
    (booking) => {
      setBookingListModal(null);
      setBookingDetailsModal({
        hall: bookingListModal?.hall,
        room: bookingListModal?.room,
        booking,
      });
    },
    [bookingListModal]
  );

  return (
    <div className="w-full">
      {approvedEnquiry && (
        <div className={`${theme === "dark" ? "bg-[#292a2d] border-[#3c4043]" : "bg-white border-[#dadce0]"} rounded-xl border px-5 py-4 mb-4`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              <p className={`font-medium ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
                Approved Enquiry: {approvedEnquiry.name} ({approvedEnquiry.eventName})
              </p>
              <p className={theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}>
                {approvedEnquiry.checkInDate} {approvedEnquiry.checkInTime} to {approvedEnquiry.checkOutDate} {approvedEnquiry.checkOutTime}
              </p>
            </div>
            <button
              onClick={clearApprovedEnquiry}
              className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-1"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className={`${theme === "dark" ? "bg-[#292a2d] border-[#3c4043]" : "bg-white border-[#dadce0]"} rounded-xl border px-5 py-4 mb-4`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-2 text-green-600 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              LIVE
            </span>
            <span className={theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}>
              Updated: {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <button
              onClick={onRefresh}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs"
            >
              <RefreshCw size={12} />
              Refresh
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setDownloadModal(true)} className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Download size={14} />
              Download CSV
            </button>
            <button onClick={handleAddBooking} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 inline-flex items-center gap-1">
              <Calendar size={14} />
              Add Booking
            </button>
            <button onClick={() => setSearchFilterModal(true)} className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-1">
              <Search size={14} />
              Search
            </button>
            <button onClick={() => setFilterModal(true)} className="px-3 py-2 rounded-lg border text-sm inline-flex items-center gap-1">
              <Filter size={14} />
              Filter
            </button>
          </div>
        </div>
      </div>

      <div className="text-center mb-5">
        <h2 className={`text-3xl font-bold ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
          Common Bookings
        </h2>
      </div>

      <VenueGrid
        hallData={stableVenueData}
        theme={theme}
        selectedRooms={selectedRooms}
        toggleRoomSelect={vacancyHandlers.toggleRoomSelect}
        selectionMode={selectionMode}
        onRoomClick={bookingHandlers.onRoomClick}
        onDirectBook={handleDirectBook}
        showToast={showToast}
      />

      {selectionMode && selectedRooms.length > 0 && (
        <SelectionFooter selectedCount={selectedRooms.length} onDone={handleDoneSelection} />
      )}

      <AnimatePresence>
        {filterModal && (
          <VenueFilterModal
            theme={theme}
            onClose={() => setFilterModal(false)}
            checkIn={checkIn}
            checkOut={checkOut}
            dailyStart={dailyStart}
            dailyEnd={dailyEnd}
            setCheckIn={setCheckIn}
            setCheckOut={setCheckOut}
            setDailyStart={setDailyStart}
            setDailyEnd={setDailyEnd}
            onSubmit={vacancyHandlers.handleFilterSubmit}
          />
        )}

        {vacantRooms.length > 0 && (
          <VenueVacantRoomsModal
            theme={theme}
            vacantRooms={vacantRooms}
            onClose={() => setVacantRooms([])}
            onBookRoom={openDirectBookingForVacant}
          />
        )}

        {bookingModal && (
          <VenueBookingModal
            theme={theme}
            selectedRooms={selectedRooms}
            prefill={approvedEnquiry}
            onClose={() => {
              setBookingModal(false);
              setSelectionMode(false);
              setSelectedRooms([]);
            }}
            onSubmit={bookingHandlers.handleVenueBooking}
          />
        )}

        {bookingListModal && (
          <VenueBookingListModal
            theme={theme}
            modal={bookingListModal}
            onClose={() => setBookingListModal(null)}
            onSelectBooking={handleSelectBookingFromList}
          />
        )}

        {bookingDetailsModal && (
          <VenueBookingDetailsModal
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
          <VenueCancelModal
            theme={theme}
            modal={cancelModal}
            remarksText={remarksText}
            setRemarksText={setRemarksText}
            onClose={() => setCancelModal(null)}
            onDone={(remarks) => bookingHandlers.onCancelDone(remarks, cancelModal)}
          />
        )}

        {extensionModal && (
          <VenueExtensionModal
            theme={theme}
            modal={extensionModal}
            onClose={() => setExtensionModal(null)}
            onSubmit={bookingHandlers.handleExtendBooking}
            onExtend={bookingHandlers.handleExtendBooking}
          />
        )}

        {searchFilterModal && (
          <VenueSearchFilterModal
            theme={theme}
            hallData={stableVenueData}
            onClose={() => setSearchFilterModal(false)}
          />
        )}

        {downloadModal && (
          <VenueDownloadModal
            theme={theme}
            venueData={rawVenueData} 
            onClose={() => setDownloadModal(false)}
            currentUser={currentUser}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
