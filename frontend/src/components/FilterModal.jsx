// src/components/FilterModal.jsx - ADVANCED VERSION
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Filter, X, Search, Calendar, User, Home, CreditCard } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";

export default function FilterModal({ hostelData, onSelectBooking, onClose }) {
  const { currentUser } = useAuth();
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };

  const [filters, setFilters] = useState({
    hostel: "",
    roomNo: "",
    guest: "",
    contact: "",
    email: "",
    paymentType: "",
    status: "",
    bookingStatus: "",
    reportedStatus: "",
    from: "",
    to: "",
    department: "",
    city: "",
    state: "",
  });
  
  const [results, setResults] = useState([]);
  const [showAllBookings, setShowAllBookings] = useState(false);

  // Get user role and assigned hostel
  const userRole = currentUser?.role || currentUser?.user?.role;
  const isRestrictedRole = userRole === 'caretaker' || userRole === 'warden';
  const assignedHostel = currentUser?.assignedHostel || currentUser?.hostel || null;

  // Get all hostels (filtered for caretakers/wardens)
  const allHostels = isRestrictedRole && assignedHostel
    ? [assignedHostel]
    : Object.keys(hostelData);

  // Auto-set hostel for caretakers/wardens
  useEffect(() => {
    if (isRestrictedRole && assignedHostel) {
      setFilters(prev => ({ ...prev, hostel: assignedHostel }));
    }
  }, [isRestrictedRole, assignedHostel]);

  // Show all bookings on mount
  useEffect(() => {
    if (showAllBookings) {
      handleShowAll();
    }
  }, [showAllBookings]);

  // Filter handler
  const handleFilter = () => {
    const now = new Date();
    const matches = Object.entries(hostelData)
      .filter(([hostel]) => {
        // Caretaker/Warden can only see their assigned hostel
        if (isRestrictedRole && assignedHostel) {
          return hostel === assignedHostel;
        }
        return true;
      })
      .flatMap(([hostel, hData]) =>
        (hData.rooms || []).flatMap((room) =>
          (room.bookings || [])
            .filter((b) => {
              const start = new Date(b.from);
              const end = new Date(b.to);

              // Date Range
              if (filters.from && new Date(filters.from) > end) return false;
              if (filters.to && new Date(filters.to) < start) return false;

              // Hostel
              if (filters.hostel && hostel !== filters.hostel) return false;

              // Room
              if (filters.roomNo && room.roomNo.toString() !== filters.roomNo)
                return false;

              // Guest Name
              if (filters.guest && 
                  !b.guest?.toLowerCase().includes(filters.guest.toLowerCase()))
                return false;

              // Contact
              if (filters.contact && !b.contact?.includes(filters.contact))
                return false;

              // Email
              if (filters.email && 
                  !b.email?.toLowerCase().includes(filters.email.toLowerCase()))
                return false;

              // Department
              if (filters.department && 
                  !b.department?.toLowerCase().includes(filters.department.toLowerCase()))
                return false;

              // City
              if (filters.city && 
                  !b.city?.toLowerCase().includes(filters.city.toLowerCase()))
                return false;

              // State
              if (filters.state && 
                  !b.state?.toLowerCase().includes(filters.state.toLowerCase()))
                return false;

              // Payment Type
              if (filters.paymentType && b.paymentType !== filters.paymentType)
                return false;

              // Booking Status (Past/Current/Upcoming)
              const isPast = end < now;
              const isCurrent = start <= now && end >= now;
              const isUpcoming = start > now;

              if (filters.status === "Past" && !isPast) return false;
              if (filters.status === "Current" && !isCurrent) return false;
              if (filters.status === "Upcoming" && !isUpcoming) return false;

              // Booking Status (booked/checked_in/checked_out/cancelled/no_show)
              if (filters.bookingStatus && b.status !== filters.bookingStatus)
                return false;

              // Reported Status
              if (filters.reportedStatus && b.reportedStatus !== filters.reportedStatus)
                return false;

              return true;
            })
            .map((b) => ({
              hostel,
              roomNo: room.roomNo,
              booking: b,
            }))
        )
      );

    // Sort by date (most recent first)
    matches.sort((a, b) => new Date(b.booking.from) - new Date(a.booking.from));

    setResults(matches);

    if (matches.length > 0) {
      showToast(`✅ Found ${matches.length} matching booking(s).`, "success");
    } else {
      showToast("⚠️ No bookings match your filters.", "warning");
    }
  };

  // Show all bookings
  const handleShowAll = () => {
    const now = new Date();
    const allBookings = Object.entries(hostelData)
      .filter(([hostel]) => {
        if (isRestrictedRole && assignedHostel) {
          return hostel === assignedHostel;
        }
        return true;
      })
      .flatMap(([hostel, hData]) =>
        (hData.rooms || []).flatMap((room) =>
          (room.bookings || []).map((b) => ({
            hostel,
            roomNo: room.roomNo,
            booking: b,
          }))
        )
      );

    // Sort by date (most recent first)
    allBookings.sort((a, b) => new Date(b.booking.from) - new Date(a.booking.from));

    setResults(allBookings);
    showToast(
      `📋 Showing all ${allBookings.length} booking(s)${
        isRestrictedRole ? ` for ${assignedHostel}` : ""
      }`,
      "info"
    );
  };

  const handleSelectBooking = (r) => {
    onSelectBooking(r);
    showToast(
      `🎯 Selected booking for ${r.booking.guest} – Room ${r.roomNo}`,
      "info"
    );
    onClose();
  };

  const getStatusBadge = (from, to, status, reportedStatus) => {
    const now = new Date();
    const start = new Date(from);
    const end = new Date(to);

    if (status === "cancelled") {
      return <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">Cancelled</span>;
    }
    if (status === "checked_out") {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">Checked Out</span>;
    }
    if (status === "no_show") {
      return <span className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-full">No Show</span>;
    }
    if (status === "checked_in" || reportedStatus === "reported") {
      return <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">✓ Active</span>;
    }
    if (end < now) {
      return <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">Past</span>;
    }
    if (start <= now && end >= now) {
      return <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">Current</span>;
    }
    return <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">Upcoming</span>;
  };

  const resetFilters = () => {
    setFilters({
      hostel: isRestrictedRole ? assignedHostel : "",
      roomNo: "",
      guest: "",
      contact: "",
      email: "",
      paymentType: "",
      status: "",
      bookingStatus: "",
      reportedStatus: "",
      from: "",
      to: "",
      department: "",
      city: "",
      state: "",
    });
    setResults([]);
    showToast("🔄 Filters cleared.", "info");
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl p-6 w-[900px] max-w-[95%] max-h-[90vh] overflow-y-auto shadow-2xl"
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2">
              <Filter className="w-6 h-6" /> Advanced Filter
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {isRestrictedRole
                ? `Searching in: ${assignedHostel}`
                : "Search across all hostels"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-red-600 transition p-2 hover:bg-red-50 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filter Fields */}
        <div className="space-y-4 mb-6">
          {/* Guest Search Section */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <User className="w-4 h-4" /> Guest Information
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Guest Name</label>
                <input
                  type="text"
                  value={filters.guest}
                  onChange={(e) => setFilters({ ...filters, guest: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Search by name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Contact</label>
                <input
                  type="text"
                  value={filters.contact}
                  onChange={(e) => setFilters({ ...filters, contact: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Email</label>
                <input
                  type="text"
                  value={filters.email}
                  onChange={(e) => setFilters({ ...filters, email: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Email address"
                />
              </div>
            </div>
          </div>

          {/* Location Section */}
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
              <Home className="w-4 h-4" /> Location & Room
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {/* Only show hostel dropdown for admin/manager */}
              {userRole !== "caretaker" && (
                <div>
                  <label className="text-xs text-gray-600 block mb-1">Hostel</label>
                  <select
                    value={filters.hostel}
                    onChange={(e) => setFilters({ ...filters, hostel: e.target.value })}
                    className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">All Hostels</option>
                    {allHostels.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-600 block mb-1">Room Number</label>
                <input
                  type="text"
                  value={filters.roomNo}
                  onChange={(e) => setFilters({ ...filters, roomNo: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Room no."
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Department</label>
                <input
                  type="text"
                  value={filters.department}
                  onChange={(e) => setFilters({ ...filters, department: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Department"
                />
              </div>
            </div>
          </div>

          {/* Date & Status Section */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Dates & Status
            </h3>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">From Date</label>
                <input
                  type="date"
                  value={filters.from}
                  onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">To Date</label>
                <input
                  type="date"
                  value={filters.to}
                  onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Time Period</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All</option>
                  <option value="Past">Past</option>
                  <option value="Current">Current</option>
                  <option value="Upcoming">Upcoming</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Booking Status</label>
                <select
                  value={filters.bookingStatus}
                  onChange={(e) => setFilters({ ...filters, bookingStatus: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">All</option>
                  <option value="booked">Booked</option>
                  <option value="checked_in">Checked In</option>
                  <option value="checked_out">Checked Out</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payment & Location Section */}
          <div className="bg-orange-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-orange-900 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4" /> Payment & Guest Location
            </h3>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">Payment Type</label>
                <select
                  value={filters.paymentType}
                  onChange={(e) => setFilters({ ...filters, paymentType: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All</option>
                  <option value="Free">Free</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">Reported Status</label>
                <select
                  value={filters.reportedStatus}
                  onChange={(e) => setFilters({ ...filters, reportedStatus: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="reported">Reported</option>
                  <option value="not_reported">Not Reported</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">City</label>
                <input
                  type="text"
                  value={filters.city}
                  onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="City"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">State</label>
                <input
                  type="text"
                  value={filters.state}
                  onChange={(e) => setFilters({ ...filters, state: e.target.value })}
                  className="border border-gray-300 p-2 rounded w-full text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="State"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-4 gap-3">
          <button
            onClick={handleShowAll}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
          >
            Show All
          </button>
          <div className="flex gap-3">
            <button
              onClick={resetFilters}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
            >
              Reset
            </button>
            <button
              onClick={handleFilter}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold text-gray-700">
              Search Results
            </h3>
            {results.length > 0 && (
              <span className="text-sm text-gray-600">
                Found <strong className="text-red-600">{results.length}</strong> booking(s)
              </span>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2">
            {results.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🔍</div>
                <p className="text-gray-500 italic">
                  No bookings found. Try adjusting your filters.
                </p>
              </div>
            ) : (
              results.map((r, idx) => (
                <motion.div
                  key={idx}
                  onClick={() => handleSelectBooking(r)}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-red-50 hover:border-red-300 cursor-pointer transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-red-700 font-semibold text-lg">
                        {r.booking.guest}
                      </p>
                      <p className="text-sm text-gray-600">
                        {r.hostel} • Room {r.roomNo}
                      </p>
                    </div>
                    {getStatusBadge(
                      r.booking.from,
                      r.booking.to,
                      r.booking.status,
                      r.booking.reportedStatus
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                    <p>📅 Check-in: {new Date(r.booking.from).toLocaleDateString()}</p>
                    <p>📅 Check-out: {new Date(r.booking.to).toLocaleDateString()}</p>
                    <p>📧 {r.booking.email || "No email"}</p>
                    <p>📞 {r.booking.contact || "No contact"}</p>
                  </div>

                  {(r.booking.department || r.booking.city || r.booking.state) && (
                    <div className="flex gap-2 text-xs text-gray-500 pt-2 border-t">
                      {r.booking.department && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          🏢 {r.booking.department}
                        </span>
                      )}
                      {r.booking.city && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          📍 {r.booking.city}
                        </span>
                      )}
                      {r.booking.state && (
                        <span className="bg-gray-100 px-2 py-1 rounded">
                          {r.booking.state}
                        </span>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}