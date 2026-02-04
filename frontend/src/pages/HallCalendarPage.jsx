// src/pages/HallCalendarPage.jsx - GOOGLE MATERIAL DESIGN 3
import React, { useState, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, Calendar as CalendarIcon, Users, Clock,
  Building2, User, Phone, Mail, MapPin, X,
  ChevronLeft, ChevronRight, Search
} from 'lucide-react';
import { useToast } from "../context/ToastContext";
import { motion, AnimatePresence } from 'framer-motion';

// Google Design Calendar Component
function GoogleCalendar({ bookings, theme, selectedDate, onDateSelect }) {
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));

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
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false
      });
    }
    
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
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

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`
      rounded-lg p-6 border transition-colors duration-200
      ${theme === 'dark' 
        ? 'bg-[#292a2d] border-[#3c4043]' 
        : 'bg-white border-[#dadce0]'
      }
    `}>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handlePrevMonth}
          className={`
            p-2 rounded-lg transition-colors duration-200
            ${theme === 'dark'
              ? 'hover:bg-[#3c4043] text-[#9aa0a6]'
              : 'hover:bg-[#f1f3f4] text-[#5f6368]'
            }
          `}
        >
          <ChevronLeft size={20} />
        </button>
        
        <div className="text-center">
          <h3 className={`text-lg font-medium ${
            theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
          }`}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h3>
        </div>
        
        <button
          onClick={handleNextMonth}
          className={`
            p-2 rounded-lg transition-colors duration-200
            ${theme === 'dark'
              ? 'hover:bg-[#3c4043] text-[#9aa0a6]'
              : 'hover:bg-[#f1f3f4] text-[#5f6368]'
            }
          `}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day Names */}
      <div className="grid grid-cols-7 gap-2 mb-3">
        {dayNames.map(day => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-2 ${
              theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Days */}
      <div className="grid grid-cols-7 gap-2">
        {calendarDays.map((day, index) => {
          const bookingCount = getBookingsForDate(day.date);
          const today = isToday(day.date);
          const selected = isSelected(day.date);
          
          return (
            <button
              key={index}
              onClick={() => onDateSelect(day.date)}
              className={`
                relative aspect-square rounded-lg p-2 text-sm font-medium
                transition-colors duration-200
                ${!day.isCurrentMonth && 'opacity-30'}
                ${selected 
                  ? theme === 'dark'
                    ? 'bg-[#8ab4f8] text-[#202124]'
                    : 'bg-[#1a73e8] text-white'
                  : theme === 'dark'
                  ? 'hover:bg-[#3c4043] text-[#e8eaed]'
                  : 'hover:bg-[#f1f3f4] text-[#202124]'
                }
                ${today && !selected && (theme === 'dark' ? 'ring-1 ring-[#8ab4f8]' : 'ring-1 ring-[#1a73e8]')}
              `}
            >
              <div className="flex flex-col items-center justify-center h-full">
                <span>{day.date.getDate()}</span>
                
                {bookingCount > 0 && (
                  <span className={`
                    mt-1 w-1.5 h-1.5 rounded-full
                    ${selected 
                      ? 'bg-[#202124]' 
                      : theme === 'dark'
                      ? 'bg-[#8ab4f8]'
                      : 'bg-[#1a73e8]'
                    }
                  `} />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Booking Card Component
function BookingCard({ booking, theme, onClick }) {
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`
        rounded-lg p-4 border cursor-pointer transition-colors duration-200
        ${theme === 'dark'
          ? 'bg-[#3c4043] hover:bg-[#4a4d50] border-[#3c4043]'
          : 'bg-white hover:bg-[#f8f9fa] border-[#dadce0]'
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className={`font-medium text-sm mb-1 truncate ${
            theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
          }`}>
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
              ${theme === 'dark' ? 'bg-[#292a2d] text-[#9aa0a6]' : 'bg-[#f8f9fa] text-[#5f6368]'}
            `}>
              <Building2 size={12} />
              {booking.hall}
            </span>
            <span className={`
              inline-flex items-center gap-1 text-xs px-2 py-1 rounded
              ${theme === 'dark' ? 'bg-[#292a2d] text-[#9aa0a6]' : 'bg-[#f8f9fa] text-[#5f6368]'}
            `}>
              <MapPin size={12} />
              Room {booking.roomNo}
            </span>
          </div>
        </div>
        <span className={`
          px-2 py-1 rounded text-xs font-medium whitespace-nowrap
          ${booking.status === 'checked_in'
            ? theme === 'dark'
              ? 'bg-[#1e4620] text-[#81c995]'
              : 'bg-[#e6f4ea] text-[#137333]'
            : theme === 'dark'
            ? 'bg-[#8ab4f8]/20 text-[#8ab4f8]'
            : 'bg-[#d3e3fd] text-[#1967d2]'
          }
        `}>
          {booking.status === 'checked_in' ? 'Active' : 'Booked'}
        </span>
      </div>
    </motion.div>
  );
}

// Booking Details Modal
function BookingDetailsModal({ booking, theme, onClose }) {
  if (!booking) return null;

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
        className={`
          rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto
          ${theme === 'dark' ? 'bg-[#292a2d]' : 'bg-white'}
        `}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
      >
        {/* Header */}
        <div className={`
          p-6 border-b
          ${theme === 'dark' ? 'border-[#3c4043]' : 'border-[#dadce0]'}
        `}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className={`text-xl font-medium mb-1 ${
                theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
              }`}>
                {booking.eventName || 'Booking Details'}
              </h3>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
              }`}>
                Complete information
              </p>
            </div>
            <button
              onClick={onClose}
              className={`
                p-2 rounded-lg transition-colors
                ${theme === 'dark'
                  ? 'hover:bg-[#3c4043] text-[#9aa0a6]'
                  : 'hover:bg-[#f1f3f4] text-[#5f6368]'
                }
              `}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <InfoSection title="Guest Information" icon={<User size={18} />} theme={theme}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoItem icon={<User size={14} />} label="Name" value={booking.name} theme={theme} />
              <InfoItem icon={<Users size={14} />} label="Society" value={booking.societyName} theme={theme} />
              <InfoItem icon={<Mail size={14} />} label="Email" value={booking.email} theme={theme} />
              <InfoItem icon={<Phone size={14} />} label="Contact" value={booking.contact} theme={theme} />
            </div>
          </InfoSection>

          <InfoSection title="Location" icon={<Building2 size={18} />} theme={theme}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoItem icon={<Building2 size={14} />} label="Hall" value={booking.hall} theme={theme} />
              <InfoItem icon={<MapPin size={14} />} label="Room" value={`Room ${booking.roomNo}`} theme={theme} />
            </div>
          </InfoSection>

          <InfoSection title="Schedule" icon={<Clock size={18} />} theme={theme}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <InfoItem 
                icon={<CalendarIcon size={14} />} 
                label="Check-in" 
                value={`${new Date(booking.checkInDate).toLocaleDateString()} ${booking.checkInTime}`} 
                theme={theme} 
              />
              <InfoItem 
                icon={<CalendarIcon size={14} />} 
                label="Check-out" 
                value={`${new Date(booking.checkOutDate).toLocaleDateString()} ${booking.checkOutTime}`} 
                theme={theme} 
              />
            </div>
          </InfoSection>

          {booking.purpose && (
            <div>
              <h4 className={`text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
              }`}>
                Purpose
              </h4>
              <div className={`p-3 rounded-lg ${
                theme === 'dark' ? 'bg-[#3c4043]' : 'bg-[#f8f9fa]'
              }`}>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
                }`}>
                  {booking.purpose}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`
          p-6 border-t
          ${theme === 'dark' ? 'border-[#3c4043]' : 'border-[#dadce0]'}
        `}>
          <button
            onClick={onClose}
            className={`
              w-full py-2 rounded-lg text-sm font-medium transition-colors
              ${theme === 'dark'
                ? 'bg-[#3c4043] hover:bg-[#4a4d50] text-[#e8eaed]'
                : 'bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124]'
              }
            `}
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function InfoSection({ title, icon, children, theme }) {
  return (
    <div>
      <h4 className={`text-sm font-medium mb-3 flex items-center gap-2 ${
        theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
      }`}>
        {icon}
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoItem({ icon, label, value, theme }) {
  return (
    <div className={`p-3 rounded-lg ${
      theme === 'dark' ? 'bg-[#3c4043]' : 'bg-[#f8f9fa]'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        <span className={theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'}>
          {icon}
        </span>
        <span className={`text-xs ${
          theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
        }`}>
          {label}
        </span>
      </div>
      <p className={`text-sm font-medium ml-6 ${
        theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
      }`}>
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

  const allBookings = useMemo(() => {
    if (!hallData) return [];
    
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
    
    return bookings;
  }, [hallData]);

  const bookingsForSelectedDate = useMemo(() => {
    return allBookings.filter(booking => {
      const checkIn = new Date(booking.checkInDate);
      const checkOut = new Date(booking.checkOutDate);
      
      const bookingDate = new Date(selectedDate);
      bookingDate.setHours(0, 0, 0, 0);
      checkIn.setHours(0, 0, 0, 0);
      checkOut.setHours(0, 0, 0, 0);
      
      return bookingDate >= checkIn && bookingDate <= checkOut;
    });
  }, [allBookings, selectedDate]);

  const filteredBookings = useMemo(() => {
    let result = bookingsForSelectedDate;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(booking =>
        booking.name?.toLowerCase().includes(query) ||
        booking.eventName?.toLowerCase().includes(query) ||
        booking.societyName?.toLowerCase().includes(query)
      );
    }

    if (selectedHall !== 'all') {
      result = result.filter(booking => booking.hall === selectedHall);
    }

    return result;
  }, [bookingsForSelectedDate, searchQuery, selectedHall]);

  const hallOptions = useMemo(() => {
    return Object.keys(hallData || {});
  }, [hallData]);

  const handleDateSelect = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' ? 'bg-[#202124]' : 'bg-[#f8f9fa]'
    }`}>
      {/* Header */}
      <header className={`
        border-b transition-colors duration-200
        ${theme === 'dark' ? 'bg-[#292a2d] border-[#3c4043]' : 'bg-white border-[#dadce0]'}
      `}>
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
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
                  Hall Booking Calendar
                </h1>
                <p className={`text-sm ${
                  theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
                }`}>
                  {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} on {selectedDate.toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <GoogleCalendar
              bookings={allBookings}
              theme={theme}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
          </div>

          {/* Bookings List */}
          <div className="lg:col-span-1">
            <div className={`
              rounded-lg p-6 border transition-colors duration-200
              ${theme === 'dark' ? 'bg-[#292a2d] border-[#3c4043]' : 'bg-white border-[#dadce0]'}
            `}>
              <h3 className={`text-base font-medium mb-4 ${
                theme === 'dark' ? 'text-[#e8eaed]' : 'text-[#202124]'
              }`}>
                Bookings for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </h3>

              {/* Search */}
              <div className="mb-4">
                <div className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg border
                  ${theme === 'dark' ? 'bg-[#3c4043] border-[#3c4043]' : 'bg-[#f8f9fa] border-[#dadce0]'}
                `}>
                  <Search size={16} className={theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'} />
                  <input
                    type="text"
                    placeholder="Search bookings..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`
                      flex-1 bg-transparent text-sm outline-none
                      ${theme === 'dark' ? 'text-[#e8eaed] placeholder-[#9aa0a6]' : 'text-[#202124] placeholder-[#5f6368]'}
                    `}
                  />
                </div>
              </div>

              {/* Hall Filter */}
              {hallOptions.length > 0 && (
                <div className="mb-4">
                  <select
                    value={selectedHall}
                    onChange={(e) => setSelectedHall(e.target.value)}
                    className={`
                      w-full px-3 py-2 rounded-lg border text-sm
                      ${theme === 'dark'
                        ? 'bg-[#3c4043] border-[#3c4043] text-[#e8eaed]'
                        : 'bg-[#f8f9fa] border-[#dadce0] text-[#202124]'
                      }
                    `}
                  >
                    <option value="all">All Halls</option>
                    {hallOptions.map(hall => (
                      <option key={hall} value={hall}>{hall}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Bookings List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredBookings.length === 0 ? (
                  <div className={`text-center py-8 ${
                    theme === 'dark' ? 'text-[#9aa0a6]' : 'text-[#5f6368]'
                  }`}>
                    <CalendarIcon size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No bookings for this date</p>
                  </div>
                ) : (
                  filteredBookings.map((booking, index) => (
                    <BookingCard
                      key={index}
                      booking={booking}
                      theme={theme}
                      onClick={() => setSelectedBooking(booking)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

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