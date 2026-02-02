// src/pages/HallBookingDashboard.jsx - Rooms Tab with Bigger Cards and Better Layout
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Users, Calendar, Plus, Search, Filter } from "lucide-react";

export default function RoomsTab({ hallData, theme, onRoomClick, onDirectBook, selectionMode, selectedRooms, toggleRoomSelect }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const extractInitial = (hallName) => {
    const match = hallName.match(/\(([^)]+)\)/);
    if (match && match[1]) {
      return match[1].trim().toUpperCase();
    }
    return hallName.charAt(0).toUpperCase();
  };

  const sortedHalls = Object.entries(hallData || {}).sort(([nameA], [nameB]) => {
    const initialA = extractInitial(nameA);
    const initialB = extractInitial(nameB);
    return initialA.localeCompare(initialB, undefined, { sensitivity: 'base', numeric: true });
  });

  // Filter halls by search
  const filteredHalls = sortedHalls.filter(([hallName]) =>
    hallName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div>
          <h2 className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            All Halls & Rooms
          </h2>
          <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
            Manage your hall bookings and room availability
          </p>
        </div>

        <div className="flex gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search halls..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border-2 focus:ring-2 focus:ring-red-200 transition ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 text-white placeholder-gray-400"
                  : "bg-white border-gray-300 placeholder-gray-500"
              }`}
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-2.5 rounded-xl border-2 focus:ring-2 focus:ring-red-200 transition ${
              theme === "dark"
                ? "bg-gray-800 border-gray-700 text-white"
                : "bg-white border-gray-300"
            }`}
          >
            <option value="all">All Rooms</option>
            <option value="vacant">Vacant Only</option>
            <option value="occupied">Occupied Only</option>
          </select>
        </div>
      </div>

      {/* Hall Cards Grid - Bigger Cards */}
      <div className="grid gap-8 grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3">
        {filteredHalls.map(([hallName, hall]) => (
          <HallCard
            key={hallName}
            hallName={hallName}
            hall={hall}
            theme={theme}
            onRoomClick={onRoomClick}
            onDirectBook={onDirectBook}
            selectionMode={selectionMode}
            selectedRooms={selectedRooms}
            toggleRoomSelect={toggleRoomSelect}
            filterStatus={filterStatus}
          />
        ))}
      </div>
    </div>
  );
}

// Large Hall Card Component
function HallCard({ hallName, hall, theme, onRoomClick, onDirectBook, selectionMode, selectedRooms, toggleRoomSelect, filterStatus }) {
  const rooms = hall.rooms || [];

  // Filter rooms based on filterStatus
  const filteredRooms = rooms.filter(room => {
    const hasActiveBooking = (room.bookings || []).some(
      b => ["booked", "checked_in"].includes(b.status)
    );

    if (filterStatus === "vacant") return !hasActiveBooking;
    if (filterStatus === "occupied") return hasActiveBooking;
    return true;
  });

  const activeBookings = rooms.reduce((count, room) => {
    const active = (room.bookings || []).filter(
      b => ["booked", "checked_in"].includes(b.status)
    );
    return count + active.length;
  }, 0);

  const occupiedRooms = rooms.filter((r) => {
    const activeBookings = (r.bookings || []).filter(
      b => ["booked", "checked_in"].includes(b.status)
    );
    return activeBookings.length > 0;
  }).length;

  const available = rooms.length - occupiedRooms;
  const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;

  const isRoomSelected = (roomNo) => {
    return selectedRooms?.some(r => r.hall === hallName && r.roomNo === roomNo);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, boxShadow: "0 25px 50px rgba(0,0,0,0.15)" }}
      className={`rounded-3xl backdrop-blur-xl border-2 shadow-2xl overflow-hidden ${
        theme === "dark"
          ? "border-gray-700 bg-gray-800/80"
          : "border-red-200 bg-white/90"
      }`}
    >
      {/* Header */}
      <div
        className={`px-8 py-6 border-b-2 ${
          theme === "dark"
            ? "border-gray-700 bg-gradient-to-r from-gray-800 to-gray-700"
            : "border-red-200 bg-gradient-to-r from-red-50 to-white"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="p-3 rounded-xl bg-red-600 text-white"
            >
              <Building2 className="w-7 h-7" />
            </motion.div>
            <div>
              <h3 className="text-2xl font-bold text-red-700">
                {hallName}
              </h3>
              <p className={`text-sm mt-1 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                {rooms.length} Total Rooms
              </p>
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-4xl font-bold ${
              occupancyRate > 75 ? "text-red-600" :
              occupancyRate > 50 ? "text-orange-600" :
              "text-green-600"
            }`}>
              {occupancyRate}%
            </div>
            <p className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Occupancy
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-8 py-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          <StatBox
            label="Active"
            value={activeBookings}
            icon={<Users className="w-5 h-5" />}
            color="green"
            theme={theme}
          />
          <StatBox
            label="Occupied"
            value={occupiedRooms}
            icon={<Calendar className="w-5 h-5" />}
            color="red"
            theme={theme}
          />
          <StatBox
            label="Available"
            value={available}
            icon={<Building2 className="w-5 h-5" />}
            color="blue"
            theme={theme}
          />
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
              Room Occupancy
            </span>
            <span className={`text-sm font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {occupiedRooms} / {rooms.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className={`h-4 rounded-full transition-all duration-500 ${
                occupancyRate > 75 ? "bg-gradient-to-r from-red-500 to-red-600" :
                occupancyRate > 50 ? "bg-gradient-to-r from-orange-500 to-orange-600" :
                "bg-gradient-to-r from-green-500 to-green-600"
              }`}
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
        </div>

        {/* Rooms Grid - Bigger Room Cards */}
        <div>
          <h4 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Rooms
          </h4>
          <div className="grid grid-cols-3 gap-3">
            {filteredRooms.map((room) => {
              const hasActiveBooking = (room.bookings || []).some(
                b => ["booked", "checked_in"].includes(b.status)
              );
              const selected = isRoomSelected(room.roomNo);

              return (
                <motion.div
                  key={room.roomNo}
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    if (!e.target.closest('.direct-book-button')) {
                      if (selectionMode) {
                        toggleRoomSelect(hallName, room.roomNo);
                      } else if (hasActiveBooking) {
                        onRoomClick(hallName, room, true);
                      }
                    }
                  }}
                  className={`relative p-4 rounded-2xl text-center font-bold cursor-pointer transition-all group shadow-lg ${
                    selected
                      ? "ring-4 ring-blue-500 ring-offset-2 scale-105"
                      : ""
                  } ${
                    hasActiveBooking
                      ? "bg-gradient-to-br from-red-500 to-red-600 text-white"
                      : theme === "dark"
                      ? "bg-gradient-to-br from-gray-700 to-gray-600 text-gray-200"
                      : "bg-gradient-to-br from-green-400 to-green-500 text-white"
                  }`}
                >
                  <span className="block text-lg mb-1">{room.roomNo}</span>
                  <span className="text-xs opacity-80">
                    {hasActiveBooking ? "Occupied" : "Vacant"}
                  </span>

                  {/* + Button */}
                  {!hasActiveBooking && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDirectBook(hallName, room);
                      }}
                      className="direct-book-button absolute -top-2 -right-2 w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hover:bg-blue-700 hover:scale-110"
                      title="Book this room"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}

                  {/* Selection checkbox */}
                  {selectionMode && (
                    <div className="absolute top-2 left-2">
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        selected
                          ? "bg-blue-600 border-blue-600"
                          : "bg-white border-gray-300"
                      }`}>
                        {selected && (
                          <svg className="w-4 h-4 text-white" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" viewBox="0 0 24 24" stroke="currentColor">
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Stat Box Component
function StatBox({ label, value, icon, color, theme }) {
  const colorClasses = {
    green: "from-green-500 to-green-600",
    red: "from-red-500 to-red-600",
    blue: "from-blue-500 to-blue-600",
  };

  return (
    <div className={`p-4 rounded-2xl ${
      theme === "dark" ? "bg-gray-700/50" : "bg-gray-50"
    }`}>
      <div className={`inline-flex p-2 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white mb-2`}>
        {icon}
      </div>
      <div className={`text-2xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
        {value}
      </div>
      <div className={`text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
        {label}
      </div>
    </div>
  );
}