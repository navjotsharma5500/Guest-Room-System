// src/GuestRoomDashboard.jsx - COMPLETE WITH HALL BOOKING INTEGRATION
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isWithinInterval } from "date-fns";
import { AlertCircle, Building2, Users } from "lucide-react";

import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import SettingsPage from "./pages/SettingsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AdminEnquiryPage from "./pages/AdminEnquiryPage";
import AllHostelsPortal from "./pages/AllHostelsPortal";
import GuestEnquiryPage from "./pages/GuestEnquiryPage";
import HallBookingDashboard from "./components/HallBookings/HallBookingDashboard";
import FeedbackPage from "./pages/FeedbackPage";
import CalendarGuestsPage from "./pages/CalendarGuestsPage";
import DefaulterManagement from "./pages/DefaulterManagement";

import ProfileModal from "./components/ProfileModal";
import ExtensionModal from "./components/ExtensionModal";
import PaymentModal from "./components/PaymentModal";

import { ToastProvider, useToast } from "./context/ToastContext";
import { useAuth } from "./context/AuthContext.js";
import { useHostelDataPolling } from "./hooks/useHostelDataPolling";
import { useHallDataPolling } from "./hooks/useHallDataPolling";
import { DashboardRefreshProvider } from "./context/DashboardRefreshContext";

import useIdleTimeout from "./hooks/useIdleTimeout";
import ScreenSaver from "./components/ScreenSaver";

import { BACKEND_URL } from "./utils/apiConfig";

const API = BACKEND_URL;

export default function GuestRoomDashboard() {
  const { currentUser, loading, logout } = useAuth();

  const { showToast } = useToast();

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

  // 🆕 HALL DATA POLLING (for admin and assistant)
  const {
    hallData: liveHallData,
    loading: hallLoading,
    error: hallError,
    lastUpdate: hallLastUpdate,
    connected: hallConnected,
    refresh: hallRefresh
  } = useHallDataPolling({});

  // Screen Saver
  const isIdle = useIdleTimeout(2); // 5 minutes idle timeout
  const [showScreenSaver, setShowScreenSaver] = useState(false);

  // Profile Modal
  const [profileOpen, setProfileOpen] = useState(false);

  // Navigation & Selection
  const [activeTab, setActiveTab] = useState("Home");
  const [activeHostel, setActiveHostel] = useState(null);
  const [activeRoomRef, setActiveRoomRef] = useState(null);

  // 🆕 HALL BOOKING DASHBOARD STATE
  const [showHallDashboard, setShowHallDashboard] = useState(false);
  const [hallData, setHallData] = useState({});

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

  // Update local hallData state when polling hook updates
  useEffect(() => {
    if (liveHallData && Object.keys(liveHallData).length > 0) {
      setHallData(liveHallData);
    }
  }, [liveHallData]);

  // Show screen saver when idle
  useEffect(() => {
    if (isIdle) {
      setShowScreenSaver(true);
    }
  }, [isIdle]);

  // 🆕 AUTO-REDIRECT: Assistant goes directly to Hall Dashboard
  useEffect(() => {
    if (currentUser?.role === "assistant") {
      setShowHallDashboard(true);
    }
  }, [currentUser]);

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

    const booking = bookingId
      ? room.bookings.find((b) => b._id === bookingId)
      : room.bookings[0];

    setActiveRoomRef({ hostel, roomNo, booking });
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    const dateStr = date.toISOString().split("T")[0];

    const bookings = [];
    Object.keys(hostelData).forEach((hostel) => {
      (hostelData[hostel]?.rooms || []).forEach((room) => {
        (room.bookings || []).forEach((booking) => {
          const fromD = new Date(booking.from);
          const toD = new Date(booking.to);
          const clickedD = new Date(dateStr);

          if (
            clickedD.getTime() >= fromD.getTime() &&
            clickedD.getTime() <= toD.getTime()
          ) {
            bookings.push({
              ...booking,
              hostel,
              roomNo: room.roomNo
            });
          }
        });
      });
    });

    setDateBookings(bookings);

    if (bookings.length > 0) {
      setCalendarDate(date);
      setShowCalendarPage(true);
    } else {
      showToast("No bookings on this date.", "info");
    }
  };

  const tileClassName = ({ date, view }) => {
    if (view !== "month") return "";
    const dateStr = date.toISOString().split("T")[0];

    const hasBooking = Object.values(hostelData).some((hostel) =>
      hostel.rooms?.some((room) =>
        room.bookings?.some((booking) => {
          const fromD = new Date(booking.from);
          const toD = new Date(booking.to);
          const checkD = new Date(dateStr);

          return (
            checkD.getTime() >= fromD.getTime() &&
            checkD.getTime() <= toD.getTime()
          );
        })
      )
    );

    return hasBooking ? "has-booking" : "";
  };

  const addBookingToRoom = async ({
    hostelName,
    roomNo,
    guest,
    from,
    to,
    checkInTime,
    checkOutTime,
    contact,
    email,
    college,
    course,
    purpose,
    organisation,
    paymentType,
    totalAmount,
    paidAmount,
    balanceAmount,
    remarks
  }) => {
    try {
      const bookingData = {
        hostel: hostelName,
        roomNo,
        guest,
        from,
        to,
        checkInTime,
        checkOutTime,
        contact,
        email,
        college,
        course,
        purpose,
        organisation,
        paymentType,
        totalAmount,
        paidAmount,
        balanceAmount,
        remarks,
        status: "booked"
      };

      const response = await fetch(`${API}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(bookingData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add booking");
      }

      const savedBooking = await response.json();
      console.log("✅ Booking added:", savedBooking);

      showToast("✅ Booking added successfully", "success");
      setDirectBookingModal(null);
      setPrefillGuest(null);

      setTimeout(() => refresh(), 500);
    } catch (error) {
      console.error("❌ Error adding booking:", error);
      showToast(`❌ ${error.message}`, "error");
    }
  };

  const cancelBooking = async () => {
    if (!cancelModal?.booking) return;

    const { booking } = cancelModal;
    const remarks = remarksText.trim();

    try {
      const response = await fetch(`${API}/bookings/${booking._id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ remarks })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel booking");
      }

      const updatedBooking = await response.json();
      console.log("✅ Booking cancelled:", updatedBooking);

      showToast("✅ Booking cancelled successfully", "success");
      setCancelModal(null);
      setBookingSelectModal(null);
      setRemarksText("");

      setTimeout(() => refresh(), 500);
    } catch (error) {
      console.error("❌ Error cancelling booking:", error);
      showToast(`❌ ${error.message}`, "error");
    }
  };

  const handleCancelModalCancel = () => {
    setCancelModal(null);
    setRemarksText("");
  };

  const handleExtensionModalExtend = async ({ hostel, roomNo, booking, extendedDate }) => {
    try {
      const response = await fetch(`${API}/bookings/${booking._id}/extend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ extendedDate })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to extend booking");
      }

      const updatedBooking = await response.json();
      console.log("✅ Booking extended:", updatedBooking);

      showToast("✅ Booking extended successfully", "success");
      setExtensionModal(null);

      setTimeout(() => refresh(), 500);
    } catch (error) {
      console.error("❌ Error extending booking:", error);
      showToast(`❌ ${error.message}`, "error");
    }
  };

  const sidebarVariants = {
    hidden: { x: "-100%", opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { duration: 0.3, ease: "easeInOut" } }
  };

  return (
    <DashboardRefreshProvider onRefresh={handleRefresh}>
      <ToastProvider theme={theme}>
        <div
          className={`flex flex-col h-screen ${
            theme === "dark"
              ? "bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100"
              : "bg-gradient-to-b from-gray-50 to-white text-gray-900"
          }`}
        >
          {/* FIXED HEADER */}
          <div
            className={`fixed top-0 left-0 right-0 z-40 h-16 border-b-2 shadow-lg backdrop-blur-md ${
              theme === "dark"
                ? "bg-gray-800/95 border-gray-700"
                : "bg-white/95 border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between h-full px-6">
              {/* LEFT SECTION - Logo & Title */}
              <div className="flex items-center gap-4">
                <motion.img
                  src="https://www.thapar.edu/images/tiet-logo.svg"
                  alt="Logo"
                  className="h-10 w-10 rounded-lg shadow-lg"
                  whileHover={{ rotate: 360, scale: 1.1 }}
                  transition={{ duration: 0.6 }}
                />
                <motion.h1
                  className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent"
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                >
                  Thapar Institute
                </motion.h1>
              </div>

              {/* CENTER SECTION - Connection Status & Refresh */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <div className={`w-2 h-2 rounded-full ${
                    connected ? 'bg-green-500 animate-pulse' : 'bg-yellow-500 animate-pulse'
                  }`} />
                  <span className="text-xs font-medium">
                    {connected ? 'Live' : 'Connecting'}
                  </span>
                </div>

                <button
                  onClick={() => refresh()}
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

              {/* RIGHT SIDE: Hall Toggle, Profile & Logout */}
              <div className="flex items-center gap-4">
                {/* 🆕 HALL BOOKING TOGGLE (Admin Only) */}
                {currentUser?.role === "admin" && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowHallDashboard(!showHallDashboard)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg ${
                      showHallDashboard
                        ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800"
                        : "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800"
                    }`}
                  >
                    {showHallDashboard ? (
                      <>
                        <Building2 size={20} />
                        Guest Room Dashboard
                      </>
                    ) : (
                      <>
                        <Users size={20} />
                        Hall Bookings
                      </>
                    )}
                  </motion.button>
                )}

                {activeTab !== "AllHostelsPortal" && !showHallDashboard && (
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
          </div>

          {/* SIDEBAR - Hide for Hall Dashboard */}
          <AnimatePresence>
            {activeTab !== "AllHostelsPortal" && !showHallDashboard && (
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

                    // ⚠️ Do NOT override Defaulters or Feedback tabs
                    setActiveTab((prev) => (["Defaulters", "Feedback"].includes(prev) ? prev : "Home"));
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

          {/* MAIN CONTENT - CONDITIONAL DASHBOARD */}
          <main className="flex-1 overflow-y-auto mt-16">
            <AnimatePresence mode="wait">
              {showHallDashboard ? (
                /* 🆕 HALL BOOKING DASHBOARD */
                <motion.div
                  key="hall-dashboard"
                  initial={{ opacity: 0, x: 100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3 }}
                >
                  <HallBookingDashboard
                    hallData={hallData}
                    setHallData={setHallData}
                    theme={theme}
                    onBackHome={() => setShowHallDashboard(false)}
                  />
                </motion.div>
              ) : (
                /* ✅ EXISTING GUEST ROOM DASHBOARD */
                <motion.div
                  key="guest-dashboard"
                  initial={{ opacity: 0, x: -100 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ duration: 0.3 }}
                >
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
                        console.log("🔄 AllHostelsPortal updating hostelData");
                        
                        if (typeof updater === 'function') {
                          const newData = updater(hostelData);
                          console.log("✅ Updated hostelData:", Object.keys(newData));
                          setTimeout(() => refresh(), 100);
                        } else {
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

                  {activeTab === "Feedback" && (
                    <FeedbackPage
                      onBack={() => {
                        setActiveTab("Home");
                        if (currentUser?.assignedHostel) {
                          setActiveHostel(currentUser.assignedHostel);
                        }
                      }}
                      theme={theme}
                    />   
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </main>   
        </div>  

        {activeTab === "Defaulters" && (
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
            booking={{
              ...defaulterPaymentModal,
              _id: defaulterPaymentModal._id || defaulterPaymentModal.bookingId,
              guest: defaulterPaymentModal.guest,
              email: defaulterPaymentModal.email,
              contact: defaulterPaymentModal.contact,
              hostel: defaulterPaymentModal.hostel,
              roomNo: defaulterPaymentModal.roomNo,
              totalAmount: defaulterPaymentModal.totalDue || 0,
              paidAmount: 0,
              balanceAmount: defaulterPaymentModal.totalDue || 0,
              paymentType: "Paid",
              discount: 0,
              waveOff: 0
            }}
            onClose={() => setDefaulterPaymentModal(null)}
            onSuccess={(updatedBooking) => {
              console.log("✅ Payment successful:", updatedBooking);
              setDefaulterPaymentModal(null);
              refresh();
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