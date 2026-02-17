import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, Download, Filter, Search, Calendar,
  Users, Clock, FileText, XCircle, User, Phone, Mail, 
  Building2, CheckCircle, DollarSign, MapPin, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Guest Details Modal Component
function GuestDetailsModal({ guest, onClose, theme = "light" }) {
  if (!guest) return null;

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
          className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg md:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto`}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-4 md:p-6 rounded-t-lg md:rounded-t-2xl z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                {guest.profilePicture ? (
                  <img
                    src={guest.profilePicture}
                    alt={guest.guest}
                    className="w-12 md:w-16 h-12 md:h-16 rounded-full border-4 border-white/30"
                  />
                ) : (
                  <div className="w-12 md:w-16 h-12 md:h-16 rounded-full bg-white/20 flex items-center justify-center">
                    <User size={24} className="md:w-8 md:h-8 text-white/70" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg md:text-2xl font-bold">{guest.guest}</h2>
                  <p className="text-red-100 text-xs md:text-sm">{guest.rollno || "—"}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:bg-white/20 rounded-full p-1 md:p-2 transition ml-auto md:ml-0"
              >
                <X size={20} className="md:w-6 md:h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {/* Status Badge */}
            {guest.status === "cancelled" && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 md:p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <XCircle size={18} className="text-red-600 w-4 h-4 md:w-5 md:h-5" />
                  <p className="font-semibold text-red-800 text-sm md:text-base">Booking Cancelled</p>
                </div>
                {guest.cancelRemarks && (
                  <p className="text-xs md:text-sm text-red-600 mt-2">{guest.cancelRemarks}</p>
                )}
              </div>
            )}

            {/* Guest Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="space-y-4">
                <h3 className={`text-base md:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                  <User size={18} className="text-red-600 w-4 h-4 md:w-5 md:h-5" />
                  Guest Information
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 mb-1">Department</p>
                    <p className={`font-semibold text-sm md:text-base ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                      {guest.department || "—"}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 mb-1">Contact</p>
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="md:w-4 md:h-4 text-gray-400" />
                      <p className={`font-semibold text-sm md:text-base ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                        {guest.contact}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 mb-1">Email</p>
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="md:w-4 md:h-4 text-gray-400" />
                      <p className={`font-semibold text-xs md:text-sm ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'} break-all`}>
                        {guest.email}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs md:text-sm text-gray-500 mb-1">Location</p>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="md:w-4 md:h-4 text-gray-400" />
                      <p className={`font-semibold text-sm md:text-base ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                        {guest.city || "—"}, {guest.state || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className={`text-base md:text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                  <Building2 size={18} className="text-red-600 w-4 h-4 md:w-5 md:h-5" />
                  Accommodation Details
                </h3>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 mb-1">Hostel</p>
                    <p className={`font-semibold text-sm md:text-base ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                      {guest.hostel}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 mb-1">Room Number</p>
                    <p className={`font-semibold text-sm md:text-base ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                      {guest.roomNo}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-xs md:text-sm text-gray-500 mb-1">Purpose</p>
                    <p className={`font-semibold text-sm md:text-base ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
                      {guest.purpose || "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stay Duration */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-lg md:rounded-xl p-3 md:p-5 border border-red-200">
              <h3 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Clock size={18} className="text-red-600 w-4 h-4 md:w-5 md:h-5" />
                Stay Duration
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm">
                  <p className="text-xs md:text-sm text-gray-500 mb-2">Check-in</p>
                  <p className="font-bold text-sm md:text-base text-gray-900">{formatDate(guest.from)}</p>
                  <p className="text-xs md:text-sm text-red-600 mt-1">{guest.checkInTime || "00:00"}</p>
                </div>
                
                <div className="bg-white rounded-lg p-3 md:p-4 shadow-sm">
                  <p className="text-xs md:text-sm text-gray-500 mb-2">Check-out</p>
                  <p className="font-bold text-sm md:text-base text-gray-900">{formatDate(guest.to)}</p>
                  <p className="text-xs md:text-sm text-red-600 mt-1">{guest.checkOutTime || "23:59"}</p>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg md:rounded-xl p-3 md:p-5 border border-green-200">
              <h3 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <DollarSign size={18} className="text-green-600 w-4 h-4 md:w-5 md:h-5" />
                Payment Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
                <div>
                  <p className="text-xs md:text-sm text-gray-500 mb-1">Amount</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">₹{guest.amount || 0}</p>
                </div>
                
                <div>
                  <p className="text-xs md:text-sm text-gray-500 mb-1">Payment Type</p>
                  <p className="font-semibold text-sm md:text-base text-gray-900">{guest.paymentType || "Free"}</p>
                </div>
                
                <div>
                  <p className="text-xs md:text-sm text-gray-500 mb-1">Status</p>
                  <span className={`inline-flex items-center gap-1 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold ${
                    guest.paymentStatus === 'Completed' || Number(guest.paidAmount || 0) >= Number(guest.amount || 0)
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {guest.paymentStatus === 'Completed' || Number(guest.paidAmount || 0) >= Number(guest.amount || 0) ? (
                      <CheckCircle size={16} />
                    ) : (
                      <Clock size={16} />
                    )}
                    {guest.paymentStatus === 'Completed' || Number(guest.paidAmount || 0) >= Number(guest.amount || 0) ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className={`sticky bottom-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} p-3 md:p-4 rounded-b-lg md:rounded-b-2xl border-t`}>
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-2 md:py-3 rounded-lg md:rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition shadow-lg text-sm md:text-base"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Guest List Item Component
function GuestListItem({ guest, onViewDetails, theme = "light" }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const isPaid = guest.paymentStatus === 'Completed' || (guest.paidAmount && Number(guest.paidAmount || 0) >= Number(guest.amount || 0));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg md:rounded-xl shadow-md hover:shadow-xl transition p-3 md:p-6 border-l-4`}
      style={{ borderLeftColor: guest.status === 'cancelled' ? '#DC2626' : '#EF4444' }}
    >
      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-0">
        <div className="flex items-center gap-3 md:gap-4 flex-1 w-full">
          {guest.profilePicture ? (
            <img
              src={guest.profilePicture}
              alt={guest.guest}
              className="w-12 md:w-16 h-12 md:h-16 rounded-full border-4 border-red-100 flex-shrink-0"
            />
          ) : (
            <div className="w-12 md:w-16 h-12 md:h-16 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <User size={24} className="md:w-8 md:h-8 text-red-400" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className={`text-base md:text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate`}>
                {guest.guest}
              </h3>
              {guest.status === 'cancelled' && (
                <span className="px-2 md:px-3 py-0.5 md:py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                  CANCELLED
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-4 text-xs md:text-sm mb-2">
              <div>
                <p className="text-gray-500">Dept</p>
                <p className={`font-semibold truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  {guest.department || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Roll</p>
                <p className={`font-semibold truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  {guest.rollno || "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Hostel</p>
                <p className={`font-semibold truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  {guest.hostel}
                </p>
              </div>
              <div>
                <p className="text-gray-500">Room</p>
                <p className={`font-semibold truncate ${theme === 'dark' ? 'text-gray-200' : 'text-gray-900'}`}>
                  {guest.roomNo}
                </p>
              </div>
            </div>

            <div className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 mt-2 text-xs sm:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              <div className="flex items-center gap-1 md:gap-2">
                <Clock size={14} className="md:w-4 md:h-4 flex-shrink-0" />
                <span className="truncate">{formatDate(guest.from)} - {formatDate(guest.to)}</span>
              </div>
              <div className="flex items-center gap-1 md:gap-2">
                <Phone size={14} className="md:w-4 md:h-4 flex-shrink-0" />
                <span>{guest.contact}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-3 w-full md:w-auto md:ml-4">
          {/* Payment Status Badge */}
          <button
            className={`flex flex-col items-center justify-center px-3 md:px-4 py-2 md:py-3 rounded-lg md:rounded-xl font-bold text-xs md:text-sm transition shadow-md min-w-fit ${
              isPaid
                ? 'bg-gradient-to-br from-green-400 to-green-500 text-white hover:from-green-500 hover:to-green-600'
                : 'bg-gradient-to-br from-yellow-400 to-yellow-500 text-white hover:from-yellow-500 hover:to-yellow-600'
            }`}
            title="Click to view payment details"
          >
            <DollarSign size={18} className="md:w-6 md:h-6 mb-0.5" />
            <span>₹{guest.amount || 0}</span>
            <span className="text-xs mt-0.5">
              {isPaid ? 'PAID' : 'UNPAID'}
            </span>
          </button>

          {/* See Details Button */}
          <button
            onClick={() => onViewDetails(guest)}
            className="bg-gradient-to-r from-red-600 to-red-700 text-white px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold hover:from-red-700 hover:to-red-800 transition shadow-lg flex items-center justify-center gap-1 md:gap-2 text-sm md:text-base"
          >
            <FileText size={16} className="md:w-5 md:h-5" />
            <span className="hidden sm:inline">See Details</span>
            <span className="sm:hidden">Details</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// Main Calendar Guests Page Component
export default function CalendarGuestsPage({ 
  selectedDate: initialDate, 
  hostelData = {}, 
  completeHostelData = {},
  onBack,
  theme = "light",
  currentUser
}) {
  const user = currentUser;
  const role = user?.role || "caretaker";
  const userHostel = user?.assignedHostel || user?.hostel || null;
  
  const [selectedDate, setSelectedDate] = useState(initialDate || new Date());
  const [activeTab, setActiveTab] = useState('active');
  const [selectedHostel, setSelectedHostel] = useState(
    role === "caretaker" ? userHostel : 'All Hostels'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  console.log("📋 CalendarGuestsPage - User Info:", {
    role,
    userHostel,
    hasData: Object.keys(hostelData).length > 0
  });

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape" && onBack) {
        onBack();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onBack]);

  // ✅ Auto-select caretaker's hostel on mount
  useEffect(() => {
    if (role === "caretaker" && userHostel) {
      setSelectedHostel(userHostel);
      console.log(`🔒 Auto-selected hostel for caretaker: ${userHostel}`);
    }
  }, [role, userHostel]);

  // ============================================================================
  // ✅ FIXED: Caretaker can only see their assigned hostel's bookings
  // ============================================================================
  const allBookings = useMemo(() => {
    const dataSource = Object.keys(completeHostelData).length > 0 ? completeHostelData : hostelData;
    
    const bookings = [];
    Object.entries(dataSource).forEach(([hostelName, hostel]) => {
      // ✅ CRITICAL FIX: Caretakers can ONLY see their assigned hostel
      if (role === "caretaker") {
        if (!userHostel) {
          console.warn("⚠️ Caretaker has no assigned hostel");
          return; // Skip if no hostel assigned
        }
        if (hostelName !== userHostel) {
          return; // Skip other hostels
        }
      }

      (hostel.rooms || []).forEach(room => {
        (room.bookings || []).forEach(booking => {
          bookings.push({
            ...booking,
            hostel: hostelName,
            roomNo: room.roomNo
          });
        });
      });
    });

    console.log(`📊 Total bookings for ${role === 'caretaker' ? userHostel : 'all hostels'}:`, bookings.length);
  
  return bookings;
}, [hostelData, completeHostelData, role, userHostel]);

  // ============================================================================
  // ✅ FIXED: Hostel dropdown for caretakers
  // ============================================================================
  const hostels = useMemo(() => {
    const hostelNames = Object.keys(hostelData);
    
    // ✅ Caretakers can ONLY see their assigned hostel
    if (role === "caretaker") {
      if (!userHostel) {
        console.warn("⚠️ Caretaker has no assigned hostel");
        return [];
      }
      console.log(`🔒 Caretaker restricted to hostel: ${userHostel}`);
      return [userHostel]; // Only their hostel, no "All Hostels" option
    }
    
    // Admin and Manager can see all hostels
    console.log(`👑 ${role} can access all hostels`);
    return ['All Hostels', ...hostelNames];
  }, [hostelData, role, userHostel]);

  const formatDate = (date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Helper function to check if checkout date/time has passed
  const isCheckoutTimePassed = (guest) => {
    if (!guest.to) return false;
    
    const checkoutDate = new Date(guest.to);
    const checkoutTime = guest.checkOutTime || guest.actualCheckOutTime || '23:59';
    const [hours, minutes] = checkoutTime.split(':').map(Number);
    
    checkoutDate.setHours(hours || 23, minutes || 59, 0, 0);
    
    const now = new Date();
    return now > checkoutDate;
  };

  const filterGuestsByDate = useCallback((guest) => {
    const from = new Date(guest.from);
    const to = new Date(guest.to);
    const selected = new Date(selectedDate);

    from.setHours(0,0,0,0);
    to.setHours(0,0,0,0);
    selected.setHours(0,0,0,0);

    // ✅ CANCELLED TAB: Show all cancelled bookings
    if (activeTab === 'cancelled') {
      return guest.status === 'cancelled';
    }

    // ✅ Exclude cancelled bookings from other tabs
    if (guest.status === 'cancelled') {
      return false;
    }

    // ✅ ACTIVE TAB: Only show checked_in or booked guests within date range AND checkout time hasn't passed
    if (activeTab === 'active') {
      // If checkout time has passed, don't show in active tab
      if (isCheckoutTimePassed(guest)) {
        return false;
      }
      const isWithinDateRange = selected >= from && selected <= to;
      const isActiveStatus = guest.status === 'checked_in' || 
                            (guest.status === 'booked' && guest.reportedStatus !== 'not_reported');
      return isWithinDateRange && isActiveStatus;
    }

    // ✅ UPCOMING TAB: Show booked guests with future check-in dates
    if (activeTab === 'upcoming') {
      const isFutureBooking = from > selected;
      const isBookedStatus = guest.status === 'booked' && guest.reportedStatus !== 'not_reported';
      return isFutureBooking && isBookedStatus;
    }

    // ✅ PAST TAB: Show checked_out, no_show guests, past bookings, OR guests whose checkout time has passed
    if (activeTab === 'past') {
      // If checkout time has passed, show in past tab
      if (isCheckoutTimePassed(guest)) {
        return true;
      }
      const isPastDate = to < selected;
      const isCompletedStatus = guest.status === 'checked_out' || 
                               guest.status === 'no_show' ||
                               guest.reportedStatus === 'not_reported';
      return isPastDate || isCompletedStatus;
    }

    return false;
  }, [activeTab, selectedDate]);

  const filteredGuests = useMemo(() => {
    return allBookings.filter(guest => {
      const matchesDate = filterGuestsByDate(guest);
      
      // ✅ Hostel filter logic
      let matchesHostel = true;
      if (role === "caretaker") {
        // Caretakers can ONLY see their hostel
        matchesHostel = guest.hostel === userHostel;
      } else {
        // Admin/Manager can filter by selected hostel
        matchesHostel = selectedHostel === 'All Hostels' || guest.hostel === selectedHostel;
      }
      
      const matchesSearch = guest.guest?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          guest.rollno?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesDate && matchesHostel && matchesSearch;
    });
  }, [allBookings, filterGuestsByDate, selectedHostel, searchQuery, role, userHostel]);

  // Pagination logic
  const paginatedGuests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredGuests.slice(startIndex, endIndex);
  }, [filteredGuests, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedDate, selectedHostel, searchQuery]);

  const handleGuestClick = (guest) => {
    setSelectedGuest(guest);
    setShowGuestModal(true);
  };

  const handleDownload = () => {
    // ✅ FIX: Only check if there's data WHEN download is clicked
    if (filteredGuests.length === 0) {
      alert("No data to download for the selected filters");
      return; // ✅ CRITICAL: Stop execution here
    }

    const csvData = filteredGuests.map(g => ({
      Name: g.guest || '',
      'Roll No': g.rollno || '',
      Hostel: g.hostel || '',
      Room: g.roomNo || '',
      'Check-in': g.from || '',
      'Check-out': g.to || '',
      Department: g.department || '',
      Contact: g.contact || '',
      Email: g.email || '',
      'Payment Status': (g.paymentStatus === 'Completed' || g.paidAmount >= g.amount) ? 'Paid' : 'Unpaid',
      Amount: g.amount || 0,
      Status: g.status || ''
    }));

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `guests_${formatDate(selectedDate).replace(/\s/g, '_')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  // ============================================================================
  // ✅ FIXED: Tab counts with caretaker restrictions - uses same logic as filterGuestsByDate
  // ============================================================================
  const getTabCount = (tabId) => {
    return allBookings.filter(g => {
      // ✅ Apply hostel filter with role-based logic
      let matchesHostel = true;
      if (role === "caretaker") {
        // Caretakers can ONLY see their hostel
        matchesHostel = g.hostel === userHostel;
      } else {
        // Admin/Manager can filter by selected hostel
        matchesHostel = selectedHostel === 'All Hostels' || g.hostel === selectedHostel;
      }
      
      if (!matchesHostel) return false;

      // ✅ CANCELLED: All cancelled bookings
      if (tabId === 'cancelled') {
        return g.status === 'cancelled';
      }
      
      if (g.status === 'cancelled') return false;

      const from = new Date(g.from);
      const to = new Date(g.to);
      const selected = new Date(selectedDate);
      from.setHours(0,0,0,0);
      to.setHours(0,0,0,0);
      selected.setHours(0,0,0,0);

      // ✅ ACTIVE TAB: Same logic as filterGuestsByDate
      if (tabId === 'active') {
        // If checkout time has passed, don't count in active tab
        if (isCheckoutTimePassed(g)) {
          return false;
        }
        const isWithinDateRange = selected >= from && selected <= to;
        const isActiveStatus = g.status === 'checked_in' || 
                              (g.status === 'booked' && g.reportedStatus !== 'not_reported');
        return isWithinDateRange && isActiveStatus;
      }

      // ✅ UPCOMING TAB: Same logic as filterGuestsByDate
      if (tabId === 'upcoming') {
        const isFutureBooking = from > selected;
        const isBookedStatus = g.status === 'booked' && g.reportedStatus !== 'not_reported';
        return isFutureBooking && isBookedStatus;
      }

      // ✅ PAST TAB: Same logic as filterGuestsByDate
      if (tabId === 'past') {
        // If checkout time has passed, count in past tab
        if (isCheckoutTimePassed(g)) {
          return true;
        }
        const isPastDate = to < selected;
        const isCompletedStatus = g.status === 'checked_out' || 
                                 g.status === 'no_show' ||
                                 g.reportedStatus === 'not_reported';
        return isPastDate || isCompletedStatus;
      }

      return false;
    }).length;
  };

  return (
    <div className={`w-full min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-4 flex-1">
              <button
                onClick={handleBack}
                className="p-1 md:p-2 hover:bg-white/20 rounded-lg transition"
              >
                <ArrowLeft size={20} className="md:w-6 md:h-6" />
              </button>
              <div>
                <h1 className="text-lg md:text-3xl font-bold">Guest Management</h1>
                <p className="text-red-100 mt-1 text-xs md:text-sm">
                  <Calendar size={16} className="inline mr-2" />
                  {formatDate(selectedDate)}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 bg-white text-red-600 px-3 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl font-semibold hover:bg-red-50 transition shadow-lg text-sm md:text-base"
            >
              <Download size={18} className="md:w-5 md:h-5" />
              <span className="hidden sm:inline">Download Report</span>
              <span className="sm:hidden">Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md border-b ${theme === 'dark' ? 'border-gray-700' : ''}`}>
        <div className="max-w-7xl mx-auto px-3 md:px-6 py-3 md:py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {/* Date Picker */}
            <div>
              <label className={`block text-xs md:text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                Select Date
              </label>
              <input
                type="date"
                value={selectedDate.toISOString().split('T')[0]}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className={`w-full border-2 rounded-lg px-3 md:px-4 py-2 text-sm focus:ring-2 focus:ring-red-200 transition ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:border-red-500' : 'bg-white border-gray-300 focus:border-red-500'}`}
              />
            </div>

            {/* Hostel Filter */}
            <div>
              <label className={`block text-xs md:text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                <Filter size={14} className="md:w-4 md:h-4 inline mr-1" />
                {role === "caretaker" ? "Your Hostel" : "Filter by Hostel"}
              </label>
              <select
                value={selectedHostel}
                onChange={(e) => setSelectedHostel(e.target.value)}
                disabled={role === "caretaker"} // ✅ Disable for caretakers
                className={`w-full border-2 rounded-lg px-3 md:px-4 py-2 text-sm focus:ring-2 focus:ring-red-200 transition ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white focus:border-red-500' : 'bg-white border-gray-300 focus:border-red-500'} ${role === "caretaker" ? 'opacity-75 cursor-not-allowed' : ''}`}
              >
                {hostels.length > 0 ? (
                  hostels.map(hostel => (
                    <option key={hostel} value={hostel}>{hostel}</option>
                  ))
                ) : (
                  <option>No hostel assigned</option>
                )}
              </select>
              {role === "caretaker" && (
                <p className="text-xs text-gray-500 mt-1">
                  🔒 You can only view your assigned hostel
                </p>
              )}
            </div>

            {/* Search */}
            <div>
              <label className={`block text-xs md:text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                <Search size={14} className="md:w-4 md:h-4 inline mr-1" />
                Search Guest
              </label>
              <input
                type="text"
                placeholder="Name or Roll No..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border-2 rounded-lg px-3 md:px-4 py-2 text-sm focus:ring-2 focus:ring-red-200 transition ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500' : 'bg-white border-gray-300 focus:border-red-500'}`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6">
          <div className={`flex flex-wrap gap-1 sm:gap-2 md:gap-3 border-b ${theme === 'dark' ? 'border-gray-700' : ''}`}>
            {[
              { id: 'active', label: 'Active Guests', short: 'Active', icon: Users },
              { id: 'upcoming', label: 'Upcoming Guests', short: 'Upcoming', icon: Clock },
              { id: 'past', label: 'Past Guests', short: 'Past', icon: FileText },
              { id: 'cancelled', label: 'Cancelled Bookings', short: 'Cancelled', icon: XCircle }
            ].map(tab => {
              const Icon = tab.icon;
              const count = getTabCount(tab.id);
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1 sm:gap-1.5 md:gap-2 px-2 sm:px-3 md:px-6 py-2 sm:py-3 md:py-4 font-semibold text-xs sm:text-sm md:text-base transition border-b-3 flex-shrink-0 ${
                    activeTab === tab.id
                      ? 'border-red-600 text-red-600 bg-red-50'
                      : theme === 'dark'
                        ? 'border-transparent text-gray-400 hover:text-red-400 hover:bg-gray-700'
                        : 'border-transparent text-gray-600 hover:text-red-600 hover:bg-red-50'
                  }`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.short}</span>
                  <span className={`ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 rounded-full text-xs font-bold ${
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

      {/* Guest List */}
      <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-6">
        {filteredGuests.length === 0 ? (
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg md:rounded-2xl shadow-lg p-6 md:p-12 text-center`}>
            <Users className={`w-12 md:w-16 h-12 md:h-16 mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className={`text-lg md:text-xl font-bold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              No Guests Found
            </h3>
            <p className={`text-sm md:text-base ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              No guests match your filters for {formatDate(selectedDate)}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {paginatedGuests.map((guest, index) => (
                <GuestListItem 
                  key={guest._id || guest.id || `${guest.hostel}-${guest.roomNo}-${guest.from}-${index}`} 
                  guest={guest} 
                  onViewDetails={handleGuestClick}
                  theme={theme}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className={`mt-4 md:mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-lg md:rounded-xl shadow-md p-3 md:p-4`}>
                <div className={`text-xs md:text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredGuests.length)} of {filteredGuests.length} guests
                </div>
                <div className="flex items-center gap-1 md:gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className={`px-2 md:px-4 py-1 md:py-2 rounded-lg font-semibold transition text-sm md:text-base ${
                      currentPage === 1
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : theme === 'dark'
                          ? 'bg-gray-700 text-white hover:bg-gray-600'
                          : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    <span className="hidden sm:inline">Previous</span>
                    <span className="sm:hidden">←</span>
                  </button>
                  
                  <div className="flex items-center gap-0.5 md:gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 md:w-10 h-8 md:h-10 rounded-lg font-semibold transition text-sm ${
                              currentPage === page
                                ? theme === 'dark'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-600 text-white'
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
                          <span key={page} className={`px-1 md:px-2 text-xs md:text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
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
                    className={`px-2 md:px-4 py-1 md:py-2 rounded-lg font-semibold transition text-sm md:text-base ${
                      currentPage === totalPages
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : theme === 'dark'
                          ? 'bg-gray-700 text-white hover:bg-gray-600'
                          : 'bg-red-600 text-white hover:bg-red-700'
                    }`}
                  >
                    <span className="hidden sm:inline">Next</span>
                    <span className="sm:hidden">→</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Guest Details Modal */}
      {showGuestModal && selectedGuest && (
        <GuestDetailsModal 
          guest={selectedGuest} 
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