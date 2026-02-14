import React, { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
  Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { motion } from "framer-motion";
import {
  Filter, BarChart3, Users, TrendingUp, DollarSign,
  Home, Download, X, Clock
} from "lucide-react";
import { format } from "date-fns";

const VENUE_COLORS = {
  primary: "#2563eb",
  secondary: "#60a5fa",
  success: "#10b981",
  warning: "#f59e0b",
  info: "#6366f1",
  danger: "#ef4444"
};

export default function VenueAnalyticsPage({ venueData = {}, theme = "dark", currentUser, onBack }) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("");
  const [selectedSociety, setSelectedSociety] = useState("");

  // Extract all bookings from venueData structure
  const extractedBookings = useMemo(() => {
    const bookings = [];
    
    Object.keys(venueData).forEach((venueName) => {
      const venue = venueData[venueName];
      if (!venue?.rooms) return;
      
      venue.rooms.forEach((room) => {
        if (room.bookings && Array.isArray(room.bookings)) {
          room.bookings.forEach((booking) => {
            bookings.push({
              id: booking.id || `${venueName}-${room.roomNo}-${booking.guestName}`,
              venue: venueName,
              roomNo: room.roomNo,
              guestName: booking.guestName || "—",
              email: booking.email || "—",
              checkInDate: booking.checkInDate || booking.from,
              checkOutDate: booking.checkOutDate || booking.to,
              status: booking.status || "booked",
              society: booking.societyName || booking.society || "—",
              department: booking.department || "—",
              reportedStatus: booking.reportedStatus || ""
            });
          });
        }
      });
    });

    return bookings;
  }, [venueData]);

  // Extract unique venues, societies, and departments
  const uniqueVenues = useMemo(() => 
    [...new Set(extractedBookings.map(b => b.venue))].sort(), 
    [extractedBookings]
  );

  const uniqueSocieties = useMemo(() => 
    [...new Set(extractedBookings.map(b => b.society).filter(s => s && s !== "—"))].sort(), 
    [extractedBookings]
  );

  const uniqueDepartments = useMemo(() => 
    [...new Set(extractedBookings.map(b => b.department).filter(d => d && d !== "—"))].sort(), 
    [extractedBookings]
  );

  // Filter bookings based on criteria
  const filteredBookings = useMemo(() => {
    return extractedBookings.filter(booking => {
      let match = true;

      if (dateFrom) {
        const bookingDate = new Date(booking.checkInDate);
        match = match && bookingDate >= new Date(dateFrom);
      }

      if (dateTo) {
        const bookingDate = new Date(booking.checkInDate);
        match = match && bookingDate <= new Date(dateTo);
      }

      if (selectedVenue) {
        match = match && booking.venue === selectedVenue;
      }

      if (selectedSociety) {
        match = match && booking.society === selectedSociety;
      }

      return match;
    });
  }, [extractedBookings, dateFrom, dateTo, selectedVenue, selectedSociety]);

  // Calculate statistics
  const totalBookings = filteredBookings.length;
  const confirmedBookings = filteredBookings.filter(b => ["booked", "checked_in"].includes(b.status)).length;
  const pendingBookings = filteredBookings.filter(b => b.status === "pending").length;
  const cancelledBookings = filteredBookings.filter(b => b.status === "cancelled").length;

  // Status distribution data
  const statusData = [
    { name: "Booked", value: confirmedBookings, color: VENUE_COLORS.success },
    { name: "Pending", value: pendingBookings, color: VENUE_COLORS.warning },
    { name: "Cancelled", value: cancelledBookings, color: VENUE_COLORS.danger },
  ].filter(item => item.value > 0);

  // Venue-wise distribution
  const venueData_chart = useMemo(() => {
    const data = {};
    filteredBookings.forEach(b => {
      data[b.venue] = (data[b.venue] || 0) + 1;
    });
    return Object.entries(data)
      .map(([name, count]) => ({ name, bookings: count }))
      .sort((a, b) => b.bookings - a.bookings);
  }, [filteredBookings]);

  // Society-wise distribution
  const societyData = useMemo(() => {
    const data = {};
    filteredBookings.forEach(b => {
      if (b.society && b.society !== "—") {
        data[b.society] = (data[b.society] || 0) + 1;
      }
    });
    return Object.entries(data)
      .map(([name, count]) => ({ name, bookings: count }))
      .sort((a, b) => b.bookings - a.bookings);
  }, [filteredBookings]);

  // Department-wise distribution
  const departmentData = useMemo(() => {
    const data = {};
    filteredBookings.forEach(b => {
      if (b.department && b.department !== "—") {
        data[b.department] = (data[b.department] || 0) + 1;
      }
    });
    return Object.entries(data)
      .map(([name, count]) => ({ name, bookings: count }))
      .sort((a, b) => b.bookings - a.bookings);
  }, [filteredBookings]);

  // Monthly trend
  const trendData = useMemo(() => {
    const trendMap = {};
    filteredBookings.forEach(b => {
      const month = format(new Date(b.checkInDate), "MMM yyyy");
      trendMap[month] = (trendMap[month] || 0) + 1;
    });
    return Object.entries(trendMap)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => new Date(a.period) - new Date(b.period));
  }, [filteredBookings]);

  const handleDownloadCSV = () => {
    if (filteredBookings.length === 0) {
      alert("No booking data to download");
      return;
    }

    const headers = ["Booking ID", "Venue", "Room", "Guest Name", "Society", "Department", "Check-in", "Check-out", "Status"];
    const rows = filteredBookings.map(b => [
      b.id || "—",
      b.venue,
      b.roomNo,
      b.guestName,
      b.society,
      b.department,
      format(new Date(b.checkInDate), "dd-MMM-yyyy"),
      format(new Date(b.checkOutDate), "dd-MMM-yyyy"),
      b.status
    ]);

    const csvContent =
      headers.join(",") +
      "\n" +
      rows.map(r => r.map(v => `"${String(v)}"`).join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `venue-analytics_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedVenue("");
    setSelectedSociety("");
  };

  const hasActiveFilters = dateFrom || dateTo || selectedVenue || selectedSociety;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
      className={`flex-1 min-h-screen p-6 md:p-8 ${theme === "dark" ? "bg-[#202124]" : "bg-gradient-to-br from-slate-50 to-blue-50"}`}
    >
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className={`text-3xl md:text-4xl font-extrabold mb-2 flex items-center gap-3 ${theme === "dark" ? "text-[#e8eaed]" : "text-gray-900"}`}>
              📊 Venue Analytics Dashboard
            </h1>
            <p className={`${theme === "dark" ? "text-[#9aa0a6]" : "text-gray-600"}`}>
              Complete venue booking and revenue analytics
            </p>
          </div>
          <div className="flex gap-3 flex-wrap md:flex-nowrap">
            <button
              onClick={handleDownloadCSV}
              disabled={filteredBookings.length === 0}
              className="px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className={`px-4 py-2 rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all ${
                  theme === "dark"
                    ? "bg-[#3c4043] text-[#e8eaed] hover:bg-[#4a4d50]"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <Home className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
        </div>

        {/* Filters Panel */}
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className={`rounded-2xl shadow-lg p-6 mb-8 ${
            theme === "dark" ? "bg-[#292a2d] border border-[#3c4043]" : "bg-white"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold flex items-center gap-2 ${theme === "dark" ? "text-[#e8eaed]" : "text-slate-800"}`}>
              <Filter className="w-5 h-5" />
              Filters
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className={`text-sm flex items-center gap-1 ${
                  theme === "dark" ? "text-[#8ab4f8] hover:text-[#a8c5ff]" : "text-blue-600 hover:text-blue-700"
                }`}
              >
                <X className="w-4 h-4" />
                Clear All
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* From Date */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-[#9aa0a6]" : "text-slate-700"}`}>
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl border-2 focus:outline-none transition-colors ${
                  theme === "dark"
                    ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                    : "bg-white border-slate-200 focus:border-blue-500"
                }`}
              />
            </div>

            {/* To Date */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-[#9aa0a6]" : "text-slate-700"}`}>
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl border-2 focus:outline-none transition-colors ${
                  theme === "dark"
                    ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                    : "bg-white border-slate-200 focus:border-blue-500"
                }`}
              />
            </div>

            {/* Venue Filter */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-[#9aa0a6]" : "text-slate-700"}`}>
                Venue
              </label>
              <select
                value={selectedVenue}
                onChange={(e) => setSelectedVenue(e.target.value)}
                className={`w-full px-4 py-2 rounded-xl border-2 focus:outline-none transition-colors appearance-none ${
                  theme === "dark"
                    ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                    : "bg-white border-slate-200 focus:border-blue-500"
                }`}
              >
                <option value="">All Venues</option>
                {uniqueVenues.map((venue) => (
                  <option key={venue} value={venue}>
                    {venue}
                  </option>
                ))}
              </select>
            </div>

            {/* Society Filter with Search */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-[#9aa0a6]" : "text-slate-700"}`}>
                Society (Search)
              </label>
              <input
                list="societies-list"
                value={selectedSociety}
                onChange={(e) => setSelectedSociety(e.target.value)}
                placeholder="Type to search..."
                className={`w-full px-4 py-2 rounded-xl border-2 focus:outline-none transition-colors ${
                  theme === "dark"
                    ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                    : "bg-white border-slate-200 focus:border-blue-500"
                }`}
              />
              <datalist id="societies-list">
                {uniqueSocieties.map((society) => (
                  <option key={society} value={society} />
                ))}
              </datalist>
            </div>
          </div>
        </motion.div>

        {/* No Data State */}
        {filteredBookings.length === 0 ? (
          <div className={`rounded-2xl p-12 text-center shadow-lg ${
            theme === "dark" ? "bg-[#292a2d] border border-[#3c4043]" : "bg-white"
          }`}>
            <div className={`mb-4 ${theme === "dark" ? "text-[#5f6368]" : "text-gray-400"}`}>
              <BarChart3 className="w-24 h-24 mx-auto" />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${theme === "dark" ? "text-[#e8eaed]" : "text-gray-700"}`}>
              No Venue Booking Data
            </h3>
            <p className={theme === "dark" ? "text-[#9aa0a6]" : "text-gray-500"}>
              No bookings found for the selected criteria.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Total Bookings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-6 shadow-lg ${
                  theme === "dark" ? "bg-[#292a2d] border border-[#3c4043]" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium mb-1 ${theme === "dark" ? "text-[#9aa0a6]" : "text-gray-600"}`}>
                      Total Bookings
                    </p>
                    <h3 className={`text-3xl font-bold mb-2 ${theme === "dark" ? "text-[#e8eaed]" : "text-gray-900"}`}>
                      {totalBookings}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-xl ${theme === "dark" ? "bg-[#3c4043]" : "bg-blue-100"}`}>
                    <Users className={`w-6 h-6 ${theme === "dark" ? "text-[#8ab4f8]" : "text-blue-600"}`} />
                  </div>
                </div>
              </motion.div>

              {/* Confirmed Bookings */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`rounded-2xl p-6 shadow-lg ${
                  theme === "dark" ? "bg-[#292a2d] border border-[#3c4043]" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium mb-1 ${theme === "dark" ? "text-[#9aa0a6]" : "text-gray-600"}`}>
                      Confirmed
                    </p>
                    <h3 className={`text-3xl font-bold mb-2 ${theme === "dark" ? "text-[#e8eaed]" : "text-gray-900"}`}>
                      {confirmedBookings}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-xl ${theme === "dark" ? "bg-[#3c4043]" : "bg-green-100"}`}>
                    <TrendingUp className={`w-6 h-6 ${theme === "dark" ? "text-[#81c995]" : "text-green-600"}`} />
                  </div>
                </div>
              </motion.div>

              {/* Cancelled Bookings (Replaced Pending Amount) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`rounded-2xl p-6 shadow-lg ${
                  theme === "dark" ? "bg-[#292a2d] border border-[#3c4043]" : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className={`text-sm font-medium mb-1 ${theme === "dark" ? "text-[#9aa0a6]" : "text-gray-600"}`}>
                      Cancelled
                    </p>
                    <h3 className={`text-3xl font-bold mb-2 ${theme === "dark" ? "text-[#e8eaed]" : "text-gray-900"}`}>
                      {cancelledBookings}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-xl ${theme === "dark" ? "bg-[#3c4043]" : "bg-red-100"}`}>
                    <X className={`w-6 h-6 ${theme === "dark" ? "text-[#f28b82]" : "text-red-600"}`} />
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Status Distribution */}
              {statusData.length > 0 && (
                <div className={`rounded-2xl p-6 shadow-lg ${
                  theme === "dark" ? "bg-[#292a2d] border border-[#3c4043]" : "bg-white"
                }`}>
                  <h2 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-[#e8eaed]" : "text-gray-900"}`}>
                    Booking Status Distribution
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={statusData}
                        dataKey="value"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Venue-wise Distribution */}
              {venueData_chart.length > 0 && (
                <div className={`rounded-2xl p-6 shadow-lg ${
                  theme === "dark" ? "bg-[#292a2d] border border-[#3c4043]" : "bg-white"
                }`}>
                  <h2 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-[#e8eaed]" : "text-gray-900"}`}>
                    Bookings by Venue
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={venueData_chart}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#3c4043" : "#e5e7eb"} />
                      <XAxis dataKey="name" stroke={theme === "dark" ? "#9aa0a6" : "#6b7280"} />
                      <YAxis stroke={theme === "dark" ? "#9aa0a6" : "#6b7280"} />
                      <Tooltip />
                      <Bar dataKey="bookings" fill={VENUE_COLORS.primary} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Society-wise Distribution */}
              {societyData.length > 0 && (
                <div className={`rounded-2xl p-6 shadow-lg ${
                  theme === "dark" ? "bg-[#292a2d] border border-[#3c4043]" : "bg-white"
                }`}>
                  <h2 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-[#e8eaed]" : "text-gray-900"}`}>
                    Bookings by Society
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={societyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#3c4043" : "#e5e7eb"} />
                      <XAxis dataKey="name" stroke={theme === "dark" ? "#9aa0a6" : "#6b7280"} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke={theme === "dark" ? "#9aa0a6" : "#6b7280"} />
                      <Tooltip />
                      <Bar dataKey="bookings" fill={VENUE_COLORS.secondary} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Department-wise Distribution */}
              {departmentData.length > 0 && (
                <div className={`rounded-2xl p-6 shadow-lg ${
                  theme === "dark" ? "bg-[#292a2d] border border-[#3c4043]" : "bg-white"
                }`}>
                  <h2 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-[#e8eaed]" : "text-gray-900"}`}>
                    Bookings by Department
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#3c4043" : "#e5e7eb"} />
                      <XAxis dataKey="name" stroke={theme === "dark" ? "#9aa0a6" : "#6b7280"} angle={-45} textAnchor="end" height={80} />
                      <YAxis stroke={theme === "dark" ? "#9aa0a6" : "#6b7280"} />
                      <Tooltip />
                      <Bar dataKey="bookings" fill={VENUE_COLORS.info} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Trend Chart */}
            {trendData.length > 0 && (
              <div className={`rounded-2xl p-6 shadow-lg ${
                theme === "dark" ? "bg-[#292a2d] border border-[#3c4043]" : "bg-white"
              }`}>
                <h2 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-[#e8eaed]" : "text-gray-900"}`}>
                  Booking Trend
                </h2>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={trendData}>
                    <defs>
                      <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={VENUE_COLORS.primary} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={VENUE_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#3c4043" : "#e5e7eb"} />
                    <XAxis dataKey="period" stroke={theme === "dark" ? "#9aa0a6" : "#6b7280"} />
                    <YAxis stroke={theme === "dark" ? "#9aa0a6" : "#6b7280"} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke={VENUE_COLORS.primary}
                      fillOpacity={1}
                      fill="url(#colorTrend)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
