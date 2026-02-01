// src/pages/HallBookingDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Home, LogOut, User, Calendar, Users, Bell, 
  Download, Search, TrendingUp, Clock 
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import HallBookingsPortal from "./HallBookingsPortal";
import useHallDataPolling from "../hooks/useHallDataPolling";

export default function HallBookingDashboard() {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [view, setView] = useState("dashboard"); // "dashboard" or "portal"

  // Real-time hall data
  const { hallData, loading, hasData, error, lastUpdate, connected, refresh } = useHallDataPolling({});

  // Get bookings for selected date
  const bookingsOnDate = useMemo(() => {
    const bookings = [];
    const dateStr = selectedDate.toISOString().split('T')[0];

    Object.values(hallData || {}).forEach((hall) => {
      (hall.rooms || []).forEach((room) => {
        (room.bookings || []).filter(b => {
          const checkIn = new Date(b.from || b.checkInDate).toISOString().split('T')[0];
          const checkOut = new Date(b.to || b.checkOutDate).toISOString().split('T')[0];
          return dateStr >= checkIn && dateStr <= checkOut;
        }).forEach(booking => {
          bookings.push({
            ...booking,
            hall: hall.name,
            roomNo: room.roomNo
          });
        });
      });
    });

    return bookings;
  }, [hallData, selectedDate]);

  // Get upcoming bookings (top 5)
  const upcomingBookings = useMemo(() => {
    const all = [];
    const now = new Date();

    Object.values(hallData || {}).forEach((hall) => {
      (hall.rooms || []).forEach((room) => {
        (room.bookings || []).filter(b => {
          const status = b.status === "booked" || b.status === "checked_in";
          const checkIn = new Date(b.from || b.checkInDate);
          return status && checkIn >= now;
        }).forEach(booking => {
          all.push({
            ...booking,
            hall: hall.name,
            roomNo: room.roomNo
          });
        });
      });
    });

    return all
      .sort((a, b) => new Date(a.from || a.checkInDate) - new Date(b.from || b.checkInDate))
      .slice(0, 5);
  }, [hallData]);

  // Calculate statistics
  const stats = useMemo(() => {
    let totalRooms = 0;
    let bookedRooms = 0;
    let activeBookings = 0;

    const now = new Date();

    Object.values(hallData || {}).forEach((hall) => {
      (hall.rooms || []).forEach((room) => {
        totalRooms++;
        
        const activeRoomBookings = (room.bookings || []).filter((b) => {
          if (b.status !== "booked" && b.status !== "checked_in") return false;
          
          const checkoutDate = new Date(b.to || b.checkOutDate);
          const time = b.checkOutTime || "23:59";
          const [h, m] = time.split(":").map(Number);
          checkoutDate.setHours(h, m, 0, 0);
          
          return checkoutDate >= now;
        });

        if (activeRoomBookings.length > 0) {
          bookedRooms++;
          activeBookings += activeRoomBookings.length;
        }
      });
    });

    return {
      totalRooms,
      bookedRooms,
      availableRooms: totalRooms - bookedRooms,
      activeBookings,
    };
  }, [hallData]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleBackHome = () => {
    const role = currentUser?.role || currentUser?.user?.role;
    if (role === "admin") {
      navigate("/admin/dashboard-selector");
    } else {
      navigate("/");
    }
  };

  // Calendar renderer
  const renderCalendar = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const monthNames = ["January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"];

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-10"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <button
          key={day}
          onClick={() => setSelectedDate(date)}
          className={`h-10 rounded-lg transition-all ${
            isSelected
              ? "bg-red-600 text-white font-bold"
              : isToday
              ? "bg-red-100 text-red-700 font-semibold"
              : "hover:bg-gray-100"
          }`}
        >
          {day}
        </button>
      );
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setSelectedDate(new Date(year, month - 1, 1))}
            className="text-red-600 hover:bg-red-50 p-2 rounded"
          >
            «
          </button>
          <h3 className="font-bold text-red-700">
            {monthNames[month]} {year}
          </h3>
          <button
            onClick={() => setSelectedDate(new Date(year, month + 1, 1))}
            className="text-red-600 hover:bg-red-50 p-2 rounded"
          >
            »
          </button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-gray-600 mb-2">
          {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2 text-sm text-center">
          {days}
        </div>

        <p className="text-xs text-gray-500 mt-4 text-center">
          Click any date to view active, upcoming, past and cancelled bookings
        </p>
      </div>
    );
  };

  if (view === "portal") {
    return (
        <HallBookingsPortal
        hallData={hallData}
        setHallData={() => {}}
        theme="light"
        onBackHome={() => setView("dashboard")}
        />
    );
    }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50" style={{ zoom: "75%" }}>
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b-2 border-red-100 px-6 py-3 flex justify-between items-center shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Hostel Guest Room Booking
              </h1>
              <div className="flex items-center gap-2 text-xs">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className="text-gray-500">
                  {connected ? 'LIVE' : 'OFFLINE'} · Updated {new Date(lastUpdate).toLocaleTimeString()}
                </span>
                <button onClick={refresh} className="text-blue-600 hover:underline ml-2">
                  🔄 Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Header Stats */}
          <div className="flex items-center gap-4">
            <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-200">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-red-600" />
                <div className="text-center">
                  <p className="text-xs text-gray-600">ACTIVE BOOKINGS</p>
                  <p className="text-2xl font-bold text-red-700">{stats.activeBookings}</p>
                  <p className="text-xs text-gray-500">Real-time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side Buttons */}
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Enquiry
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm">
              Home
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">
              <Search className="w-4 h-4" />
            </button>
            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-sm">
              Analytics
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm">
              <Download className="w-4 h-4 inline mr-1" />
              Download
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
              <User className="w-5 h-5 text-gray-700" />
              <span className="text-sm font-medium">{currentUser?.name || "User"}</span>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </header>

        {/* Main Dashboard */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Calendar + Upcoming */}
          <div className="w-1/2 p-6 overflow-y-auto">
            {/* Calendar */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Select a Date to View Bookings
              </h2>
              {renderCalendar()}
            </div>

            {/* Upcoming Bookings */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold text-red-700 mb-4 flex items-center gap-2">
                📅 Upcoming Bookings
                <span className="text-sm bg-green-500 text-white px-2 py-0.5 rounded-full">
                  {upcomingBookings.length} Bookings
                </span>
              </h2>

              <div className="space-y-3">
                {upcomingBookings.map((booking, idx) => (
                  <motion.div
                    key={booking._id || idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setSelectedBooking(booking)}
                    className="bg-green-50 border-2 border-green-300 rounded-lg p-3 cursor-pointer hover:bg-green-100 transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <p className="font-bold text-green-700 text-sm">
                          {booking.name || booking.guest}
                        </p>
                      </div>
                      <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full font-bold">
                        UPCOMING
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                      <div>
                        <p className="font-medium">Hall: {booking.hall}</p>
                        <p>Room: {booking.roomNo}</p>
                      </div>
                      <div>
                        <p className="font-medium">
                          Check-in: {new Date(booking.from || booking.checkInDate).toLocaleDateString()}
                        </p>
                        <p>
                          Time: {booking.checkInTime || "N/A"}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {upcomingBookings.length === 0 && (
                  <p className="text-center text-gray-500 py-8">
                    No upcoming bookings
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Booking Details */}
          <div className="w-1/2 p-6 overflow-y-auto bg-gray-100">
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-lg font-bold text-red-700 mb-4">
                Booking Details
              </h2>

              {selectedBooking ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-6">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-gray-600" />
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-semibold">Name:</span>
                      <span>{selectedBooking.name || selectedBooking.guest}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Hall:</span>
                      <span>{selectedBooking.hall}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Room:</span>
                      <span>{selectedBooking.roomNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Check-in:</span>
                      <span>{new Date(selectedBooking.from || selectedBooking.checkInDate).toLocaleDateString()} ({selectedBooking.checkInTime})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Check-out:</span>
                      <span>{new Date(selectedBooking.to || selectedBooking.checkOutDate).toLocaleDateString()} ({selectedBooking.checkOutTime})</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Contact:</span>
                      <span>{selectedBooking.contact || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold">Email:</span>
                      <span className="text-xs">{selectedBooking.email || "N/A"}</span>
                    </div>
                    {selectedBooking.purpose && (
                      <div>
                        <span className="font-semibold">Purpose:</span>
                        <p className="text-gray-600 mt-1">{selectedBooking.purpose}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                    📋
                  </div>
                  <p className="text-lg font-semibold">No Booking Selected</p>
                  <p className="text-sm mt-2">
                    Select a booking from the upcoming bookings below or click a room to view details
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions Footer */}
        <footer className="bg-white border-t-2 border-red-100 p-4 shadow-lg">
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setView("portal")}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold shadow-md transition"
            >
              <Calendar className="w-5 h-5" />
              Manage Bookings
            </button>
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-md transition"
            >
              <TrendingUp className="w-5 h-5" />
              Refresh Data
            </button>
            <button
              onClick={handleBackHome}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold shadow-md transition"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}