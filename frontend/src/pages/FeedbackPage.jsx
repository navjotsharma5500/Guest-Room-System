// src/pages/FeedbackPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Star, Search, Calendar, Filter, User, Phone, Mail,
  Building2, MapPin, X, Upload, Trash2, FileText, TrendingUp,
  Award, AlertCircle, MessageSquare, Users, ChevronLeft, ChevronRight
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

const GUEST_RATING_CONFIG = {
  1: { label: 'Poor', emoji: '😞', color: 'red' },
  2: { label: 'Below Average', emoji: '😕', color: 'orange' },
  3: { label: 'Average', emoji: '😐', color: 'yellow' },
  4: { label: 'Good', emoji: '😊', color: 'blue' },
  5: { label: 'Excellent', emoji: '🤩', color: 'green' }
};

// Tab configuration
const TABS = {
  CARETAKER: 'caretaker',
  GUEST: 'guest'
};

// Feedback Modal Component (for Caretaker Feedback)
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
          className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto will-change-auto`}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-red-600 to-red-700 text-white p-6 rounded-t-2xl z-10 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Star size={24} />
                Rate Guest Experience
              </h2>
              <p className="text-red-100 text-sm mt-1">{guest.guest} - Room {guest.roomNo}</p>
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
              <p className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>How would you rate this guest?</p>
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

              {/* Fixed height container to prevent layout shift */}
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
                    <span className="text-xl font-bold">{ratingInfo.label}</span>
                    <span className="text-sm">{ratingInfo.description}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}>
                Remarks (Optional)
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Add any specific feedback about the guest's stay..."
                rows={4}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none transition ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>

            {/* Attachments */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}>
                Attachments (Optional, max 5)
              </label>
              <div className="space-y-3">
                {attachments.length < 5 && (
                  <IKUpload
                    fileName={`feedback-${guest._id || guest.id}-${Date.now()}`}
                    folder="/feedback-attachments"
                    onSuccess={(res) => handleFileUpload(res.url)}
                    onError={(err) => alert('Upload failed: ' + err.message)}
                    className="hidden"
                    id="feedback-file-upload"
                  />
                )}
                <label
                  htmlFor="feedback-file-upload"
                  className={`flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-xl cursor-pointer transition ${
                    attachments.length >= 5 
                      ? 'opacity-50 cursor-not-allowed' 
                      : theme === 'dark'
                      ? 'border-gray-600 hover:border-red-500 bg-gray-700'
                      : 'border-slate-300 hover:border-red-500 bg-white'
                  }`}
                >
                  <Upload size={20} className="text-red-500" />
                  <span className={theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}>
                    {attachments.length >= 5 ? 'Maximum attachments reached' : 'Click to upload image'}
                  </span>
                </label>

                {/* Attachment previews */}
                {attachments.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {attachments.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Attachment ${idx + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeAttachment(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={onClose}
                disabled={submitting}
                className={`flex-1 px-6 py-3 border-2 rounded-xl font-semibold transition ${
                  theme === 'dark'
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                } disabled:opacity-50`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl font-semibold hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition guestroom-primary-btn"
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

// Guest Feedback Card Component (for Caretaker tab)
function GuestFeedbackCard({ guest, onRate, existingFeedback, theme }) {
  const hasFeedback = !!existingFeedback;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
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
                {guest.guest}
              </h3>
              {hasFeedback && (
                <div className="flex items-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={i < existingFeedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                    />
                  ))}
                  <span className={`ml-2 text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                    {existingFeedback.rating}/5
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              <Mail className="w-4 h-4 text-red-500" />
              <span className="truncate">{guest.email}</span>
            </div>
            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              <Phone className="w-4 h-4 text-red-500" />
              <span>{guest.contact}</span>
            </div>
            {guest.rollno && (
              <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                <User className="w-4 h-4 text-red-500" />
                <span>Roll: {guest.rollno}</span>
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
                {guest.hostel}
              </span>
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-slate-600'}>• Room {guest.roomNo}</span>
            </div>
            <div className={`flex items-center gap-2 text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              <Calendar className="w-4 h-4 text-red-500" />
              <span>
                {new Date(guest.from).toLocaleDateString()} - {new Date(guest.to).toLocaleDateString()}
              </span>
            </div>
          </div>

          {hasFeedback && existingFeedback.remarks && (
            <div className={`mt-3 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-red-50'}`}>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-700'}`}>
                <span className="font-semibold">Remarks:</span> {existingFeedback.remarks}
              </p>
            </div>
          )}
        </div>

        {/* Right: Action Button */}
        <div className="lg:col-span-4 flex items-center justify-end">
          <button
            onClick={() => onRate(guest)}
            className={`px-6 py-3 rounded-xl font-semibold transition-all guestroom-primary-btn ${
              hasFeedback
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800'
                : 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800'
            }`}
          >
            {hasFeedback ? '✏️ Edit Rating' : '⭐ Rate Guest'}
          </button>
        </div>
      </div>

      {/* Attachments */}
      {hasFeedback && existingFeedback.attachments?.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <p className={`text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}>
            Attachments ({existingFeedback.attachments.length})
          </p>
          <div className="grid grid-cols-4 gap-2">
            {existingFeedback.attachments.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Attachment ${idx + 1}`}
                className="w-full h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                onClick={() => window.open(url, '_blank')}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// Guest Feedback Item Component (for Guest Feedback tab)
function GuestFeedbackItem({ feedback, theme, onStatusUpdate }) {
  const ratingConfig = GUEST_RATING_CONFIG[feedback.rating] || GUEST_RATING_CONFIG[3];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`guestroom-card rounded-2xl shadow-lg border-2 border-red-100 p-6 hover:shadow-xl transition-all ${
        theme === 'dark' ? 'bg-gray-800' : 'bg-white'
      }`}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Guest Info */}
        <div className="lg:col-span-4 space-y-3">
          <div>
            <h3 className={`text-lg font-bold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
              {feedback.name || 'Unknown Guest'}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl">{ratingConfig.emoji}</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={i < feedback.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                  />
                ))}
              </div>
              <span className={`text-sm font-semibold ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                {feedback.rating}/5 - {ratingConfig.label}
              </span>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              <Building2 className="w-4 h-4 text-red-500" />
              <span>{feedback.hostel}</span>
            </div>
            <div className={`flex items-center gap-2 ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
              <Calendar className="w-4 h-4 text-red-500" />
              <span>{new Date(feedback.submittedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Middle: Feedback Content */}
        <div className="lg:col-span-5 space-y-3">
          {feedback.description && (
            <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-red-50'}`}>
              <p className={`text-sm font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-700'}`}>
                Feedback:
              </p>
              <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-slate-600'}`}>
                {feedback.description}
              </p>
            </div>
          )}
        </div>

        {/* Right: Status & Actions */}
        <div className="lg:col-span-3 flex flex-col items-end justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                feedback.status === 'reviewed'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {feedback.status === 'reviewed' ? '✓ Reviewed' : '⏳ Pending'}
            </span>
          </div>

          {onStatusUpdate && feedback.status === 'pending' && (
            <button
              onClick={() => onStatusUpdate(feedback._id, 'reviewed')}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl font-semibold hover:from-green-700 hover:to-green-800 transition-all guestroom-primary-btn"
            >
              Mark as Reviewed
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Main Feedback Page Component
export default function FeedbackPage({ onBack, theme = 'light' }) {
  const { currentUser } = useAuth();
  const user = currentUser?.user || currentUser;

  const [activeTab, setActiveTab] = useState(TABS.CARETAKER);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Caretaker feedback state
  const [caretakerGuests, setCaretakerGuests] = useState([]);
  const [caretakerFeedbacks, setCaretakerFeedbacks] = useState([]);

  // Guest feedback state
  const [guestFeedbacks, setGuestFeedbacks] = useState([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedHostel, setSelectedHostel] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Handle ESC key
  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape" && onBack) {
        onBack();
      }
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onBack]);

  // Fetch data on mount
  useEffect(() => {
    if (activeTab === TABS.CARETAKER) {
      fetchCaretakerData();
    } else {
      fetchGuestFeedback();
    }
  }, [activeTab]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, selectedHostel, dateFrom, dateTo]);

  const fetchCaretakerData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const [guestsRes, feedbacksRes] = await Promise.all([
        fetch(`${API}/api/bookings/checked-out`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/api/feedback/caretaker/list`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!guestsRes.ok || !feedbacksRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const guestsData = await guestsRes.json();
      const feedbacksData = await feedbacksRes.json();

      setCaretakerGuests(guestsData.bookings || []);
      setCaretakerFeedbacks(feedbacksData.feedbacks || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching caretaker data:', err);
      setError('Failed to fetch guest feedback data');
    } finally {
      setLoading(false);
    }
  };

  const fetchGuestFeedback = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${API}/api/guest-feedback/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Failed to fetch guest feedback');

      const data = await res.json();
      setGuestFeedbacks(data.feedbacks || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching guest feedback:', err);
      setError('Failed to fetch guest feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCaretakerFeedback = async (feedbackData) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/feedback/caretaker/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(feedbackData)
      });

      if (!res.ok) throw new Error('Failed to submit feedback');

      await fetchCaretakerData();
    } catch (err) {
      console.error('Error submitting feedback:', err);
      throw err;
    }
  };

  const handleGuestFeedbackStatusUpdate = async (feedbackId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/guest-feedback/${feedbackId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update status');

      await fetchGuestFeedback();
    } catch (err) {
      console.error('Error updating feedback status:', err);
      alert('Failed to update feedback status');
    }
  };

  const getFeedbackForGuest = useCallback((guestId) => {
    return caretakerFeedbacks.find(f => f.bookingId === guestId);
  }, [caretakerFeedbacks]);

  // Filter caretaker guests
  const filteredCaretakerGuests = useMemo(() => {
    let filtered = [...caretakerGuests];

    if (selectedHostel) {
      filtered = filtered.filter(g => g.hostel === selectedHostel);
    }

    if (dateFrom) {
      filtered = filtered.filter(g => new Date(g.from) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter(g => new Date(g.to) <= new Date(dateTo));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f =>
        f.name?.toLowerCase().includes(query) ||
        f.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [caretakerGuests, selectedHostel, dateFrom, dateTo, searchQuery]);

  // Filter guest feedback
  const filteredGuestFeedbacks = useMemo(() => {
    let filtered = [...guestFeedbacks];

    if (selectedHostel) {
      filtered = filtered.filter(f => f.hostel === selectedHostel);
    }

    if (dateFrom) {
      filtered = filtered.filter(f => new Date(f.submittedAt) >= new Date(dateFrom));
    }

    if (dateTo) {
      filtered = filtered.filter(f => new Date(f.submittedAt) <= new Date(dateTo));
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f =>
        f.guest?.guest?.toLowerCase().includes(query) ||
        f.comments?.toLowerCase().includes(query) ||
        f.suggestions?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [guestFeedbacks, selectedHostel, dateFrom, dateTo, searchQuery]);

  const currentData = activeTab === TABS.CARETAKER ? filteredCaretakerGuests : filteredGuestFeedbacks;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const paginatedData = currentData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Get unique hostels
  const uniqueHostels = useMemo(() => {
    const hostels = activeTab === TABS.CARETAKER
      ? caretakerGuests.map(g => g.hostel)
      : guestFeedbacks.map(f => f.hostel);
    return [...new Set(hostels)].sort();
  }, [caretakerGuests, guestFeedbacks, activeTab]);

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-red-50'}`}>
      {/* ✅ FIXED: Proper spacing to avoid going under sidebar/navbar */}
      <div className="ml-64 mt-16 p-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              {onBack && (
                <button
                  onClick={onBack}
                  className={`p-2 rounded-xl border-2 transition-all ${
                    theme === 'dark'
                      ? 'bg-gray-800 border-gray-700 hover:border-red-500'
                      : 'bg-white border-slate-200 hover:border-red-300'
                  }`}
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div>
                <h1 className={`text-3xl font-bold gradient-text-red`}>
                  Guest Feedback Management
                </h1>
                <p className={theme === 'dark' ? 'text-gray-400' : 'text-slate-600'}>
                  Manage caretaker and guest feedback
                </p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setActiveTab(TABS.CARETAKER)}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === TABS.CARETAKER
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                  : theme === 'dark'
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-slate-700 hover:bg-red-50 border-2 border-slate-200'
              }`}
            >
              📝 Caretaker Feedback ({caretakerGuests.length})
            </button>
            <button
              onClick={() => setActiveTab(TABS.GUEST)}
              className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-all ${
                activeTab === TABS.GUEST
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg'
                  : theme === 'dark'
                  ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  : 'bg-white text-slate-700 hover:bg-red-50 border-2 border-slate-200'
              }`}
            >
              💬 Guest Feedback ({guestFeedbacks.length})
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                theme === 'dark' ? 'text-gray-400' : 'text-slate-400'
              }`} />
              <input
                type="text"
                placeholder="Search by name, email, contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400'
                    : 'bg-white border-slate-200 text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-6 py-3 rounded-xl border-2 font-semibold transition-all ${
                showFilters
                  ? 'bg-red-600 text-white border-red-600'
                  : theme === 'dark'
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:border-red-500'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-red-300'
              }`}
            >
              <Filter className="w-5 h-5 inline mr-2" />
              Filters
            </button>
          </div>

          {/* Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`overflow-hidden rounded-2xl border-2 p-6 mb-6 ${
                  theme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-slate-200'
                }`}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-slate-700'
                    }`}>
                      Hostel
                    </label>
                    <select
                      value={selectedHostel}
                      onChange={(e) => setSelectedHostel(e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="">All Hostels</option>
                      {uniqueHostels.map(hostel => (
                        <option key={hostel} value={hostel}>{hostel}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-slate-700'
                    }`}>
                      From Date
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${
                      theme === 'dark' ? 'text-white' : 'text-slate-700'
                    }`}>
                      To Date
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 transition ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    onClick={() => {
                      setSelectedHostel('');
                      setDateFrom('');
                      setDateTo('');
                    }}
                    className={`px-6 py-2 rounded-xl font-semibold transition ${
                      theme === 'dark'
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Clear Filters
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-red-500`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  Total {activeTab === TABS.CARETAKER ? 'Guests' : 'Feedbacks'}
                </p>
                <p className="text-2xl font-bold text-red-600">{currentData.length}</p>
              </div>
              {activeTab === TABS.CARETAKER ? (
                <User size={32} className="text-red-400" />
              ) : (
                <MessageSquare size={32} className="text-red-400" />
              )}
            </div>
          </div>
          
          {activeTab === TABS.CARETAKER ? (
            <>
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-green-500`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Rated</p>
                    <p className="text-2xl font-bold text-green-600">
                      {filteredCaretakerGuests.filter(g => getFeedbackForGuest(g._id || g.id)).length}
                    </p>
                  </div>
                  <Star size={32} className="text-green-400" />
                </div>
              </div>
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-orange-500`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Unrated</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {filteredCaretakerGuests.filter(g => !getFeedbackForGuest(g._id || g.id)).length}
                    </p>
                  </div>
                  <AlertCircle size={32} className="text-orange-400" />
                </div>
              </div>
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-blue-500`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Avg Rating</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {(() => {
                        const ratings = filteredCaretakerGuests
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
            </>
          ) : (
            <>
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-yellow-500`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Pending</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {guestFeedbacks.filter(f => f.status === 'pending').length}
                    </p>
                  </div>
                  <AlertCircle size={32} className="text-yellow-400" />
                </div>
              </div>
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-green-500`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Reviewed</p>
                    <p className="text-2xl font-bold text-green-600">
                      {guestFeedbacks.filter(f => f.status === 'reviewed').length}
                    </p>
                  </div>
                  <Star size={32} className="text-green-400" />
                </div>
              </div>
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-blue-500`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Avg Rating</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {guestFeedbacks.length > 0
                        ? (guestFeedbacks.reduce((sum, f) => sum + f.rating, 0) / guestFeedbacks.length).toFixed(1)
                        : '—'}
                    </p>
                  </div>
                  <TrendingUp size={32} className="text-blue-400" />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
              Loading {activeTab === TABS.CARETAKER ? 'guests' : 'guest'} feedback...
            </p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <p className="text-red-600 font-semibold">{error}</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className={`mx-auto mb-4 ${theme === 'dark' ? 'text-gray-600' : 'text-gray-400'}`} />
            <p className={theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}>
              No {activeTab === TABS.CARETAKER ? 'checked-out guests' : 'guest feedback'} found
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {activeTab === TABS.CARETAKER ? (
                paginatedData.map((guest, index) => (
                  <GuestFeedbackCard
                    key={guest._id || guest.id}
                    guest={guest}
                    index={index}
                    onRate={(g) => {
                      setSelectedGuest(g);
                      setShowModal(true);
                    }}
                    existingFeedback={getFeedbackForGuest(guest._id || guest.id)}
                    theme={theme}
                  />
                ))
              ) : (
                paginatedData.map((feedback, index) => (
                  <GuestFeedbackItem
                    key={feedback._id}
                    feedback={feedback}
                    index={index}
                    theme={theme}
                    onStatusUpdate={user?.role === 'admin' || user?.role === 'manager' ? handleGuestFeedbackStatusUpdate : null}
                  />
                ))
              )}
            </div>

            {/* Pagination - Matching BookingsPage style */}
            {totalPages > 1 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-8"
              >
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
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
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className={`px-2 ${theme === 'dark' ? 'text-gray-500' : 'text-slate-400'}`}>
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
          </>
        )}
      </div>

      {/* Feedback Modal (for Caretaker feedback) */}
      {showModal && selectedGuest && activeTab === TABS.CARETAKER && (
        <FeedbackModal
          guest={selectedGuest}
          onClose={() => {
            setShowModal(false);
            setSelectedGuest(null);
          }}
          onSubmit={handleSubmitCaretakerFeedback}
          existingFeedback={getFeedbackForGuest(selectedGuest._id || selectedGuest.id)}
          theme={theme}
        />
      )}
    </div>
  );
}