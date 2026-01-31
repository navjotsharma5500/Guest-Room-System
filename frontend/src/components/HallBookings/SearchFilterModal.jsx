// src/components/HallBookings/SearchFilterModal.jsx
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Filter, Calendar, User, Building, Download } from "lucide-react";
import * as XLSX from 'xlsx';

export default function SearchFilterModal({ theme, hallData, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedHall, setSelectedHall] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Get all bookings from hall data
  const allBookings = useMemo(() => {
    const bookings = [];
    
    if (!hallData) return bookings;

    Object.entries(hallData).forEach(([hallName, hallInfo]) => {
      (hallInfo.rooms || []).forEach(room => {
        (room.bookings || []).forEach(booking => {
          bookings.push({
            ...booking,
            hallName,
            roomNo: room.roomNo,
          });
        });
      });
    });

    return bookings;
  }, [hallData]);

  // Filter bookings based on search criteria
  const filteredBookings = useMemo(() => {
    let filtered = [...allBookings];

    // Search by name, society, event, contact, email
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(b => 
        (b.name || "").toLowerCase().includes(search) ||
        (b.societyName || "").toLowerCase().includes(search) ||
        (b.eventName || "").toLowerCase().includes(search) ||
        (b.contact || "").toLowerCase().includes(search) ||
        (b.email || "").toLowerCase().includes(search)
      );
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(b => {
        const checkIn = new Date(b.checkInDate || b.from);
        return checkIn >= new Date(startDate);
      });
    }

    if (endDate) {
      filtered = filtered.filter(b => {
        const checkOut = new Date(b.checkOutDate || b.to);
        return checkOut <= new Date(endDate);
      });
    }

    // Filter by hall
    if (selectedHall !== "all") {
      filtered = filtered.filter(b => b.hallName === selectedHall);
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter(b => b.status === selectedStatus);
    }

    // Sort by check-in date (newest first)
    filtered.sort((a, b) => {
      const dateA = new Date(a.checkInDate || a.from);
      const dateB = new Date(b.checkInDate || b.from);
      return dateB - dateA;
    });

    return filtered;
  }, [allBookings, searchTerm, startDate, endDate, selectedHall, selectedStatus]);

  // Get unique hall names
  const hallNames = useMemo(() => {
    if (!hallData) return [];
    return Object.keys(hallData);
  }, [hallData]);

  // Download filtered bookings as Excel
  const handleDownload = () => {
    if (filteredBookings.length === 0) {
      alert("No bookings to download");
      return;
    }

    const exportData = filteredBookings.map((booking, index) => ({
      "S.No": index + 1,
      "Name": booking.name || "—",
      "Society": booking.societyName || "—",
      "Event": booking.eventName || "—",
      "Contact": booking.contact || "—",
      "Email": booking.email || "—",
      "Hall": booking.hallName || "—",
      "Room": booking.roomNo || "—",
      "Check-in Date": booking.checkInDate || booking.from || "—",
      "Check-in Time": booking.checkInTime || "—",
      "Check-out Date": booking.checkOutDate || booking.to || "—",
      "Check-out Time": booking.checkOutTime || "—",
      "Status": booking.status || "—",
      "Purpose": booking.purpose || "—",
      "Description": booking.description || "—",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Hall Bookings");

    // Auto-size columns
    const maxWidth = 30;
    const colWidths = Object.keys(exportData[0] || {}).map(key => ({
      wch: Math.min(
        maxWidth,
        Math.max(
          key.length,
          ...exportData.map(row => String(row[key] || "").length)
        )
      )
    }));
    worksheet['!cols'] = colWidths;

    const fileName = `Hall_Bookings_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Format date display
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className={`rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden ${
          theme === "dark" 
            ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" 
            : "bg-gradient-to-br from-white via-red-50 to-white"
        }`}
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
      >
        {/* Header */}
        <div className={`px-8 py-6 border-b-2 ${
          theme === "dark" 
            ? "border-gray-700 bg-gradient-to-r from-red-900/30 to-orange-900/30" 
            : "border-red-100 bg-gradient-to-r from-red-600 to-red-700"
        }`}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className={`text-3xl font-bold flex items-center gap-3 ${
                theme === "dark" ? "text-red-400" : "text-white"
              }`}>
                <Search className="w-8 h-8" />
                Search & Filter Bookings
              </h2>
              <p className={`text-sm mt-1 ${
                theme === "dark" ? "text-red-300" : "text-red-100"
              }`}>
                Found {filteredBookings.length} booking(s)
              </p>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDownload}
                className={`px-4 py-2 rounded-xl font-semibold flex items-center gap-2 ${
                  theme === "dark"
                    ? "bg-green-700 hover:bg-green-600 text-white"
                    : "bg-white hover:bg-green-50 text-green-700"
                }`}
              >
                <Download className="w-4 h-4" />
                Download
              </motion.button>
              <motion.button
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-red-400 hover:bg-gray-800"
                    : "text-white hover:text-red-200 hover:bg-red-600"
                }`}
              >
                <X size={28} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`px-8 py-6 border-b ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Search
              </label>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === "dark" ? "text-gray-500" : "text-gray-400"
                }`} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name, Society, Event, Contact..."
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 transition-all ${
                    theme === "dark"
                      ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500"
                      : "border-gray-300 bg-white focus:border-red-500"
                  } outline-none`}
                />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                From Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border-2 transition-all ${
                  theme === "dark"
                    ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500"
                    : "border-gray-300 bg-white focus:border-red-500"
                } outline-none`}
              />
            </div>

            {/* End Date */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                To Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className={`w-full px-4 py-2.5 rounded-xl border-2 transition-all ${
                  theme === "dark"
                    ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500"
                    : "border-gray-300 bg-white focus:border-red-500"
                } outline-none`}
              />
            </div>

            {/* Hall Filter */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Hall
              </label>
              <select
                value={selectedHall}
                onChange={(e) => setSelectedHall(e.target.value)}
                className={`w-full px-4 py-2.5 rounded-xl border-2 transition-all ${
                  theme === "dark"
                    ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500"
                    : "border-gray-300 bg-white focus:border-red-500"
                } outline-none`}
              >
                <option value="all">All Halls</option>
                {hallNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchTerm("");
                setStartDate("");
                setEndDate("");
                setSelectedHall("all");
                setSelectedStatus("all");
              }}
              className={`text-sm font-semibold ${
                theme === "dark" ? "text-red-400 hover:text-red-300" : "text-red-600 hover:text-red-700"
              }`}
            >
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="px-8 py-6 overflow-y-auto max-h-[50vh]">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <div className={`text-6xl mb-4`}>🔍</div>
              <p className={`text-lg font-semibold ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}>
                No bookings found
              </p>
              <p className={`text-sm mt-2 ${
                theme === "dark" ? "text-gray-500" : "text-gray-500"
              }`}>
                Try adjusting your search filters
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((booking, index) => (
                <motion.div
                  key={booking._id || index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`p-4 rounded-xl border-2 transition-all hover:shadow-lg ${
                    theme === "dark"
                      ? "border-gray-700 bg-gray-800 hover:border-red-600"
                      : "border-gray-200 bg-white hover:border-red-400"
                  }`}
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Column 1: Basic Info */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-red-600" />
                        <p className={`font-bold ${
                          theme === "dark" ? "text-gray-100" : "text-gray-800"
                        }`}>
                          {booking.name}
                        </p>
                      </div>
                      <p className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        {booking.societyName}
                      </p>
                      <p className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        {booking.eventName}
                      </p>
                      <p className={`text-xs mt-1 ${
                        theme === "dark" ? "text-gray-500" : "text-gray-500"
                      }`}>
                        📞 {booking.contact}
                      </p>
                    </div>

                    {/* Column 2: Hall & Room */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building className="w-4 h-4 text-blue-600" />
                        <p className={`font-semibold ${
                          theme === "dark" ? "text-gray-100" : "text-gray-800"
                        }`}>
                          {booking.hallName}
                        </p>
                      </div>
                      <p className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        Room: {booking.roomNo}
                      </p>
                      <div className="mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          booking.status === "checked_in" ? "bg-red-100 text-red-700" :
                          booking.status === "booked" ? "bg-yellow-100 text-yellow-700" :
                          booking.status === "checked_out" ? "bg-green-100 text-green-700" :
                          booking.status === "cancelled" ? "bg-gray-100 text-gray-700" :
                          "bg-blue-100 text-blue-700"
                        }`}>
                          {booking.status?.toUpperCase() || "BOOKED"}
                        </span>
                      </div>
                    </div>

                    {/* Column 3: Dates */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-green-600" />
                        <p className={`text-sm font-semibold ${
                          theme === "dark" ? "text-gray-100" : "text-gray-800"
                        }`}>
                          Check-in
                        </p>
                      </div>
                      <p className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        {formatDate(booking.checkInDate || booking.from)} at {booking.checkInTime || "—"}
                      </p>
                      
                      <div className="flex items-center gap-2 mt-2 mb-2">
                        <Calendar className="w-4 h-4 text-red-600" />
                        <p className={`text-sm font-semibold ${
                          theme === "dark" ? "text-gray-100" : "text-gray-800"
                        }`}>
                          Check-out
                        </p>
                      </div>
                      <p className={`text-sm ${
                        theme === "dark" ? "text-gray-400" : "text-gray-600"
                      }`}>
                        {formatDate(booking.checkOutDate || booking.to)} at {booking.checkOutTime || "—"}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`px-8 py-4 border-t ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        }`}>
          <div className="flex justify-between items-center">
            <p className={`text-sm ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}>
              Showing {filteredBookings.length} of {allBookings.length} total bookings
            </p>
            <button
              onClick={onClose}
              className={`px-6 py-2 rounded-xl font-semibold transition-all ${
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}