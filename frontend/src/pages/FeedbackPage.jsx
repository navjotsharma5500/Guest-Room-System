// src/pages/FeedbackPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Star, Search, Calendar, Filter, User, Phone, Mail,
  Building2, MapPin, X, Upload, Trash2, FileText, TrendingUp,
  Award, AlertCircle, MessageSquare, Users
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
                className={`w-full border-2 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-200 transition ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-red-500' 
                    : 'bg-white border-gray-300 focus:border-red-500'
                }`}
              />
            </div>

            {/* Attachments */}
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>
                Attachments (Optional, max 5)
              </label>
              
              {attachments.length < 5 && (
                <IKUpload
                  fileName="feedback-attachment.jpg"
                  folder="/feedback"
                  onSuccess={(res) => handleFileUpload(res.url)}
                  onError={(err) => alert('Upload failed: ' + err.message)}
                  className="hidden"
                  id="feedback-file-upload"
                />
              )}
              
              <label
                htmlFor="feedback-file-upload"
                className={`flex items-center justify-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer transition ${
                  attachments.length >= 5 
                    ? 'opacity-50 cursor-not-allowed' 
                    : theme === 'dark'
                    ? 'border-gray-600 hover:border-red-500 hover:bg-gray-700'
                    : 'border-gray-300 hover:border-red-500 hover:bg-gray-50'
                }`}
              >
                <Upload size={20} className="text-red-500" />
                <span className={theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}>
                  {attachments.length >= 5 ? 'Maximum 5 files reached' : 'Click to upload'}
                </span>
              </label>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="mt-3 space-y-2">
                  {attachments.map((url, index) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                      }`}
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-red-600 hover:underline truncate flex-1"
                      >
                        {url.split('/').pop()}
                      </a>
                      <button
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700 ml-2"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className={`flex-1 py-3 rounded-lg font-semibold transition ${
                  theme === 'dark'
                    ? 'bg-gray-700 text-white hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || rating === 0}
                className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
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

// Guest Feedback Card Component (for Caretaker feedback tab)
function GuestFeedbackCard({ guest, onRate, existingFeedback, theme }) {
  const getRatingColor = (rating) => {
    if (!rating) return theme === 'dark' ? 'text-gray-500' : 'text-gray-400';
    if (rating === 5) return 'text-green-500';
    if (rating === 4) return 'text-blue-500';
    if (rating === 3) return 'text-yellow-500';
    if (rating === 2) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-5 shadow-md hover:shadow-lg transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-12 h-12 rounded-full ${existingFeedback ? 'bg-gradient-to-br from-green-400 to-green-600' : 'bg-gradient-to-br from-gray-400 to-gray-600'} flex items-center justify-center text-white font-bold text-lg`}>
              {guest.guest?.charAt(0) || 'G'}
            </div>
            <div>
              <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {guest.guest}
              </h3>
              <p className="text-sm text-gray-500">Room {guest.roomNo} • {guest.hostel}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Mail size={14} />
              <span className="truncate">{guest.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Phone size={14} />
              <span>{guest.contact}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar size={14} />
              <span>Checkout: {new Date(guest.checkedOutAt || guest.to).toLocaleDateString()}</span>
            </div>
          </div>

          {existingFeedback && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={16}
                      className={getRatingColor(existingFeedback.rating)}
                      fill={i < existingFeedback.rating ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {existingFeedback.ratingLabel}
                </span>
              </div>
              {existingFeedback.remarks && (
                <p className="text-sm text-gray-600 line-clamp-2">{existingFeedback.remarks}</p>
              )}
            </div>
          )}
        </div>

        <button
          onClick={() => onRate(guest)}
          className={`ml-4 px-4 py-2 rounded-lg font-semibold transition ${
            existingFeedback
              ? theme === 'dark'
                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white'
          }`}
        >
          {existingFeedback ? 'Edit' : 'Rate'}
        </button>
      </div>
    </div>
  );
}

// Guest Feedback Item Component (for Guest feedback tab)
function GuestFeedbackItem({ feedback, theme, onStatusUpdate }) {
  const [showDetails, setShowDetails] = useState(false);
  const config = GUEST_RATING_CONFIG[feedback.rating];

  return (
    <div className={`${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-xl p-5 shadow-md hover:shadow-lg transition-all`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-lg">
              {feedback.name?.charAt(0) || 'G'}
            </div>
            <div>
              <h3 className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-800'}`}>
                {feedback.name}
              </h3>
              <p className="text-sm text-gray-500">Hostel {feedback.hostel}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm mb-3">
            <div className="flex items-center gap-2 text-gray-500">
              <Mail size={14} />
              <span className="truncate">{feedback.email}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Phone size={14} />
              <span>{feedback.contact}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <Calendar size={14} />
              <span>Submitted: {new Date(feedback.submittedAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                feedback.status === 'reviewed' ? 'bg-green-100 text-green-700' :
                feedback.status === 'archived' ? 'bg-gray-100 text-gray-700' :
                'bg-yellow-100 text-yellow-700'
              }`}>
                {feedback.status.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    style={{ color: i < feedback.rating ? (
                      feedback.rating === 5 ? '#10b981' :
                      feedback.rating === 4 ? '#3b82f6' :
                      feedback.rating === 3 ? '#eab308' :
                      feedback.rating === 2 ? '#f97316' : '#ef4444'
                    ) : '#d1d5db' }}
                    fill={i < feedback.rating ? 'currentColor' : 'none'}
                  />
                ))}
              </div>
              <span className="text-2xl">{config?.emoji}</span>
              <span className="text-sm font-semibold text-gray-700">
                {feedback.ratingLabel}
              </span>
            </div>

            {feedback.description && (
              <div className={`mt-2 p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <p className={`text-sm ${showDetails ? '' : 'line-clamp-2'} ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                  {feedback.description}
                </p>
                {feedback.description.length > 100 && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-red-600 text-sm font-semibold mt-1 hover:underline"
                  >
                    {showDetails ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {onStatusUpdate && (
          <div className="ml-4 flex flex-col gap-2">
            <select
              value={feedback.status}
              onChange={(e) => onStatusUpdate(feedback._id, e.target.value)}
              className="px-3 py-2 text-sm rounded-lg border-2 border-gray-300 focus:border-red-500 focus:ring-2 focus:ring-red-200"
            >
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

// Main Feedback Page Component
export default function FeedbackPage() {
  const { user, theme } = useAuth();
  const [activeTab, setActiveTab] = useState(TABS.CARETAKER);
  
  // Caretaker Feedback State
  const [checkedOutGuests, setCheckedOutGuests] = useState([]);
  const [caretakerFeedbacks, setCaretakerFeedbacks] = useState([]);
  
  // Guest Feedback State
  const [guestFeedbacks, setGuestFeedbacks] = useState([]);
  
  // Common State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hostelFilter, setHostelFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State (for Caretaker feedback)
  const [showModal, setShowModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState(null);

  const hostels = ['All', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N'];
  const isRestrictedRole = user?.role === 'caretaker' || user?.role === 'warden';

  // Fetch Caretaker Feedback Data
  const fetchCaretakerFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch checked-out guests
      const guestsRes = await fetch(`${API}/api/bookings/checked-out`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!guestsRes.ok) throw new Error('Failed to fetch guests');
      const guestsData = await guestsRes.json();
      setCheckedOutGuests(guestsData.bookings || []);

      // Fetch caretaker feedbacks
      const feedbackRes = await fetch(`${API}/api/feedback`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!feedbackRes.ok) throw new Error('Failed to fetch feedback');
      const feedbackData = await feedbackRes.json();
      setCaretakerFeedbacks(feedbackData.feedbacks || []);

      setError('');
    } catch (err) {
      console.error('Error fetching caretaker feedback:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch Guest Feedback Data
  const fetchGuestFeedback = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      const res = await fetch(`${API}/api/guest-feedback`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error('Failed to fetch guest feedback');
      const data = await res.json();
      setGuestFeedbacks(data.feedbacks || []);
      setError('');
    } catch (err) {
      console.error('Error fetching guest feedback:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial Load
  useEffect(() => {
    if (activeTab === TABS.CARETAKER) {
      fetchCaretakerFeedback();
    } else {
      fetchGuestFeedback();
    }
  }, [activeTab, fetchCaretakerFeedback, fetchGuestFeedback]);

  // Real-time updates
  useEffect(() => {
    const handleFeedbackSubmitted = () => {
      if (activeTab === TABS.CARETAKER) {
        fetchCaretakerFeedback();
      }
    };

    const handleGuestFeedbackSubmitted = () => {
      if (activeTab === TABS.GUEST) {
        fetchGuestFeedback();
      }
    };

    window.addEventListener('feedback-submitted', handleFeedbackSubmitted);
    window.addEventListener('guestFeedbackSubmitted', handleGuestFeedbackSubmitted);

    return () => {
      window.removeEventListener('feedback-submitted', handleFeedbackSubmitted);
      window.removeEventListener('guestFeedbackSubmitted', handleGuestFeedbackSubmitted);
    };
  }, [activeTab, fetchCaretakerFeedback, fetchGuestFeedback]);

  // Handle Caretaker Feedback Submit
  const handleSubmitCaretakerFeedback = async (feedbackData) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(feedbackData)
      });

      if (!res.ok) throw new Error('Failed to submit feedback');
      
      await fetchCaretakerFeedback();
      alert('Feedback submitted successfully!');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      throw err;
    }
  };

  // Handle Guest Feedback Status Update
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
      console.error('Error updating status:', err);
      alert('Failed to update status');
    }
  };

  // Get feedback for a specific guest
  const getFeedbackForGuest = (guestId) => {
    return caretakerFeedbacks.find(f => f.bookingId === guestId);
  };

  // Filter Caretaker Guests
  const filteredCaretakerGuests = useMemo(() => {
    return checkedOutGuests.filter(guest => {
      const matchesSearch = guest.guest?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          guest.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          guest.contact?.includes(searchQuery);
      
      const matchesHostel = hostelFilter === 'All' || guest.hostel === hostelFilter;
      
      const feedback = getFeedbackForGuest(guest._id || guest.id);
      const matchesRating = ratingFilter === 'All' ||
                           (ratingFilter === 'Unrated' && !feedback) ||
                           (feedback && feedback.rating === Number(ratingFilter));
      
      const matchesDate = !dateFilter || 
                         new Date(guest.checkedOutAt || guest.to).toDateString() === new Date(dateFilter).toDateString();

      return matchesSearch && matchesHostel && matchesRating && matchesDate;
    });
  }, [checkedOutGuests, searchQuery, hostelFilter, ratingFilter, dateFilter, caretakerFeedbacks]);

  // Filter Guest Feedbacks
  const filteredGuestFeedbacks = useMemo(() => {
    return guestFeedbacks.filter(feedback => {
      const matchesSearch = feedback.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          feedback.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          feedback.contact?.includes(searchQuery);
      
      const matchesHostel = hostelFilter === 'All' || feedback.hostel === hostelFilter;
      
      const matchesRating = ratingFilter === 'All' || feedback.rating === Number(ratingFilter);
      
      const matchesDate = !dateFilter || 
                         new Date(feedback.submittedAt).toDateString() === new Date(dateFilter).toDateString();

      return matchesSearch && matchesHostel && matchesRating && matchesDate;
    });
  }, [guestFeedbacks, searchQuery, hostelFilter, ratingFilter, dateFilter]);

  // Pagination
  const currentData = activeTab === TABS.CARETAKER ? filteredCaretakerGuests : filteredGuestFeedbacks;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const paginatedData = currentData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, hostelFilter, ratingFilter, dateFilter, activeTab]);

  return (
    <div className={`p-6 ${theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="text-red-600" size={32} />
            Feedback Management
          </h1>
          <p className="text-gray-500 mt-1">Manage caretaker and guest feedback</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab(TABS.CARETAKER)}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === TABS.CARETAKER
              ? 'text-red-600 border-b-2 border-red-600'
              : theme === 'dark'
              ? 'text-gray-400 hover:text-gray-200'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users size={20} />
            Caretaker Feedback
          </div>
        </button>
        <button
          onClick={() => setActiveTab(TABS.GUEST)}
          className={`px-6 py-3 font-semibold transition-all relative ${
            activeTab === TABS.GUEST
              ? 'text-red-600 border-b-2 border-red-600'
              : theme === 'dark'
              ? 'text-gray-400 hover:text-gray-200'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare size={20} />
            Guest Feedback
          </div>
        </button>
      </div>

      {/* Filters */}
      <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-6 mb-6`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <Search size={16} className="inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Name, email, or contact..."
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
              value={hostelFilter}
              onChange={(e) => setHostelFilter(e.target.value)}
              disabled={isRestrictedRole}
              className={`w-full border-2 rounded-lg px-4 py-2 ${
                theme === 'dark' 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              } ${isRestrictedRole ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {hostels.map(h => (
                <option key={h} value={h}>{h === 'All' ? 'All Hostels' : `Hostel ${h}`}</option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              <Calendar size={16} className="inline mr-1" />
              {activeTab === TABS.CARETAKER ? 'Checkout Date' : 'Submission Date'}
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
              {activeTab === TABS.CARETAKER && <option value="Unrated">Unrated</option>}
              <option value="5">⭐⭐⭐⭐⭐ {activeTab === TABS.CARETAKER ? 'Outstanding' : 'Excellent'}</option>
              <option value="4">⭐⭐⭐⭐ Good</option>
              <option value="3">⭐⭐⭐ Average</option>
              <option value="2">⭐⭐ Below Average</option>
              <option value="1">⭐ Poor</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-red-500`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total {activeTab === TABS.CARETAKER ? 'Guests' : 'Feedbacks'}</p>
                <p className="text-2xl font-bold text-red-600">{currentData.length}</p>
              </div>
              {activeTab === TABS.CARETAKER ? <User size={32} className="text-red-400" /> : <MessageSquare size={32} className="text-red-400" />}
            </div>
          </div>
          
          {activeTab === TABS.CARETAKER ? (
            <>
              <div className={`${theme === 'dark' ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-md p-4 border-l-4 border-green-500`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Rated</p>
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
                    <p className="text-sm text-gray-500">Unrated</p>
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
                    <p className="text-sm text-gray-500">Avg Rating</p>
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
                    <p className="text-sm text-gray-500">Pending</p>
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
                    <p className="text-sm text-gray-500">Reviewed</p>
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
                    <p className="text-sm text-gray-500">Avg Rating</p>
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
            <p className="text-gray-500">Loading {activeTab === TABS.CARETAKER ? 'guests' : 'guest'} feedback...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
            <p className="text-red-600 font-semibold">{error}</p>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="text-center py-12">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No {activeTab === TABS.CARETAKER ? 'checked-out guests' : 'guest feedback'} found</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {activeTab === TABS.CARETAKER ? (
                paginatedData.map(guest => (
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
                ))
              ) : (
                paginatedData.map(feedback => (
                  <GuestFeedbackItem
                    key={feedback._id}
                    feedback={feedback}
                    theme={theme}
                    onStatusUpdate={user?.role === 'admin' || user?.role === 'manager' ? handleGuestFeedbackStatusUpdate : null}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Previous
                </button>
                <span className={`px-4 py-2 ${theme === 'dark' ? 'text-white' : 'text-gray-700'}`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
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