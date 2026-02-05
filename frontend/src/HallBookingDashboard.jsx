// src/HallBookingDashboard.jsx - UPDATED WITH GOOGLE DESIGN PATCHES
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Sun, Moon } from "lucide-react";
import "./styles/hallbooking.css";

import useHallDataPolling from "./hooks/useHallDataPolling";

import HallSidebar from "./components/HallBookings/HallSidebar";
import HallMainContent from "./components/HallBookings/HallMainContent";
import HallBookingsPortal from "./pages/HallBookingsPortal";
import HallCalendarPage from "./pages/HallCalendarPage";
import EventCalendarPage from "./pages/EventCalendarPage";
import HallCategoryPortal from "./pages/HallCategoryPortal";
import SettingsPage from "./pages/SettingsPage";
import ProfileModal from "./components/ProfileModal";
import HallExtensionModal from "./components/HallBookings/HallExtensionModal";

import { ToastProvider, useToast } from "./context/ToastContext";
import { useAuth } from "./context/AuthContext.js";
import { DashboardRefreshProvider } from "./context/DashboardRefreshContext";
import useIdleTimeout from "./hooks/useIdleTimeout";
import ScreenSaver from "./components/ScreenSaver";

import { BACKEND_URL } from "./utils/apiConfig";

const API = BACKEND_URL;

const sidebarVariants = {
  hidden: { x: -280, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: "spring", stiffness: 120 } },
};

export default function HallBookingDashboard() {
  const navigate = useNavigate();
  const { currentUser, loading, logout } = useAuth();
  const role = currentUser?.role || "guest";
  const { showToast } = useToast();

  const { 
    hallData, 
    loading: hallLoading, 
    hasData, 
    error: hallError,
    lastUpdate,
    connected,
    refresh: refreshHallData 
  } = useHallDataPolling();

  const isIdle = useIdleTimeout(5);
  const [showScreenSaver, setShowScreenSaver] = useState(false);

  const [profileOpen, setProfileOpen] = useState(false);

  const [activeSection, setActiveSection] = useState("home");

  const [extensionModal, setExtensionModal] = useState(null);

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem("notificationsEnabled") === "true"
  );

  const [currentUserData, setCurrentUserData] = useState(currentUser);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when activeSection changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeSection]);

  useEffect(() => {
    setCurrentUserData(currentUser);
  }, [currentUser]);

  useEffect(() => {
    if (isIdle) {
      setShowScreenSaver(true);
    }
  }, [isIdle]);

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

  useEffect(() => {
    const handleExtensionOpen = (e) => {
      const { hall, roomNo, booking } = e.detail;
      setExtensionModal({
        open: true,
        hall,
        roomNo,
        booking
      });
    };

    window.addEventListener("open-hall-extension-modal", handleExtensionOpen);
    return () =>
      window.removeEventListener("open-hall-extension-modal", handleExtensionOpen);
  }, []);

  const handleRefresh = useCallback((silent = false) => {
    console.log('🔄 Hall Dashboard refresh triggered - silent:', silent);
    refreshHallData();
  }, [refreshHallData]);

  const handleExtensionModalExtend = async (extensionData) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(
        `${API}/api/hall-bookings/${extensionData.bookingId}/extend`,
        {
          method: "PATCH",
          credentials: "include",
          headers,
          body: JSON.stringify({
            extendedDate: extensionData.newCheckOutDate,
            extendedTime: extensionData.newCheckOutTime,
            remarks: extensionData.remarks,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Extension failed");
      }

      showToast("Booking extended successfully", "success");
      setExtensionModal(null);
    } catch (error) {
      console.error("Extension error:", error);
      showToast(error.message || "Failed to extend booking", "error");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNavigate = (section) => {
    setActiveSection(section);
  };

  const getCategoryHallName = (categoryId) => {
    const mapping = {
      "hall": "Hall",
      "rooms": "Rooms",
      "creativity-rooms": "Creativity Rooms",
      "green-rooms": "Green Rooms",
      "open-area": "Open Area",
      "desk-area": "Desk Area",
      "common-rooms": "Common Rooms"
    };
    return mapping[categoryId] || null;
  };

  const isCategoryPortal = [
    "hall", "rooms", "creativity-rooms", "green-rooms", 
    "open-area", "desk-area", "common-rooms"
  ].includes(activeSection);

  // Access control
  if (!loading && currentUser && !["admin", "assistant"].includes(role)) {
    return (
      <main className="flex items-center justify-center h-screen text-gray-500">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You don't have permission to access Hall Bookings</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="hallbooking-primary-btn mt-4 px-6 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // Loading states with Google Design (PATCH 20)
  if (loading) {
    return (
      <main className={`
        flex flex-col items-center justify-center h-screen gap-4
        ${theme === "dark" ? "bg-[#202124]" : "bg-white"}
      `}>
        <div className={`
          w-12 h-12 border-4 rounded-full animate-spin
          ${theme === "dark"
            ? "border-[#3c4043] border-t-[#8ab4f8]"
            : "border-[#f1f3f4] border-t-[#1a73e8]"
          }
        `} />
        <div className={`text-base ${
          theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
        }`}>
          Loading Hall Booking Dashboard...
        </div>
      </main>
    );
  }

  if (!currentUser) {
    window.location.href = "/";
    return null;
  }

  if (hallLoading && !hasData) {
    return (
      <main className={`
        flex flex-col items-center justify-center h-screen gap-4
        ${theme === "dark" ? "bg-[#202124]" : "bg-white"}
      `}>
        <div className={`
          w-12 h-12 border-4 rounded-full animate-spin
          ${theme === "dark"
            ? "border-[#3c4043] border-t-[#8ab4f8]"
            : "border-[#f1f3f4] border-t-[#1a73e8]"
          }
        `} />
        <div className={`text-base ${
          theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
        }`}>
          Loading Hall Bookings...
        </div>
        <div className={`flex items-center gap-2 text-xs ${
          theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
        }`}>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>{connected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </main>
    );
  }

  if (hallError && !hasData) {
    return (
      <main className={`
        flex flex-col items-center justify-center h-screen gap-4
        ${theme === "dark" ? "bg-[#202124]" : "bg-white"}
      `}>
        <div className={`text-xl font-medium ${
          theme === "dark" ? "text-[#f28b82]" : "text-[#d93025]"
        }`}>
          ⚠️ Connection Error
        </div>
        <div className={`text-sm max-w-md text-center ${
          theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
        }`}>
          {hallError}
        </div>
        <button
          onClick={refreshHallData}
          className={`
            mt-4 px-6 py-2 rounded-lg font-medium transition-colors
            ${theme === "dark"
              ? "bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124]"
              : "bg-[#1a73e8] hover:bg-[#1967d2] text-white"
            }
          `}
        >
          Retry Connection
        </button>
      </main>
    );
  }

  return (
    <DashboardRefreshProvider onRefresh={handleRefresh}>
      <ToastProvider>
        <div className={`min-h-screen ${
          theme === "dark" ? "bg-[#202124]" : "bg-[#f8f9fa]"
        }`}>
          {/* Animated Background */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 sm:-top-40 -right-20 sm:-right-40 w-40 sm:w-80 h-40 sm:h-80 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute -bottom-20 sm:-bottom-40 -left-20 sm:-left-40 w-40 sm:w-80 h-40 sm:h-80 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-20 sm:-bottom-40 left-10 sm:left-20 w-40 sm:w-80 h-40 sm:h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>

          {/* HEADER - Mobile Responsive with Google Design */}
          <header className={`
            fixed top-0 left-0 right-0 h-16 z-30
            flex items-center justify-between px-3 sm:px-6
            border-b transition-colors duration-200
            ${theme === "dark"
              ? "bg-[#292a2d] border-[#3c4043]"
              : "bg-white border-[#dadce0]"
            }
          `}>
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`
                  md:hidden p-2 rounded-lg transition-colors
                  ${theme === "dark" 
                    ? "hover:bg-[#3c4043] text-[#9aa0a6]" 
                    : "hover:bg-[#f1f3f4] text-[#5f6368]"
                  }
                `}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>

              <h1 className={`text-base sm:text-xl font-normal truncate ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}>
                <span className="hidden sm:inline">Hall Booking Portal</span>
                <span className="sm:hidden">Hall Booking</span>
              </h1>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* Switch Dashboard Button - Only show for Admin */}
              {role === "admin" && (
                <button
                  onClick={() => navigate("/admin/dashboard-selector")}
                  className={`
                    px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors
                    ${theme === "dark"
                      ? "text-[#8ab4f8] hover:bg-[#3c4043]"
                      : "text-[#1a73e8] hover:bg-[#f1f3f4]"
                    }
                  `}
                >
                  <span className="hidden md:inline">Switch Dashboard</span>
                  <span className="md:hidden">Switch</span>
                </button>
              )}

              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className={`
                  p-1.5 sm:p-2 rounded-full transition-colors
                  ${theme === "dark" 
                    ? "hover:bg-[#3c4043] text-[#9aa0a6]" 
                    : "hover:bg-[#f1f3f4] text-[#5f6368]"
                  }
                `}
              >
                {theme === "dark" ? <Sun className="w-4 h-4 sm:w-5 sm:h-5" /> : <Moon className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              {/* Settings - Hidden on mobile */}
              <button
                onClick={() => setActiveSection("settings")}
                className={`
                  hidden sm:block p-2 rounded-full transition-colors
                  ${theme === "dark" 
                    ? "hover:bg-[#3c4043] text-[#9aa0a6]" 
                    : "hover:bg-[#f1f3f4] text-[#5f6368]"
                  }
                `}
              >
                <Settings className="w-5 h-5" />
              </button>

              {/* Profile - Responsive */}
              <button
                onClick={() => setProfileOpen(true)}
                className={`
                  flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-colors
                  ${theme === "dark" 
                    ? "hover:bg-[#3c4043] text-[#e8eaed]" 
                    : "hover:bg-[#f1f3f4] text-[#202124]"
                  }
                `}
              >
                <div className={`
                  w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium
                  ${theme === "dark" ? "bg-[#8ab4f8] text-[#202124]" : "bg-[#1a73e8] text-white"}
                `}>
                  {currentUser?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <span className="hidden lg:inline text-sm truncate max-w-[100px]">{currentUser?.name}</span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className={`
                  px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors
                  ${theme === "dark"
                    ? "bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#202124]"
                    : "bg-[#1a73e8] hover:bg-[#1967d2] text-white"
                  }
                `}
              >
                <span className="hidden sm:inline">Logout</span>
                <span className="sm:hidden">Out</span>
              </button>
            </div>
          </header>

          {/* SIDEBAR - Desktop and Mobile Overlay */}
          <AnimatePresence>
            {/* Desktop Sidebar - Always visible on md+ */}
            <motion.aside
              key="hall-sidebar-desktop"
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className={`
                fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 flex-col z-20
                hidden md:flex
                border-r transition-colors duration-200
                ${theme === "dark"
                  ? "bg-[#292a2d] border-[#3c4043]"
                  : "bg-white border-[#dadce0]"
                }
              `}
            >
              <HallSidebar
                theme={theme}
                activeSection={activeSection}
                onNavigate={handleNavigate}
              />
            </motion.aside>

            {/* Mobile Sidebar Overlay */}
            {mobileMenuOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/50 z-40 md:hidden"
                  onClick={() => setMobileMenuOpen(false)}
                />
                
                {/* Sliding Sidebar */}
                <motion.aside
                  initial={{ x: -280 }}
                  animate={{ x: 0 }}
                  exit={{ x: -280 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  className={`
                    fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 z-50 md:hidden
                    border-r transition-colors duration-200
                    ${theme === "dark"
                      ? "bg-[#292a2d] border-[#3c4043]"
                      : "bg-white border-[#dadce0]"
                    }
                  `}
                >
                  <HallSidebar
                    theme={theme}
                    activeSection={activeSection}
                    onNavigate={(section) => {
                      handleNavigate(section);
                      setMobileMenuOpen(false); // Close menu after navigation
                    }}
                  />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* MAIN CONTENT */}
          <main className={`flex-1 overflow-y-auto mt-16 ml-0 md:ml-64 px-2 sm:px-4 lg:px-6`}>
            {/* Dashboard Home */}
            {activeSection === "home" && (
              <HallMainContent
                hallData={hallData}
                theme={theme}
                currentUser={currentUser}
                onRefresh={handleRefresh}
                setExtensionModal={setExtensionModal}
                onNavigate={handleNavigate}
              />
            )}

            {/* Manage Bookings Portal */}
            {activeSection === "manage-bookings" && (
              <HallBookingsPortal
                hallData={hallData}
                theme={theme}
                currentUser={currentUser}
                onRefresh={handleRefresh}
                setExtensionModal={setExtensionModal}
                onBackHome={() => handleNavigate("home")}
              />
            )}

            {/* Calendar Page */}
            {activeSection === "calendar" && (
              <HallCalendarPage
                hallData={hallData}
                theme={theme}
                onBack={() => handleNavigate("home")}
              />
            )}

            {/* Event Calendar Page */}
            {activeSection === "event-calendar" && (
              <EventCalendarPage
                theme={theme}
                onBack={() => handleNavigate("home")}
              />
            )}

            {/* Category Portals */}
            {isCategoryPortal && (
              <HallCategoryPortal
                hallData={hallData}
                theme={theme}
                categoryId={activeSection}
                categoryName={getCategoryHallName(activeSection)}
                currentUser={currentUser}
                onRefresh={handleRefresh}
                setExtensionModal={setExtensionModal}
                onBackHome={() => handleNavigate("home")}
              />
            )}

            {/* Settings Page */}
            {activeSection === "settings" && (
              <SettingsPage
                theme={theme}
                setTheme={setTheme}
                notificationsEnabled={notificationsEnabled}
                setNotificationsEnabled={setNotificationsEnabled}
                setActiveTab={() => setActiveSection("home")}
                hostelData={hallData}
              />
            )}
          </main>
        </div>

        {/* Extension Modal */}
        {extensionModal && (
          <HallExtensionModal
            modal={extensionModal}
            onClose={() => setExtensionModal(null)}
            onExtend={handleExtensionModalExtend}
          />
        )}

        {/* Profile Modal */}
        <ProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          currentUser={currentUserData}
          onUpdate={(updatedUser) => {
            console.log("✅ Profile updated:", updatedUser);
            setCurrentUserData(updatedUser);

            try {
              const existingUser = JSON.parse(localStorage.getItem("user") || "{}");
              localStorage.setItem(
                "user",
                JSON.stringify({
                  ...existingUser,
                  ...updatedUser,
                })
              );
            } catch (e) {
              console.error("Failed to update localStorage:", e);
            }

            window.dispatchEvent(
              new CustomEvent("userProfileUpdated", {
                detail: updatedUser,
              })
            );
          }}
        />

        {/* Screen Saver */}
        <ScreenSaver isActive={showScreenSaver} onDismiss={() => setShowScreenSaver(false)} />
      </ToastProvider>
    </DashboardRefreshProvider>
  );
}