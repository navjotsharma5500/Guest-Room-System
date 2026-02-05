// src/pages/FeedbackPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Star, Search, Calendar, Filter, User, Phone, Mail,
  Building2, MapPin, X, Upload, Trash2, FileText, TrendingUp,
  Award, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { BACKEND_URL, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT, IMAGEKIT_AUTH_ENDPOINT } from '../utils/apiConfig';
import { IKContext, IKUpload } from 'imagekitio-react';

const API = BACKEND_URL;

const authenticator = async () => {
  try {
    const r = await fetch(IMAGEKIT_AUTH_ENDPOINT, { method: "GET" });
    if (!r.ok) throw new Error(`Auth request failed ${r.status}`);
    const data = await r.json();
    return {
      signature: data.signature,
      expire: data.expire,
      token: data.token,
      publicKey: data.publicKey,
    };
  } catch (err) {
    console.error("ImageKit authenticator error:", err);
    throw err;
  }
};

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
    <IKContext
      publicKey={IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={IMAGEKIT_URL_ENDPOINT}
      authenticator={authenticator}
    >
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
            {/* Star Rating - FIXED: Removed hover state to prevent fluctuation */}
            <div className="text-center">
              <p className="text-lg font-semibold mb-4">How would you rate this guest?</p>
              <div className="flex justify-center gap-3 mb-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                  >
                    <Star
                      size={48}
                      className="transition-colors duration-150"
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
                  </button>
                ))}
              </div>

              {/* FIXED: Rating info with fixed height to prevent layout shift */}
              <div className="min-h-[80px] flex items-center justify-center">
                {ratingInfo && (
                  <div
                    className={`inline-flex flex-col items-center gap-2 px-6 py-3 rounded-xl transition-colors duration-150 ${
                      currentRating === 5 ? 'bg-green-100 text-green-800' :
                      currentRating === 4 ? 'bg-blue-100 text-blue-800' :
                      currentRating === 3 ? 'bg-yellow-100 text-yellow-800' :
                      currentRating === 2 ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}
                  >
                    <p className="text-xl font-bold">{ratingInfo.label}</p>
                    <p className="text-sm">{ratingInfo.description}</p>
                  </div>
                )}
              </div>
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
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300'
                }`}
              />
            </div>

            {/* Attachments */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Attachments (Optional - Max 5)
              </label>
              
              {attachments.length < 5 && (
                <div className={`border-2 border-dashed rounded-lg p-4 text-center ${
                  theme === 'dark' ? 'border-gray-600' : 'border-gray-300'
                }`}>
                  <IKUpload
                    onSuccess={(res) => handleFileUpload(res.url)}
                    onError={(err) => console.error('Upload error:', err)}
                    folder="/feedback-attachments"
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto mb-2 text-purple-600" size={32} />
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                      Click to upload images or documents
                    </p>
                  </label>
                </div>
              )}

              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((url, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-2 rounded border ${
                      theme === 'dark' ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
                    }`}>
                      <a 
                        href={url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-purple-600 hover:underline truncate flex-1"
                      >
                        Attachment {idx + 1}
                      </a>
                      <button
                        onClick={() => removeAttachment(idx)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="flex-1 py-3 rounded-lg font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {submitting ? 'Submitting...' : existingFeedback ? 'Update Feedback' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </motion.div>
        </motion.div>
      </AnimatePresence>
    </IKContext>
  );
}

// Guest Feedback Card Component
function GuestFeedbackCard({ guest, onRate, existingFeedback, theme }) {
  const checkoutDate = guest.checkedOutAt 
    ? new Date(guest.checkedOutAt).toLocaleDateString()
    : new Date(guest.to).toLocaleDateString();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg border-2 ${
        existingFeedback 
          ? 'border-green-300' 
          : 'border-gray-200'
      } p-5 hover:shadow-xl transition-all duration-300`}
    >
      <div className="flex flex-col md:flex-row justify-between gap-4">
        {/* Guest Info */}
        <div className="flex-1 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {guest.guest}
              </h3>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                <Building2 size={14} />
                <span>{guest.hostel} - Room {guest.roomNo}</span>
              </div>
            </div>
            {existingFeedback && (
              <div className="flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">
                <Award size={14} />
                Rated
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Phone size={14} />
              <span>{guest.contact}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Mail size={14} />
              <span className="truncate">{guest.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar size={14} />
              <span>Checked out: {checkoutDate}</span>
            </div>
            {guest.department && (
              <div className="flex items-center gap-2 text-gray-600">
                <User size={14} />
                <span>{guest.department}</span>
              </div>
            )}
          </div>

          {/* Existing Rating Display */}
          {existingFeedback && (
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm font-semibold text-gray-700">Your Rating:</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={18}
                      className={star <= existingFeedback.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-300 text-gray-300'}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-purple-600">
                  {RATING_CONFIG[existingFeedback.rating]?.label}
                </span>
              </div>
              {existingFeedback.remarks && (
                <p className="text-sm text-gray-600 italic">"{existingFeedback.remarks}"</p>
              )}
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="flex items-center">
          <button
            onClick={() => onRate(guest)}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              existingFeedback
                ? theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                : 'bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-700 hover:to-purple-800 shadow-lg hover:shadow-xl'
            }`}
          >
            {existingFeedback ? 'Edit Rating' : 'Rate Guest'}
          </button>
        </div>
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

  // FIXED: Fetch checked-out guests - now includes auto-checked-out guests
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
        const now = new Date();
        
        Object.values(data.hostels).forEach(hostel => {
          hostel.rooms.forEach(room => {
            room.bookings.forEach(booking => {
              // FIXED: Include both manually checked out AND auto-checked-out guests
              const isManuallyCheckedOut = booking.status === 'checked_out';
              
              // Check if checkout date/time has passed (for auto-checkout)
              const checkoutDateTime = new Date(`${booking.to}T${booking.checkoutTime || '12:00'}`);
              const isAutoCheckedOut = checkoutDateTime <= now;
              
              // Include if either condition is true
              if (isManuallyCheckedOut || isAutoCheckedOut) {
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
        console.log(`✅ Found ${filteredBookings.length} checked-out guests (manual + auto)`);
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
  }, [checkedOutGuests, searchQuery, selectedHostel, dateFilter, ratingFilter, feedbacks]);

  // Pagination
  const totalPages = Math.ceil(filteredGuests.length / itemsPerPage);
  const paginatedGuests = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredGuests.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredGuests, currentPage, itemsPerPage]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedHostel, dateFilter, ratingFilter]);

  // Get unique hostels
  const hostels = useMemo(() => {
    const unique = [...new Set(checkedOutGuests.map(g => g.hostel))];
    return role === 'caretaker' ? [userHostel] : ['All', ...unique];
  }, [checkedOutGuests, role, userHostel]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gradient-to-br from-purple-50 to-pink-50'}`}>
      {/* Header */}
      <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="hover:bg-white/20 rounded-full p-2 transition"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                  <Star size={32} />
                  Guest Feedback System
                </h1>
                <p className="text-purple-100 text-sm mt-1">
                  Rate and review checked-out guests
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 mb-6`}>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Filter size={20} />
            Filters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                <Search size={16} className="inline mr-1" />
                Search Guest
              </label>
              <input
                type="text"
                placeholder="Name, contact, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full border-2 rounded-lg px-4 py-2 ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
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
      <div className="px-6 py-6">
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