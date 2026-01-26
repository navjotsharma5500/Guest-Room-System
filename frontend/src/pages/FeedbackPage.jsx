// src/pages/FeedbackPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Star, Search, Calendar, Filter, User, Phone, Mail,
  Building2, MapPin, X, Upload, Trash2, FileText, TrendingUp,
  Award, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL } from '../utils/apiConfig';
import IKUpload from '../components/IKUpload';

const API = BACKEND_URL;

// Rating configurations
const RATING_CONFIG = {
  1: { label: 'Poor', description: 'Violated major hostel policies', color: 'red' },
  2: { label: 'Below Average', description: 'Left a very messy room', color: 'orange' },
  3: { label: 'Average', description: 'Fair', color: 'yellow' },
  4: { label: 'Good', description: 'Generally respectful', color: 'blue' },
  5: { label: 'Outstanding', description: 'Clean', color: 'green' }
};

// Feedback Modal Component
function FeedbackModal({ guest, onClose, onSubmit, existingFeedback, theme }) {
  const [rating, setRating] = useState(existingFeedback?.rating || 0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [remarks, setRemarks] = useState(existingFeedback?.remarks || '');
  const [attachments, setAttachments] = useState(existingFeedback?.attachments || []);
  const [submitting, setSubmitting] = useState(false);

  const currentRating = hoveredRating || rating;
  const ratingInfo = RATING_CONFIG[currentRating] || null;

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        bookingId: guest._id || guest.id,
        rating,
        remarks,
        attachments
      });
      onClose();
    } catch (err) {
      alert('Failed to submit feedback: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileUpload = (url) => {
    if (attachments.length >= 5) {
      alert('Maximum 5 attachments allowed');
      return;
    }
    setAttachments([...attachments, url]);
  };

  const removeAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
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
          className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto`}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6 rounded-t-2xl z-10 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Star size={24} />
                Rate Guest Experience
              </h2>
              <p className="text-purple-100 text-sm mt-1">{guest.guest} - Room {guest.roomNo}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-2 transition"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Star Rating */}
            <div className="text-center">
              <p className="text-lg font-semibold mb-4">How would you rate this guest?</p>
              <div className="flex justify-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none transition"
                  >
                    <Star
                      size={48}
                      className={`${
                        star <= currentRating
                          ? `fill-${RATING_CONFIG[currentRating]?.color}-500 text-${RATING_CONFIG[currentRating]?.color}-500`
                          : 'fill-gray-300 text-gray-300'
                      } transition-all duration-200`}
                      style={{
                        fill: star <= currentRating ? 
                          (currentRating === 5 ? '#10b981' :
                           currentRating === 4 ? '#3b82f6' :
                           currentRating === 3 ? '#eab308' :
                           currentRating === 2 ? '#f97316' : '#ef4444') : '#d1d5db',
                        color: star <= currentRating ? 
                          (currentRating === 5 ? '#10b981' :
                           currentRating === 4 ? '#3b82f6' :
                           currentRating === 3 ? '#eab308' :
                           currentRating === 2 ? '#f97316' : '#ef4444') : '#d1d5db'
                      }}
                    />
                  </motion.button>
                ))}
              </div>

              {ratingInfo && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`inline-flex flex-col items-center gap-2 px-6 py-3 rounded-xl ${
                    currentRating === 5 ? 'bg-green-100 text-green-800' :
                    currentRating === 4 ? 'bg-blue-100 text-blue-800' :
                    currentRating === 3 ? 'bg-yellow-100 text-yellow-800' :
                    currentRating === 2 ? 'bg-orange-100 text-orange-800' :
                    'bg-red-100 text-red-800'
                  }`}
                >
                  <span className="font-bold text-lg">{ratingInfo.label}</span>
                  <span className="text-sm">{ratingInfo.description}</span>
                </motion.div>
              )}
            </div>

            {/* Remarks */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Remarks (Optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any additional comments about the guest's stay..."
                rows={4}
                className={`w-full border-2 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-200 transition ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-purple-500' 
                    : 'bg-white border-gray-300 focus:border-purple-500'
                }`}
              />
            </div>

            {/* Attachments */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Attachments (Optional - Max 5)
              </label>
              
              {attachments.length < 5 && (
                <IKUpload
                  onSuccess={handleFileUpload}
                  folder="feedback-attachments"
                  buttonText="Upload Image"
                  buttonClassName="w-full"
                />
              )}

              {attachments.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mt-3">
                  {attachments.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Attachment ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-gray-300"
                      />
                      <button
                        onClick={() => removeAttachment(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className={`sticky bottom-0 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-b-2xl border-t flex justify-end gap-3`}>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              {submitting ? 'Submitting...' : existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Guest Feedback Card Component
function GuestFeedbackCard({ guest, onRate, existingFeedback, theme }) {
  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md hover:shadow-xl transition p-6 border-l-4 border-purple-500`}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Star Rating Section */}
        <div className="flex flex-col items-center justify-center min-w-[120px]">
          {existingFeedback ? (
            <>
              <div className="flex gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    className={star <= existingFeedback.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-300 text-gray-300'}
                  />
                ))}
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                existingFeedback.rating === 5 ? 'bg-green-100 text-green-800' :
                existingFeedback.rating === 4 ? 'bg-blue-100 text-blue-800' :
                existingFeedback.rating === 3 ? 'bg-yellow-100 text-yellow-800' :
                existingFeedback.rating === 2 ? 'bg-orange-100 text-orange-800' :
                'bg-red-100 text-red-800'
              }`}>
                {RATING_CONFIG[existingFeedback.rating]?.label}
              </span>
            </>
          ) : (
            <button
              onClick={() => onRate(guest)}
              className="flex flex-col items-center gap-2 px-4 py-3 bg-purple-100 hover:bg-purple-200 rounded-lg transition group"
            >
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={20}
                    className="fill-gray-300 text-gray-300 group-hover:fill-yellow-400 group-hover:text-yellow-400 transition"
                  />
                ))}
              </div>
              <span className="text-xs font-bold text-purple-700">Rate Guest</span>
            </button>
          )}
        </div>

        {/* Guest Details */}
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            {guest.profilePicture ? (
              <img
                src={guest.profilePicture}
                alt={guest.guest}
                className="w-12 h-12 rounded-full border-4 border-purple-100"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <User size={24} className="text-purple-400" />
              </div>
            )}
            <div>
              <h3 className={`text-lg font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                {guest.guest}
              </h3>
              <p className="text-sm text-gray-500">{guest.rollno || "—"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Building2 size={16} className="text-purple-500" />
              <span>{guest.hostel}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-red-500" />
              <span>Room {guest.roomNo}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-blue-500" />
              <span>{guest.contact}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-green-500" />
              <span className="truncate text-xs">{guest.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-orange-500" />
              <span>{formatDate(guest.checkedOutAt || guest.to)}</span>
            </div>
          </div>

          {existingFeedback?.remarks && (
            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-sm italic text-gray-700">"{existingFeedback.remarks}"</p>
            </div>
          )}

          {existingFeedback?.attachments?.length > 0 && (
            <div className="mt-3 flex gap-2 flex-wrap">
              {existingFeedback.attachments.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-16 h-16"
                >
                  <img
                    src={url}
                    alt={`Attachment ${idx + 1}`}
                    className="w-full h-full object-cover rounded border-2 border-gray-300 hover:border-purple-500 transition"
                  />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Edit Button for existing feedback */}
        {existingFeedback && (
          <button
            onClick={() => onRate(guest)}
            className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition text-sm font-medium"
          >
            Edit
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Main Feedback Page Component
export default function FeedbackPage({ onBack, theme = "light" }) {
  const { currentUser } = useAuth();
  const role = currentUser?.role || "caretaker";
  const userHostel = currentUser?.assignedHostel || currentUser?.hostel || null;

  const [checkedOutGuests, setCheckedOutGuests] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedGuest, setSelectedGuest] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHostel, setSelectedHostel] = useState(role === 'caretaker' ? userHostel : 'All');
  const [dateFilter, setDateFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('All');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch checked-out guests
  const fetchCheckedOutGuests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API}/api/bookings/all-for-download`, {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!response.ok) throw new Error('Failed to fetch bookings');

      const data = await response.json();
      
      if (data.success) {
        const allBookings = [];
        Object.values(data.hostels).forEach(hostel => {
          hostel.rooms.forEach(room => {
            room.bookings.forEach(booking => {
              if (booking.status === 'checked_out') {
                allBookings.push({
                  ...booking,
                  hostel: hostel.name,
                  roomNo: room.roomNo
                });
              }
            });
          });
        });

        // Filter by role
        const filteredBookings = role === 'caretaker'
          ? allBookings.filter(b => b.hostel === userHostel)
          : allBookings;

        setCheckedOutGuests(filteredBookings);
        console.log(`✅ Found ${filteredBookings.length} checked-out guests`);
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [role, userHostel]);

  // Fetch feedbacks
  const fetchFeedbacks = useCallback(async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(`${API}/api/feedback?limit=1000`, {
        method: "GET",
        credentials: "include",
        headers,
      });

      if (!response.ok) throw new Error('Failed to fetch feedbacks');

      const data = await response.json();
      
      if (data.success) {
        setFeedbacks(data.feedbacks || []);
        console.log(`✅ Found ${data.feedbacks?.length || 0} feedbacks`);
      }
    } catch (err) {
      console.error('❌ Fetch feedbacks error:', err);
    }
  }, []);

  useEffect(() => {
    fetchCheckedOutGuests();
    fetchFeedbacks();
  }, [fetchCheckedOutGuests, fetchFeedbacks]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && onBack) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onBack]);

  // Get feedback for a booking
  const getFeedbackForGuest = (guestId) => {
    return feedbacks.find(f => f.bookingId === guestId);
  };

  // Submit feedback
  const handleSubmitFeedback = async (feedbackData) => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      };

      const response = await fetch(`${API}/api/feedback`, {
        method: "POST",
        credentials: "include",
        headers,
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) throw new Error('Failed to submit feedback');

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ Feedback submitted:', data.feedback);
        await fetchFeedbacks(); // Refresh feedbacks
        alert(data.message);
      }
    } catch (err) {
      console.error('❌ Submit error:', err);
      throw err;
    }
  };

  // Filter guests
  const filteredGuests = useMemo(() => {
    return checkedOutGuests.filter(guest => {
      // Search filter
      const matchesSearch = !searchQuery || 
        guest.guest?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guest.contact?.includes(searchQuery) ||
        guest.email?.toLowerCase().includes(searchQuery.toLowerCase());

      // Hostel filter
      const matchesHostel = selectedHostel === 'All' || guest.hostel === selectedHostel;

      // Date filter
      const matchesDate = !dateFilter || 
        new Date(guest.checkedOutAt || guest.to).toISOString().split('T')[0] === dateFilter;

      // Rating filter
      let matchesRating = true;
      if (ratingFilter !== 'All') {
        const feedback = getFeedbackForGuest(guest._id || guest.id);
        if (ratingFilter === 'Unrated') {
          matchesRating = !feedback;
        } else {
          matchesRating = feedback?.rating === Number(ratingFilter);
        }
      }

      return matchesSearch && matchesHostel && matchesDate && matchesRating;
    });
  }, [checkedOutGuests, searchQuery, selectedHostel, dateFilter, ratingFilter]);

  // Pagination
  const paginatedGuests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredGuests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredGuests, currentPage]);

  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedHostel, dateFilter, ratingFilter]);

  // Get unique hostels
  const hostels = useMemo(() => {
    if (role === 'caretaker') return [userHostel];
    const unique = [...new Set(checkedOutGuests.map(g => g.hostel))];
    return ['All', ...unique];
  }, [checkedOutGuests, role, userHostel]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 to-blue-50'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-xl">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/20 rounded-lg transition"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Award size={32} />
                  Guest Feedback & Reviews
                </h1>
                <p className="text-purple-100 mt-1">Rate checked-out guests and track performance</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} shadow-md border-b`}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <Search size={16} className="inline mr-1" />
                Search
              </label>
              <input
                type="text"
                placeholder="Name, contact, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border-2 rounded-lg px-4 py-2 ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>

            {/* Hostel Filter */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <Building2 size={16} className="inline mr-1" />
                Hostel
              </label>
              <select
                value={selectedHostel}
                onChange={(e) => setSelectedHostel(e.target.value)}
                disabled={role === 'caretaker'}
                className={`w-full border-2 rounded-lg px-4 py-2 ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                } ${role === 'caretaker' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {hostels.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <Calendar size={16} className="inline mr-1" />
                Checkout Date
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={`w-full border-2 rounded-lg px-4 py-2 ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>

            {/* Rating Filter */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <Filter size={16} className="inline mr-1" />
                Rating
              </label>
              <select
                value={ratingFilter}
                onChange={(e) => setRatingFilter(e.target.value)}
                className={`w-full border-2 rounded-lg px-4 py-2 ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : 'bg-white border-gray-300'
                }`}
              >
                <option value="All">All Ratings</option>
                <option value="Unrated">Unrated</option>
                <option value="5">⭐⭐⭐⭐⭐ Outstanding</option>
                <option value="4">⭐⭐⭐⭐ Good</option>
                <option value="3">⭐⭐⭐ Average</option>
                <option value="2">⭐⭐ Below Average</option>
                <option value="1">⭐ Poor</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-purple-500`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Guests</p>
                <p className="text-2xl font-bold text-purple-600">{filteredGuests.length}</p>
              </div>
              <User size={32} className="text-purple-400" />
            </div>
          </div>
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-green-500`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Rated</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredGuests.filter(g => getFeedbackForGuest(g._id || g.id)).length}
                </p>
              </div>
              <Star size={32} className="text-green-400" />
            </div>
          </div>
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-orange-500`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unrated</p>
                <p className="text-2xl font-bold text-orange-600">
                  {filteredGuests.filter(g => !getFeedbackForGuest(g._id || g.id)).length}
                </p>
              </div>
              <AlertCircle size={32} className="text-orange-400" />
            </div>
          </div>
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-blue-500`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Avg Rating</p>
                <p className="text-2xl font-bold text-blue-600">
                  {(() => {
                    const ratings = filteredGuests
                      .map(g => getFeedbackForGuest(g._id || g.id)?.rating)
                      .filter(r => r);
                    return ratings.length > 0 
                      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
                      : '—';
                  })()}
                </p>
              </div>
              <TrendingUp size={32} className="text-blue-400" />
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
            <p className="text-gray-500">Loading guests feedback...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <p className="text-red-600 font-semibold">{error}</p>
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No checked-out guests found</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {paginatedGuests.map(guest => (
                <GuestFeedbackCard
                  key={guest._id || guest.id}
                  guest={guest}
                  onRate={(g) => {
                    setSelectedGuest(g);
                    setShowModal(true);
                  }}
                  existingFeedback={getFeedbackForGuest(guest._id || guest.id)}
                  theme={theme}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <span className={`px-4 py-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Feedback Modal */}
      {showModal && selectedGuest && (
        <FeedbackModal
          guest={selectedGuest}
          onClose={() => {
            setShowModal(false);
            setSelectedGuest(null);
          }}
          onSubmit={handleSubmitFeedback}
          existingFeedback={getFeedbackForGuest(selectedGuest._id || selectedGuest.id)}
          theme={theme}
        />
      )}
    </div>
  );
}