// src/pages/BookingsPage.jsx - FIXED VERSION
// ✅ Fixed: Proper layout (ml-64 mt-16) to avoid going under sidebar
// ✅ Fixed: Tab counts now show accurate numbers for each tab

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Search,
  Filter,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  Building2,
  Clock,
  CreditCard,
  FileText,
  Check,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { hasPermission } from "../utils/checkPermission";
import axios from "axios";
import { format } from "date-fns";
import { BACKEND_URL } from "../utils/apiConfig";
import { useNavigate } from "react-router-dom";

export default function BookingsPage({ onBack, theme = "light" }) {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedHostel, setSelectedHostel] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Check permissions
  const role = currentUser?.role || currentUser?.user?.role;
  const canSeeAllHostels = hasPermission(currentUser, "sidebar.allHostels");
  const assignedHostel = currentUser?.assignedHostel || currentUser?.hostel || null;

  // Fetch bookings
  useEffect(() => {
    fetchBookings();
  }, []);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") {
        handleBackClick();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const fetchBookings = async () => {
    try {
        setLoading(true);
        const token = localStorage.getItem("token");

        const response = await axios.get(
        `${BACKEND_URL}/api/bookings/list`,
        {
            headers: { Authorization: `Bearer ${token}` },
        }
        );

        setBookings(response.data.bookings || []);
        setError(null);

    } catch (err) {
        console.error("Error fetching bookings:", err);
        setError(err.response?.data?.message || "Failed to fetch bookings");
    } finally {
        setLoading(false);
    }
 };

  // ✅ FIXED: Filter bookings by specific tab status
  const getFilteredBookingsByStatus = (bookingsArray, tabId) => {
    const now = new Date();
    
    switch (tabId) {
      case "active":
        return bookingsArray.filter(
          (b) =>
            (b.status === "booked" || b.status === "checked_in") &&
            new Date(b.to) >= now
        );
      case "past":
        return bookingsArray.filter(
          (b) =>
            b.status === "checked_out" ||
            (new Date(b.to) < now && b.status !== "cancelled")
        );
      case "upcoming":
        return bookingsArray.filter(
          (b) =>
            b.status === "booked" &&
            new Date(b.from) > now
        );
      case "cancelled":
        return bookingsArray.filter((b) => b.status === "cancelled");
      default:
        return bookingsArray;
    }
  };

  // Apply search and filters
  const filteredBookings = useMemo(() => {
    let filtered = [...bookings];

    // Filter by hostel (for restricted roles)
    if (!canSeeAllHostels && assignedHostel) {
      filtered = filtered.filter((b) => b.hostel === assignedHostel);
    }

    // Filter by selected hostel (from dropdown)
    if (selectedHostel) {
      filtered = filtered.filter((b) => b.hostel === selectedHostel);
    }

    // Filter by date range
    if (dateFrom) {
      filtered = filtered.filter(
        (b) => new Date(b.from) >= new Date(dateFrom)
      );
    }
    if (dateTo) {
      filtered = filtered.filter((b) => new Date(b.to) <= new Date(dateTo));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.guest?.toLowerCase().includes(query) ||
          b.email?.toLowerCase().includes(query) ||
          b.contact?.toLowerCase().includes(query) ||
          b.rollno?.toLowerCase().includes(query) ||
          b.city?.toLowerCase().includes(query) ||
          b.state?.toLowerCase().includes(query) ||
          b._id?.toLowerCase().includes(query)
      );
    }

    // Filter by tab status
    filtered = getFilteredBookingsByStatus(filtered, activeTab);

    return filtered;
  }, [
    bookings,
    activeTab,
    searchQuery,
    dateFrom,
    dateTo,
    selectedHostel,
    canSeeAllHostels,
    assignedHostel,
  ]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = filteredBookings.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, dateFrom, dateTo, selectedHostel]);

  // Get unique hostels
  const uniqueHostels = useMemo(() => {
    return [...new Set(bookings.map((b) => b.hostel))].sort();
  }, [bookings]);

  // Handle back button click
  const handleBackClick = () => {
    if (onBack && typeof onBack === "function") {
      onBack();
    } else {
      navigate(-1); // ✅ correct React Router way
    }
  };

  // Download CSV
  const handleDownload = () => {
    const headers = [
      "Booking ID",
      "Guest Name",
      "Email",
      "Contact",
      "Roll No",
      "Hostel",
      "Room No",
      "From Date",
      "To Date",
      "Status",
      "Payment Status",
      "Total Amount",
      "Paid Amount",
      "Balance",
      "City",
      "State",
      "Purpose",
    ];

    const rows = filteredBookings.map((b) => [
      b._id || "",
      b.guest || "",
      b.email || "",
      b.contact || "",
      b.rollno || "",
      b.hostel || "",
      b.roomNo || "",
      b.from ? format(new Date(b.from), "dd/MM/yyyy") : "",
      b.to ? format(new Date(b.to), "dd/MM/yyyy") : "",
      b.status || "",
      b.paymentStatus || "",
      b.totalAmount || 0,
      b.paidAmount || 0,
      b.balanceAmount || 0,
      b.city || "",
      b.state || "",
      b.purpose || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `bookings_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery("");
    setDateFrom("");
    setDateTo("");
    setSelectedHostel("");
  };

  const hasActiveFilters = searchQuery || dateFrom || dateTo || selectedHostel;

  return (
    <div className={`fixed inset-0 ml-64 mt-16 bg-gradient-to-br ${theme === 'dark' ? 'bg-gray-900' : 'from-red-50 to-blue-50'} overflow-y-auto`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xl rounded-3xl mx-6 mt-6">
        <div className="px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackClick}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <FileText size={32} />
                  All Bookings
                </h1>
                <p className="text-red-100 mt-1">Manage and view all guest bookings</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowFilters(!showFilters)}
                className={`
                  px-4 py-2 rounded-xl flex items-center gap-2 transition-all
                  ${
                    showFilters || hasActiveFilters
                      ? "bg-white text-red-600"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }
                `}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 bg-red-600 rounded-full" />
                )}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownload}
                className="px-4 py-2 rounded-xl flex items-center gap-2 bg-white text-red-600 hover:bg-red-50 transition-all"
              >
                <Download className="w-4 h-4" />
                Download
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mx-6 mt-4 overflow-hidden"
          >
            <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg border-2 border-red-100 p-6`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                  Filters
                </h3>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
                  >
                    <X className="w-4 h-4" />
                    Clear All
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Search */}
                <div className="lg:col-span-2">
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Name, Email, Contact, Roll No, City, State..."
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border-2 focus:outline-none transition-colors ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-red-500'
                          : 'bg-white border-slate-200 focus:border-red-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Date From */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>
                    From Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border-2 focus:outline-none transition-colors ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-red-500'
                          : 'bg-white border-slate-200 focus:border-red-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Date To */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>
                    To Date
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className={`w-full pl-10 pr-4 py-2 rounded-xl border-2 focus:outline-none transition-colors ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white focus:border-red-500'
                          : 'bg-white border-slate-200 focus:border-red-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Hostel Filter (Only for admin & manager) */}
                {canSeeAllHostels && (
                  <div className="lg:col-span-2">
                    <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>
                      Hostel
                    </label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={selectedHostel}
                        onChange={(e) => setSelectedHostel(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-xl border-2 focus:outline-none transition-colors appearance-none ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white focus:border-red-500'
                            : 'bg-white border-slate-200 focus:border-red-500'
                        }`}
                      >
                        <option value="">All Hostels</option>
                        {uniqueHostels.map((hostel) => (
                          <option key={hostel} value={hostel}>
                            {hostel}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mx-6 mt-6"
      >
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg border-2 border-red-100 p-2 flex flex-wrap gap-2`}>
          {[
            { id: "all", label: "All Bookings", icon: FileText },
            { id: "active", label: "Active", icon: Check },
            { id: "upcoming", label: "Upcoming", icon: Clock },
            { id: "past", label: "Past", icon: Calendar },
            { id: "cancelled", label: "Cancelled", icon: XCircle },
          ].map((tab) => {
            const Icon = tab.icon;
            // ✅ FIXED: Calculate count for THIS specific tab, not activeTab
            const count = getFilteredBookingsByStatus(bookings, tab.id).length;

            return (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex-1 min-w-[140px] px-4 py-3 rounded-xl flex items-center justify-center gap-2
                  transition-all font-medium
                  ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md"
                      : theme === 'dark'
                      ? "text-gray-300 hover:bg-gray-700"
                      : "text-slate-600 hover:bg-red-50"
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                <span
                  className={`
                  px-2 py-0.5 rounded-full text-xs
                  ${
                    activeTab === tab.id
                      ? "bg-white/20 text-white"
                      : theme === 'dark'
                      ? "bg-gray-700 text-gray-300"
                      : "bg-slate-200 text-slate-700"
                  }
                `}
                >
                  {count}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Bookings List */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="mx-6 mt-6 pb-6"
      >
        {loading ? (
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg border-2 border-red-100 p-12 flex flex-col items-center justify-center`}>
            <Loader2 className="w-12 h-12 text-red-600 animate-spin mb-4" />
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}>Loading bookings...</p>
          </div>
        ) : error ? (
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg border-2 border-red-100 p-12 flex flex-col items-center justify-center`}>
            <AlertCircle className="w-12 h-12 text-red-600 mb-4" />
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}>{error}</p>
            <button
              onClick={fetchBookings}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : paginatedBookings.length === 0 ? (
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-lg border-2 border-red-100 p-12 flex flex-col items-center justify-center`}>
            <FileText className="w-12 h-12 text-slate-300 mb-4" />
            <p className={theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}>No bookings found</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 text-red-600 hover:text-red-700"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedBookings.map((booking, index) => (
              <BookingCard key={booking._id} booking={booking} index={index} theme={theme} />
            ))}
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mx-6 pb-6 flex items-center justify-between"
        >
          <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of{" "}
            {filteredBookings.length} bookings
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`p-2 rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 hover:border-red-500'
                  : 'bg-white border-slate-200 hover:border-red-300'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => {
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`
                          px-3 py-1.5 rounded-lg transition-all
                          ${
                            currentPage === page
                              ? "bg-red-600 text-white"
                              : theme === 'dark'
                              ? "bg-gray-800 text-gray-300 hover:bg-gray-700 border-2 border-gray-700"
                              : "bg-white text-slate-700 hover:bg-red-50 border-2 border-slate-200"
                          }
                        `}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return (
                      <span key={page} className="px-2 text-slate-400">
                        ...
                      </span>
                    );
                  }
                  return null;
                }
              )}
            </div>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              className={`p-2 rounded-xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 hover:border-red-500'
                  : 'bg-white border-slate-200 hover:border-red-300'
              }`}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Booking Card Component
function BookingCard({ booking, index, theme }) {
  const getStatusBadge = (status) => {
    const badges = {
      booked: { bg: "bg-blue-100", text: "text-blue-700", label: "Booked" },
      checked_in: { bg: "bg-green-100", text: "text-green-700", label: "Checked In" },
      checked_out: { bg: "bg-slate-100", text: "text-slate-700", label: "Checked Out" },
      cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
      no_show: { bg: "bg-orange-100", text: "text-orange-700", label: "No Show" },
    };
    const badge = badges[status] || badges.booked;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      PAID: { bg: "bg-green-100", text: "text-green-700", label: "Paid" },
      PARTIALLY_PAID: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Partial" },
      UNPAID: { bg: "bg-red-100", text: "text-red-700", label: "Unpaid" },
    };
    const badge = badges[status] || badges.UNPAID;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`guestroom-card rounded-2xl shadow-lg border-2 border-red-100 p-6 hover:shadow-xl transition-all ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Guest Info */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className={`text-lg font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {booking.guest}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {getStatusBadge(booking.status)}
                {getPaymentStatusBadge(booking.paymentStatus)}
              </div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              <Mail className="w-4 h-4 text-red-500" />
              <span className="truncate">{booking.email}</span>
            </div>
            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              <Phone className="w-4 h-4 text-red-500" />
              <span>{booking.contact}</span>
            </div>
            {booking.rollno && (
              <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                <User className="w-4 h-4 text-red-500" />
                <span>Roll: {booking.rollno}</span>
              </div>
            )}
            {(booking.city || booking.state) && (
              <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                <MapPin className="w-4 h-4 text-red-500" />
                <span>
                  {[booking.city, booking.state].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Middle: Booking Details */}
        <div className="lg:col-span-4 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-red-500" />
              <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {booking.hostel}
              </span>
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-slate-600'}>• Room {booking.roomNo}</span>
            </div>
            <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              <Calendar className="w-4 h-4 text-red-500" />
              <span>
                {format(new Date(booking.from), "dd MMM yyyy")} -{" "}
                {format(new Date(booking.to), "dd MMM yyyy")}
              </span>
            </div>
            {booking.numGuests > 1 && (
              <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                <User className="w-4 h-4 text-red-500" />
                <span>{booking.numGuests} Guests</span>
                {booking.males > 0 && <span>• {booking.males} M</span>}
                {booking.females > 0 && <span>• {booking.females} F</span>}
              </div>
            )}
            {booking.purpose && (
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                <span className="font-medium">Purpose:</span> {booking.purpose}
              </div>
            )}
          </div>
        </div>

        {/* Right: Payment Info */}
        <div className="lg:col-span-4 space-y-3">
          <div className={`rounded-xl p-4 space-y-2 ${theme === 'dark' ? 'bg-gray-700' : 'bg-red-50'}`}>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>Total Amount</span>
              <span className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                ₹{booking.totalAmount || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>Paid</span>
              <span className="font-semibold text-green-700">
                ₹{booking.paidAmount || 0}
              </span>
            </div>
            <div className={`flex items-center justify-between pt-2 border-t ${theme === 'dark' ? 'border-gray-600' : 'border-red-200'}`}>
              <span className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-slate-700'}`}>Balance</span>
              <span className={`font-bold ${
                (booking.balanceAmount || 0) > 0 ? "text-red-600" : "text-green-600"
              }`}>
                ₹{booking.balanceAmount || 0}
              </span>
            </div>
          </div>

          {booking.paymentMode && (
            <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              <CreditCard className="w-4 h-4 text-red-500" />
              <span>{booking.paymentMode}</span>
            </div>
          )}

          <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-slate-500'}`}>
            ID: {booking._id?.slice(-8).toUpperCase()}
          </div>
        </div>
      </div>
    </motion.div>
  );
}