// src/components/HallBookings/SearchFilterModal.jsx - FIXED VERSION
import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Filter, Calendar, MapPin, User, Mail } from "lucide-react";

export default function SearchFilterModal({ theme, hallData, onClose }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHall, setSelectedHall] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Calculate filtered bookings
  const filteredBookings = useMemo(() => {
    const bookings = [];

    Object.keys(hallData || {}).forEach(hallName => {
      const hall = hallData[hallName];
      hall.rooms?.forEach(room => {
        room.bookings?.forEach(booking => {
          // Apply filters
          const matchesHall = selectedHall === "all" || booking.hall === selectedHall || hallName === selectedHall;
          const matchesStatus = selectedStatus === "all" || booking.status === selectedStatus;
          
          const matchesSearch = !searchTerm || 
            booking.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.eventName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.societyName?.toLowerCase().includes(searchTerm.toLowerCase());

          const matchesDateFrom = !dateFrom || booking.checkInDate >= dateFrom;
          const matchesDateTo = !dateTo || booking.checkOutDate <= dateTo;

          if (matchesHall && matchesStatus && matchesSearch && matchesDateFrom && matchesDateTo) {
            bookings.push({
              ...booking,
              hall: hallName,
              roomNo: room.roomNo
            });
          }
        });
      });
    });

    return bookings.sort((a, b) => 
      new Date(b.checkInDate) - new Date(a.checkInDate)
    );
  }, [hallData, searchTerm, selectedHall, selectedStatus, dateFrom, dateTo]);

  const handleReset = () => {
    setSearchTerm("");
    setSelectedHall("all");
    setSelectedStatus("all");
    setDateFrom("");
    setDateTo("");
  };

  const halls = Object.keys(hallData || {});
  const statuses = [
    { value: "all", label: "All Statuses" },
    { value: "booked", label: "Booked" },
    { value: "checked_in", label: "Checked In" },
    { value: "checked_out", label: "Checked Out" },
    { value: "cancelled", label: "Cancelled" },
    { value: "no_show", label: "No Show" },
  ];

  const getStatusColor = (status) => {
    const colors = {
      booked: "bg-blue-100 text-blue-700",
      checked_in: "bg-green-100 text-green-700",
      checked_out: "bg-gray-100 text-gray-700",
      cancelled: "bg-red-100 text-red-700",
      no_show: "bg-orange-100 text-orange-700",
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className={`w-full max-w-6xl rounded-2xl p-6 max-h-[90vh] overflow-hidden flex flex-col ${
            theme === "dark"
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Filter className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  Search & Filter Bookings
                </h2>
                <p className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}>
                  {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg hover:bg-gray-700 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search & Filters */}
          <div className="space-y-4 mb-6">
            {/* Search Box */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                <Search className="w-4 h-4 inline mr-2" />
                Search by Name, Email, Event, or Society
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type to search..."
                className={`w-full px-4 py-3 rounded-lg border ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                    : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                }`}
              />
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Hall Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  <MapPin className="w-4 h-4 inline mr-2" />
                  Hall
                </label>
                <select
                  value={selectedHall}
                  onChange={(e) => setSelectedHall(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  <option value="all">All Halls</option>
                  {halls.map(hall => (
                    <option key={hall} value={hall}>
                      {hall}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  <User className="w-4 h-4 inline mr-2" />
                  Status
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  {statuses.map(status => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              {/* Date To */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                }`}>
                  <Calendar className="w-4 h-4 inline mr-2" />
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>
            </div>

            {/* Active Filters Display */}
            {(searchTerm || selectedHall !== "all" || selectedStatus !== "all" || dateFrom || dateTo) && (
              <div className={`p-4 rounded-lg ${
                theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <p className={`text-sm font-medium ${
                    theme === "dark" ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Active Filters:
                  </p>
                  <button
                    onClick={handleReset}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Clear All
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {searchTerm && (
                    <span className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                      Search: {searchTerm}
                    </span>
                  )}
                  {selectedHall !== "all" && (
                    <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                      Hall: {selectedHall}
                    </span>
                  )}
                  {selectedStatus !== "all" && (
                    <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-xs">
                      Status: {selectedStatus}
                    </span>
                  )}
                  {dateFrom && (
                    <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs">
                      From: {dateFrom}
                    </span>
                  )}
                  {dateTo && (
                    <span className="px-3 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs">
                      To: {dateTo}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-12">
                <p className={`text-lg ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                  No bookings match your filters
                </p>
              </div>
            ) : (
              filteredBookings.map((booking, idx) => (
                <motion.div
                  key={booking._id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-lg border ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className={`font-bold ${
                          theme === "dark" ? "text-white" : "text-gray-900"
                        }`}>
                          {booking.eventName}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                          {booking.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                            Guest: <span className="font-medium text-white">{booking.name}</span>
                          </p>
                          <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                            Society: <span className="font-medium text-white">{booking.societyName}</span>
                          </p>
                        </div>
                        <div>
                          <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                            Hall: <span className="font-medium text-white">{booking.hall} - Room {booking.roomNo}</span>
                          </p>
                          <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                            Contact: <span className="font-medium text-white">{booking.contact}</span>
                          </p>
                        </div>
                        <div className="col-span-2">
                          <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                            Check-in: <span className="font-medium text-white">{booking.checkInDate} at {booking.checkInTime}</span>
                          </p>
                          <p className={`${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                            Check-out: <span className="font-medium text-white">{booking.checkOutDate} at {booking.checkOutTime}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4 mt-4 border-t border-gray-700">
            <button
              onClick={onClose}
              className={`flex-1 py-3 rounded-xl font-medium ${
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-900"
              }`}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}