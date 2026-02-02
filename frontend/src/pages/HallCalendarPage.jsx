// src/pages/HallCalendarPage.jsx - COMPLETE FIXED VERSION
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Calendar as CalendarIcon, Users, Clock,
  Building2, User, Phone, Mail, MapPin, X,
  ChevronLeft, ChevronRight, Search, ChevronDown
} from 'lucide-react';
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from 'framer-motion';

// ✅ FIXED: Advanced Glassmorphism Calendar Component
function AdvancedCalendar({ bookings, theme, selectedDate, onDateSelect }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

  // ✅ Get bookings for a specific date
  const getBookingsForDate = useCallback((date) => {
    return bookings.filter(booking => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      
      const bookingDate = new Date(date);
      bookingDate.setHours(0, 0, 0, 0);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      return bookingDate >= checkIn && bookingDate <= checkOut;
    }).length;
  }, [bookings]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const prevLastDay = new Date(year, month, 0);
    
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const daysInPrevMonth = prevLastDay.getDate();
    
    const days = [];
    
    // Previous month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [currentMonth]);

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    return date.toDateString() === selectedDate.toDateString();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (date) => {
    onDateSelect(date);
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`glassmorphism-calendar rounded-3xl p-8 shadow-2xl border-2 ${
      theme === 'dark' 
        ? 'bg-gray-800/40 border-gray-700/50 backdrop-blur-2xl' 
        : 'bg-white/40 border-white/60 backdrop-blur-2xl'
    }`}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={handlePrevMonth}
          className={`p-3 rounded-xl transition-all hover:scale-110 shadow-lg ${
            theme === 'dark'
              ? 'hover:bg-gray-700/50 bg-gray-700/30 text-gray-300'
              : 'hover:bg-gray-100 bg-white/50 text-gray-700'
          }`}
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="text-center">
          <h3 className={`text-3xl font-bold bg-gradient-to-r from-red-600 to-red-700 bg-clip-text text-transparent`}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
          <p className={`text-sm mt-1 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
            Click any date to view bookings
          </p>
        </div>
        
        <button
          onClick={handleNextMonth}
          className={`p-3 rounded-xl transition-all hover:scale-110 shadow-lg ${
            theme === 'dark'
              ? 'hover:bg-gray-700/50 bg-gray-700/30 text-gray-300'
              : 'hover:bg-gray-100 bg-white/50 text-gray-700'
          }`}
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-3 mb-4">
        {dayNames.map(day => (
          <div
            key={day}
            className={`text-center text-sm font-bold py-3 rounded-lg ${
              theme === 'dark' 
                ? 'text-gray-300 bg-gray-700/30' 
                : 'text-gray-700 bg-gray-100/50'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-3">
        {calendarDays.map((day, index) => {
          const bookingCount = getBookingsForDate(day.date);
          const today = isToday(day.date);
          const selected = isSelected(day.date);
          
          return (
            <motion.button
              key={index}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleDateClick(day.date)}
              className={`
                relative aspect-square rounded-2xl p-3 transition-all shadow-md
                ${!day.isCurrentMonth && 'opacity-40'}
                ${today && 'ring-4 ring-blue-500 ring-offset-2'}
                ${selected 
                  ? 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-xl transform scale-105' 
                  : theme === 'dark'
                  ? 'hover:bg-gray-700/60 bg-gray-700/30 text-gray-200'
                  : 'hover:bg-white bg-gray-50/50 text-gray-800'
                }
              `}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span className={`text-xl font-bold ${
                  selected ? 'text-white' : ''
                }`}>
                  {day.date.getDate()}
                </span>
                
                {/* Booking Count Badge */}
                {bookingCount > 0 && (
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className={`mt-2 px-2.5 py-1 rounded-full text-xs font-bold shadow-lg ${
                      selected
                        ? 'bg-white/30 text-white border border-white/50'
                        : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                    }`}
                  >
                    {bookingCount} {bookingCount === 1 ? 'booking' : 'bookings'}
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-8 pt-6 border-t border-gray-300/30 flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-red-600 shadow"></div>
          <span className={theme === 'dark' ? 'text-gray-300 font-medium' : 'text-gray-700 font-medium'}>
            Has Bookings
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-4 border-blue-500"></div>
          <span className={theme === 'dark' ? 'text-gray-300 font-medium' : 'text-gray-700 font-medium'}>
            Today
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-gradient-to-br from-red-600 to-red-700"></div>
          <span className={theme === 'dark' ? 'text-gray-300 font-medium' : 'text-gray-700 font-medium'}>
            Selected
          </span>
        </div>
      </div>
    </div>
  );
}

// Booking Card Component
function BookingCard({ booking, onClick, theme }) {
  const getStatusColor = (status) => {
    const colors = {
      booked: "bg-blue-100 text-blue-800 border-blue-300",
      checked_in: "bg-green-100 text-green-800 border-green-300",
      checked_out: "bg-gray-100 text-gray-800 border-gray-300",
      cancelled: "bg-red-100 text-red-800 border-red-300",
    };
    return colors[status] || colors.booked;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
      onClick={onClick}
      className={`cursor-pointer rounded-2xl p-5 border-2 transition-all ${
        theme === 'dark'
          ? 'bg-gray-800/60 border-gray-700 hover:border-red-500'
          : 'bg-white/80 border-gray-200 hover:border-red-500'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            theme === 'dark' ? 'bg-red-900/50' : 'bg-red-100'
          }`}>
            <User className={`w-6 h-6 ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`} />
          </div>
          <div>
            <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {booking.name}
            </h3>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {booking.eventName || booking.societyName}
            </p>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
          {booking.status.replace("_", " ").toUpperCase()}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="flex items-center gap-2">
          <Building2 size={16} className="text-red-600" />
          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
            {booking.hall}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin size={16} className="text-red-600" />
          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
            Room {booking.roomNo}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-red-600" />
          <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}>
            {booking.checkInTime} - {booking.checkOutTime}
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
      </div>
    </motion.div>
  );
}

// Booking Details Modal
function BookingDetailsModal({ booking, onClose, theme }) {
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
        className={`${
          theme === 'dark' ? 'bg-gray-800' : 'bg-white'
        } rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                <User size={32} className="text-white/90" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{booking.name}</h2>
                <p className="text-red-100 text-sm">{booking.eventName || "Hall Booking"}</p>
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
          {/* Guest Information */}
          <div>
            <h4 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Guest Information
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem icon={<User size={18} />} label="Name" value={booking.name} theme={theme} />
              <InfoItem icon={<Users size={18} />} label="Society" value={booking.societyName} theme={theme} />
              <InfoItem icon={<Mail size={18} />} label="Email" value={booking.email} theme={theme} />
              <InfoItem icon={<Phone size={18} />} label="Contact" value={booking.contact} theme={theme} />
            </div>
          </div>

          {/* Location */}
          <div>
            <h4 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Location Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem icon={<Building2 size={18} />} label="Hall" value={booking.hall} theme={theme} />
              <InfoItem icon={<MapPin size={18} />} label="Room" value={`Room ${booking.roomNo}`} theme={theme} />
            </div>
          </div>

          {/* Timeline */}
          <div>
            <h4 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Booking Timeline
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoItem icon={<CalendarIcon size={18} />} label="Check-in Date" value={formatDate(booking.checkInDate)} theme={theme} />
              <InfoItem icon={<Clock size={18} />} label="Check-in Time" value={booking.checkInTime} theme={theme} />
              <InfoItem icon={<CalendarIcon size={18} />} label="Check-out Date" value={formatDate(booking.checkOutDate)} theme={theme} />
              <InfoItem icon={<Clock size={18} />} label="Check-out Time" value={booking.checkOutTime} theme={theme} />
            </div>
          </div>

          {/* Purpose */}
          {booking.purpose && (
            <div>
              <h4 className={`text-lg font-bold mb-3 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Purpose
              </h4>
              <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  {booking.purpose}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-6 border-t ${theme === 'dark' ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            className={`w-full py-3 rounded-lg font-medium transition ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
            }`}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Info Item Helper
function InfoItem({ icon, label, value, theme }) {
  return (
    <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
          {icon}
        </span>
        <span className={`text-xs font-medium ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
          {label}
        </span>
      </div>
      <p className={`text-sm font-semibold ml-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}

// Main Component
export default function HallCalendarPage({ onBack, hallData, theme = "light" }) {
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHall, setSelectedHall] = useState('all');

  // ✅ FIXED: Get all bookings from hallData
  const allBookings = useMemo(() => {
    if (!hallData) {
      console.log("❌ No hallData available");
      return [];
    }
    
    const bookings = [];
    Object.keys(hallData).forEach(hallName => {
      const hall = hallData[hallName];
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
    
    console.log(`📊 Total bookings loaded: ${bookings.length}`);
    return bookings;
  }, [hallData]);

  // ✅ FIXED: Get bookings for selected date
  const bookingsForSelectedDate = useMemo(() => {
    const dateStr = selectedDate.toDateString();
    console.log(`🔍 Filtering bookings for: ${dateStr}`);
    
    const filtered = allBookings.filter(booking => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      
      const bookingDate = new Date(selectedDate);
      bookingDate.setHours(0, 0, 0, 0);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      return bookingDate >= checkIn && bookingDate <= checkOut;
    });

    console.log(`✅ Found ${filtered.length} bookings for ${dateStr}`);
    return filtered;
  }, [allBookings, selectedDate]);

  // Filter bookings by search and hall
  const filteredBookings = useMemo(() => {
    let result = bookingsForSelectedDate;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(booking =>
        booking.name?.toLowerCase().includes(query) ||
        booking.eventName?.toLowerCase().includes(query) ||
        booking.societyName?.toLowerCase().includes(query) ||
        booking.contact?.includes(query) ||
        booking.email?.toLowerCase().includes(query)
      );
    }

    if (selectedHall !== 'all') {
      result = result.filter(booking => booking.hall === selectedHall);
    }

    return result;
  }, [bookingsForSelectedDate, searchQuery, selectedHall]);

  // Get unique halls
  const hallOptions = useMemo(() => {
    return Object.keys(hallData || {});
  }, [hallData]);

  // ✅ FIXED: Handle date selection
  const handleDateSelect = useCallback((date) => {
    console.log(`📅 Date selected: ${date.toDateString()}`);
    setSelectedDate(date);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-red-50">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 -left-40 w-80 h-80 bg-red-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-20 -right-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-40 left-20 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <div className={`backdrop-blur-xl border-b ${
        theme === 'dark' ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-200'
      } sticky top-0 z-40`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
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
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg">
                  <CalendarIcon size={24} />
                </div>
                <div>
                  <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    Hall Booking Calendar
                  </h1>
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedDate.toLocaleDateString('en-IN', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })} • {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Calendar - Takes 2 columns on large screens */}
          <div className="lg:col-span-2">
            <AdvancedCalendar
              bookings={allBookings}
              theme={theme}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          </div>

          {/* Bookings List */}
          <div className="space-y-6">
            {/* Filters */}
            <div className={`rounded-2xl p-6 shadow-xl border-2 ${
              theme === 'dark' 
                ? 'bg-gray-800/60 border-gray-700 backdrop-blur-xl' 
                : 'bg-white/60 border-white/60 backdrop-blur-xl'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Filters
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className={`text-sm font-medium block mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Name, event..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`w-full border-2 rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-red-200 transition ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                          : 'bg-white border-gray-300'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium block mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Hall
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <select
                      value={selectedHall}
                      onChange={(e) => setSelectedHall(e.target.value)}
                      className={`w-full border-2 rounded-xl pl-10 pr-10 py-2 focus:ring-2 focus:ring-red-200 transition appearance-none ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                    >
                      <option value="all">All Halls</option>
                      {hallOptions.map(hall => (
                        <option key={hall} value={hall}>{hall}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bookings for Selected Date */}
            <div className={`rounded-2xl p-6 shadow-xl border-2 ${
              theme === 'dark' 
                ? 'bg-gray-800/60 border-gray-700 backdrop-blur-xl' 
                : 'bg-white/60 border-white/60 backdrop-blur-xl'
            }`}>
              <h3 className={`text-lg font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Bookings on {selectedDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
              </h3>

              <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                {filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarIcon className={`w-16 h-16 mx-auto mb-4 ${
                      theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      No bookings found for this date
                    </p>
                  </div>
                ) : (
                  filteredBookings.map((booking, index) => (
                    <BookingCard
                      key={booking._id || index}
                      booking={booking}
                      onClick={() => setSelectedBooking(booking)}
                      theme={theme}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {selectedBooking && (
          <BookingDetailsModal
            booking={selectedBooking}
            onClose={() => setSelectedBooking(null)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* Styles */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        
        .animation-delay-4000 {
          animation-delay: 4s;
        }

        /* Custom scrollbar */
        .overflow-y-auto::-webkit-scrollbar {
          width: 8px;
        }

        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(220, 38, 38, 0.5);
          border-radius: 10px;
        }

        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(220, 38, 38, 0.7);
        }
      `}</style>
    </div>
  );
}