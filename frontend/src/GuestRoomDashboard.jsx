// src/GuestRoomDashboard.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isWithinInterval } from "date-fns";
import Sidebar from "./components/Sidebar";
import MainContent from "./components/MainContent";
import SettingsPage from "./pages/SettingsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import hostelDataJSON from "./data/hostelData.json";
import GuestEnquiryPage from "./pages/GuestEnquiryPage";
import AdminEnquiryPage from "./pages/AdminEnquiryPage";
import AllHostelsPortal from "./pages/AllHostelsPortal";
import { ToastProvider } from "./context/ToastContext";
import ProfileModal from "./components/ProfileModal";
import { useAuth } from "./context/AuthContext.js";
import ExtensionModal from "./components/ExtensionModal";

export default function GuestRoomDashboard() {

  // ⭐ MUST BE FIRST → AUTH HOOK
  const { currentUser, loading } = useAuth();

  // ⭐ ALL HOOKS MUST COME BEFORE ANY RETURN
  const [profileOpen, setProfileOpen] = useState(false);

  const loadInitialHostelData = async () => {
    const res = await fetch(`${process.env.REACT_APP_API_URL}/bookings/all`);
    return await res.json();
  };  

  const [hostelData, setHostelData] = useState({});
  const [activeTab, setActiveTab] = useState("Home");
  const [activeHostel, setActiveHostel] = useState(null);
  const [activeRoomRef, setActiveRoomRef] = useState(null);
  const [bookingSelectModal, setBookingSelectModal] = useState(null);
  const [directBookingModal, setDirectBookingModal] = useState(null);
  const [cancelModal, setCancelModal] = useState(null);
  const [extensionModal, setExtensionModal] = useState(null);
  const [remarksText, setRemarksText] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dateBookings, setDateBookings] = useState([]);
  const [prefillGuest, setPrefillGuest] = useState(null);

  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    localStorage.getItem("notificationsEnabled") === "true"
  );

  // ⭐ EFFECTS MUST ALSO BE BEFORE EARLY RETURN
  useEffect(() => {
    loadInitialHostelData().then(setHostelData);
  }, []);

  useEffect(() => {}, [loading, currentUser]);

  useEffect(() => {
    if (!hostelData || Object.keys(hostelData).length === 0) return;

    async function saveToBackend() {
      try {
        await fetch(`${process.env.REACT_APP_API_URL}/bookings/save-all`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hostelData),
        });
      } catch (err) {
        console.error("Failed to sync hostelData with backend", err);    
      }
    }
    
    saveToBackend();
  }, [hostelData]);  

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
    if (activeTab === "AllHostelsPortal") {
      const raw = localStorage.getItem("lastApprovedGuest");
      if (raw) {
        try {
          setPrefillGuest(JSON.parse(raw));
        } catch (err) {
          console.error("Invalid lastApprovedGuest", err);
          localStorage.removeItem("lastApprovedGuest");
          setPrefillGuest(null);
        }
      } else {
        setPrefillGuest(null);
      }
    }
  }, [activeTab]);

  useEffect(() => {
  const handleExtensionOpen = (e) => {
    const { hostel, roomNo, booking } = e.detail;

    setExtensionModal({
      open: true,
      hostel,
      roomNo,
      booking,
    });
  };

  window.addEventListener("open-extension-modal", handleExtensionOpen);

  return () => {
    window.removeEventListener("open-extension-modal", handleExtensionOpen);
  };
}, []);

  // =========================
  // 🔥 AFTER ALL HOOKS → EARLY RETURNS
  // =========================

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

  // =========================
  // ORIGINAL FUNCTIONS (UNCHANGED)
  // =========================

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    sessionStorage.removeItem("user");
    window.location.href = "/";
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
    const allRooms = Object.values(hostelData).flatMap((h) => h.rooms || []);
    const total = allRooms.length;
    const occupied = allRooms.filter(
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
      prefill: guestToUse,
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
    const room = findRoom(hostel, roomNo);
    if (!room) return;
    if (!room.bookings?.length) {
      setActiveRoomRef({ hostel, roomNo, booking: null });
    } else if (bookingId) {
      const bk = room.bookings.find((b) => b.id === bookingId);
      setActiveRoomRef({ hostel, roomNo, booking: bk });
    } else if (room.bookings.length === 1) {
      setActiveRoomRef({ hostel, roomNo, booking: room.bookings[0] });
    } else {
      setBookingSelectModal({ hostel, room, bookings: room.bookings });
    }
  };

  const addBookingToRoom = (hostel, roomNo, booking) => {
    setHostelData((prev) => {
      const copy = structuredClone(prev);
      const room = copy[hostel].rooms.find((r) => r.roomNo === roomNo);
      if (!room) return prev;
      booking.id = `b_${Date.now()}`;
      booking.from =
        typeof booking.from === "string"
          ? booking.from
          : new Date(booking.from).toISOString().split("T")[0];
      booking.to =
        typeof booking.to === "string"
          ? booking.to
          : new Date(booking.to).toISOString().split("T")[0];
      room.bookings = room.bookings || [];
      room.bookings.push(booking);
      return copy;
    });
    setRightPanelToRoom(hostel, roomNo);
  };

  {/* EXTENSION MODAL */}
  {extensionModal && extensionModal.open && (
    <ExtensionModal
      modal={extensionModal}
      onClose={() => setExtensionModal(null)}
      onExtend={(newTo) => {
        const { hostel, roomNo, booking } = extensionModal;

        // Prevent overlapping
        const room = hostelData[hostel].rooms.find(r => r.roomNo === roomNo);
        const conflict = room.bookings
          .filter(b => b.id !== booking.id)
          .some(b => {
            return (
              new Date(newTo) >= new Date(b.from) &&
              new Date(newTo) <= new Date(b.to)
            );
          });
          
          if (conflict) {
            alert("⚠ Room already booked for these dates!");
            return;
          }
           
          // update
          const updated = structuredClone(hostelData);
          const targetRoom = updated[hostel].rooms.find(r => r.roomNo === roomNo);
          const targetBooking = targetRoom.bookings.find(b => b.id === booking.id);

          targetBooking.to = newTo;

          setHostelData(updated);
          setExtensionModal(null);
          alert("Booking extended successfully!");
        }}
      />
    )}

  const cancelBooking = (hostel, roomNo, bookingId, remarks) => {
    setHostelData((prev) => {
      const copy = structuredClone(prev);
      const room = copy[hostel].rooms.find((r) => r.roomNo === roomNo);
      if (!room) return prev;
      room.bookings = (room.bookings || []).filter((b) => b.id !== bookingId);
      return copy;
    });
    if (activeRoomRef?.booking?.id === bookingId) setActiveRoomRef(null);
  };

  const extendBooking = (hostel, roomNo, bookingId, newToDate) => {
    setHostelData((prev) => {
      const copy = structuredClone(prev);
      const room = copy[hostel].rooms.find((r) => r.roomNo === roomNo);
      if (!room) return prev;

      const booking = room.bookings.find((b) => b.id === bookingId);
      if (!booking) return prev;

      booking.to = newToDate; // update checkout date
      return copy;
    });
    
    setActiveRoomRef((ref) =>
      ref?.booking?.id === bookingId
        ? { ...ref, booking: { ...ref.booking, to: newToDate } }
        : ref
      );
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
                end: new Date(b.to),
              })
            )
          )
          .flatMap((r) =>
            r.bookings
              .filter((b) =>
                isWithinInterval(date, {
                  start: new Date(b.from),
                  end: new Date(b.to),
                })
              )
              .map((b) => ({
                hostel,
                roomNo: r.roomNo,
                booking: b,
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
            end: new Date(b.to),
          })
        )
      )
    );
    return hasBooking ? "bg-red-200 rounded-full" : null;
  };

  const sidebarVariants = {
    hidden: { x: -280, opacity: 0, transition: { duration: 0.4 } },
    visible: { x: 0, opacity: 1, transition: { duration: 0.4 } },
  };

  // =========================
  // RETURN UI (UNCHANGED)
  // =========================

  return (
    <ToastProvider theme={theme}>
      <div
        className={`flex h-screen font-sans transition-colors duration-300 ${
          theme === "dark"
            ? "bg-gray-900 text-gray-100"
            : "bg-gray-50 text-gray-900"
        }`}
      >
        {/* ⭐ TOP HEADER */}
        <div
          className={`fixed left-64 right-0 top-0 h-16 flex items-center justify-end px-6 shadow-md z-20 ${
            theme === "dark"
              ? "bg-gray-800 text-white"
              : "bg-white text-gray-900"
          }`}
        >
          <button
            onClick={() => setProfileOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            👤 Profile
          </button>

          <button
            onClick={handleLogout}
            className="ml-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            Logout
          </button>
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
                  setActiveTab("Home");
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
              setHostelData={setHostelData}
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
              setHostelData={setHostelData}
              prefillGuest={prefillGuest}
              theme={theme}
              onBackHome={() => {
                try {
                  localStorage.removeItem("lastApprovedGuest");
                  window.dispatchEvent(new Event("lastApprovedGuestCleared"));
                } catch {}
                setPrefillGuest(null);
                setActiveTab("Home");
              }}
              handleStartDirectBooking={handleStartDirectBooking}
              setExtensionModal={setExtensionModal}   // ⭐ ADD THIS
            />
          )}        
        </main>
      </div>

      {extensionModal && (
        <ExtensionModal
          modal={extensionModal}
          onClose={() => setExtensionModal(null)}
          onExtend={(newTo) => {
            const { hostel, roomNo, booking } = extensionModal;

            // CONFLICT CHECK
            const existing = hostelData[hostel].rooms
              .find((r) => r.roomNo === roomNo)
              .bookings.filter((b) => b.id !== booking.id);

            const conflict = existing.some((b) => {
              return (
                new Date(newTo) >= new Date(b.from) &&
                new Date(newTo) <= new Date(b.to)  
              );
            });
            
            if (conflict) {
              alert("⚠ Room is already booked for those extended dates!");
              return;
            }
            
            extendBooking(hostel, roomNo, booking.id, newTo);
            setExtensionModal(null);
            alert("Booking extended successfully!");
          }}
        />
      )}      

      {/* ⭐ PROFILE MODAL */}
      <ProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        currentUser={currentUser}
        onUpdate={() => {}}
      />
    </ToastProvider>
  );
}
