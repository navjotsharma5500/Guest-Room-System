// src/HallBookingDashboard.jsx - CORRECTED VERSION WITH HOOK INTEGRATION
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings } from "lucide-react";

// ✅ FIX: Import the polling hook
import useHallDataPolling from "./hooks/useHallDataPolling";

import HallSidebar from "./components/HallBookings/HallSidebar";
import HallMainContent from "./components/HallBookings/HallMainContent";
import HallBookingsPortal from "./pages/HallBookingsPortal";
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

export default function HallBookingDashboard() {
  const navigate = useNavigate();
  const { currentUser, loading, logout } = useAuth();
  const role = currentUser?.role || "guest";
  const { showToast } = useToast();

  // ✅ FIX: Use the polling hook instead of manual fetch
  const { 
    hallData, 
    loading: hallLoading, 
    hasData, 
    error: hallError,
    lastUpdate,
    connected,
    refresh: refreshHallData 
  } = useHallDataPolling();

  // Screen Saver
  const isIdle = useIdleTimeout(5);
  const [showScreenSaver, setShowScreenSaver] = useState(false);

  // Profile Modal
  const [profileOpen, setProfileOpen] = useState(false);

  // Navigation
  const [activeSection, setActiveSection] = useState("home"); // "home" or "portal"

  // Modal States
  const [extensionModal, setExtensionModal] = useState(null);

  // Settings
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "dark");
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

  // ✅ REMOVED: Manual fetch function - using hook instead

  // ✅ REMOVED: useEffect for fetching - hook handles this

  // Extension modal listener
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

  // ✅ FIX: Refresh handler now uses hook's refresh function
  const handleRefresh = useCallback((silent = false) => {
    console.log('🔄 Hall Dashboard refresh triggered - silent:', silent);
    refreshHallData();
  }, [refreshHallData]);

  // Handle extension submission
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
      // ✅ FIX: Refresh will be triggered automatically by Socket.IO
      // handleRefresh(true); // No longer needed - hook will auto-refresh
    } catch (error) {
      console.error("Extension error:", error);
      showToast(error.message || "Failed to extend booking", "error");
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  // Access control - only admin and assistant
  if (!loading && currentUser && !["admin", "assistant"].includes(role)) {
    return (
      <main className="flex items-center justify-center h-screen text-gray-500">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p>You don't have permission to access Hall Bookings</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  // Loading states
  if (loading) {
    return (
      <main className="flex items-center justify-center h-screen text-gray-500">
        Loading Hall Booking Dashboard...
      </main>
    );
  }

  if (!currentUser) {
    window.location.href = "/";
    return null;
  }

  // ✅ FIX: Updated loading check to use hook's loading state
  if (hallLoading && !hasData) {
    return (
      <main className="flex flex-col items-center justify-center h-screen text-gray-500 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent"></div>
        <div className="text-xl font-semibold">Loading Hall Bookings...</div>
        <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
          <span>{connected ? 'Connected' : 'Connecting...'}</span>
        </div>
        <div className="text-xs text-gray-400">API: {API}</div>
      </main>
    );
  }

  // ✅ FIX: Updated error handling
  if (hallError && !hasData) {
    return (
      <main className="flex flex-col items-center justify-center h-screen text-gray-500 gap-4">
        <div className="text-xl font-semibold text-red-600">⚠️ Connection Error</div>
        <div className="text-sm text-gray-600 dark:text-gray-400 max-w-md text-center">
          {hallError}
        </div>
        <div className="text-xs text-gray-400">Trying to connect to: {API}</div>
        <button
          onClick={refreshHallData}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry Connection
        </button>
        <button
          onClick={() => navigate("/dashboard")}
          className="px-6 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
        >
          Back to Main Dashboard
        </button>
      </main>
    );
  }

  const sidebarVariants = {
    hidden: { x: -250, opacity: 0 },
    visible: {
      x: 0,
      opacity: 1,
      transition: { duration: 0.3, ease: "easeOut" },
    },
  };

  return (
    <DashboardRefreshProvider onRefresh={handleRefresh}>
      <ToastProvider theme={theme}>
        <div
          className={`min-h-screen relative overflow-hidden ${
            theme === "dark"
              ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"
              : "bg-gradient-to-br from-gray-50 via-white to-red-50"
          }`}
        >
          {/* Glassmorphism Background Effects */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 -left-40 w-80 h-80 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
            <div className="absolute top-0 -right-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-40 left-20 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
          </div>

          {/* HEADER */}
          <div
            className={`fixed top-0 left-0 right-0 z-30 backdrop-blur-xl border-b ${
              theme === "dark"
                ? "bg-gray-900/80 border-gray-700"
                : "bg-white/80 border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between px-6 py-3">
              {/* Logo & Title */}
              <div className="flex items-center gap-4">
                <img
                  src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
                  alt="Thapar Logo"
                  className="w-12 h-12 object-contain"
                />
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                    Hall Booking System
                  </h1>
                  <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Management Dashboard
                  </p>
                </div>
              </div>

              {/* Right Side Actions */}
              <div className="flex items-center gap-4">
                {/* Settings Button */}
                <button
                  onClick={() => setActiveSection("settings")}
                  className={`p-2 rounded-lg transition ${
                    theme === "dark"
                      ? "hover:bg-gray-700 text-gray-300"
                      : "hover:bg-gray-100 text-gray-700"
                  }`}
                  title="Settings"
                >
                  <motion.div whileHover={{ rotate: 90 }} transition={{ duration: 0.3 }}>
                    <Settings className="w-5 h-5" />
                  </motion.div>
                </button>

                {/* Profile Button */}
                <button
                  onClick={() => setProfileOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold">
                    {currentUser?.name?.charAt(0) || "A"}
                  </div>
                  <span className="text-sm font-medium">{currentUser?.name}</span>
                </button>

                {/* Logout Button */}
                <button
                  onClick={handleLogout}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <AnimatePresence>
            <motion.div
              key="hall-sidebar"
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="z-20"
            >
              <HallSidebar
                theme={theme}
                activeSection={activeSection}
                onNavigate={(section) => setActiveSection(section)}
              />
            </motion.div>
          </AnimatePresence>

          {/* MAIN CONTENT */}
          <main className={`flex-1 overflow-y-auto mt-16 ${activeSection === "home" ? "ml-64" : "ml-20"}`}>
            {activeSection === "home" && (
              <HallMainContent
                hallData={hallData}
                theme={theme}
                currentUser={currentUser}
                onRefresh={handleRefresh}
                setExtensionModal={setExtensionModal}
              />
            )}

            {activeSection === "portal" && (
              <HallBookingsPortal
                hallData={hallData}
                theme={theme}
                currentUser={currentUser}
                onRefresh={handleRefresh}
                setExtensionModal={setExtensionModal}
              />
            )}

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