// src/components/HallBookings/HallBookingDashboard.jsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Calendar from "react-calendar";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  MapPin, 
  Users,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
  Download,
  Filter
} from "lucide-react";
import "react-calendar/dist/Calendar.css";
import "../../styles/calendarCustom.css";
import * as XLSX from 'xlsx';

import HallSidebar from "./HallSidebar";
import HallBookingsPortal from "../../pages/HallBookingsPortal";
import { useToast } from "../../context/ToastContext";

export default function HallBookingDashboard({
  hallData = {},
  setHallData,
  theme,
  onBackHome,
}) {
  const { showToast } = useToast();
  
  // State Management
  const [activeSection, setActiveSection] = useState("home"); // "home" or "portal"
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [bookingsForDate, setBookingsForDate] = useState([]);

  // Calculate statistics
  const stats = useMemo(() => {
    let totalRooms = 0;
    let totalAvailable = 0;
    let totalActive = 0;
    let totalUpcoming = 0;
    let allBookings = [];

    Object.entries(hallData || {}).forEach(([hallName, hallInfo]) => {
      const rooms = hallInfo.rooms || [];
      totalRooms += rooms.length;

      rooms.forEach(room => {
        const activeBookings = (room.bookings || []).filter(b => 
          ["booked", "checked_in"].includes(b.status)
        );

        if (activeBookings.length === 0) {
          totalAvailable++;
        } else {
          const now = new Date();
          const hasActive = activeBookings.some(b => {
            const checkInDate = new Date(b.from || b.checkInDate);
            const checkInTime = b.checkInTime || "00:00";
            const [hours, minutes] = checkInTime.split(':').map(Number);
            checkInDate.setHours(hours, minutes, 0, 0);
            return now >= checkInDate;
          });

          if (hasActive) {
            totalActive++;
          } else {
            totalUpcoming++;
          }
        }

        // Collect all bookings
        activeBookings.forEach(booking => {
          allBookings.push({
            ...booking,
            hall: hallName,
            roomNo: room.roomNo,
          });
        });
      });
    });

    // Sort bookings by check-in date
    allBookings.sort((a, b) => {
      const dateA = new Date(a.from || a.checkInDate);
      const dateB = new Date(b.from || b.checkInDate);
      return dateA - dateB;
    });

    return {
      totalRooms,
      totalAvailable,
      totalActive,
      totalUpcoming,
      allBookings,
    };
  }, [hallData]);

  // Get upcoming bookings (top 5)
  const upcomingBookings = useMemo(() => {
    const now = new Date();
    
    return stats.allBookings
      .filter(booking => {
        const checkInDate = new Date(booking.from || booking.checkInDate);
        const checkInTime = booking.checkInTime || "00:00";
        const [hours, minutes] = checkInTime.split(':').map(Number);
        checkInDate.setHours(hours, minutes, 0, 0);
        
        // Only future bookings
        return checkInDate > now && booking.status === "booked";
      })
      .slice(0, 5); // Top 5
  }, [stats.allBookings]);

  // Get bookings for selected date
  useEffect(() => {
    const dateStr = selectedDate.toISOString().split("T")[0];
    
    const filtered = stats.allBookings.filter(booking => {
      const checkIn = new Date(booking.from || booking.checkInDate);
      const checkOut = new Date(booking.to || booking.checkOutDate);
      
      const checkInStr = checkIn.toISOString().split("T")[0];
      const checkOutStr = checkOut.toISOString().split("T")[0];
      
      return dateStr >= checkInStr && dateStr <= checkOutStr;
    });
    
    setBookingsForDate(filtered);
    
    // Auto-select first booking if available
    if (filtered.length > 0 && !selectedBooking) {
      setSelectedBooking(filtered[0]);
    }
  }, [selectedDate, stats.allBookings]);

  // Calendar tile styling
  const tileClassName = ({ date }) => {
    const dateStr = date.toISOString().split("T")[0];
    
    const hasBookings = stats.allBookings.some(booking => {
      const checkIn = new Date(booking.from || booking.checkInDate);
      const checkOut = new Date(booking.to || booking.checkOutDate);
      
      const checkInStr = checkIn.toISOString().split("T")[0];
      const checkOutStr = checkOut.toISOString().split("T")[0];
      
      return dateStr >= checkInStr && dateStr <= checkOutStr;
    });
    
    return hasBookings ? "has-bookings" : "";
  };

  // Format date/time
  const formatDateTime = (dateString, timeString) => {
    if (!dateString) return "—";

    try {
      const date = new Date(dateString);
      
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const day = date.getDate();
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      
      const formattedDate = `${String(day).padStart(2, "0")}-${month}-${year}`;

      if (!timeString) return formattedDate;

      const [hours, minutes] = timeString.split(":").map(Number);
      const period = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;

      return `${formattedDate} (${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period})`;
    } catch {
      return dateString;
    }
  };

  // Handle navigation
  const handleNavigate = (section) => {
    setActiveSection(section);
  };

  // Download all bookings data
  const handleDownloadData = () => {
    try {
      const allBookings = [];
      
      Object.entries(hallData).forEach(([hallName, hallInfo]) => {
        (hallInfo.rooms || []).forEach(room => {
          (room.bookings || []).forEach(booking => {
            allBookings.push({
              "Hall": hallName,
              "Room": room.roomNo,
              "Name": booking.name || "—",
              "Society": booking.societyName || "—",
              "Event": booking.eventName || "—",
              "Contact": booking.contact || "—",
              "Email": booking.email || "—",
              "Check-in Date": booking.checkInDate || booking.from || "—",
              "Check-in Time": booking.checkInTime || "—",
              "Check-out Date": booking.checkOutDate || booking.to || "—",
              "Check-out Time": booking.checkOutTime || "—",
              "Status": booking.status || "—",
              "Purpose": booking.purpose || "—",
              "Description": booking.description || "—",
            });
          });
        });
      });

      if (allBookings.length === 0) {
        showToast("⚠️ No bookings to download", "warning");
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(allBookings);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Hall Bookings");

      // Auto-size columns
      const maxWidth = 30;
      const colWidths = Object.keys(allBookings[0] || {}).map(key => ({
        wch: Math.min(
          maxWidth,
          Math.max(
            key.length,
            ...allBookings.map(row => String(row[key] || "").length)
          )
        )
      }));
      worksheet['!cols'] = colWidths;

      const fileName = `Hall_Bookings_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      showToast("✅ Data downloaded successfully", "success");
    } catch (error) {
      console.error("❌ Download error:", error);
      showToast("❌ Failed to download data", "error");
    }
  };

  // If in portal view, show full portal
  if (activeSection === "portal") {
    return (
      <div className="fixed inset-0 top-16">
        <HallSidebar
          theme={theme}
          onNavigate={handleNavigate}
          activeSection={activeSection}
        />
        <div className="ml-[250px] h-full overflow-y-auto">
          <HallBookingsPortal
            hallData={hallData}
            setHallData={setHallData}
            theme={theme}
            onBackHome={onBackHome}
          />
        </div>
      </div>
    );
  }

  // Dashboard Home View
  return (
    <div className="fixed inset-0 top-16">
      <HallSidebar
        theme={theme}
        onNavigate={handleNavigate}
        activeSection={activeSection}
      />
      
      <main className={`ml-[250px] h-full overflow-y-auto p-6 ${
        theme === "dark"
          ? "bg-gradient-to-b from-gray-900 to-gray-800"
          : "bg-gradient-to-b from-red-50 to-white"
      }`}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Statistics Overview */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {/* Total Rooms */}
            <div className={`p-6 rounded-2xl border-2 shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600"
                : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-600">{stats.totalRooms}</p>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Total Rooms
                  </p>
                </div>
              </div>
            </div>

            {/* Available */}
            <div className={`p-6 rounded-2xl border-2 shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600"
                : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">{stats.totalAvailable}</p>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Available
                  </p>
                </div>
              </div>
            </div>

            {/* Active Now */}
            <div className={`p-6 rounded-2xl border-2 shadow-lg ${
              theme === "dark"
                ? "bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600"
                : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
            }`}>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-xl">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-600">{stats.totalActive}</p>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Active Now
                  </p>
                </div>
              </div>
            </div>

            {/* Upcoming - With Download Button */}
            <div className={`p-6 rounded-2xl border-2 shadow-lg relative ${
              theme === "dark"
                ? "bg-gradient-to-br from-gray-800 to-gray-700 border-gray-600"
                : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
            }`}>
              {/* Download Button - Positioned top-right */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleDownloadData}
                className="absolute top-2 right-2 p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors"
                title="Download All Bookings"
              >
                <Download className="w-4 h-4 text-green-600" />
              </motion.button>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-xl">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-yellow-600">{stats.totalUpcoming}</p>
                  <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                    Upcoming
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Calendar and Booking Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Calendar Section */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className={`shadow-xl rounded-2xl p-6 ${
                theme === "dark"
                  ? "bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700"
                  : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3 mb-6">
                <CalendarIcon className="w-6 h-6 text-red-600" />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  Booking Calendar
                </h2>
              </div>

              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileClassName={tileClassName}
                className={theme === "dark" ? "dark-calendar" : ""}
              />

              {/* Bookings for Selected Date */}
              <div className="mt-6 space-y-3">
                <h3 className={`font-semibold text-lg flex items-center gap-2 ${
                  theme === "dark" ? "text-gray-200" : "text-gray-800"
                }`}>
                  <Building2 className="w-5 h-5 text-red-600" />
                  Bookings on {selectedDate.toLocaleDateString()}
                </h3>

                {bookingsForDate.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {bookingsForDate.map((booking, index) => (
                      <motion.div
                        key={booking._id || index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => setSelectedBooking(booking)}
                        whileHover={{ scale: 1.02 }}
                        className={`p-3 rounded-xl cursor-pointer transition-all ${
                          selectedBooking?._id === booking._id
                            ? "bg-red-100 border-2 border-red-600"
                            : theme === "dark"
                            ? "bg-gray-700 hover:bg-gray-600"
                            : "bg-white hover:bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className={`font-semibold text-sm ${
                            theme === "dark" ? "text-gray-200" : "text-gray-800"
                          }`}>
                            {booking.name || booking.guest || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            {booking.hall} - {booking.roomNo}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className={`text-sm ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`}>
                      No bookings on this date
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Booking Details Section */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className={`shadow-xl rounded-2xl p-6 ${
                theme === "dark"
                  ? "bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700"
                  : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
              }`}
            >
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent mb-6">
                Booking Details
              </h2>

              {selectedBooking ? (
                <motion.div
                  key={selectedBooking._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {/* Guest Name */}
                  <div className={`p-4 rounded-xl ${
                    theme === "dark" ? "bg-gray-700" : "bg-red-50"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-red-600" />
                      <span className="text-sm font-semibold text-gray-500">Guest Name</span>
                    </div>
                    <p className={`text-lg font-bold ${
                      theme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>
                      {selectedBooking.name || selectedBooking.guest || "—"}
                    </p>
                  </div>

                  {/* Location */}
                  <div className={`p-4 rounded-xl ${
                    theme === "dark" ? "bg-gray-700" : "bg-blue-50"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-500">Location</span>
                    </div>
                    <p className={`text-lg font-bold ${
                      theme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>
                      {selectedBooking.hall} - Room {selectedBooking.roomNo}
                    </p>
                  </div>

                  {/* Check-in */}
                  <div className={`p-4 rounded-xl ${
                    theme === "dark" ? "bg-gray-700" : "bg-green-50"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-semibold text-gray-500">Check-in</span>
                    </div>
                    <p className={`text-lg font-bold ${
                      theme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>
                      {formatDateTime(selectedBooking.from || selectedBooking.checkInDate, selectedBooking.checkInTime)}
                    </p>
                  </div>

                  {/* Check-out */}
                  <div className={`p-4 rounded-xl ${
                    theme === "dark" ? "bg-gray-700" : "bg-yellow-50"
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm font-semibold text-gray-500">Check-out</span>
                    </div>
                    <p className={`text-lg font-bold ${
                      theme === "dark" ? "text-gray-100" : "text-gray-900"
                    }`}>
                      {formatDateTime(selectedBooking.to || selectedBooking.checkOutDate, selectedBooking.checkOutTime)}
                    </p>
                  </div>

                  {/* Additional Info */}
                  {(selectedBooking.societyName || selectedBooking.eventName) && (
                    <div className={`p-4 rounded-xl ${
                      theme === "dark" ? "bg-gray-700" : "bg-purple-50"
                    }`}>
                      <div className="space-y-2">
                        {selectedBooking.societyName && (
                          <div>
                            <span className="text-sm font-semibold text-gray-500">Society:</span>
                            <p className={`font-bold ${
                              theme === "dark" ? "text-gray-100" : "text-gray-900"
                            }`}>
                              {selectedBooking.societyName}
                            </p>
                          </div>
                        )}
                        {selectedBooking.eventName && (
                          <div>
                            <span className="text-sm font-semibold text-gray-500">Event:</span>
                            <p className={`font-bold ${
                              theme === "dark" ? "text-gray-100" : "text-gray-900"
                            }`}>
                              {selectedBooking.eventName}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                    <Users className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className={`text-lg font-semibold ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    No Booking Selected
                  </p>
                  <p className={`text-sm mt-2 ${
                    theme === "dark" ? "text-gray-500" : "text-gray-500"
                  }`}>
                    Select a date with bookings to view details
                  </p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Upcoming Bookings Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`shadow-xl rounded-2xl p-6 ${
              theme === "dark"
                ? "bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700"
                : "bg-gradient-to-br from-white to-gray-50 border border-gray-200"
            }`}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-red-600" />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">
                  Upcoming Bookings
                </h2>
              </div>
              <span className={`text-sm ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}>
                Top 5 upcoming
              </span>
            </div>

            {upcomingBookings.length > 0 ? (
              <div className="space-y-3">
                {upcomingBookings.map((booking, index) => (
                  <motion.div
                    key={booking._id || index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01, x: 5 }}
                    onClick={() => setSelectedBooking(booking)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border-l-4 border-l-yellow-500 ${
                      theme === "dark"
                        ? "bg-gray-700 hover:bg-gray-600"
                        : "bg-white hover:bg-gray-50 border border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-gray-500" />
                          <span className={`font-semibold ${
                            theme === "dark" ? "text-gray-200" : "text-gray-800"
                          }`}>
                            {booking.name || booking.guest || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className={theme === "dark" ? "text-gray-400" : "text-gray-600"}>
                            {booking.hall} - Room {booking.roomNo}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>
                          {formatDateTime(booking.from || booking.checkInDate, booking.checkInTime)}
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 mt-1 inline-block">
                          UPCOMING
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-100 mx-auto flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-gray-400" />
                </div>
                <p className={`text-lg font-semibold ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}>
                  No Upcoming Bookings
                </p>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}