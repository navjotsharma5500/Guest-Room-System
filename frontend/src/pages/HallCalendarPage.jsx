// src/pages/HallCalendarPage.jsx
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Download, Filter, Search, Calendar as CalendarIcon,
  Users, Clock, FileText, XCircle, User, Phone, Mail, 
  Building2, CheckCircle, DollarSign, MapPin, X, ChevronDown
} from 'lucide-react';
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from 'framer-motion';

// Booking Details Modal Component
function BookingDetailsModal({ booking, onClose, theme = "light" }) {
  if (!booking) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "booked": return "blue";
      case "checked_in": return "green";
      case "checked_out": return "gray";
      case "cancelled": return "red";
      default: return "gray";
    }
  };

  const statusColor = getStatusColor(booking.status);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          } rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto backdrop-blur-xl border ${
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl z-10">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                {booking.profilePicture ? (
                  <img
                    src={booking.profilePicture}
                    alt={booking.name}
                    className="w-16 h-16 rounded-full border-4 border-white/30"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <User size={32} className="text-white/70" />
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold">{booking.name}</h2>
                  <p className="text-red-100 text-sm">{booking.eventName || "—"}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-2 transition"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Status Badge */}
            <div className={`bg-${statusColor}-50 border-l-4 border-${statusColor}-500 p-4 rounded-lg`}>
              <div className="flex items-center gap-2">
                {booking.status === "cancelled" ? (
                  <XCircle className={`text-${statusColor}-600`} size={20} />
                ) : (
                  <CheckCircle className={`text-${statusColor}-600`} size={20} />
                )}
                <p className={`font-semibold text-${statusColor}-800`}>
                  Status: {booking.status.replace("_", " ").toUpperCase()}
                </p>
              </div>
              {booking.cancelRemarks && (
                <p className={`text-sm text-${statusColor}-600 mt-2`}>{booking.cancelRemarks}</p>
              )}
            </div>

            {/* Booking Information Grid */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                  <User className="text-red-600" size={20} />
                  Guest Information
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Organization</p>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                      {booking.organization || "—"}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Contact</p>
                    <div className="flex items-center gap-2">
                      <Phone size={16} className="text-gray-400" />
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                        {booking.contact || "—"}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-gray-400" />
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'} text-sm break-all`}>
                        {booking.email || "—"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Address</p>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-400" />
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                        {booking.address || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                  <Building2 className="text-red-600" size={20} />
                  Hall Details
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Hall</p>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                      {booking.hall}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Room Number</p>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                      {booking.roomNo}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Event Type</p>
                    <p className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                      {booking.eventType || "—"}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-1">Attendees</p>
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-gray-400" />
                      <p className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                        {booking.attendees || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Duration */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl p-5 border border-red-200 dark:border-red-800">
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2 mb-4`}>
                <Clock className="text-red-600" size={20} />
                Booking Duration
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'} rounded-lg p-4 shadow-sm`}>
                  <p className="text-sm text-gray-500 mb-2">Check-in</p>
                  <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {formatDate(booking.checkInDate)}
                  </p>
                  <p className="text-sm text-red-600 mt-1">{booking.checkInTime || "00:00"}</p>
                </div>
                
                <div className={`${theme === 'dark' ? 'bg-gray-800/50' : 'bg-white'} rounded-lg p-4 shadow-sm`}>
                  <p className="text-sm text-gray-500 mb-2">Check-out</p>
                  <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    {formatDate(booking.checkOutDate)}
                  </p>
                  <p className="text-sm text-red-600 mt-1">{booking.checkOutTime || "00:00"}</p>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {booking.remarks && (
              <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-2`}>
                  Remarks
                </h3>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {booking.remarks}
                </p>
              </div>
            )}

            {/* Payment Information */}
            {booking.amount && (
              <div className={`p-4 rounded-xl border-2 ${
                booking.paymentStatus === 'paid' 
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                  : 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <DollarSign className={
                      booking.paymentStatus === 'paid' ? 'text-green-600' : 'text-orange-600'
                    } size={24} />
                    <div>
                      <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                        Total Amount
                      </p>
                      <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                        ₹{booking.amount}
                      </p>
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-lg font-bold ${
                    booking.paymentStatus === 'paid'
                      ? 'bg-green-600 text-white'
                      : 'bg-orange-600 text-white'
                  }`}>
                    {booking.paymentStatus === 'paid' ? 'PAID' : 'PENDING'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Booking List Item Component
function BookingListItem({ booking, onViewDetails, theme }) {
  const getStatusColor = (status) => {
    switch (status) {
      case "booked": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "checked_in": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "checked_out": return "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300";
      case "cancelled": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={() => onViewDetails(booking)}
      className={`backdrop-blur-xl rounded-xl border shadow-lg p-5 cursor-pointer transition ${
        theme === 'dark' 
          ? 'bg-gray-800/60 border-gray-700 hover:bg-gray-800/80' 
          : 'bg-white/60 border-gray-200 hover:bg-white/80'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {booking.profilePicture ? (
            <img
              src={booking.profilePicture}
              alt={booking.name}
              className="w-12 h-12 rounded-full border-2 border-red-600"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white font-bold text-lg">
              {booking.name?.charAt(0) || "?"}
            </div>
          )}
          <div>
            <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {booking.name}
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {booking.eventName || booking.organization || "—"}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(booking.status)}`}>
          {booking.status.replace("_", " ").toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-red-600" />
          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
            {booking.hall} - {booking.roomNo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CalendarIcon size={16} className="text-red-600" />
          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
            {new Date(booking.checkInDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
            {' - '}
            {new Date(booking.checkOutDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          </span>
        </div>
        {booking.contact && (
          <div className="flex items-center gap-2">
            <Phone size={16} className="text-red-600" />
            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
              {booking.contact}
            </span>
          </div>
        )}
        {booking.attendees && (
          <div className="flex items-center gap-2">
            <Users size={16} className="text-red-600" />
            <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
              {booking.attendees} attendees
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Main Calendar Page Component
export default function HallCalendarPage({ onBack, hallData, theme = "light" }) {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTabLocal] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHall, setSelectedHall] = useState('all');
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Get all bookings from hallData
  const allBookings = useMemo(() => {
    if (!hallData) return [];
    
    const bookings = [];
    Object.keys(hallData).forEach(hallName => {
      const hall = hallData[hallName];
      if (hall.rooms) {
        hall.rooms.forEach(room => {
          if (room.bookings) {
            room.bookings.forEach(booking => {
              bookings.push({
                ...booking,
                hall: hallName,
                roomNo: room.roomNo
              });
            });
          }
        });
      }
    });
    return bookings;
  }, [hallData]);

  // Format date helper
  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Filter bookings based on active tab
  const filteredByTab = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return allBookings.filter(booking => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);

      switch (activeTab) {
        case 'active':
          return booking.status === 'checked_in' || 
                 (booking.status === 'booked' && checkIn <= now && checkOut >= today);
        case 'upcoming':
          return booking.status === 'booked' && checkIn > now;
        case 'past':
          return booking.status === 'checked_out' || checkOut < today;
        case 'cancelled':
          return booking.status === 'cancelled';
        default:
          return true;
      }
    });
  }, [allBookings, activeTab]);

  // Filter by search query and hall
  const filteredBookings = useMemo(() => {
    let result = filteredByTab;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(booking =>
        booking.name?.toLowerCase().includes(query) ||
        booking.eventName?.toLowerCase().includes(query) ||
        booking.organization?.toLowerCase().includes(query) ||
        booking.contact?.includes(query) ||
        booking.email?.toLowerCase().includes(query)
      );
    }

    if (selectedHall !== 'all') {
      result = result.filter(booking => booking.hall === selectedHall);
    }

    return result;
  }, [filteredByTab, searchQuery, selectedHall]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, currentPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedHall]);

  // Get tab counts
  const getTabCount = (tabId) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return allBookings.filter(booking => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);

      switch (tabId) {
        case 'active':
          return booking.status === 'checked_in' || 
                 (booking.status === 'booked' && checkIn <= now && checkOut >= today);
        case 'upcoming':
          return booking.status === 'booked' && checkIn > now;
        case 'past':
          return booking.status === 'checked_out' || checkOut < today;
        case 'cancelled':
          return booking.status === 'cancelled';
        default:
          return false;
      }
    }).length;
  };

  // Handle guest click
  const handleGuestClick = (booking) => {
    setSelectedGuest(booking);
    setShowGuestModal(true);
  };

  // Get unique halls
  const hallOptions = useMemo(() => {
    return Object.keys(hallData || {});
  }, [hallData]);

  return (
    <div className="min-h-screen">
      {/* Glassmorphism Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-20 -right-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header Section */}
      <div className={`backdrop-blur-xl border-b ${
        theme === 'dark' ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
      } sticky top-16 z-40`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <motion.div
            initial={{ y: -20 }}
            animate={{ y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className={`p-2 rounded-xl transition ${
                  theme === 'dark' 
                    ? 'hover:bg-gray-700 text-gray-300' 
                    : 'hover:bg-gray-100 text-gray-700'
                }`}
              >
                <ArrowLeft size={24} />
              </button>
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Calendar View
                  </h1>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {formatDate(selectedDate)} • {filteredBookings.length} bookings
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {/* Export functionality */}}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition font-semibold"
            >
              <Download size={20} />
              Export
            </button>
          </motion.div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`text-sm font-medium block mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Search Booking
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Name, event, organization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full border-2 rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-red-200 transition ${
                    theme === 'dark' 
                      ? 'bg-gray-800/60 border-gray-700 text-white placeholder-gray-400 focus:border-red-500 backdrop-blur-xl' 
                      : 'bg-white/60 border-gray-300 focus:border-red-500 backdrop-blur-xl'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className={`text-sm font-medium block mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Select Hall
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <select
                  value={selectedHall}
                  onChange={(e) => setSelectedHall(e.target.value)}
                  className={`w-full border-2 rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-red-200 transition appearance-none ${
                    theme === 'dark' 
                      ? 'bg-gray-800/60 border-gray-700 text-white focus:border-red-500 backdrop-blur-xl' 
                      : 'bg-white/60 border-gray-300 focus:border-red-500 backdrop-blur-xl'
                  }`}
                >
                  <option value="all">All Halls</option>
                  {hallOptions.map(hall => (
                    <option key={hall} value={hall}>{hall}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />
              </div>
            </div>

            <div>
              <label className={`text-sm font-medium block mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Select Date
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => setSelectedDate(new Date(e.target.value))}
                  className={`w-full border-2 rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-red-200 transition ${
                    theme === 'dark' 
                      ? 'bg-gray-800/60 border-gray-700 text-white focus:border-red-500 backdrop-blur-xl' 
                      : 'bg-white/60 border-gray-300 focus:border-red-500 backdrop-blur-xl'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`backdrop-blur-xl border-b sticky top-[180px] z-30 ${
        theme === 'dark' ? 'bg-gray-800/80 border-gray-700' : 'bg-white/80 border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex overflow-x-auto">
            {[
              { id: 'active', label: 'Active', icon: Users },
              { id: 'upcoming', label: 'Upcoming', icon: Clock },
              { id: 'past', label: 'Past', icon: FileText },
              { id: 'cancelled', label: 'Cancelled', icon: XCircle }
            ].map(tab => {
              const Icon = tab.icon;
              const count = getTabCount(tab.id);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabLocal(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-semibold transition border-b-3 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-red-600 text-red-600 bg-red-50 dark:bg-red-900/20'
                      : theme === 'dark'
                        ? 'border-transparent text-gray-400 hover:text-red-400 hover:bg-gray-700/50'
                        : 'border-transparent text-gray-600 hover:text-red-600 hover:bg-red-50/50'
                  }`}
                >
                  <Icon size={20} />
                  {tab.label}
                  <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === tab.id
                      ? 'bg-red-600 text-white'
                      : theme === 'dark'
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-gray-200 text-gray-700'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking List */}
      <div className="max-w-7xl mx-auto px-6 py-6 relative z-10">
        {filteredBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`backdrop-blur-xl rounded-2xl border shadow-xl p-12 text-center ${
              theme === 'dark' ? 'bg-gray-800/60 border-gray-700' : 'bg-white/60 border-gray-200'
            }`}
          >
            <Users className={`w-16 h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className={`text-xl font-bold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              No Bookings Found
            </h3>
            <p className={`${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              No bookings match your current filters
            </p>
          </motion.div>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedBookings.map((booking, index) => (
                <BookingListItem 
                  key={booking._id || `${booking.hall}-${booking.roomNo}-${index}`} 
                  booking={booking} 
                  onViewDetails={handleGuestClick}
                  theme={theme}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`mt-6 flex items-center justify-between backdrop-blur-xl rounded-xl border shadow-lg p-4 ${
                  theme === 'dark' ? 'bg-gray-800/60 border-gray-700' : 'bg-white/60 border-gray-200'
                }`}
              >
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600'
                        : theme === 'dark'
                          ? 'bg-gray-700 text-white hover:bg-gray-600'
                          : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-10 h-10 rounded-lg font-semibold transition ${
                              currentPage === page
                                ? 'bg-red-600 text-white'
                                : theme === 'dark'
                                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className={`px-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg font-semibold transition ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-600'
                        : theme === 'dark'
                          ? 'bg-gray-700 text-white hover:bg-gray-600'
                          : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Booking Details Modal */}
      {showGuestModal && selectedGuest && (
        <BookingDetailsModal
          booking={selectedGuest}
          onClose={() => {
            setShowGuestModal(false);
            setSelectedGuest(null);
          }}
          theme={theme}
        />
      )}
    </div>
  );
}