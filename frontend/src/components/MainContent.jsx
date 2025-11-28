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

// default export
export default function MainContent({
  activeTab,
  setActiveTab,
  activeHostel,
  setActiveHostel,
  hostelData = {},
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
}) {
  const { currentUser, loadingUser } = useAuth();
  const [searchModal, setSearchModal] = useState(false);
  const [dateBookings, setDateBookings] = useState([]);
  const [filterModal, setFilterModal] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const addNotification = (notif) => setNotifications((prev) => [...prev, notif]);

  const [toast, setToast] = useState({ show: false, message: "" });
  const lastPendingRef = useRef(0);
  const initRef = useRef(false); 

  useEffect(() => {
    const reload = () => {
      if (typeof window.fetchLatestHostelData === "function") {
        window.fetchLatestHostelData();
      }
    };
    
    window.addEventListener("reloadHostelData", reload);
    return () => window.removeEventListener("reloadHostelData", reload);
  }, []);  
  
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (showNotifDropdown && !e.target.closest(".notif-wrapper")) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener("click", handleOutsideClick);
    return () => document.removeEventListener("click", handleOutsideClick);
  }, [showNotifDropdown]);

  // Unified polling + storage listener for enquiries
  useEffect(() => {
    const fetchEnquiries = () => {
      try {
        const stored = JSON.parse(localStorage.getItem("guestEnquiries")) || [];
        const pending = stored.filter((e) => !e.status || e.status === "pending");

        // Only populate notifications if enabled
        if (notificationsEnabled) {
          setNotifications(
            pending.map((e) => ({
              name: e.name,
              message: e.purpose || "New enquiry submitted",
              date: new Date(e.date).toLocaleString(),
              status: e.status,
            }))
          );
        } else {
          setNotifications([]);
        }
        return pending;
      } catch (err) {
        console.error("Error loading enquiries:", err);
        setNotifications([]);
        return [];
      }
    };

    const check = () => {
      const pending = fetchEnquiries();
      if (!initRef.current) {
        lastPendingRef.current = pending.length;
        initRef.current = true;
        return;
      }
      // Don't show toast if notifications are disabled
      if (pending.length > lastPendingRef.current && notificationsEnabled) {
        const newest = pending
          .slice()
          .sort((a, b) => new Date(a.date) - new Date(b.date))[pending.length - 1];
        if (newest) {
          setToast({
            show: true,
            message: `New enquiry: ${newest.name} (${newest.city || ""}, ${newest.state || ""})`,
          });
          setTimeout(() => setToast({ show: false, message: "" }), 4000);
        }
      }
      lastPendingRef.current = pending.length;
    };

    check();
    const id = setInterval(check, 5000);

    // storage event (fires for changes from other tabs)
    const onStorage = (e) => {
      if (e.key === "guestEnquiries") {
        check();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      clearInterval(id);
      window.removeEventListener("storage", onStorage);
    };
  }, [notificationsEnabled]);

  // Clear notifications immediately when turned off
  useEffect(() => {
    if (!notificationsEnabled) {
      setNotifications([]);
      setToast({ show: false, message: "" });
    }
  }, [notificationsEnabled]);

  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!selectedDate) return;
    const dateStart = new Date(selectedDate);
    dateStart.setHours(0, 0, 0, 0);
if (!selectedDate) return;
    const userHostel = currentUser?.hostel || null;

    const allowedHostels =
      role === "caretaker"
      ? [userHostel]   // caretaker → only his hostel
      : Object.keys(hostelData);  // admin + manager → all hostels

    const newBookings = Object.entries(hostelData || {})
      .filter(([hostel]) => {
        if (role === "admin" || role === "manager") return true;
        return userHostel?.includes(hostel);   // caretaker → only their hostel
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
        return (
          dateStart.getTime() >= from.getTime() &&
          dateStart.getTime() <= to.getTime()
        );  
      });

    setDateBookings(newBookings);
  }, [hostelData, selectedDate]);

  useEffect(() => {
    if (!theme) return;
    document.body.classList.remove("light", "dark");
    document.body.classList.add(theme);
    localStorage.setItem("guestDashboardTheme", theme);
  }, [theme]);

  const allBookings = Object.entries(hostelData || {})
    .flatMap(([hostel, hData]) =>
      (hData.rooms || []).flatMap((room) => (room.bookings || []).map((b) => ({ hostel, roomNo: room.roomNo, booking: b })))
    )
    .sort((a, b) => new Date(a.booking.from) - new Date(b.booking.from));

  const role = currentUser?.role || "caretaker";
  const userHostel = currentUser?.hostel || null;

  const upcoming = allBookings
    .filter((b) => {
      if (role === "admin" || role === "manager") return true;
      return userHostel?.includes(b.hostel);
    })
    .filter((b) => new Date(b.booking.from) >= new Date())  
    .slice(0, 5);

  const allHostels = hostelData || {};
  const handleDownload = () => {
    // 🔒 Restrict caretakers from downloading other hostels
    if (currentUser?.role === "caretaker") {
      const caretakerHostel = currentUser.hostel;

      // If NO hostel selected → auto-lock to caretaker hostel
      if (!activeHostel) {
        alert("Caretakers can download only their assigned hostel data.");
        return;
      }
    
      // If selected hostel is NOT caretaker's hostel → block
      if (!caretakerHostel.includes(activeHostel)) {
        alert(`You can download only data for ${caretakerHostel}.`);
        return;
      }
    }    

    // CASE 1: No hostel selected → Export everything
    if (!activeHostel) {
      const rows = [];

      Object.entries(allHostels).forEach(([hostel, hData]) => {
        (hData.rooms || []).forEach((room) => {
          (room.bookings || []).forEach((b) => {
            rows.push({
              BookingID: b.id || b.bookingID || "",
              Guest: b.guest || b.name || "",
              Hostel: hostel,
              RoomNo: room.roomNo,
              RollNo: b.rollno || b.rollNo || "",
              Department: b.department || "",
              Contact: b.contact,
              Email: b.email,
              Gender: b.gender,
              FromDate: b.from || "",
              ToDate: b.to || "",
              TotalGuests: b.numGuests || b.guests || "",
              Females: b.females || b.femaleGuests || "",
              Males: b.males || b.maleGuests || "",
              State: b.state,
              City: b.city,
              Purpose: b.purpose,
              Reference: b.reference || "",
              PaymentType: b.paymentType || "",
              Amount: b.amount || "",
              Attachments: (b.files || []).length,
              Status: b.status || "Booked",         
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
            headers
              .map((h) => `"${String(r[h] ?? "").replace(/"/g, '""')}"`)
              .join(",")
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

    // CASE 2: A specific hostel is selected → export only that hostel
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
          Contact: b.contact,
          Email: b.email,
          Gender: b.gender,
          From: b.from,
          To: b.to,
          Guests: b.numGuests,
          State: b.state,
          City: b.city,
          Purpose: b.purpose,
          Reference: b.reference || "",
          PaymentType: b.paymentType || "",
          Amount: b.amount || "",
          Attachments: (b.files || []).length,
          Status: b.status || "Booked",
          EnquiryStatus: b.enquiryStatus || "",
          EnquiryDate: b.enquiryDate || "",
        });
      });
    });

    if (rows.length === 0) {
      alert(`No bookings found for ${activeHostel}.`);
      return;
    }

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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeHostel}_bookings.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }; 

  if (loadingUser || !currentUser) {
    return (
      <main className="flex-1 flex items-center justify-center ml-64 text-gray-500">
        Loading...
      </main>
    );
  }

  return (
    <main
      className={`flex-1 flex flex-col overflow-y-auto transition-all duration-500 ${
        activeTab === "Enquiry" ? "p-0 ml-0" : "p-6 ml-64"
      } ${theme === "dark" ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}
    >
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
              color: "#555",                // grey text  
              WebkitTextStroke: "0.7px #ff7a7a", // light-red outline
              letterSpacing: "0.5px",
            }}
          >
            Hostel Guest Room Booking
          </h1>
        </a>      

          <div className="flex items-center gap-4">
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

            {/* Analytics button → only Admin + Manager */}
            {(currentUser?.role === "admin" || currentUser?.role === "manager") && (
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
              onClick={handleDownload}
              className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg shadow hover:bg-red-700 text-lg"
            >
              Download
            </button>

            {currentUser?.role !== "caretaker" && (
              <div className="relative notif-wrapper">
                <button
                  onClick={() => setShowNotifDropdown((prev) => !prev)}
                  className={`relative p-3 border rounded-full shadow-md transition ${
                    theme === "dark" ? "bg-gray-800 border-gray-600 hover:bg-gray-700" : "bg-white border-gray-200 hover:bg-red-50"
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
                      theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                    }`}
                  >
                    {notifications.length === 0 ? (
                      <div className={`p-3 text-sm text-center ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
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
                              theme === "dark" ? "hover:bg-gray-700 border-gray-700" : "hover:bg-red-50 border-gray-200"
                            }`}
                            onClick={() => {
                              setActiveTab("Enquiry");
                              setShowNotifDropdown(false);
                            }}
                          >
                            <p className={theme === "dark" ? "text-red-400 font-semibold" : "text-red-700 font-semibold"}>
                              {n.name}
                            </p>
                            <p className={theme === "dark" ? "text-gray-300" : "text-gray-600"}>{n.message}</p>
                            <p className={`text-xs ${theme === "dark" ? "text-gray-500" : "text-gray-400"}`}>{n.date}</p>
                          </div>
                        ))
                    )}

                    {notifications.length > 0 && (
                      <div
                        className={`text-center text-sm p-2 cursor-pointer ${
                          theme === "dark" ? "text-blue-400 hover:bg-gray-700" : "text-blue-600 hover:bg-blue-50"
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

      {activeTab === "Enquiry" && <AdminEnquiryPage setActiveTab={setActiveTab} />}

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
          {activeTab === "Home" && !activeHostel && (
            <>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div
                  className={`shadow-md rounded-2xl p-6 flex flex-col items-center ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}
                >
                  <h2 className={`text-2xl font-semibold mb-3 ${theme === "dark" ? "text-red-400" : "text-red-700"}`}>Calendar</h2>
                  <Calendar
                    onChange={(date) => {
                      setSelectedDate(date);
                      setRightPanelToRoom(null, null);
                      setActiveRoomRef(null);
                    }}
                    value={selectedDate}
                  />
                  <div className="mt-6 w-full">
                    <h3 className={`text-lg font-semibold mb-2 ${theme === "dark" ? "text-red-400" : "text-red-700"}`}>
                      Bookings on {format(selectedDate, "dd MMM yyyy")}
                    </h3>
                    {dateBookings.length > 0 ? (
                      <div className="space-y-2">
                        {dateBookings.map((item, idx) => (
                          <div
                            key={`${item.hostel}_${item.roomNo}_${idx}`}
                            className={`p-3 border rounded-lg cursor-pointer ${
                              theme === "dark" ? "bg-gray-700 border-gray-600 hover:bg-gray-600" : "bg-red-50 border-red-100 hover:bg-red-100"
                            }`}
                            onClick={() => setRightPanelToRoom(item.hostel, item.roomNo, item.booking.id)}
                          >
                            <p className={`font-medium ${theme === "dark" ? "text-red-400" : "text-red-700"}`}>
                              {item.hostel} — {item.roomNo}
                            </p>
                            <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                              {item.booking.guest} ({item.booking.from} → {item.booking.to})
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm italic ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No bookings on this date.</p>
                    )}
                  </div>
                </div>  

                <div className={`shadow-md rounded-2xl p-6 ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
                  {activeRoomRef && activeRoomRef.booking ? (
                    <GuestDetails activeRoomRef={activeRoomRef} onCancel={(m) => setCancelModal(m)} theme={theme} />
                  ) : (
                    <p className={`italic text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      Select a booked room from the calendar to view details.
                    </p>
                  )}
                </div>
              </div>

              <div className={`shadow-md rounded-2xl p-6 ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
                <h3 className={`text-2xl font-semibold mb-4 ${theme === "dark" ? "text-red-400" : "text-red-700"}`}>Upcoming Bookings</h3>
                {upcoming.length > 0 ? (
                  <div className="space-y-2">
                    {upcoming.map((u, idx) => (
                      <div
                        key={`${u.hostel}_${u.roomNo}_${idx}`}
                        className={`p-3 border rounded-lg cursor-pointer ${
                          theme === "dark" ? "bg-gray-700 border-gray-600 hover:bg-gray-600" : "bg-green-50 border-green-100 hover:bg-green-100"
                        }`}
                        onClick={() => setRightPanelToRoom(u.hostel, u.roomNo, u.booking.id)}
                      >
                        <p className={`font-medium ${theme === "dark" ? "text-green-400" : "text-green-700"}`}>
                          {u.booking.guest} — {u.hostel} / {u.roomNo}
                        </p>
                        <p className={`text-sm ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>{u.booking.from} → {u.booking.to}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className={`text-sm italic ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>No upcoming bookings.</p>
                )}
              </div>
            </>
          )}

          {activeHostel && activeTab === "Home" && (
            <div className="grid grid-cols-2 gap-6 flex-grow">
              <div className={`shadow-md rounded-2xl p-6 border overflow-y-auto ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
                {activeHostel === "All Hostels" ? (
                  <>
                    <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${theme === "dark" ? "text-red-400" : "text-red-700"}`}>
                      <Building2 className={theme === "dark" ? "text-red-400" : "text-red-600"} /> All Hostels
                    </h2>
                    <p className={`text-sm mb-3 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                      Total Guest Rooms: {statsAll().total} | Occupied: {statsAll().occupied} | Available: {statsAll().available}
                    </p>
                    {Object.entries(hostelData || {}).map(([name, h]) => (
                      <div key={name} className={`border-b pb-3 mb-3 ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
                        <h3 className={`text-md font-semibold mb-2 ${theme === "dark" ? "text-red-400" : "text-red-600"}`}>{name}</h3>
                        {(h.rooms || []).map((room) => (
                          <RoomCard
                            key={room.roomNo}
                            hostel={activeHostel}
                            room={room}
                            onSelect={setRightPanelToRoom}
                            onCancel={(m) => setCancelModal(m)}
                            onDirectBooking={(hostel, rm) => setDirectBookingModal({ open: true, hostel, room: rm, prefill: null })}
                            setExtensionModal={setExtensionModal}
                            theme={theme}
                          />
                        ))}
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <h2 className={`text-xl font-semibold mb-4 ${theme === "dark" ? "text-red-400" : "text-red-700"}`}>
                      {activeHostel}
                    </h2>
                    <p className={`text-sm mb-3 ${theme === "dark" ? "text-gray-300" : "text-gray-600"}`}>
                      {(() => {
                        const s = statsForHostel(activeHostel);
                        return `Total Guest Rooms: ${s.total} | Occupied: ${s.occupied} | Available: ${s.available}`;
                      })()}
                    </p>
                    {(hostelData[activeHostel]?.rooms || []).map((room) => (
                      <RoomCard
                        key={room.roomNo}
                        hostel={activeHostel}
                        room={room}
                        onSelect={setRightPanelToRoom}
                        onCancel={(m) => setCancelModal(m)}
                        onDirectBooking={(hostel, rm) => setDirectBookingModal({ open: true, hostel, room: rm, prefill: null })}
                        setExtensionModal={setExtensionModal}
                        theme={theme}
                      />
                    ))}
                  </>
                )}
              </div>

              <div className={`shadow-md rounded-2xl p-6 ${theme === "dark" ? "bg-gray-800" : "bg-white"}`}>
                {activeRoomRef && activeRoomRef.booking ? (
                  <GuestDetails activeRoomRef={activeRoomRef} onCancel={(m) => setCancelModal(m)} theme={theme} setExtensionModal={setExtensionModal} />
                ) : (
                  <p className={`italic text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>Select a room to view booking details.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div className="fixed bottom-6 right-6 flex flex-col gap-3">
        <button className="p-3 bg-white border shadow-lg rounded-full hover:bg-red-50" onClick={() => setActiveTab("Settings")}>
          <Settings className="text-red-700" />
        </button>

        <button
          className="p-3 bg-white border shadow-lg rounded-full hover:bg-red-50"
          onClick={() => {
            const confirmed = window.confirm("Are you sure you want to clear all cache and cookies? This will reset the application.");
            if (confirmed) {
              try {
                localStorage.clear();
                sessionStorage.clear();

                // Clear cookies
                document.cookie.split(";").forEach((c) => {
                  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });

                alert("✅ Cache and cookies cleared successfully! Page will reload.");
                window.location.reload();
              } catch (err) {
                console.error("Failed to clear cache", err);
                alert("❌ Failed to clear cache. Try again.");
              }
            }
          }}
          title="Clear cache and cookies"
        >
          <Trash2 className="text-red-700" />
        </button>

        <button className="p-3 bg-white border shadow-lg rounded-full hover:bg-red-50" onClick={() => setFilterModal(true)}>
          <Filter className="text-red-700" />
        </button>
      </div>

      {filterModal && (
        <FilterModal
          hostelData={hostelData}
          onSelectBooking={(result) => {
            setActiveRoomRef({ hostel: result.hostel, roomNo: result.roomNo, booking: result.booking });
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
            addBookingToRoom(directBookingModal.hostel, directBookingModal.room.roomNo, b);
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
            cancelBooking(cancelModal.hostel, cancelModal.room.roomNo, cancelModal.booking.id, remarksText || "Cancelled");
            setRemarksText("");
            setCancelModal(null);
          }}
        />
      )}

      {toast.show && (
        <div className="fixed bottom-6 right-6 z-50 pointer-events-auto" aria-live="polite">
          <div className="max-w-xs w-full bg-white border border-red-200 shadow-xl rounded-xl p-4 flex items-start gap-3">
            <div className="text-2xl">🔔</div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-700">{toast.message}</p>
              <p className="text-xs text-gray-500 mt-1">Click the bell to view.</p>
            </div>
            <button onClick={() => setToast({ show: false, message: "" })} className="text-gray-400 hover:text-gray-600 ml-2" aria-label="Close">
              ✕
            </button>
          </div>
        </div>
      )}

      {searchModal && (
        <SearchGuestModal
          hostelData={hostelData}
          onSelectGuest={(result) => {
            setActiveRoomRef({ hostel: result.hostel, roomNo: result.roomNo, booking: result.booking });
            setSearchModal(false);
          }}
          onClose={() => setSearchModal(false)}
        />
      )}
    </main>
  );
}
