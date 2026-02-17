// src/pages/VenueCalendarPage.jsx - GOOGLE MATERIAL DESIGN 3
import React, { useState, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, Calendar as CalendarIcon, Users, Clock,
  Building2, User, Phone, Mail, MapPin, X,
  ChevronLeft, ChevronRight, Search, FileText, XCircle
} from 'lucide-react';
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from 'framer-motion';

// Booking Details Modal Component
function BookingDetailsModal({ booking, theme, onClose }) {
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

  return (
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
        className={`
          rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto
          ${theme === 'dark' ? 'bg-[#292a2d]' : 'bg-white'}
        `}
      >
        {/* Header */}
        <div className={`
          sticky top-0 p-6 rounded-t-2xl z-10
          ${theme === 'dark' ? 'bg-[#1a73e8]' : 'bg-[#1a73e8]'}
        `}>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className={`
                w-16 h-16 rounded-full flex items-center justify-center
                ${theme === 'dark' ? 'bg-white/20' : 'bg-white/30'}
              `}>
                <Building2 size={32} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-medium text-white">{booking.name}</h2>
                <p className="text-white/80 text-sm">{booking.societyName || 'Guest'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Badge */}
          {booking.status === "cancelled" && (
            <div className={`
              border-l-4 p-4 rounded-lg
              ${theme === 'dark' 
                ? 'bg-red-900/20 border-red-500' 
                : 'bg-red-50 border-red-500'
              }
            `}>
              <div className="flex items-center gap-2">
                <XCircle className="text-red-600" size={20} />
                <p className={`font-medium ${
                  theme === 'dark' ? 'text-red-400' : 'text-red-800'
                }`}>
                  Booking Cancelled
                </p>
              </div>
              {booking.cancelRemarks && (
                <p className={`text-sm mt-2 ${
                  theme === 'dark' ? 'text-red-300' : 'text-red-600'
                }`}>
                  {booking.cancelRemarks}
                </p>
              )}
            </div>
          )}

          {/* Booking Information */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className={`
                text-base font-medium flex items-center gap-2
                ${theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'}
              `}>
                <User className="text-[#1a73e8]" size={18} />
                Contact Information
              </h3>
              
              <div className="space-y-3">
                <InfoItem 
                  label="Contact Person" 
                  value={booking.name} 
                  theme={theme}
                />
                
                <div>
                  <p className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
                  }`}>
                    Phone
                  </p>
                  <div className="flex items-center gap-2">
                    <Phone size={14} className={
                      theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
                    } />
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
                    }`}>
                      {booking.contact || "—"}
                    </p>
                  </div>
                </div>
                
                <div>
                  <p className={`text-xs mb-1 ${
                    theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
                  }`}>
                    Email
                  </p>
                  <div className="flex items-center gap-2">
                    <Mail size={14} className={
                      theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
                    } />
                    <p className={`text-sm font-medium break-all ${
                      theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
                    }`}>
                      {booking.email || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className={`
                text-base font-medium flex items-center gap-2
                ${theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'}
              `}>
                <Building2 className="text-[#1a73e8]" size={18} />
                Venue Details
              </h3>
              
              <div className="space-y-3">
                <InfoItem 
                  label="Hall" 
                  value={booking.hall} 
                  theme={theme}
                />
                
                <InfoItem 
                  label="Room Number" 
                  value={booking.roomNo} 
                  theme={theme}
                />
                
                <InfoItem 
                  label="Event Name" 
                  value={booking.eventName || "—"} 
                  theme={theme}
                />
                
                <InfoItem 
                  label="Society" 
                  value={booking.societyName || "—"} 
                  theme={theme}
                />
              </div>
            </div>
          </div>

          {/* Booking Duration */}
          <div className={`
            rounded-xl p-5 border
            ${theme === 'dark' 
              ? 'bg-[#3c4043] border-[#5f6368]' 
              : 'bg-[#f8f9fa] border-[#dadce0]'
            }
          `}>
            <h3 className={`
              text-base font-medium flex items-center gap-2 mb-4
              ${theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'}
            `}>
              <Clock className="text-[#1a73e8]" size={18} />
              Booking Duration
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className={`
                rounded-lg p-4
                ${theme === 'dark' ? 'bg-[#292a2d]' : 'bg-white'}
              `}>
                <p className={`text-xs mb-2 ${
                  theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
                }`}>
                  Check-in
                </p>
                <p className={`font-medium ${
                  theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
                }`}>
                  {formatDate(booking.checkInDate)}
                </p>
                <p className="text-xs text-[#1a73e8] mt-1">
                  {booking.checkInTime || "00:00"}
                </p>
              </div>
              
              <div className={`
                rounded-lg p-4
                ${theme === 'dark' ? 'bg-[#292a2d]' : 'bg-white'}
              `}>
                <p className={`text-xs mb-2 ${
                  theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
                }`}>
                  Check-out
                </p>
                <p className={`font-medium ${
                  theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
                }`}>
                  {formatDate(booking.checkOutDate)}
                </p>
                <p className="text-xs text-[#1a73e8] mt-1">
                  {booking.checkOutTime || "23:59"}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          {booking.purpose && (
            <div>
              <h3 className={`
                text-base font-medium mb-3
                ${theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'}
              `}>
                Purpose
              </h3>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
              }`}>
                {booking.purpose}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Info Item Component
function InfoItem({ label, value, theme }) {
  return (
    <div>
      <p className={`text-xs mb-1 ${
        theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
      }`}>
        {label}
      </p>
      <p className={`text-sm font-medium ${
        theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
      }`}>
        {value || "—"}
      </p>
    </div>
  );
}

// Booking List Item Component
function BookingListItem({ booking, onViewDetails, theme }) {
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
      whileHover={{ scale: 1.005 }}
      onClick={() => onViewDetails(booking)}
      className={`
        rounded-lg p-4 border cursor-pointer transition-all duration-200
        ${theme === 'dark'
          ? 'bg-[#292a2d] hover:bg-[#3c4043] border-[#3c4043] hover:border-[#5f6368]'
          : 'bg-white hover:bg-[#f8f9fa] border-[#dadce0] hover:border-[#bdc1c6]'
        }
      `}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`
            w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
            ${theme === 'dark' ? 'bg-[#3c4043]' : 'bg-[#f8f9fa]'}
          `}>
            <Building2 size={20} className="text-[#1a73e8]" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className={`
              font-medium text-sm mb-1 truncate
              ${theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'}
            `}>
              {booking.name}
            </h4>
            <p className={`text-xs mb-2 truncate ${
              theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
            }`}>
              {booking.societyName || 'Guest'}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`
                inline-flex items-center gap-1 text-xs px-2 py-1 rounded
                ${theme === 'dark' 
                  ? 'bg-[#3c4043] text-[#9aa0a6]' 
                  : 'bg-[#f8f9fa] text-[#5f6368]'
                }
              `}>
                <Building2 size={10} />
                {booking.hall}
              </span>
              <span className={`
                inline-flex items-center gap-1 text-xs px-2 py-1 rounded
                ${theme === 'dark' 
                  ? 'bg-[#3c4043] text-[#9aa0a6]' 
                  : 'bg-[#f8f9fa] text-[#5f6368]'
                }
              `}>
                Room {booking.roomNo}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className={`text-xs mb-1 ${
            theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
          }`}>
            {formatDate(booking.checkInDate)}
          </p>
          <p className={`text-xs ${
            theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
          }`}>
            to {formatDate(booking.checkOutDate)}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

// Main Component
export default function VenueCalendarPage({ onBack, venueData, theme = "light" }) {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSociety, setSelectedSociety] = useState('all');
  const [activeTab, setActiveTab] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Format date helper
  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Get all bookings
  const allBookings = useMemo(() => {
    if (!venueData) return [];
    
    const bookings = [];
    Object.keys(venueData).forEach(hallName => {
      const hall = venueData[hallName];
      if (hall.rooms) {
        hall.rooms.forEach(room => {
          if (room.bookings && room.bookings.length > 0) {
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
  }, [venueData]);

  // Get unique societies
  const societies = useMemo(() => {
    const societySet = new Set();
    allBookings.forEach(booking => {
      if (booking.societyName) {
        societySet.add(booking.societyName);
      }
    });
    return Array.from(societySet).sort();
  }, [allBookings]);

  // Filter by tab (comparing against selected date, not bookingsForDate)
  const tabFilteredBookings = useMemo(() => {
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    return allBookings.filter(booking => {
      // Parse booking dates
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);

      if (activeTab === 'cancelled') {
        return booking.status === 'cancelled';
      }

      // Exclude cancelled bookings from other tabs
      if (booking.status === 'cancelled') {
        return false;
      }

      if (activeTab === 'active') {
        // Active: check-in is today or before, and check-out is today or after
        return checkIn <= selectedDateOnly && checkOut >= selectedDateOnly;
      }
      
      if (activeTab === 'upcoming') {
        // Upcoming: check-in is after selected date
        return checkIn > selectedDateOnly;
      }
      
      if (activeTab === 'past') {
        // Past: check-out is before selected date
        return checkOut < selectedDateOnly;
      }

      return true;
    });
  }, [allBookings, selectedDate, activeTab]);

  // Apply search and society filters
  const filteredBookings = useMemo(() => {
    let result = tabFilteredBookings;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(booking =>
        booking.name?.toLowerCase().includes(query) ||
        booking.eventName?.toLowerCase().includes(query) ||
        booking.societyName?.toLowerCase().includes(query) ||
        booking.hall?.toLowerCase().includes(query)
      );
    }

    if (selectedSociety !== 'all') {
      result = result.filter(booking => booking.societyName === selectedSociety);
    }

    return result;
  }, [tabFilteredBookings, searchQuery, selectedSociety]);

  // Pagination
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBookings.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBookings, currentPage]);

  // Reset page when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSociety, activeTab, selectedDate]);

  // Get tab counts (use allBookings, not bookingsForDate)
  const getTabCount = useCallback((tabId) => {
    const selectedDateOnly = new Date(selectedDate);
    selectedDateOnly.setHours(0, 0, 0, 0);
    
    return allBookings.filter(booking => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);

      if (tabId === 'cancelled') {
        return booking.status === 'cancelled';
      }

      if (booking.status === 'cancelled') {
        return false;
      }

      if (tabId === 'active') {
        return checkIn <= selectedDateOnly && checkOut >= selectedDateOnly;
      }
      
      if (tabId === 'upcoming') {
        return checkIn > selectedDateOnly;
      }
      
      if (tabId === 'past') {
        return checkOut < selectedDateOnly;
      }

      return false;
    }).length;
  }, [allBookings, selectedDate]);

  const handleBookingClick = useCallback((booking) => {
    setSelectedBooking(booking);
  }, []);

  // Auto-switch to 'past' tab if any booking has expired
  React.useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Check if there are any bookings with checkOutDate in the past
    const hasExpiredBookings = allBookings.some(booking => {
      const checkOut = new Date(booking.checkOutDate);
      checkOut.setHours(0, 0, 0, 0);
      return checkOut < today;
    });
    
    // If there are expired bookings and we're not already on 'past' tab, switch to it
    if (hasExpiredBookings && activeTab !== 'past' && activeTab !== 'cancelled') {
      setActiveTab('past');
    }
  }, [allBookings]);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#202124]' : 'bg-[#f8f9fa]'
    }`}>
      {/* Header */}
      <header className={`
        border-b transition-colors duration-200
        ${theme === 'dark' ? 'bg-[#292a2d] border-[#3c4043]' : 'bg-white border-[#dadce0]'}
      `}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className={`
                p-2 rounded-lg transition-colors
                ${theme === 'dark'
                  ? 'hover:bg-[#3c4043] text-[#9aa0a6]'
                  : 'hover:bg-[#f1f3f4] text-[#5f6368]'
                }
              `}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className={`text-xl font-normal ${
                theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
              }`}>
                Venue Booking Calendar
              </h1>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
              }`}>
                Manage and track venue bookings
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Filters Section */}
      <div className={`
        border-b transition-colors duration-200
        ${theme === 'dark' ? 'bg-[#292a2d] border-[#3c4043]' : 'bg-white border-[#dadce0]'}
      `}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Date Picker */}
            <div>
              <label className={`
                block text-xs font-medium mb-2
                ${theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'}
              `}>
                <CalendarIcon size={14} className="inline mr-1" />
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className={`
                  w-full border rounded-lg px-3 py-2 text-sm
                  transition-colors duration-200
                  ${theme === 'dark'
                    ? 'bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]'
                    : 'bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8]'
                  }
                  focus:outline-none focus:ring-2 focus:ring-opacity-20
                  ${theme === 'dark' ? 'focus:ring-[#8ab4f8]' : 'focus:ring-[#1a73e8]'}
                `}
              />
            </div>

            {/* Society Filter */}
            <div>
              <label className={`
                block text-xs font-medium mb-2
                ${theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'}
              `}>
                <Building2 size={14} className="inline mr-1" />
                Filter by Society
              </label>
              <select
                value={selectedSociety}
                onChange={(e) => setSelectedSociety(e.target.value)}
                className={`
                  w-full border rounded-lg px-3 py-2 text-sm
                  transition-colors duration-200
                  ${theme === 'dark'
                    ? 'bg-[#3c4043] border-[#5f6368] text-[#e8eaed]'
                    : 'bg-white border-[#dadce0] text-[#202124]'
                  }
                  focus:outline-none focus:ring-2 focus:ring-opacity-20
                  ${theme === 'dark' ? 'focus:ring-[#8ab4f8]' : 'focus:ring-[#1a73e8]'}
                `}
              >
                <option value="all">All Societies</option>
                {societies.map(society => (
                  <option key={society} value={society}>{society}</option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className={`
                block text-xs font-medium mb-2
                ${theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'}
              `}>
                <Search size={14} className="inline mr-1" />
                Search Booking
              </label>
              <input
                type="text"
                placeholder="Name, Event, or Society..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`
                  w-full border rounded-lg px-3 py-2 text-sm
                  transition-colors duration-200
                  ${theme === 'dark'
                    ? 'bg-[#3c4043] border-[#5f6368] text-[#e8eaed] placeholder-[#9aa0a6]'
                    : 'bg-white border-[#dadce0] text-[#202124] placeholder-[#5f6368]'
                  }
                  focus:outline-none focus:ring-2 focus:ring-opacity-20
                  ${theme === 'dark' ? 'focus:ring-[#8ab4f8]' : 'focus:ring-[#1a73e8]'}
                `}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`
        transition-colors duration-200
        ${theme === 'dark' ? 'bg-[#292a2d]' : 'bg-white'}
      `}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
          <div className={`
            flex flex-wrap gap-1 sm:gap-2 md:gap-3 pb-0 border-b
            ${theme === 'dark' ? 'border-[#3c4043]' : 'border-[#dadce0]'}
          `}>
            {[
              { id: 'active', label: 'Active Bookings', short: 'Active', icon: Users },
              { id: 'upcoming', label: 'Upcoming Bookings', short: 'Upcoming', icon: Clock },
              { id: 'past', label: 'Past Bookings', short: 'Past', icon: FileText },
              { id: 'cancelled', label: 'Cancelled Bookings', short: 'Cancelled', icon: XCircle }
            ].map(tab => {
              const Icon = tab.icon;
              const count = getTabCount(tab.id);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 text-xs sm:text-sm md:text-base font-medium
                    transition-all duration-200 border-b-2 flex-shrink-0
                    ${activeTab === tab.id
                      ? theme === 'dark'
                        ? 'border-[#8ab4f8] text-[#8ab4f8] bg-[#8ab4f8]/5'
                        : 'border-[#1a73e8] text-[#1a73e8] bg-[#1a73e8]/5'
                      : theme === 'dark'
                        ? 'border-transparent text-[#9aa0a6] hover:text-[#8ab4f8] hover:bg-[#3c4043]'
                        : 'border-transparent text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f8f9fa]'
                    }
                  `}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.short}</span>
                  <span className={`
                    ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-medium
                    ${activeTab === tab.id
                      ? theme === 'dark'
                        ? 'bg-[#8ab4f8] text-[#202124]'
                        : 'bg-[#1a73e8] text-white'
                      : theme === 'dark'
                        ? 'bg-[#3c4043] text-[#9aa0a6]'
                        : 'bg-[#f8f9fa] text-[#5f6368]'
                    }
                  `}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking List */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {filteredBookings.length === 0 ? (
          <div className={`
            rounded-lg p-12 text-center
            ${theme === 'dark' ? 'bg-[#292a2d]' : 'bg-white'}
          `}>
            <Building2 className={`
              w-16 h-16 mx-auto mb-4
              ${theme === 'dark' ? 'text-[#5f6368]' : 'text-[#dadce0]'}
            `} />
            <h3 className={`
              text-lg font-medium mb-2
              ${theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'}
            `}>
              No Bookings Found
            </h3>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
            }`}>
              No bookings match your filters for {formatDate(selectedDate)}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {paginatedBookings.map((booking, index) => (
                <BookingListItem 
                  key={booking._id || `${booking.hall}-${booking.roomNo}-${booking.checkInDate}-${index}`}
                  booking={booking} 
                  onViewDetails={handleBookingClick}
                  theme={theme}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`
                mt-6 flex items-center justify-between rounded-lg p-4
                ${theme === 'dark' ? 'bg-[#292a2d]' : 'bg-white'}
              `}>
                <div className={`text-sm ${
                  theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
                }`}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredBookings.length)} of {filteredBookings.length} bookings
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${currentPage === 1
                        ? theme === 'dark'
                          ? 'bg-[#3c4043] text-[#5f6368] cursor-not-allowed'
                          : 'bg-[#f8f9fa] text-[#9aa0a6] cursor-not-allowed'
                        : theme === 'dark'
                          ? 'bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]'
                          : 'bg-[#1a73e8] text-white hover:bg-[#1765cc]'
                      }
                    `}
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
                            className={`
                              w-10 h-10 rounded-lg text-sm font-medium transition-colors
                              ${currentPage === page
                                ? theme === 'dark'
                                  ? 'bg-[#8ab4f8] text-[#202124]'
                                  : 'bg-[#1a73e8] text-white'
                                : theme === 'dark'
                                  ? 'bg-[#3c4043] text-[#9aa0a6] hover:bg-[#5f6368]'
                                  : 'bg-[#f8f9fa] text-[#5f6368] hover:bg-[#e8eaed]'
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
                          <span key={page} className={`px-2 ${
                            theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
                          }`}>
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
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${currentPage === totalPages
                        ? theme === 'dark'
                          ? 'bg-[#3c4043] text-[#5f6368] cursor-not-allowed'
                          : 'bg-[#f8f9fa] text-[#9aa0a6] cursor-not-allowed'
                        : theme === 'dark'
                          ? 'bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]'
                          : 'bg-[#1a73e8] text-white hover:bg-[#1765cc]'
                      }
                    `}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            theme={theme}
            onClose={() => setSelectedBooking(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}