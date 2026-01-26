// src/components/MainContent.jsx - COMPLETE COMBINED VERSION
import React, { useEffect, useState, useRef } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import { Settings, Trash2, Filter, Building2, Search } from "lucide-react";
import { combineDateAndTime } from "../utils/dateUtils";

import GuestDetails from "./GuestDetails";
import RoomCard from "./RoomCard";
import DirectBookingModal from "./DirectBookingModal";
import CancelModal from "./CancelModal";
import SettingsPage from "../pages/SettingsPage";
import SearchGuestModal from "./SearchGuestModal";
import FilterModal from "./FilterModal";
import AdminEnquiryPage from "../pages/AdminEnquiryPage";
import LiveBookingCounter from "./LiveBookingCounter";
import PaymentModal from "./PaymentModal";
import ExtensionModal from "./ExtensionModal";
import HostelMenuButton from "./HostelMenuButton";
import { BlockRoomModal, UnblockRoomModal, BlockedRoomInfoModal } from "./RoomBlockingModals";

import "react-calendar/dist/Calendar.css";
import "../styles/calendarCustom.css";

import { useAuth } from "../context/AuthContext";
import hotelIcon from "../assets/hotelIcon.png";
import CalendarGuestsPage from "../pages/CalendarGuestsPage";
import { 
  fetchEnquiries, 
  apiFetchHostels, 
  apiFetchBookings, 
  apiFetchAllBookingsForDownload,
} from "../utils/api";  

// ====================================================
// MAIN COMPONENT START
// ====================================================
export default function MainContent(props) {
  // ------------------------------
  // PROPS DESTRUCTURING
  // ------------------------------
  const {
    activeTab,
    setActiveTab,
    activeHostel,
    setActiveHostel,
    hostelData = {},
    completeHostelData = {},
    setRightPanelToRoom,
    activeRoomRef,
    setActiveRoomRef,
    statsForHostel,
    statsAll,
    bookingSelectModal,
    setBookingSelectModal,
    directBookingModal,
    setDirectBookingModal,
    cancelModal,
    setCancelModal,
    setExtensionModal,
    remarksText,
    setRemarksText,
    addBookingToRoom,
    cancelBooking,
    handleStartDirectBooking,
    theme,
    setTheme,
    notificationsEnabled,
    setNotificationsEnabled,
    currentUserData,
    handleCancelModalCancel,
  } = props;

  // ====================================================
  // AUTH HOOKS MUST BE FIRST
  // ====================================================
  const { currentUser, loadingUser } = useAuth();
  const role = currentUser?.role || "caretaker";

  const userHostel =
    currentUser?.assignedHostel ||
    currentUser?.hostel ||
    null;

  // ====================================================
  // UI STATES
  // ====================================================
  const [searchModal, setSearchModal] = useState(false);
  const [filterModal, setFilterModal] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [blockRoomModal, setBlockRoomModal] = useState(null);
  const [unblockRoomModal, setUnblockRoomModal] = useState(null);
  const [blockedRoomInfoModal, setBlockedRoomInfoModal] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "" });

  const lastPendingRef = useRef(0);
  const initRef = useRef(false);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [downloadDateModal, setDownloadDateModal] = useState(false);
  const [downloadFromDate, setDownloadFromDate] = useState("");
  const [downloadToDate, setDownloadToDate] = useState("");
  const [showCalendarPage, setShowCalendarPage] = useState(false);

  // ====================================================
  // EVENT LISTENER – RELOAD HOSTEL DATA
  // ====================================================
  useEffect(() => {
    const reload = () => {
      if (typeof window.fetchLatestHostelData === "function") {
        window.fetchLatestHostelData();
      }
    };

    window.addEventListener("reloadHostelData", reload);
    return () => window.removeEventListener("reloadHostelData", reload);
  }, []);

  // ====================================================
  // NOTIFICATION DROPDOWN CLICK OUTSIDE
  // ====================================================
  useEffect(() => {
    const handleClick = (e) => {
      if (showNotifDropdown && !e.target.closest(".notif-wrapper")) {
        setShowNotifDropdown(false);
      }
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showNotifDropdown]);

  // ====================================================
  // ENQUIRY POLLING FROM BACKEND
  // ====================================================
  useEffect(() => {
    // ✅ CRITICAL FIX: Only admin and manager should receive enquiry notifications
    if (role !== "admin" && role !== "manager") {
      console.log("🔒 Enquiry notifications disabled for role:", role);
      setNotifications([]);
      return; // Exit early for caretakers
    }

    let interval;

    const load = async () => {
      const result = await fetchEnquiries();
      const enquiries = Array.isArray(result) ? result : (result?.enquiries || []);

      const pending = enquiries.filter((e) => e.status === "pending");

      if (notificationsEnabled) {
        setNotifications(
          pending.map((e) => ({
            name: e.name,
            message: e.purpose || "New enquiry submitted",
            date: new Date(e.createdAt).toLocaleString(),
            status: e.status,
          }))
        );
      } else {
        setNotifications([]);
      }

      if (!initRef.current) {
        lastPendingRef.current = pending.length;
        initRef.current = true;
        return;
      }

      // ✅ Only show toast for admin/manager
      if (pending.length > lastPendingRef.current && notificationsEnabled) {
        const newest = pending[pending.length - 1];

        setToast({
          show: true,
          message: `New enquiry: ${newest.name} (${newest.city || ""}, ${
            newest.state || ""
          })`,
        });

        setTimeout(() => setToast({ show: false, message: "" }), 4000);
      }

      lastPendingRef.current = pending.length;
    };

    load();
    interval = setInterval(load, 5000);

    return () => clearInterval(interval);
  }, [notificationsEnabled, role]);

  

  // ====================================================
  // THEME SETTER
  // ====================================================
  useEffect(() => {
    if (!theme) return;

    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    localStorage.setItem("guestDashboardTheme", theme);
  }, [theme]);

  // ====================================================
  // UPCOMING BOOKINGS LIST
  // ====================================================
  const allBookings =
    Object.entries(hostelData || {})
      .flatMap(([hostel, h]) =>
        (h.rooms || [])
          .flatMap((room) =>
            (room.bookings || []).map((b) => ({
              hostel,
              roomNo: room.roomNo,
              booking: b,
            }))
          )
      )
      .sort((a, b) => new Date(a.booking.from) - new Date(b.booking.from)) || [];

  const upcoming = allBookings
    .filter((b) => {
      // ✅ Filter by user role
      if (role === "admin" || role === "manager") return true;
      return b.hostel === userHostel;
    })
    .filter((b) => {
      // ✅ CRITICAL FIX: Exclude cancelled, checked_out, no_show, and REPORTED/CHECKED_IN bookings
      if (["cancelled", "checked_out", "no_show", "checked_in"].includes(b.booking.status)) {
        return false;
      }
      
      // ✅ ALSO exclude if reportedStatus is "reported" (additional safety check)
      if (b.booking.reportedStatus === "reported") {
        return false;
      }
      
      // ✅ Use actualCheckInDate if guest reported early
      const fromDate = b.booking.actualCheckInDate || b.booking.from;
      const checkInDateTime = new Date(fromDate);
      
      // Set check-in time
      const checkInTime = b.booking.actualCheckInTime || b.booking.checkInTime || "00:00";
      const [hours, minutes] = checkInTime.split(':').map(Number);
      checkInDateTime.setHours(hours, minutes, 0, 0);
      
      const now = new Date();
      
      // ✅ Show only FUTURE bookings (not currently checked in)
      return checkInDateTime >= now;
    })
    .slice(0, 5);

    const getEffectiveCheckInDate = (booking) => {
      // ✅ Use actualCheckInDate if guest reported early, otherwise use 'from'
      return booking.actualCheckInDate || booking.from;
    };

  // ====================================================
  // CSV EXPORT LOGIC (COMPLETE VERSION WITH DATE RANGE)
  // ====================================================
  

  const handleDownloadClick = () => {
    setDownloadDateModal(true);
  };

  const handleDownloadWithDates = () => {
    if (!downloadFromDate || !downloadToDate) {
      alert("⚠️ Please select both From and To dates.");
      return;
    }

    const fromDate = new Date(downloadFromDate);
    const toDate = new Date(downloadToDate);

    if (fromDate > toDate) {
      alert("⚠️ From date cannot be after To date.");
      return;
    }

    handleDownload(fromDate, toDate);

    setDownloadDateModal(false);
    setDownloadFromDate("");
    setDownloadToDate("");
  };

  const handleDownload = async (filterFromDate = null, filterToDate = null) => {
    try {
      console.log("🔓 Starting download with date filter:", { filterFromDate, filterToDate });

      // Fetch bookings
      const bookingsData = await apiFetchAllBookingsForDownload();
      console.log("✅ Bookings fetched:", bookingsData);

      // ✅ CRITICAL FIX: Only fetch enquiries for admin/manager
      let enquiries = [];
      if (role === "admin" || role === "manager") {
        const enquiriesData = await fetchEnquiries();
        enquiries = Array.isArray(enquiriesData) ? enquiriesData : (enquiriesData?.enquiries || []);
        console.log("✅ Enquiries fetched:", enquiries.length);
      } else {
        console.log("🔒 Enquiries disabled for role:", role);
      }

      if (!bookingsData.success || !bookingsData.hostels) {
        alert("❌ Failed to fetch booking data");
        return;
      }

      const bookings = [];

      // Extract all bookings from hostels structure
      // ✅ CRITICAL FIX: Filter by user's hostel for caretakers
      (bookingsData.hostels || []).forEach((hostel) => {
        // Skip this hostel if caretaker and it's not their assigned hostel
        if (role === "caretaker" && userHostel && hostel.name !== userHostel) {
          return;
        }
        
        (hostel.rooms || []).forEach((room) => {
          (room.bookings || []).forEach((booking) => {
            bookings.push({
              ...booking,
              hostel: hostel.name,
              roomNo: room.roomNo,
            });
          });    
        });
      });    

      console.log("📋 Total bookings:", bookings.length);
      console.log("📋 Total enquiries:", enquiries.length);

      // Prepare CSV rows
      const rows = [];

      // Helper function to check date range
      const isWithinDateRange = (bookingFrom, bookingTo, filterFrom, filterTo) => {
        if (!filterFrom || !filterTo) return true;
      
        try {
          const bFrom = new Date(bookingFrom);
          const bTo = new Date(bookingTo);
          const fFrom = new Date(filterFrom);
          const fTo = new Date(filterTo);

          bFrom.setHours(0, 0, 0, 0);
          bTo.setHours(23, 59, 59, 999);
          fFrom.setHours(0, 0, 0, 0);
          fTo.setHours(23, 59, 59, 999);

          return !(bTo < fFrom || bFrom > fTo);
        } catch (err) {
          console.error("Date comparison error:", err);
          return true;
        }
      };

      // ✅ Helper function to format transaction date
      const formatTransactionDate = (dateStr) => {
        if (!dateStr) return "";
        try {
          return new Date(dateStr).toISOString().split('T')[0];
        } catch {
          return "";
        }
      };

      // Process bookings
      bookings.forEach((b) => {
        // Apply date filter
        if (filterFromDate && filterToDate) {
          if (!isWithinDateRange(b.from, b.to, filterFromDate, filterToDate)) {
            return; // Skip this booking
          }
        }

        // ✅ PAYMENT DETAILS EXTRACTION
        const totalAmount = Number(b.totalAmount) || Number(b.amount) || 0;
        const paidAmount = Number(b.paidAmount) || 0;
        const discount = Number(b.discount) || Number(b.waveOff) || 0;
        const balanceAmount = Number(b.balanceAmount) || (totalAmount - paidAmount - discount);

        rows.push({
          // Basic Info
          Type: "Booking",
          BookingID: b._id || b.id || "",
          Guest: b.guest || "",
          Hostel: b.hostel || "",
          RoomNo: b.roomNo || "",
          Contact: b.contact || "",
          Email: b.email || "",
          
          // Dates
          From: b.from ? new Date(b.from).toISOString().split('T')[0] : "",
          To: b.to ? new Date(b.to).toISOString().split('T')[0] : "",
          CheckInTime: b.checkInTime || "00:00",
          CheckOutTime: b.checkOutTime || "23:59",
          
          // Guest Details
          Gender: b.gender || "",
          City: b.city || "",
          State: b.state || "",
          Department: b.department || "",
          RollNo: b.rollno || "",
          Reference: b.reference || "",
          Purpose: b.purpose || "",
          
          // Guest Count
          NumGuests: b.numGuests || 1,
          Males: b.males || 0,
          Females: b.females || 0,
          
          // ✅ FIXED: PAYMENT DETAILS WITH TRANSACTION INFO
          PaymentType: b.paymentType || "Paid",
          TotalAmount: totalAmount,
          PaidAmount: paidAmount,
          Discount_WaveOff: discount,
          BalanceAmount: balanceAmount,
          PaymentStatus: b.paymentStatus || "UNPAID",
          
          // ✅ CRITICAL FIX: Add missing payment transaction fields
          PaymentMode: b.paymentMode || b.paymentMethod || "",
          TransactionID: b.transactionId || "",
          TransactionDate: formatTransactionDate(b.transactionDate),
          PaymentRemarks: b.paymentRemarks || "",
          
          // Attachments
          Attachments: (b.files || []).length,
          ApprovalDocuments: (b.approvalDocuments || []).length,
          PaymentAttachments: (b.paymentAttachments || []).length,
          
          // Status & Remarks
          Status: b.status || "booked",
          CancelRemarks: b.cancelRemarks || "",
          FreeRemarks: b.remarks || b.freeRemarks || "",
          RejectionReason: "",
          
          // Reporting Details
          ReportedStatus: b.reportedStatus || "pending",
          ReportedAt: b.reportedAt ? new Date(b.reportedAt).toISOString().split('T')[0] : "",
          ActualCheckInDate: b.actualCheckInDate ? new Date(b.actualCheckInDate).toISOString().split('T')[0] : "",
          ActualCheckInTime: b.actualCheckInTime || "",
        });
      });

      // ✅ CRITICAL FIX: Only process enquiries for admin/manager
      if (role === "admin" || role === "manager") {
        // Process enquiries (rejected + pending only)
        enquiries.forEach((e) => {
          // Apply date filter
          if (filterFromDate && filterToDate) {
            const enquiryDate = new Date(e.createdAt);
            if (!isWithinDateRange(enquiryDate, enquiryDate, filterFromDate, filterToDate)) {
              return;
            }
          }

          if (e.status === "rejected" || e.status === "pending") {
            rows.push({
              Type: "Enquiry",
              BookingID: e._id || "",
              Guest: e.name || "",
              Hostel: e.hostel || "",
              RoomNo: "",
              Contact: e.contact || "",
              Email: e.email || "",
              From: e.from ? new Date(e.from).toISOString().split('T')[0] : "",
              To: e.to ? new Date(e.to).toISOString().split('T')[0] : "",
              CheckInTime: e.checkInTime || "",
              CheckOutTime: e.checkOutTime || "",
              Gender: e.gender || "",
              City: e.city || "",
              State: e.state || "",
              Department: e.department || "",
              RollNo: e.rollno || "",
              Reference: e.reference || "",
              Purpose: e.purpose || "",
              NumGuests: e.guests || 0,
              Males: e.males || 0,
              Females: e.females || 0,
              
              // ✅ Payment fields (empty for enquiries)
              PaymentType: "",
              TotalAmount: "",
              PaidAmount: "",
              Discount_WaveOff: "",
              BalanceAmount: "",
              PaymentStatus: "",
              PaymentMode: "",
              TransactionID: "",
              TransactionDate: "",
              PaymentRemarks: "",
              
              Attachments: (e.files || []).length,
              ApprovalDocuments: 0,
              PaymentAttachments: 0,
              Status: e.status || "pending",
              CancelRemarks: "",
              FreeRemarks: "",
              RejectionReason: e.rejectionReason || "",
              ReportedStatus: "",
              ReportedAt: "",
              ActualCheckInDate: "",
              ActualCheckInTime: "",
            });
          }
        });
      }

      console.log("📋 Total rows after filtering:", rows.length);

      if (!rows.length) {
        alert("ℹ️ No data found for the selected date range.");
        return;
      }

      // Generate CSV
      const headers = Object.keys(rows[0]);
      const csv =
        headers.join(",") +
        "\n" +
        rows
          .map((r) =>
            headers
              .map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`)
              .join(",")
          )
          .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const link = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = link;

      const dateRange = filterFromDate && filterToDate 
        ? `_${new Date(filterFromDate).toISOString().split('T')[0]}_to_${new Date(filterToDate).toISOString().split('T')[0]}`
        : "";

      // ✅ Add role to filename for clarity
      const rolePrefix = role === "caretaker" ? `${userHostel}_` : "";
      a.download = `${rolePrefix}complete_data_with_payment${dateRange}.csv`;

      a.click();
      URL.revokeObjectURL(link);

      const recordType = role === "caretaker" 
        ? `${rows.length} booking records (${userHostel} only)` 
        : `${rows.length} records (${rows.filter(r => r.Type === 'Booking').length} bookings, ${rows.filter(r => r.Type === 'Enquiry').length} enquiries)`;
      
      alert(`✅ Downloaded ${recordType} with complete payment details.`);

    } catch (err) {
      console.error("❌ Download error:", err);
      alert("Failed to download data. Please try again.");
    }
  };

  // Helper function to check time overlap on same day
  const checkTimeOverlap = (booking1, booking2) => {
    const date1From = new Date(booking1.from);
    const date1To = new Date(booking1.to);
    const date2From = new Date(booking2.from);
    const date2To = new Date(booking2.to);

    date1From.setHours(0, 0, 0, 0);
    date1To.setHours(0, 0, 0, 0);
    date2From.setHours(0, 0, 0, 0);
    date2To.setHours(0, 0, 0, 0);

    const time1In = booking1.checkInTime || "00:00";
    const time1Out = booking1.checkOutTime || "23:59";
    const time2In = booking2.checkInTime || "00:00";
    const time2Out = booking2.checkOutTime || "23:59";

    const timeToMinutes = (timeStr) => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const b1CheckIn = timeToMinutes(time1In);
    const b1CheckOut = timeToMinutes(time1Out);
    const b2CheckIn = timeToMinutes(time2In);
    const b2CheckOut = timeToMinutes(time2Out);

    const datesOverlap = date1From <= date2To && date1To >= date2From;

    if (!datesOverlap) return false;

    const isSameDay = date1From.getTime() === date2From.getTime() && 
                      date1To.getTime() === date2To.getTime();

    if (isSameDay) {
      return b1CheckIn < b2CheckOut && b1CheckOut > b2CheckIn;
    }

    return true;
  };

  if (showCalendarPage) {
    return (
      <CalendarGuestsPage
        selectedDate={selectedDate}
        hostelData={hostelData}
        completeHostelData={completeHostelData}
        theme={theme}
        currentUser={currentUser}  // ✅ ADD THIS
        onBack={() => setShowCalendarPage(false)}
      />
    );
  }

  const handleBlockRoom = (hostelName, roomNo) => {
    console.log("🔒 Block room clicked:", hostelName, roomNo);
    setBlockRoomModal({ hostelName, roomNo });
  };

  const handleUnblockRoom = (hostelName, roomNo, blockInfo) => {
    console.log("🔓 Unblock room clicked:", hostelName, roomNo);
    setUnblockRoomModal({ hostelName, roomNo, blockInfo });
  };

  const handleBlockedRoomClick = (hostelName, roomNo, blockInfo) => {
    console.log("ℹ️ Blocked room info clicked:", hostelName, roomNo);
    setBlockedRoomInfoModal({ hostelName, roomNo, blockInfo });
  };

  const handleBlockSuccess = () => {
    console.log("✅ Block successful - refreshing data");
    if (typeof window.fetchLatestHostelData === "function") {
      window.fetchLatestHostelData();
    }
    setBlockRoomModal(null);
  };

  const handleUnblockSuccess = () => {
    console.log("✅ Unblock successful - refreshing data");
    if (typeof window.fetchLatestHostelData === "function") {
      window.fetchLatestHostelData();
    }
    setUnblockRoomModal(null);
  };

  // ====================================================
  // LOADING STATE
  // ====================================================
  if (loadingUser || !currentUser) {
    return (
      <main className="flex-1 flex items-center justify-center text-gray-500">
        Loading...
      </main>
    );
  }

  // ====================================================
  // DATE FORMATTER HELPER
  // ====================================================
  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "—";
    try {
      const normalizedTime = timeString && timeString.trim() ? timeString : "00:00";
      const dt = combineDateAndTime(dateString, normalizedTime);
      return dt ? format(dt, "dd-MMM-yyyy (hh:mm a)") : format(new Date(dateString), "dd-MMM-yyyy");
    } catch (error) {
      return dateString;
    }
  };

  // ====================================================
  // RETURN UI
  // ====================================================
  return (
    <main
      className={`flex-1 flex flex-col overflow-y-auto transition-all duration-500 ${
        activeTab === "Enquiry" ? "p-0 ml-0" : "p-6 ml-64"
      } ${theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}
    >
      {/* ========================================================= */}
      {/* TOP HEADER – BACK BUTTON, HOME, SEARCH, ANALYTICS */}
      {/* ========================================================= */}

      {activeTab !== "Enquiry" && (
        <header
          className={`flex justify-between items-center mb-6 border-b pb-4 ${
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          }`}
        >
          <a
            onClick={() => {
              setActiveTab("Home");
              setActiveHostel(null);
              setRightPanelToRoom(null, null);
              setActiveRoomRef(null);
            }}
            className="flex items-center gap-3 cursor-pointer select-none"
          >
            <img
              src={hotelIcon}
              alt="Hostel Icon"
              className="w-10 h-10 object-contain drop-shadow-sm"
            />

            <h1
              className="text-2xl font-semibold tracking-wide"
              style={{
                color: "#555",
                WebkitTextStroke: "0.7px #ff7a7a",
                letterSpacing: "0.5px",
              }}
            >
              Hostel Guest Room Booking
            </h1>
          </a>
          
          <header
            className={`flex justify-between items-center mb-6 border-b pb-4 ${
              theme === "dark" ? "border-gray-700" : "border-gray-200"
            }`}
          >
        </header>    

          <div className="flex items-center gap-4">
            <LiveBookingCounter
              theme={theme}
              currentUser={currentUser}
            />    
            {currentUser?.role !== "caretaker" && (
              <button
                onClick={() => setActiveTab("Enquiry")}
                className={`px-6 py-2 rounded-lg font-medium border text-lg transition ${
                  activeTab === "Enquiry"
                    ? "bg-red-600 text-white border-red-700"
                    : theme === "dark"
                    ? "bg-gray-800 text-gray-100 border-gray-600 hover:bg-gray-700"
                    : "bg-white text-red-700 border-red-300 hover:bg-red-100"
                }`}
              >
                Enquiry
              </button>
            )}   

            <button
              onClick={() => {
                setActiveTab("Home");
                setActiveHostel(null);
                setRightPanelToRoom(null, null);
                setActiveRoomRef(null);
              }}
              className={`px-6 py-2 rounded-lg font-medium border text-lg transition ${
                activeTab === "Home"
                  ? "bg-red-600 text-white border-red-700"
                  : theme === "dark"
                  ? "bg-gray-800 text-gray-100 border-gray-600 hover:bg-gray-700"
                  : "bg-white text-red-700 border-red-300 hover:bg-red-100"
              }`}
            >
              Home
            </button>

            <button
              onClick={() => setSearchModal(true)}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium border text-lg transition ${
                theme === "dark"
                  ? "bg-gray-800 text-gray-100 border-gray-600 hover:bg-gray-700"
                  : "bg-white text-red-700 border-red-300 hover:bg-red-100"
              }`}
            >
              <Search className="w-5 h-5" /> Search
            </button>

            {(currentUser?.role === "admin" ||
              currentUser?.role === "manager") && (
              <button
                onClick={() => setActiveTab("Analytics")}
                className={`px-6 py-2 rounded-lg font-medium border text-lg transition ${
                  activeTab === "Analytics"
                    ? "bg-red-600 text-white border-red-700"
                    : theme === "dark"
                    ? "bg-gray-800 text-gray-100 border-gray-600 hover:bg-gray-700"
                    : "bg-white text-red-700 border-red-300 hover:bg-red-100"
                }`}
              >
                Analytics
              </button>
            )}

            <button
              onClick={handleDownloadClick}
              className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg shadow hover:bg-red-700 text-lg"
            >
              Download
            </button>

            {currentUser?.role !== "caretaker" && (
              <div className="relative notif-wrapper">
                <button
                  onClick={() => setShowNotifDropdown((prev) => !prev)}
                  className={`relative p-3 border rounded-full shadow-md transition ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-600 hover:bg-gray-700"
                      : "bg-white border-gray-200 hover:bg-red-50"
                  }`}
                >
                  🔓”
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5">
                      {notifications.length}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div
                    className={`absolute right-0 mt-2 w-72 border rounded-lg shadow-lg z-50 ${
                      theme === "dark"
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    {notifications.length === 0 ? (
                      <div
                        className={`p-3 text-sm text-center ${
                          theme === "dark" ? "text-gray-400" : "text-gray-500"
                        }`}
                      >
                        No new enquiries
                      </div>
                    ) : (
                      notifications
                        .slice()
                        .reverse()
                        .map((n, i) => (
                          <div
                            key={i}
                            className={`p-3 cursor-pointer text-sm border-b last:border-0 ${
                              theme === "dark"
                                ? "hover:bg-gray-700 border-gray-700"
                                : "hover:bg-red-50 border-gray-200"
                            }`}
                            onClick={() => {
                              setActiveTab("Enquiry");
                              setShowNotifDropdown(false);
                            }}
                          >
                            <p
                              className={`${
                                theme === "dark"
                                  ? "text-red-400"
                                  : "text-red-700"
                              } font-semibold`}
                            >
                              {n.name}
                            </p>
                            <p
                              className={`${
                                theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-600"
                              }`}
                            >
                              {n.message}
                            </p>
                            <p
                              className={`text-xs ${
                                theme === "dark"
                                  ? "text-gray-500"
                                  : "text-gray-400"
                              }`}
                            >
                              {n.date}
                            </p>
                          </div>
                        ))
                    )}

                    {notifications.length > 0 && (
                      <div
                        className={`text-center text-sm p-2 cursor-pointer ${
                          theme === "dark"
                            ? "text-blue-400 hover:bg-gray-700"
                            : "text-blue-600 hover:bg-blue-50"
                        }`}
                        onClick={() => {
                          setActiveTab("Enquiry");
                          setShowNotifDropdown(false);
                        }}
                      >
                        View all enquiries →
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      {/* ========================================================= */}
      {/* ENQUIRY TAB */}
      {/* ========================================================= */}
      {activeTab === "Enquiry" && (
        <AdminEnquiryPage setActiveTab={setActiveTab} />
      )}

      {/* ========================================================= */}
      {/* SETTINGS PAGE */}
      {/* ========================================================= */}
      {activeTab === "Settings" ? (
        <SettingsPage
          theme={theme}
          setTheme={setTheme}
          notificationsEnabled={notificationsEnabled}
          setNotificationsEnabled={setNotificationsEnabled}
          setActiveTab={setActiveTab}
        />
      ) : (
        <>
          {/* ========================================================= */}
          {/* HOME DASHBOARD – NO HOSTEL SELECTED */}
          {/* ========================================================= */}
          {activeTab === "Home" && !activeHostel && (
            <>
              {/* -------- TOP GRID: CALENDAR + GUEST DETAILS -------- */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                
                {/* ========== LEFT: CALENDAR PANEL ========== */}
                <div className={`shadow-md rounded-2xl p-6 flex flex-col items-center ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}>
                  <h2 className={`text-2xl font-semibold mb-4 ${
                    theme === "dark" ? "text-red-400" : "text-red-700"
                  }`}>
                    Select a Date to View Bookings
                  </h2>

                  <Calendar
                    onChange={(date) => {
                      setSelectedDate(date);
                      setShowCalendarPage(true);
                    }}
                    value={selectedDate}
                    className="rounded-xl shadow-lg"
                  />
                  
                  <p className={`text-sm mt-4 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Click any date to view active, upcoming, past, and cancelled bookings
                  </p>
                </div>

                {/* ========== RIGHT: GUEST DETAILS PANEL ========== */}
                <div className={`shadow-md rounded-2xl p-6 ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}>
                  <h2 className={`text-2xl font-semibold mb-4 ${
                    theme === "dark" ? "text-red-400" : "text-red-700"
                  }`}>
                    Booking Details
                  </h2>

                  {activeRoomRef && activeRoomRef.booking ? (
                    <GuestDetails
                      activeRoomRef={activeRoomRef}
                      onCancel={(m) => setCancelModal(m)}
                      theme={theme}
                      setExtensionModal={setExtensionModal}
                    />
                  ) : (
                    <div className={`flex flex-col items-center justify-center h-full min-h-[400px] ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      <div className="text-6xl mb-4">📋</div>
                      <p className="text-lg font-medium">No Booking Selected</p>
                      <p className="text-sm mt-2 text-center max-w-md">
                        Select a booking from the upcoming bookings below or click on a room to view details
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* ========== UPCOMING BOOKINGS SECTION (FULL WIDTH) ========== */}
              <div className={`shadow-md rounded-2xl p-6 ${
                theme === "dark" ? "bg-gray-800" : "bg-white"
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className={`text-2xl font-semibold flex items-center gap-3 ${
                    theme === "dark" ? "text-red-400" : "text-red-700"
                  }`}>
                    <span className="text-3xl">🗓️</span>
                    Upcoming Bookings
                    <span className={`text-base px-3 py-1 rounded-full ${
                      theme === "dark" 
                        ? "bg-red-900/30 text-red-300" 
                        : "bg-red-100 text-red-700"
                    }`}>
                      {upcoming.length} {upcoming.length === 1 ? 'Booking' : 'Bookings'}
                    </span>
                  </h3>
                </div>

                {upcoming.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                    {upcoming.map((u, idx) => {
                      const isSelected = activeRoomRef?.booking?.id === u.booking.id || 
                                        activeRoomRef?.booking?._id === u.booking._id;

                      const effectiveFrom = getEffectiveCheckInDate(u.booking);
                      
                      return (
                        <div
                          key={`${u.hostel}_${u.roomNo}_${idx}`}
                          onClick={() => setRightPanelToRoom(
                            u.hostel,
                            u.roomNo,
                            u.booking._id || u.booking.id
                          )}
                          className={`
                            group relative overflow-hidden rounded-xl border-2 cursor-pointer
                            transition-all duration-300 transform hover:scale-105 hover:shadow-2xl
                            ${isSelected 
                              ? theme === "dark"
                                ? "bg-gradient-to-br from-red-900/40 to-red-800/40 border-red-500 shadow-red-500/50 shadow-lg"
                                : "bg-gradient-to-br from-red-50 to-orange-50 border-red-500 shadow-red-300/50 shadow-lg"
                              : theme === "dark"
                                ? "bg-gray-700/50 border-gray-600 hover:border-red-500 hover:bg-gray-700"
                                : "bg-white border-gray-200 hover:border-red-400 hover:bg-gradient-to-br hover:from-red-50 hover:to-orange-50"
                            }
                          `}
                          style={{
                            animationDelay: `${idx * 50}ms`,
                            animation: 'fadeInUp 0.5s ease-out forwards'
                          }}
                        >
                          {/* Top Badge */}
                          <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-xs font-bold ${
                            theme === "dark"
                              ? "bg-gradient-to-r from-green-600 to-green-700 text-white"
                              : "bg-gradient-to-r from-green-500 to-green-600 text-white"
                          }`}>
                            UPCOMING
                          </div>

                          {/* Selected Indicator */}
                          {isSelected && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />
                          )}

                          {/* Card Content */}
                          <div className="p-5 pt-8">
                            {/* Guest Name */}
                            <div className="flex items-start gap-2 mb-4">
                              <div className={`text-2xl ${
                                theme === "dark" ? "text-red-400" : "text-red-600"
                              }`}>
                                ðŸ‘¤
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className={`font-bold text-lg truncate ${
                                  theme === "dark" ? "text-white" : "text-gray-900"
                                }`}>
                                  {u.booking.guest}
                                </h4>
                                <p className={`text-xs ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                                }`}>
                                  {u.booking.department || u.booking.rollno || 'Guest'}
                                </p>
                              </div>
                            </div>

                            {/* Location */}
                            <div className={`flex items-center gap-2 mb-3 p-2 rounded-lg ${
                              theme === "dark" 
                                ? "bg-gray-800/50" 
                                : "bg-gray-50"
                            }`}>
                              <span className="text-xl">🏢</span>
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                                }`}>
                                  Hostel
                                </p>
                                <p className={`font-semibold text-sm truncate ${
                                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                                }`}>
                                  {u.hostel}
                                </p>
                              </div>
                            </div>

                            {/* Room Number */}
                            <div className={`flex items-center gap-2 mb-4 p-2 rounded-lg ${
                              theme === "dark" 
                                ? "bg-gray-800/50" 
                                : "bg-gray-50"
                            }`}>
                              <span className="text-xl">ðŸšª</span>
                              <div className="flex-1">
                                <p className={`text-xs ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                                }`}>
                                  Room Number
                                </p>
                                <p className={`font-bold text-lg ${
                                  theme === "dark" ? "text-red-400" : "text-red-600"
                                }`}>
                                  {u.roomNo}
                                </p>
                              </div>
                            </div>

                            {/* Dates */}
                            <div className={`space-y-2 p-3 rounded-lg ${
                              theme === "dark"
                                ? "bg-gradient-to-br from-blue-900/20 to-blue-800/20 border border-blue-700/30"
                                : "bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200"
                            }`}>
                              {/* Check-in */}
                              <div className="flex items-center gap-2">
                                <span className="text-sm">📋…</span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs ${
                                    theme === "dark" ? "text-blue-300" : "text-blue-700"
                                  }`}>
                                    Check-in
                                  </p>
                                  <p className={`text-xs font-semibold truncate ${
                                    theme === "dark" ? "text-blue-100" : "text-blue-900"
                                  }`}>
                                    {formatDateTime(u.booking.from, u.booking.checkInTime)}
                                  </p>
                                </div>
                              </div>

                              <div className={`h-px ${
                                theme === "dark" ? "bg-blue-700/30" : "bg-blue-300"
                              }`} />

                              {/* Check-out */}
                              <div className="flex items-center gap-2">
                                <span className="text-sm">📋</span>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs ${
                                    theme === "dark" ? "text-blue-300" : "text-blue-700"
                                  }`}>
                                    Check-out
                                  </p>
                                  <p className={`text-xs font-semibold truncate ${
                                    theme === "dark" ? "text-blue-100" : "text-blue-900"
                                  }`}>
                                    {formatDateTime(u.booking.to, u.booking.checkOutTime)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Contact Info */}
                            <div className={`mt-3 pt-3 border-t flex items-center gap-2 ${
                              theme === "dark" ? "border-gray-700" : "border-gray-200"
                            }`}>
                              <span className="text-sm">📋ž</span>
                              <p className={`text-xs truncate ${
                                theme === "dark" ? "text-gray-400" : "text-gray-600"
                              }`}>
                                {u.booking.contact}
                              </p>
                            </div>
                          </div>

                          {/* Hover Overlay */}
                          <div className={`
                            absolute inset-0 opacity-0 group-hover:opacity-100
                            transition-opacity duration-300 pointer-events-none
                            bg-gradient-to-t ${
                              theme === "dark"
                                ? "from-red-900/30 to-transparent"
                                : "from-red-100/50 to-transparent"
                            }
                          `} />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`flex flex-col items-center justify-center py-16 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    <div className="text-6xl mb-4">📋­</div>
                    <p className="text-xl font-semibold mb-2">No Upcoming Bookings</p>
                    <p className="text-sm">All upcoming bookings will appear here</p>
                  </div>
                )}
              </div>
            </>
          )}  

          {/* ========================================================= */}
          {/* HOME DASHBOARD – HOSTEL SELECTED (Room List + Details) */}
          {/* ========================================================= */}
          {activeHostel && activeTab === "Home" && (
            <div className="grid grid-cols-2 gap-6 flex-grow">

              {/* ------------------------ */}
              {/* LEFT PANEL – ROOM LIST */}
              {/* ------------------------ */}
              <div
                className={`shadow-md rounded-2xl overflow-hidden border ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                {activeHostel === "All Hostels" ? (
                  <>
                    {/* ✅ ENHANCED HEADER FOR ALL HOSTELS */}
                    <div className={`p-5 border-b-4 border-red-500 ${
                      theme === "dark" 
                        ? "bg-gradient-to-r from-gray-900 to-gray-700" 
                        : "bg-gradient-to-r from-gray-200 to-gray-100"
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${
                          theme === "dark" ? "bg-red-900/30" : "bg-red-100"
                        }`}>
                          <Building2 className={`w-6 h-6 ${
                            theme === "dark" ? "text-red-400" : "text-red-600"
                          }`} />
                        </div>
                        <div>
                          <h2 className={`text-2xl font-bold ${
                            theme === "dark" ? "text-white" : "text-gray-900"
                          }`}>
                            All Hostels
                          </h2>
                          <p className={`text-sm ${
                            theme === "dark" ? "text-gray-300" : "text-gray-700"
                          }`}>
                            Complete hostel overview with all guest rooms
                          </p>
                        </div>
                      </div>

                      {/* Stats Bar */}
                      <div className={`grid grid-cols-3 gap-3 mt-4 p-3 rounded-lg ${
                        theme === "dark" 
                          ? "bg-gray-800/50" 
                          : "bg-white/50"
                      }`}>
                        <div className="text-center">
                          <p className={`text-xs ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}>
                            Total Rooms
                          </p>
                          <p className={`text-xl font-bold ${
                            theme === "dark" ? "text-blue-400" : "text-blue-600"
                          }`}>
                            {statsAll().total}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className={`text-xs ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}>
                            Occupied
                          </p>
                          <p className={`text-xl font-bold ${
                            theme === "dark" ? "text-red-400" : "text-red-600"
                          }`}>
                            {statsAll().occupied}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className={`text-xs ${
                            theme === "dark" ? "text-gray-400" : "text-gray-600"
                          }`}>
                            Available
                          </p>
                          <p className={`text-xl font-bold ${
                            theme === "dark" ? "text-green-400" : "text-green-600"
                          }`}>
                            {statsAll().available}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Room List Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(100vh-350px)]">
                      {Object.entries(hostelData || {}).map(([name, h]) => (
                        <div
                          key={name}
                          className={`border-b pb-3 mb-3 last:border-0 ${
                            theme === "dark"
                              ? "border-gray-700"
                              : "border-gray-200"
                          }`}
                        >
                          <h3
                            className={`text-md font-semibold mb-2 ${
                              theme === "dark"
                                ? "text-red-400"
                                : "text-red-600"
                            }`}
                          >
                            {name}
                          </h3>

                          {(h.rooms || []).map((room) => (
                            <RoomCard
                              key={room.roomNo}
                              hostel={name}
                              room={room}
                              onSelect={setRightPanelToRoom}
                              onCancel={(m) => setCancelModal(m)}
                              onDirectBooking={(hostel, rm) =>
                                setDirectBookingModal({
                                  open: true,
                                  hostel,
                                  room: rm,
                                  prefill: null,
                                })
                              }
                              onBlockedClick={handleBlockedRoomClick}
                              setExtensionModal={setExtensionModal}
                              theme={theme}
                            />
                          ))}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {/* ✅ ENHANCED HEADER FOR SINGLE HOSTEL */}
                    <div className={`p-5 border-b-4 border-red-500 ${
                      theme === "dark" 
                        ? "bg-gradient-to-r from-gray-900 to-gray-700" 
                        : "bg-gradient-to-r from-gray-200 to-gray-100"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        {/* Left side - Hostel info */}
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            theme === "dark" ? "bg-red-900/30" : "bg-red-100"
                          }`}>
                            <Building2 className={`w-6 h-6 ${
                              theme === "dark" ? "text-red-400" : "text-red-600"
                            }`} />
                          </div>
                          <div>
                            <h2 className={`text-2xl font-bold ${
                              theme === "dark" ? "text-white" : "text-gray-900"
                            }`}>
                              {activeHostel}
                            </h2>
                            <p className={`text-sm ${
                              theme === "dark" ? "text-gray-300" : "text-gray-700"
                            }`}>
                              Guest room management and booking overview
                            </p>
                          </div>
                        </div>

                        {/* ✅ RIGHT SIDE - THREE DOTS MENU (Role + Hostel scoped) */}
                        {(
                          role === "admin" ||
                          role === "manager" ||
                          (role === "caretaker" && activeHostel === userHostel)
                        ) && (
                          <>
                            {console.log("🔍 Passing rooms to HostelMenuButton:", {
                              activeHostel,
                              hostelData: hostelData[activeHostel],
                              rooms: hostelData[activeHostel]?.rooms,
                              roomsCount: hostelData[activeHostel]?.rooms?.length
                            })}
                            <HostelMenuButton
                              hostelName={activeHostel}
                              rooms={hostelData[activeHostel]?.rooms || []}
                              onBlockRoom={handleBlockRoom}
                              onUnblockRoom={handleUnblockRoom}
                              theme={theme}
                            />
                          </>
                        )}
                      </div>

                      {/* Stats Bar */}
                      <div className={`grid grid-cols-3 gap-3 mt-4 p-3 rounded-lg ${
                        theme === "dark" 
                          ? "bg-gray-800/50" 
                          : "bg-white/50"
                      }`}>
                        {(() => {
                          const s = statsForHostel(activeHostel);
                          return (
                            <>
                              <div className="text-center">
                                <p className={`text-xs ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                                }`}>
                                  Total Rooms
                                </p>
                                <p className={`text-xl font-bold ${
                                  theme === "dark" ? "text-blue-400" : "text-blue-600"
                                }`}>
                                  {s.total}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className={`text-xs ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                                }`}>
                                  Occupied
                                </p>
                                <p className={`text-xl font-bold ${
                                  theme === "dark" ? "text-red-400" : "text-red-600"
                                }`}>
                                  {s.occupied}
                                </p>
                              </div>
                              <div className="text-center">
                                <p className={`text-xs ${
                                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                                }`}>
                                  Available
                                </p>
                                <p className={`text-xl font-bold ${
                                  theme === "dark" ? "text-green-400" : "text-green-600"
                                }`}>
                                  {s.available}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Room List Content */}
                    <div className="p-6 overflow-y-auto max-h-[calc(100vh-350px)]">
                      {(hostelData[activeHostel]?.rooms || []).map((room) => (
                        <RoomCard
                          key={room.roomNo}
                          hostel={activeHostel}
                          room={room}
                          onSelect={setRightPanelToRoom}
                          onCancel={(m) => setCancelModal(m)}
                          onDirectBooking={(hostel, rm) =>
                            setDirectBookingModal({
                              open: true,
                              hostel,
                              room: rm,
                              prefill: null,
                            })
                          }
                          onBlockedClick={handleBlockedRoomClick}
                          setExtensionModal={setExtensionModal}
                          theme={theme}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* ------------------------ */}
              {/* RIGHT PANEL – BOOKING DETAILS */}
              {/* ------------------------ */}
              <div
                className={`shadow-md rounded-2xl p-6 ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                {activeRoomRef && activeRoomRef.booking ? (
                  <GuestDetails
                    activeRoomRef={activeRoomRef}
                    onCancel={(m) => setCancelModal(m)}
                    theme={theme}
                    setExtensionModal={setExtensionModal}
                  />
                ) : (
                  <p
                    className={`italic text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}
                  >
                    Select a room to view booking details.
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* FLOATING BUTTONS (SETTINGS / CLEAR CACHE / FILTER) */}
      {/* ========================================================= */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <button
          className="p-3 bg-white border shadow-lg rounded-full hover:bg-red-50"
          onClick={() => setActiveTab("Settings")}
        >
          <Settings className="text-red-700" />
        </button>

        <button
          className="p-3 bg-white border shadow-lg rounded-full hover:bg-red-50"
          onClick={() => {
            const confirmClear = window.confirm(
              "Clear all cache and cookies? The app will reload."
            );
            if (confirmClear) {
              localStorage.clear();
              sessionStorage.clear();
              document.cookie.split(";").forEach((c) => {
                document.cookie = c
                  .replace(/^ +/, "")
                  .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
              });
              alert("Cleared. Reloading...");
              window.location.reload();
            }
          }}
        >
          <Trash2 className="text-red-700" />
        </button>

        <button
          className="p-3 bg-white border shadow-lg rounded-full hover:bg-red-50"
          onClick={() => setFilterModal(true)}
        >
          <Filter className="text-red-700" />
        </button>
      </div>

      {/* ========================================================= */}
      {/* ALL MODALS (Filter, Booking, Cancel, Toast, Search, Download) */}
      {/* ========================================================= */}

      {/* FILTER */}
      {filterModal && (
        <FilterModal
          hostelData={completeHostelData && Object.keys(completeHostelData).length > 0 ? completeHostelData : hostelData}
          onSelectBooking={(result) => {
            setActiveRoomRef({
              hostel: result.hostel,
              roomNo: result.roomNo,
              booking: result.booking,
            });
            setFilterModal(false);
          }}
          onClose={() => setFilterModal(false)}
        />
      )}

      {/* DIRECT BOOKING */}
      {directBookingModal && directBookingModal.open && (
        <DirectBookingModal
          modal={directBookingModal}
          onClose={() => setDirectBookingModal(null)}
          onSubmit={(b) => {
            addBookingToRoom(
              directBookingModal.hostel,
              directBookingModal.room.roomNo,
              b
            );
            setDirectBookingModal(null);
          }}
        />
      )}

      {/* CANCEL BOOKING */}
      {cancelModal && (
        <CancelModal
          modal={cancelModal}
          remarksText={remarksText}
          setRemarksText={(v) => setRemarksText(v)}
          onClose={() => setCancelModal(null)}
          onDone={async (remarks) => {
            // ✅ Use MongoDB-integrated handler from props
            if (typeof props.handleCancelModalCancel === "function") {
              await props.handleCancelModalCancel(remarks);
            } else {
              // ⚠️ Fallback to local-only cancellation (not recommended)
              console.warn("⚠️ handleCancelModalCancel not provided, using local-only cancel");  
              cancelBooking(
                cancelModal.hostel,
                cancelModal.room.roomNo,
                cancelModal.booking._id || cancelModal.booking.id,
                remarks || "Cancelled"
              );
            }
            setRemarksText("");
            setCancelModal(null);
          }}
        />
      )}

      {/* TOAST */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
          <div className="max-w-xs w-full bg-white border border-red-200 shadow-xl rounded-xl p-4 flex items-start gap-3">
            <div className="text-2xl">🔓”</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">
                {toast.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Click the bell to view.
              </p>
            </div>
            <button
              onClick={() => setToast({ show: false, message: "" })}
              className="text-gray-400 hover:text-gray-600 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* DOWNLOAD DATE FILTER MODAL */}
      {downloadDateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div
            className={`rounded-2xl p-6 w-[500px] shadow-xl ${
              theme === "dark"
                ? "bg-gray-800 text-gray-100"
                : "bg-white text-gray-900"
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h3
                className={`text-xl font-semibold flex items-center gap-2 ${
                  theme === "dark" ? "text-red-400" : "text-red-700"
                }`}
              >
                📋… Select Date Range for Complete Download
              </h3>
              <button
                className={
                  theme === "dark"
                    ? "text-gray-400 hover:text-red-400"
                    : "text-gray-500 hover:text-red-600"
                }
                onClick={() => {
                  setDownloadDateModal(false);
                  setDownloadFromDate("");
                  setDownloadToDate("");
                }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">From Date</label>
                <input
                  type="date"
                  value={downloadFromDate}
                  onChange={(e) => setDownloadFromDate(e.target.value)}
                  className={`w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-gray-100"
                      : "bg-white border-gray-300"
                  }`}
                />
              </div>
      
              <div>
                <label className="block text-sm font-medium mb-1">To Date</label>
                <input
                  type="date"
                  value={downloadToDate}
                  onChange={(e) => setDownloadToDate(e.target.value)}
                  className={`w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-500 ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-gray-100"
                      : "bg-white border-gray-300"
                  }`}
                />
              </div>
      
              <p
                className={`text-xs ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}
              >
                All bookings and enquiries overlapping with this date range will be included.
              </p>
      
              <div
                className={`p-4 rounded-lg text-sm space-y-2 ${
                  theme === "dark"
                    ? "bg-blue-900/20 border border-blue-700 text-blue-200"
                    : "bg-blue-50 border border-blue-200 text-blue-800"
                }`}
              >
                <p className="font-semibold">📋 Download Includes:</p>
                <ul className="space-y-1 ml-4">
                  <li>✅ <strong>Approved Bookings</strong> - with all details</li>
                  <li>❌ <strong>Rejected Enquiries</strong> - with rejection reasons</li>
                  <li>ðŸš« <strong>Cancelled Bookings</strong> - with cancel remarks</li>
                  <li>ðŸ†“ <strong>Free Bookings</strong> - with free remarks</li>
                  <li>ðŸ‘¤ <strong>All Guest Info</strong> - Gender, City, State, Department, RollNo</li>
                  <li>📋 <strong>All Remarks</strong> - Cancel remarks, Free remarks, Rejection reasons</li>
                </ul>
              </div>
            </div>
      
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setDownloadDateModal(false);
                  setDownloadFromDate("");
                  setDownloadToDate("");
                }}
                className={`px-6 py-2 rounded transition font-medium ${
                  theme === "dark"
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-900"
                }`}
              >
                Cancel
              </button>
      
              <button
                onClick={handleDownloadWithDates}
                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition font-medium"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH GUEST */}
      {searchModal && (
        <SearchGuestModal
          hostelData={completeHostelData && Object.keys(completeHostelData).length > 0 ? completeHostelData : hostelData}
          onSelectGuest={(result) => {
            setActiveRoomRef({
              hostel: result.hostel,
              roomNo: result.roomNo,
              booking: result.booking,
            });
            setSearchModal(false);
          }}
          onClose={() => setSearchModal(false)}
        />
      )}
      
      {/* ========================================================= */}
      {/* ROOM BLOCKING MODALS */}
      {/* ========================================================= */}
      
      {/* Block Room Modal */}
      {blockRoomModal && (
        <BlockRoomModal
          hostelName={blockRoomModal.hostelName}
          roomNo={blockRoomModal.roomNo}
          onClose={() => setBlockRoomModal(null)}
          onSuccess={handleBlockSuccess}
          theme={theme}
        />
      )}

      {/* Unblock Room Modal */}
      {unblockRoomModal && (
        <UnblockRoomModal
          hostelName={unblockRoomModal.hostelName}
          roomNo={unblockRoomModal.roomNo}
          blockInfo={unblockRoomModal.blockInfo}
          onClose={() => setUnblockRoomModal(null)}
          onSuccess={handleUnblockSuccess}
          theme={theme}
        />
      )}

      {/* Blocked Room Info Modal */}
      {blockedRoomInfoModal && (
        <BlockedRoomInfoModal
          hostelName={blockedRoomInfoModal.hostelName}
          roomNo={blockedRoomInfoModal.roomNo}
          blockInfo={blockedRoomInfoModal.blockInfo}
          onClose={() => setBlockedRoomInfoModal(null)}
          theme={theme}
        />
      )}
    </main>
  );          
}