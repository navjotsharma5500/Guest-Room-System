// src/components/MainContent.jsx
import React, { useEffect, useState, useRef } from "react";
import Calendar from "react-calendar";
import { format } from "date-fns";
import { Settings, Trash2, Filter, Building2, Search } from "lucide-react";

import GuestDetails from "./GuestDetails";
import RoomCard from "./RoomCard";
import DirectBookingModal from "./DirectBookingModal";
import CancelModal from "./CancelModal";
import SettingsPage from "../pages/SettingsPage";
import SearchGuestModal from "./SearchGuestModal";
import FilterModal from "./FilterModal";
import AdminEnquiryPage from "../pages/AdminEnquiryPage";
import "react-calendar/dist/Calendar.css";
import "../styles/calendarCustom.css";
import { useAuth } from "../context/AuthContext";
import hotelIcon from "../assets/hotelIcon.png";
import ExtensionModal from "./ExtensionModal";
import axios from "axios";

// ==== BACKEND URL ====
const API = process.env.REACT_APP_API_URL;

export default function MainContent(props) {
  const {
    activeTab, setActiveTab,
    activeHostel, setActiveHostel,
    hostelData = {},
    setRightPanelToRoom,
    activeRoomRef, setActiveRoomRef,
    statsForHostel, statsAll,
    bookingSelectModal, setBookingSelectModal,
    directBookingModal, setDirectBookingModal,
    cancelModal, setCancelModal,
    setExtensionModal,
    remarksText, setRemarksText,
    addBookingToRoom, cancelBooking,
    theme, setTheme,
    notificationsEnabled, setNotificationsEnabled
  } = props;

  const { currentUser, loadingUser } = useAuth();
  const [searchModal, setSearchModal] = useState(false);
  const [dateBookings, setDateBookings] = useState([]);
  const [filterModal, setFilterModal] = useState(false);

  // ====== NOTIFICATIONS ======
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [toast, setToast] = useState({ show: false, message: "" });

  const lastPendingRef = useRef(0);
  const initRef = useRef(false);

  const role = currentUser?.role || "caretaker";

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (showNotifDropdown && !e.target.closest(".notif-wrapper")) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showNotifDropdown]);
  // ================================
  // 🔔 FETCH ENQUIRIES FROM BACKEND
  // (Admin & Manager ONLY — caretakers get ZERO enquiry visibility)
  // ================================
  const fetchPendingFromBackend = async () => {
    if (role === "caretaker") {
      setNotifications([]); // caretakers never see enquiries
      return [];
    }

    try {
      const res = await axios.get(`${API}/enquiry`);
      const pending = res.data.filter((e) => e.status === "pending");

      if (notificationsEnabled) {
        setNotifications(
          pending.map((e) => ({
            id: e._id,
            name: e.name,
            message: e.purpose || "New guest enquiry",
            date: new Date(e.createdAt).toLocaleString()
          }))
        );
      } else {
        setNotifications([]);
      }

      return pending;
    } catch (err) {
      console.error("Notification fetch error:", err);
      return [];
    }
  };

  // ========== LOAD BOOKINGS FROM BACKEND ==========
  useEffect(() => {
    async function loadSharedBookings() {
      try {
        const res = await axios.get(`${API}/api/bookings/all`, {
          withCredentials: true,
        });
        console.log("Backend bookings:", res.data.bookings);
      } catch (err) {
        console.error("Failed to load bookings:", err);
      }
    }
    loadSharedBookings();
  }, []);

  // ================================
  // 🔁 POLLING (Admin & Manager ONLY)
  // ================================
  useEffect(() => {
    if (role === "caretaker") return; // caretakers skip entire system

    const check = async () => {
      const pending = await fetchPendingFromBackend();

      if (!initRef.current) {
        lastPendingRef.current = pending.length;
        initRef.current = true;
        return;
      }

      // Show toast only if enabled
      if (notificationsEnabled && pending.length > lastPendingRef.current) {
        const newest = pending[pending.length - 1];
        if (newest) {
          setToast({
            show: true,
            message: `New enquiry: ${newest.name}`
          });
          setTimeout(() => setToast({ show: false, message: "" }), 4000);
        }
      }

      lastPendingRef.current = pending.length;
    };

    check();
    const id = setInterval(check, 5000);
    return () => clearInterval(id);
  }, [notificationsEnabled, role]);

  // Disable notifications immediately if turned OFF
  useEffect(() => {
    if (!notificationsEnabled) {
      setNotifications([]);
      setToast({ show: false, message: "" });
    }
  }, [notificationsEnabled]);

  // ================================
  // 📅 DATE FILTER (Calendar)
  // ================================
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!selectedDate) return;

    const dateStart = new Date(selectedDate);
    dateStart.setHours(0, 0, 0, 0);

    const userHostel = currentUser?.hostel || null;

    const newBookings = Object.entries(hostelData || {})
      .filter(([hostel]) => {
        if (role === "admin" || role === "manager") return true;
        return userHostel === hostel; // caretaker only own hostel
      })
      .flatMap(([hostel, hData]) =>
        (hData.rooms || []).flatMap((room) =>
          (room.bookings || []).map((b) => ({ hostel, roomNo: room.roomNo, booking: b }))
        )
      )
      .filter((item) => {
        const from = new Date(item.booking.from);
        const to = new Date(item.booking.to);
        from.setHours(0, 0, 0, 0);
        to.setHours(0, 0, 0, 0);
        return dateStart >= from && dateStart <= to;
      });

    setDateBookings(newBookings);
  }, [hostelData, selectedDate, role]);
  // ================================
  // 🎨 THEME HANDLING (Light / Dark)
  // ================================
  useEffect(() => {
    if (!theme) return;
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    localStorage.setItem("guestDashboardTheme", theme);
  }, [theme]);

  // ================================
  // 📌 ALL BOOKINGS (Filtered by Role)
  // ================================
  const allBookings = Object.entries(hostelData || {})
    .flatMap(([hostel, hData]) =>
      (hData.rooms || []).flatMap((room) =>
        (room.bookings || []).map((b) => ({
          hostel,
          roomNo: room.roomNo,
          booking: b
        }))
      )
    )
    .filter((b) => {
      if (role === "admin" || role === "manager") return true;
      return currentUser?.hostel === b.hostel; // caretaker → his hostel only
    })
    .sort((a, b) => new Date(a.booking.from) - new Date(b.booking.from));

  // ================================
  // 🔜 UPCOMING BOOKINGS (next 5)
  // ================================
  const upcoming = allBookings
    .filter((b) => new Date(b.booking.from) >= new Date())
    .slice(0, 5);

  // ================================
  // 📥 DOWNLOAD (CSV Export)
  // caretakers can download ONLY their hostel
  // ================================
  const allHostels = hostelData || {};

  const handleDownload = () => {
    // Restrict caretakers
    if (role === "caretaker") {
      if (!activeHostel || activeHostel !== currentUser.hostel) {
        alert(`Caretakers can download only their hostel: ${currentUser.hostel}`);
        return;
      }
    }

    // CASE 1: No hostel selected → Admin/Manager exporting everything
    if (!activeHostel) {
      const rows = [];

      Object.entries(allHostels).forEach(([hostel, hData]) => {
        (hData.rooms || []).forEach((room) => {
          (room.bookings || []).forEach((b) => {
            rows.push({
              BookingID: b.id || "",
              Guest: b.guest,
              Hostel: hostel,
              RoomNo: room.roomNo,
              From: b.from,
              To: b.to,
              Guests: b.numGuests,
              City: b.city,
              State: b.state,
              Purpose: b.purpose,
              Status: b.status || "Booked"
            });
          });
        });
      });

      if (rows.length === 0) {
        alert("No bookings found.");
        return;
      }

      const headers = Object.keys(rows[0]);
      const csv =
        headers.join(",") +
        "\n" +
        rows
          .map((r) =>
            headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
          )
          .join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all_hostels_bookings.csv`;
      a.click();
      URL.revokeObjectURL(url);

      return;
    }

    // CASE 2: Export only selected hostel
    if (!allHostels[activeHostel]) {
      alert("Invalid hostel selected.");
      return;
    }

    const rooms = allHostels[activeHostel].rooms || [];
    const rows = [];

    rooms.forEach((room) => {
      (room.bookings || []).forEach((b) => {
        rows.push({
          Hostel: activeHostel,
          RoomNo: room.roomNo,
          Guest: b.guest,
          From: b.from,
          To: b.to,
          Guests: b.numGuests,
          City: b.city,
          State: b.state,
          Purpose: b.purpose,
          Status: b.status || "Booked"
        });
      });
    });

    if (rows.length === 0) {
      alert(`No bookings found for ${activeHostel}`);
      return;
    }

    const headers = Object.keys(rows[0]);
    const csv =
      headers.join(",") +
      "\n" +
      rows
        .map((r) =>
          headers.map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeHostel}_bookings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ================================
  // 🔄 Show Loader if user not ready
  // ================================
  if (loadingUser || !currentUser) {
    return (
      <main className="flex-1 flex items-center justify-center ml-64 text-gray-500">
        Loading...
      </main>
    );
  }

  // ================================
  // 🎯 MAIN RETURN
  // ================================
  return (
    <main
      className={`flex-1 flex flex-col overflow-y-auto transition-all duration-500 ${
        activeTab === "Enquiry" ? "p-0 ml-0" : "p-6 ml-64"
      } ${
        theme === "dark"
          ? "bg-gray-900 text-gray-100"
          : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* ================================
          🔝 HEADER (Hidden on Enquiry Page)
      ================================ */}
      {activeTab !== "Enquiry" && (
        <header
          className={`flex justify-between items-center mb-6 border-b pb-4 ${
            theme === "dark" ? "border-gray-700" : "border-gray-200"
          }`}
        >
          {/* Logo + Title */}
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

          {/* Right Side Buttons */}
          <div className="flex items-center gap-4">
            {/* Enquiry visible only to Admin + Manager */}
            {(role === "admin" || role === "manager") && (
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

            {/* Home button */}
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

            {/* Search */}
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

            {/* Analytics → only Admin + Manager */}
            {(role === "admin" || role === "manager") && (
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

            {/* Download */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg shadow hover:bg-red-700 text-lg"
            >
              Download
            </button>

            {/* Bell → only Admin + Manager */}
            {(role === "admin" || role === "manager") && (
              <div className="relative notif-wrapper">
                <button
                  onClick={() =>
                    setShowNotifDropdown((prev) => !prev)
                  }
                  className={`relative p-3 border rounded-full shadow-md transition ${
                    theme === "dark"
                      ? "bg-gray-800 border-gray-600 hover:bg-gray-700"
                      : "bg-white border-gray-200 hover:bg-red-50"
                  }`}
                >
                  🔔
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
                          theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
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
                              className={
                                theme === "dark"
                                  ? "text-red-400 font-semibold"
                                  : "text-red-700 font-semibold"
                              }
                            >
                              {n.name}
                            </p>
                            <p
                              className={
                                theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-600"
                              }
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

      {/* ================================
          ENQUIRY PAGE
      ================================ */}
      {activeTab === "Enquiry" && (
        <AdminEnquiryPage setActiveTab={setActiveTab} />
      )}

      {/* ================================
          SETTINGS PAGE
      ================================ */}
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
          {/* ================================
              HOME PAGE (No hostel selected)
          ================================ */}
          {activeTab === "Home" && !activeHostel && (
            <>
              {/* ======== Left: Calendar ======== */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div
                  className={`shadow-md rounded-2xl p-6 flex flex-col items-center ${
                    theme === "dark" ? "bg-gray-800" : "bg-white"
                  }`}
                >
                  <h2
                    className={`text-2xl font-semibold mb-3 ${
                      theme === "dark" ? "text-red-400" : "text-red-700"
                    }`}
                  >
                    Calendar
                  </h2>

                  <Calendar
                    onChange={(date) => {
                      setSelectedDate(date);
                      setRightPanelToRoom(null, null);
                      setActiveRoomRef(null);
                    }}
                    value={selectedDate}
                  />

                  {/* Bookings on date */}
                  <div className="mt-6 w-full">
                    <h3
                      className={`text-lg font-semibold mb-2 ${
                        theme === "dark"
                          ? "text-red-400"
                          : "text-red-700"
                      }`}
                    >
                      Bookings on {format(selectedDate, "dd MMM yyyy")}
                    </h3>

                    {dateBookings.length > 0 ? (
                      <div className="space-y-2">
                        {dateBookings.map((item, idx) => (
                          <div
                            key={`${item.hostel}_${item.roomNo}_${idx}`}
                            className={`p-3 border rounded-lg cursor-pointer ${
                              theme === "dark"
                                ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                                : "bg-red-50 border-red-100 hover:bg-red-100"
                            }`}
                            onClick={() =>
                              setRightPanelToRoom(
                                item.hostel,
                                item.roomNo,
                                item.booking.id
                              )
                            }
                          >
                            <p
                              className={`font-medium ${
                                theme === "dark"
                                  ? "text-red-400"
                                  : "text-red-700"
                              }`}
                            >
                              {item.hostel} — {item.roomNo}
                            </p>
                            <p
                              className={`text-sm ${
                                theme === "dark"
                                  ? "text-gray-300"
                                  : "text-gray-600"
                              }`}
                            >
                              {item.booking.guest} ({item.booking.from} →{" "}
                              {item.booking.to})
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p
                        className={`text-sm italic ${
                          theme === "dark"
                            ? "text-gray-400"
                            : "text-gray-500"
                        }`}
                      >
                        No bookings on this date.
                      </p>
                    )}
                  </div>
                </div>
                {/* ======== Right: Guest Details of Selected Room ======== */}
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
                        theme === "dark"
                          ? "text-gray-400"
                          : "text-gray-500"
                      }`}
                    >
                      Select a booked room from the calendar to view details.
                    </p>
                  )}
                </div>
              </div>

              {/* ================================
                  UPCOMING BOOKINGS
              ================================ */}
              <div
                className={`shadow-md rounded-2xl p-6 ${
                  theme === "dark" ? "bg-gray-800" : "bg-white"
                }`}
              >
                <h3
                  className={`text-2xl font-semibold mb-4 ${
                    theme === "dark" ? "text-red-400" : "text-red-700"
                  }`}
                >
                  Upcoming Bookings
                </h3>

                {upcoming.length > 0 ? (
                  <div className="space-y-2">
                    {upcoming.map((u, idx) => (
                      <div
                        key={`${u.hostel}_${u.roomNo}_${idx}`}
                        className={`p-3 border rounded-lg cursor-pointer ${
                          theme === "dark"
                            ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                            : "bg-green-50 border-green-100 hover:bg-green-100"
                        }`}
                        onClick={() =>
                          setRightPanelToRoom(
                            u.hostel,
                            u.roomNo,
                            u.booking.id
                          )
                        }
                      >
                        <p
                          className={`font-medium ${
                            theme === "dark"
                              ? "text-green-400"
                              : "text-green-700"
                          }`}
                        >
                          {u.booking.guest} — {u.hostel} / {u.roomNo}
                        </p>
                        <p
                          className={`text-sm ${
                            theme === "dark"
                              ? "text-gray-300"
                              : "text-gray-600"
                          }`}
                        >
                          {u.booking.from} → {u.booking.to}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p
                    className={`text-sm italic ${
                      theme === "dark"
                        ? "text-gray-400"
                        : "text-gray-500"
                    }`}
                  >
                    No upcoming bookings.
                  </p>
                )}
              </div>
            </>
          )}

          {/* ================================
              HOSTEL SELECTED VIEW
          ================================ */}
          {activeHostel && activeTab === "Home" && (
            <div className="grid grid-cols-2 gap-6 flex-grow">
              <div
                className={`shadow-md rounded-2xl p-6 border overflow-y-auto ${
                  theme === "dark"
                    ? "bg-gray-800 border-gray-700"
                    : "bg-white border-gray-200"
                }`}
              >
                {activeHostel === "All Hostels" ? (
                  <>
                    <h2
                      className={`text-xl font-semibold mb-4 flex items-center gap-2 ${
                        theme === "dark"
                          ? "text-red-400"
                          : "text-red-700"
                      }`}
                    >
                      <Building2
                        className={
                          theme === "dark"
                            ? "text-red-400"
                            : "text-red-600"
                        }
                      />{" "}
                      All Hostels
                    </h2>

                    <p
                      className={`text-sm mb-3 ${
                        theme === "dark"
                          ? "text-gray-300"
                          : "text-gray-600"
                      }`}
                    >
                      Total Guest Rooms: {statsAll().total} | Occupied:{" "}
                      {statsAll().occupied} | Available:{" "}
                      {statsAll().available}
                    </p>

                    {Object.entries(hostelData || {}).map(
                      ([name, h]) => (
                        <div
                          key={name}
                          className={`border-b pb-3 mb-3 ${
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
                              setExtensionModal={setExtensionModal}
                              theme={theme}
                            />
                          ))}
                        </div>
                      )
                    )}
                  </>
                ) : (
                  <>
                    <h2
                      className={`text-xl font-semibold mb-4 ${
                        theme === "dark"
                          ? "text-red-400"
                          : "text-red-700"
                      }`}
                    >
                      {activeHostel}
                    </h2>

                    <p
                      className={`text-sm mb-3 ${
                        theme === "dark"
                          ? "text-gray-300"
                          : "text-gray-600"
                      }`}
                    >
                      {(() => {
                        const s = statsForHostel(activeHostel);
                        return `Total Guest Rooms: ${s.total} | Occupied: ${s.occupied} | Available: ${s.available}`;
                      })()}
                    </p>

                    {(hostelData[activeHostel]?.rooms || []).map(
                      (room) => (
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
                          setExtensionModal={setExtensionModal}
                          theme={theme}
                        />
                      )
                    )}
                  </>
                )}
              </div>

              {/* Right Panel */}
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
                      theme === "dark"
                        ? "text-gray-400"
                        : "text-gray-500"
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

      {/* ================================
          FLOATING BUTTONS
      ================================ */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        {/* Settings */}
        <button
          className="p-3 bg-white border shadow-lg rounded-full hover:bg-red-50"
          onClick={() => setActiveTab("Settings")}
        >
          <Settings className="text-red-700" />
        </button>

        {/* Clear Cache */}
        <button
          className="p-3 bg-white border shadow-lg rounded-full hover:bg-red-50"
          onClick={() => {
            const confirmed = window.confirm(
              "Are you sure you want to clear all cache and cookies? This will reset the application."
            );
            if (confirmed) {
              try {
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(";").forEach((c) => {
                  document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                alert("Cache cleared! Reloading...");
                window.location.reload();
              } catch (err) {
                alert("Failed to clear cache.");
              }
            }
          }}
        >
          <Trash2 className="text-red-700" />
        </button>

        {/* Filter Modal */}
        <button
          className="p-3 bg-white border shadow-lg rounded-full hover:bg-red-50"
          onClick={() => setFilterModal(true)}
        >
          <Filter className="text-red-700" />
        </button>
      </div>

      {/* ================================
          MODALS
      ================================ */}
      {filterModal && (
        <FilterModal
          hostelData={hostelData}
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

      {cancelModal && (
        <CancelModal
          modal={cancelModal}
          remarksText={remarksText}
          setRemarksText={(v) => setRemarksText(v)}
          onClose={() => setCancelModal(null)}
          onDone={() => {
            cancelBooking(
              cancelModal.hostel,
              cancelModal.room.roomNo,
              cancelModal.booking.id,
              remarksText || "Cancelled"
            );
            setRemarksText("");
            setCancelModal(null);
          }}
        />
      )}

      {/* ================================
          TOAST NOTIFICATION
      ================================ */}
      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-auto">
          <div className="max-w-xs w-full bg-white border border-red-200 shadow-xl rounded-xl p-4 flex items-start gap-3">
            <div className="text-2xl">🔔</div>
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

      {/* Search Guest Modal */}
      {searchModal && (
        <SearchGuestModal
          hostelData={hostelData}
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
    </main>
  );
}
