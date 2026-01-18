// src/GuestRoomDashboard.jsx - UPDATED WITH CENTRALIZED REFRESH
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isWithinInterval } from "date-fns";
import { AlertCircle } from "lucide-react";

import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import SettingsPage from "./pages/SettingsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AdminEnquiryPage from "./pages/AdminEnquiryPage";
import AllHostelsPortal from "./pages/AllHostelsPortal";
import GuestEnquiryPage from "./pages/GuestEnquiryPage";

import ProfileModal from "./components/ProfileModal";
import ExtensionModal from "./components/ExtensionModal";

import { ToastProvider } from "./context/ToastContext";
import { useAuth } from "./context/AuthContext.js";
import { useHostelDataPolling } from "./hooks/useHostelDataPolling";
import { DashboardRefreshProvider } from "./context/DashboardRefreshContext";
import CalendarGuestsPage from "./pages/CalendarGuestsPage";
import useIdleTimeout from "./hooks/useIdleTimeout";
import ScreenSaver from "./components/ScreenSaver";
import PaymentModal from "./components/PaymentModal";
import DefaulterManagement from "./pages/DefaulterManagement";
import { BACKEND_URL } from "./utils/apiConfig";

const API = BACKEND_URL;

export default function GuestRoomDashboard() {
  const { currentUser, loading, logout } = useAuth();

  // Socket.IO hook (handles all data)
  const {
    hostelData,
    completeHostelData,
    loading: hostelLoading,
    error: hostelError,
    lastUpdate,
    connected,
    refresh
  } = useHostelDataPolling({});

  // Screen Saver
  const isIdle = useIdleTimeout(2); // 5 minutes idle timeout
  const [showScreenSaver, setShowScreenSaver] = useState(false);

  // Profile Modal
  const [profileOpen, setProfileOpen] = useState(false);

  // Navigation & Selection
  const [activeTab, setActiveTab] = useState("Home");
  const [activeHostel, setActiveHostel] = useState(null);
  const [activeRoomRef, setActiveRoomRef] = useState(null);

  // 🔍 DEBUG: track active tab
 console.log("🧭 Dashboard activeTab =", activeTab);

  // Modal States
  const [bookingSelectModal, setBookingSelectModal] = useState(null);
  const [directBookingModal, setDirectBookingModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [extensionModal, setExtensionModal] = useState(null);

  // Form Data
  const [remarksText, setRemarksText] = useState("");

  // Calendar
  const [showCalendarPage, setShowCalendarPage] = useState(false);
  const [calendarDate, setCalendarDate] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateBookings, setDateBookings] = useState([]);

  // Guest Prefill
  const [prefillGuest, setPrefillGuest] = useState(null);

  // Defaulter Payment Modal
  const [defaulterPaymentModal, setDefaulterPaymentModal] = useState(null);

  // Settings
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem("notificationsEnabled") === "true"
  );

  // User Data
  const [currentUserData, setCurrentUserData] = useState(currentUser);

  useEffect(() => {
    setCurrentUserData(currentUser);
  }, [currentUser]);

  // Show screen saver when idle
  useEffect(() => {
    if (isIdle) {
      setShowScreenSaver(true);
    }
  }, [isIdle]);

  // Theme + notifications save
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("dark", theme === "dark");
    document.body.classList.toggle("light", theme === "light");

    localStorage.setItem("theme", theme);
    localStorage.setItem(
      "notificationsEnabled",
      notificationsEnabled ? "true" : "false"
    );
  }, [theme, notificationsEnabled]);

  // Extension modal listener
  useEffect(() => {
    const handleExtensionOpen = (e) => {
      const { hostel, roomNo, booking } = e.detail;
      setExtensionModal({
        open: true,
        hostel,
        roomNo,
        booking
      });
    };

    window.addEventListener("open-extension-modal", handleExtensionOpen);
    return () =>
      window.removeEventListener("open-extension-modal", handleExtensionOpen);
  }, []);

  // Prefill guest after enquiry approval
  useEffect(() => {
    const checkPrefill = () => {
      const raw = localStorage.getItem("lastApprovedGuest");
      if (!raw) return;

      try {
        const guest = JSON.parse(raw);
        setPrefillGuest(guest);
      } catch {}
    };

    checkPrefill();
    window.addEventListener("lastApprovedGuestChanged", checkPrefill);

    return () =>
      window.removeEventListener("lastApprovedGuestChanged", checkPrefill);
  }, []);
  
  // 🔥 CENTRALIZED REFRESH HANDLER
  const handleRefresh = useCallback((silent = false) => {
    console.log('🔄 Dashboard refresh triggered - silent:', silent);
    refresh(); // Call your existing refresh from useHostelDataPolling
  }, [refresh]);

  // Early returns for loading states
  if (loading) {
    return (
      <main className="flex items-center justify-center h-screen text-gray-500">
        Kindly Wait Dashboard Loading...
      </main>
    );
  }

  if (!currentUser) {
    window.location.href = "/";
    return null;
  }

  if (hostelLoading) {
    return (
      <main className="flex flex-col items-center justify-center h-screen text-gray-500 gap-4">
        <div className="text-xl font-semibold">Loading Rooms & Hostels...</div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'}`} />
          <span className="text-sm">
            {connected ? 'Connected to real-time updates' : 'Connecting...'}
          </span>
        </div>
        <div className="text-xs text-gray-400 mt-2">
          API: {API}
        </div>
      </main>
    );
  }

  if (hostelError && !hostelLoading) {
    return (
      <main className="flex flex-col items-center justify-center h-screen text-gray-500 gap-4">
        <div className="text-xl font-semibold text-red-600">⚠️ Connection Error</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-md text-center">
          {hostelError}
        </div>
        <div className="text-xs text-gray-400">
          Trying to connect to: {API}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm">Disconnected</span>
        </div>
        <button
          onClick={refresh}
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          🔄 Retry Connection
        </button>
      </main>
    );
  }

  if (showCalendarPage && calendarDate) {
    return (
      <DashboardRefreshProvider onRefresh={handleRefresh}>
        <ToastProvider theme={theme}>
          <CalendarGuestsPage
            selectedDate={calendarDate}
            hostelData={hostelData}
            completeHostelData={completeHostelData}
            onBack={() => {
              setShowCalendarPage(false);
              setCalendarDate(null);
            }}
            theme={theme}
            currentUser={currentUser}
          />
        </ToastProvider>
      </DashboardRefreshProvider>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
    } catch {}
    setTimeout(() => (window.location.href = "/"), 300);
  };

  const statsForHostel = (hostel) => {
    const rooms = hostelData[hostel]?.rooms || [];
    const total = rooms.length;
    const occupied = rooms.filter(
      (r) => r.bookings && r.bookings.length > 0
    ).length;

    return { total, occupied, available: total - occupied };
  };

  const statsAll = () => {
    const rooms = Object.values(hostelData).flatMap((h) => h.rooms || []);
    const total = rooms.length;
    const occupied = rooms.filter(
      (r) => r.bookings && r.bookings.length > 0
    ).length;

    return { total, occupied, available: total - occupied };
  };

  function handleStartDirectBooking({ hostelName, roomId, prefill = null }) {
    const guestToUse = prefill || prefillGuest || null;

    setDirectBookingModal({
      open: true,
      hostel: hostelName,
      room: { roomNo: roomId },
      prefill: guestToUse
    });

    try {
      localStorage.removeItem("lastApprovedGuest");
    } catch {}
    setPrefillGuest(null);
  }

  const findRoom = (hostel, roomNo) =>
    hostelData[hostel]?.rooms.find((r) => r.roomNo === roomNo);

  const setRightPanelToRoom = (hostel, roomNo, bookingId = null) => {
    if (!hostel || !roomNo) return setActiveRoomRef(null);

    let room = findRoom(hostel, roomNo);
  
    if (!room && completeHostelData[hostel]) {
      room = completeHostelData[hostel].rooms?.find((r) => r.roomNo === roomNo);
      console.log(`📦 Found room in completeHostelData: ${hostel} / ${roomNo}`);
    }

    if (!room) {
      console.warn(`❌ Room not found: ${hostel} / ${roomNo}`);
      return;
    }

    if (!room.bookings?.length) {
      setActiveRoomRef({ hostel, roomNo, booking: null });
      return;
    }

    if (bookingId) {
      const bk = room.bookings.find(
        (b) => b.id === bookingId || b._id === bookingId
      );
    
      if (bk) {
        console.log("✅ Booking found and selected:", bookingId);
        setActiveRoomRef({ hostel, roomNo, booking: bk });
      } else {
        console.warn(`❌ Booking not found in room: ${bookingId}`);
        const allRoomBookings = room.bookings;
        console.log("Available booking IDs:", allRoomBookings.map(b => b.id || b._id));
        setActiveRoomRef({ hostel, roomNo, booking: null });
      }
      return;
    }

    if (room.bookings.length === 1) {
      setActiveRoomRef({ hostel, roomNo, booking: room.bookings[0] });
    } else {
      setBookingSelectModal({ hostel, room, bookings: room.bookings });
    }
  };

  const addBookingToRoom = (hostel, roomNo, booking) => {
    console.log("📘 Booking added, triggering refresh...");
    const bookingId = booking._id || booking.id;
    
    setTimeout(() => {
      refresh();
      setTimeout(() => {
        setRightPanelToRoom(hostel, roomNo, bookingId);
      }, 500);
    }, 100);
  };

  const cancelBooking = (hostel, roomNo, bookingId, remarks) => {
    console.log("❌ Booking cancelled, Socket.IO will sync...");
    
    if (activeRoomRef?.booking?.id === bookingId) {
      setActiveRoomRef(null);
    }
    
    setTimeout(() => refresh(), 100);
  };

  const handleCancelModalCancel = async (remarks) => {
    if (!cancelModal) return;

    const { hostel, room, booking } = cancelModal;

    const currentHostel = hostelData[hostel];
    if (!currentHostel) {
      alert("❌ Hostel not found");
      setCancelModal(null);
      return;
    }

    const currentRoom = currentHostel.rooms?.find((r) => r.roomNo === room?.roomNo) || null;
    if (!currentRoom) {
      alert("❌ Room not found");
      setCancelModal(null);
      return;
    }

    const mongoId =
      (booking._id && !booking._id.toString().startsWith("b_")
        ? booking._id
        : null) ||
      (booking.id && !booking.id.toString().startsWith("b_")
        ? booking.id
        : null);

    if (!mongoId) {
      console.error("❌ Missing MongoDB _id for booking:", booking);
      alert(
        "❌ Cannot cancel: Booking is not stored in the database yet. Please refresh the page and try again."
      );
      setCancelModal(null);
      return;
    }

    try {
      console.log("⬆️ Cancelling booking in MongoDB:", mongoId);

      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API}/api/bookings/${mongoId}/cancel`, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify({
          remarks: remarks || "Cancelled",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to cancel booking");
      }

      const result = await response.json();
      console.log("✅ Booking cancelled in MongoDB:", result);

      cancelBooking(hostel, room.roomNo, booking.id || booking._id, remarks);

      setCancelModal(null);
      setRemarksText("");
      alert("✅ Booking cancelled successfully!");
    } catch (error) {
      console.error("❌ Cancellation error:", error);
      alert(`❌ Failed to cancel booking: ${error.message}`);
    }
  };

  const extendBooking = (hostel, roomNo, bookingId, newToDate, remarks, extensionAttachments) => {
    console.log("🔄 Booking extended, Socket.IO will sync...");
    
    setActiveRoomRef((ref) =>
      ref?.booking?.id === bookingId
        ? { 
            ...ref, 
            booking: { 
                ...ref.booking, 
                to: newToDate,
                extendRemarks: remarks || ref.booking.extendRemarks,
                extensionAttachments: extensionAttachments || ref.booking.extensionAttachments
            } 
          }
        : ref
    );
    
    setTimeout(() => refresh(), 100);
  };

  const handleExtensionModalExtend = async (extensionData, newToDate, remarks, extensionAttachments) => {
    console.log("================================================================================");
    console.log("🔥 DASHBOARD: handleExtensionModalExtend called");
    console.log("📦 Parameters:", {
      extensionData: extensionData ? "present" : "null",
      hasBooking: extensionData?.booking ? "yes" : "no",
      newToDate,
      remarks,
      filesCount: extensionAttachments?.length || 0
    });
    console.log("================================================================================");

    // ✅ VALIDATE: extensionData must be the modal object
    if (!extensionData || !extensionData.booking) {
      alert("❌ Invalid extension data");
      return;
    }

    const { hostel, roomNo, booking } = extensionData;

    // Validate hostel exists
    const currentHostel = hostelData[hostel];
    if (!currentHostel) {
      alert("❌ Hostel not found");
      setExtensionModal(null);
      return;
    }

    // Validate room exists
    const currentRoom = currentHostel.rooms?.find((r) => r.roomNo === roomNo) || null;
    if (!currentRoom) {
      alert("❌ Room not found");
      setExtensionModal(null);
      return;
    }

    // ✅ VALIDATE: New date must be after current checkout
    const currentTo = new Date(booking.to);
    const newTo = new Date(newToDate);

    if (newTo <= currentTo) {
      alert("❌ New checkout date must be after the current checkout date.");
      return;
    }

    // ✅ CHECK FOR CONFLICTS (exclude cancelled/completed bookings)
    const bookingFrom = new Date(booking.from);
    
    const hasFutureConflict = (currentRoom.bookings || []).some((b) => {
      // Skip the current booking
      const sameBooking =
        (b.id && booking.id && b.id === booking.id) ||
        (b._id && booking._id && b._id === booking._id);
      if (sameBooking) return false;

      // ✅ CRITICAL FIX: Skip cancelled, checked_out, and no_show bookings
      if (["cancelled", "checked_out", "no_show"].includes(b.status)) {
        return false;
      }
      
      const otherFrom = new Date(b.from);
      const otherTo = new Date(b.to);

      // Check if extension period overlaps with other booking
      const overlaps = bookingFrom <= otherTo && newTo >= otherFrom;
      
      if (overlaps) {
        console.log("⚠️ Conflict detected with booking:", {
          guest: b.guest,
          from: b.from,
          to: b.to,
          status: b.status
        });
      }
      
      return overlaps;
    });

    if (hasFutureConflict) {
      alert(
        "❌ Cannot extend: these dates overlap another booking in this room.\nPlease use Direct Booking or ask the guest to raise a new enquiry."
      );
      return;
    }

    // ✅ GET MONGODB ID
    const mongoId =
      (booking._id && !booking._id.toString().startsWith("b_")
        ? booking._id
        : null) ||
      (booking.id && !booking.id.toString().startsWith("b_")
        ? booking.id
        : null);
      
    if (!mongoId) {
      console.error("❌ Missing MongoDB _id for booking:", booking);
      alert(
        "❌ Cannot extend: Booking is not stored in the database yet. Please refresh the page and try again."
      );
      setExtensionModal(null);
      return;
    }
    
    // ✅ CALL BACKEND API
    try {
      console.log("⬆️ Extending booking in MongoDB:", mongoId);

      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const payload = {
        newTo: newToDate,
        hostel,
        roomNo,
        remarks: remarks || "",
        extensionAttachments: Array.isArray(extensionAttachments) ? extensionAttachments : []
      };

      console.log("📤 Sending payload:", JSON.stringify(payload, null, 2));

      const response = await fetch(`${API}/api/bookings/${mongoId}/extend`, {
        method: "PUT",
        credentials: "include",
        headers,
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to extend booking");
      }
      
      const result = await response.json();
      console.log("✅ Booking extended in MongoDB:", result);

      // ✅ UPDATE LOCAL STATE
      extendBooking(hostel, roomNo, booking.id || booking._id, newToDate, remarks, extensionAttachments);

      // ✅ CLOSE MODAL
      setExtensionModal(null);
      
      alert("✅ Booking extended successfully!");

      // ✅ TRIGGER REFRESH
      setTimeout(() => refresh(), 100);

    } catch (error) {
      console.error("================================================================================");
      console.error("❌ Extension error:", error);
      console.error("Stack:", error.stack);
      console.error("================================================================================");
      alert(`❌ Failed to extend booking: ${error.message}`);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setActiveRoomRef(null);

    const bookingsOnDate = Object.entries(hostelData).flatMap(
      ([hostel, h]) =>
        (h.rooms || [])
          .filter((r) =>
            (r.bookings || []).some((b) =>
              isWithinInterval(date, {
                start: new Date(b.from),
                end: new Date(b.to)
              })
            )
          )
          .flatMap((r) =>
            r.bookings
              .filter((b) =>
                isWithinInterval(date, {
                  start: new Date(b.from),
                  end: new Date(b.to)
                })
              )
              .map((b) => ({
                hostel,
                roomNo: r.roomNo,
                booking: b
              }))
          )
    );

    setDateBookings(bookingsOnDate);
  };

  const tileClassName = ({ date }) => {
    const hasBooking = Object.values(hostelData).some((h) =>
      (h.rooms || []).some((r) =>
        (r.bookings || []).some((b) =>
          isWithinInterval(date, {
            start: new Date(b.from),
            end: new Date(b.to)
          })
        )
      )
    );
    return hasBooking ? "bg-red-200 rounded-full" : null;
  };

  const sidebarVariants = {
    hidden: { x: -280, opacity: 0, transition: { duration: 0.4 } },
    visible: { x: 0, opacity: 1, transition: { duration: 0.4 } }
  };

  return (
    // 🔥 WRAP EVERYTHING IN DashboardRefreshProvider
    <DashboardRefreshProvider onRefresh={handleRefresh}>
      <ToastProvider theme={theme}>
        <div
          className={`flex h-screen font-sans transition-colors duration-300 ${
            theme === "dark"
              ? "bg-gray-900 text-gray-100"
              : "bg-gray-50 text-gray-900"
          }`}
        >
          {/* TOP HEADER */}
          <div
            className={`fixed left-64 right-0 top-0 h-16 flex items-center justify-between px-6 shadow-md z-20 ${
              theme === "dark" ? "bg-gray-800" : "bg-white"
            }`}
          >
            {/* LEFT SIDE: Real-time Status */}
            <div className="flex items-center gap-4">
              {/* Connection Status Indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className={`text-sm font-medium ${connected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {connected ? '🔴 LIVE' : '⚠️ Reconnecting...'}
                </span>
              </div>

              {/* Last Update Time */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Updated: {new Date(lastUpdate).toLocaleTimeString()}
              </div>

              {/* Manual Refresh Button */}
              <button
                onClick={refresh}
                disabled={hostelLoading}
                className={`px-3 py-1 text-xs rounded-md transition ${
                  hostelLoading
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                title="Manually refresh data"
              >
                {hostelLoading ? '⏳ Refreshing...' : '🔄 Refresh'}
              </button>
            </div>

            {/* RIGHT SIDE: Profile & Logout */}
            <div className="flex items-center gap-4">
              {activeTab !== "AllHostelsPortal" && (
                <button
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  <span className="font-medium">{currentUserData?.name || "Profile"}</span>
                </button>
              )}

              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Logout
              </button>
            </div>
          </div>

          {/* SIDEBAR */}
          <AnimatePresence>
            {activeTab !== "AllHostelsPortal" && (
              <motion.div
                key="sidebar"
                variants={sidebarVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
                className="z-20"
              >
                <Sidebar
                  activeHostel={activeHostel}
                  setActiveHostel={(hostel) => {
                    setActiveHostel(hostel);

                    // ⚠️ Do NOT override Defaulters tab
                    setActiveTab((prev) => (prev === "Defaulters" ? prev : "Home"));
                  }}
                  setActiveRoomRef={setActiveRoomRef}
                  hostelData={hostelData}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  theme={theme}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* MAIN CONTENT */}
          <main className="flex-1 overflow-y-auto mt-16">
            {activeTab === "Home" && (
              <MainContent
                {...{
                  activeTab,
                  setActiveTab,
                  activeHostel,
                  setActiveHostel,
                  hostelData,
                  completeHostelData,
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
                  extensionModal,
                  setExtensionModal,
                  remarksText,
                  setRemarksText,
                  cancelBooking,
                  handleCancelModalCancel,
                  addBookingToRoom,
                  selectedDate,
                  dateBookings,
                  handleDateClick,
                  tileClassName,
                  notificationsEnabled,
                  setNotificationsEnabled,
                  theme,
                  setTheme,
                  handleStartDirectBooking,
                  currentUserData,
                }}
              />
            )}

            {activeTab === "Settings" && (
              <SettingsPage
                theme={theme}
                setTheme={setTheme}
                notificationsEnabled={notificationsEnabled}
                setNotificationsEnabled={setNotificationsEnabled}
                setActiveTab={setActiveTab}
                hostelData={hostelData}
              />
            )}

            {activeTab === "Enquiry" && (
              <AdminEnquiryPage setActiveTab={setActiveTab} />
            )}

            {activeTab === "Analytics" && (
              <AnalyticsPage
                hostelData={hostelData}
                setActiveTab={setActiveTab}
                theme={theme}
              />
            )}

            {activeTab === "AllHostelsPortal" && (
              <AllHostelsPortal
                hostelData={hostelData}
                setHostelData={(updater) => {
                  // ✅ CRITICAL FIX: setHostelData was missing
                  console.log("🔄 AllHostelsPortal updating hostelData");
                  
                  if (typeof updater === 'function') {
                    // Handle function updater (prev => newState)
                    const newData = updater(hostelData);
                    console.log("✅ Updated hostelData:", Object.keys(newData));
                    // Trigger refresh to sync with backend
                    setTimeout(() => refresh(), 100);
                  } else {
                    // Handle direct value
                    console.log("✅ Direct hostelData update");
                    setTimeout(() => refresh(), 100);
                  }
                }}
                prefillGuest={prefillGuest}
                theme={theme}
                onBackHome={() => {
                  localStorage.removeItem("lastApprovedGuest");
                  setPrefillGuest(null);
                  setActiveTab("Home");
                }}
                handleStartDirectBooking={handleStartDirectBooking}
                setExtensionModal={setExtensionModal}
              />
            )}
          </main>   
        </div>  

        {activeTab === "Defaulters" && (
          <div className="ml-64 mt-16">
            <DefaulterManagement
              currentUser={currentUser}
              onBack={() => {
                setActiveTab("Home");
                if (currentUser?.assignedHostel) {
                  setActiveHostel(currentUser.assignedHostel);
                }
              }}
              onOpenPaymentModal={(booking) => {
                setDefaulterPaymentModal(booking);
              }}
            />
          </div>
        )}

        {extensionModal && (
          <ExtensionModal
            modal={extensionModal}
            onClose={() => setExtensionModal(null)}
            onExtend={handleExtensionModalExtend}
          />
        )}

        {/* ✅ DEFAULTER PAYMENT MODAL */}
        {defaulterPaymentModal && (
          <PaymentModal
            booking={defaulterPaymentModal}
            onClose={() => setDefaulterPaymentModal(null)}
            onSuccess={(updatedBooking) => {
              console.log("✅ Payment successful:", updatedBooking);
              setDefaulterPaymentModal(null);
              refresh(); // Refresh data after payment
            }}
          />
        )}

        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          currentUser={currentUserData}
          onUpdate={(updatedUser) => {
            console.log("✅ Profile updated:", updatedUser);
            setCurrentUserData(updatedUser);

            try {
              const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
              localStorage.setItem("user", JSON.stringify({
                ...existingUser,
                ...updatedUser
              }));
            } catch (e) {
              console.error("Failed to update localStorage:", e);
            }
            
            window.dispatchEvent(new CustomEvent("userProfileUpdated", {
              detail: updatedUser
            }));
          }}
        />
        {/* ✅ SCREEN SAVER - RENDERS OVER EVERYTHING */}
        <ScreenSaver
          isActive={showScreenSaver}
          onDismiss={() => setShowScreenSaver(false)}
        />
      </ToastProvider>
    </DashboardRefreshProvider>
  );
}