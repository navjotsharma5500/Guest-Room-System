// GuestHistory.jsx - COMPLETE FIXED VERSION
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, CreditCard, User, FileText, X, Star } from "lucide-react";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;

const GuestHistory = ({ contact, email, onClose, theme = "light" }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        console.log("🔍 Fetching guest history:", { contact, email });
        
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const queryParams = new URLSearchParams();
        if (contact) queryParams.append("contact", contact);
        if (email) queryParams.append("email", email);

        const url = `${API}/api/bookings/history?${queryParams.toString()}`;
        console.log("📤 Request URL:", url);

        const response = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers,
        });

        console.log("📥 Response status:", response.status);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📦 Response data:", data);

        if (data.success) {
          console.log("✅ History fetched:", data.bookings?.length || 0, "bookings");
          setHistory(data.bookings || []);
        } else {
          throw new Error(data.message || "Failed to fetch history");
        }
      } catch (err) {
        console.error("❌ Error fetching guest history:", err);
        setError(err.message || "Failed to load history");
      } finally {
        setLoading(false);
      }
    };

    if (contact || email) {
      fetchHistory();
    } else {
      setLoading(false);
      setError("No contact or email provided to fetch history.");
    }
  }, [contact, email]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    try {
      return new Date(dateString).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full max-w-full sm:max-w-2xl max-h-[90vh] sm:max-h-[85vh] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          theme === "dark" ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 sm:p-6 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <HistoryIcon size={24} />
              Guest Booking History
            </h3>
            <p className="text-blue-100 text-xs sm:text-sm mt-1">
              Past stays for {contact || email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <p className="text-gray-500">Loading history...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 text-red-500 bg-red-50 rounded-lg p-6">
              <p className="font-medium">Error loading history</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <FileText size={48} className="text-gray-300 mb-2" />
              <p>No previous booking history found.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((booking, index) => (
                <div
                  key={booking._id || booking.id || index}
                  className={`p-3 sm:p-4 rounded-lg sm:rounded-xl border transition hover:shadow-md ${
                    theme === "dark"
                      ? "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                      : "bg-white border-gray-200 hover:border-blue-300"
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold text-base sm:text-lg">{booking.hostel || "—"}</h4>
                      <div className="flex items-center gap-2 text-sm opacity-80">
                        <MapPin size={14} />
                        <span>Room {booking.roomNo || "—"}</span>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        booking.status === "cancelled"
                          ? "bg-red-100 text-red-700"
                          : booking.status === "checked_in" || booking.status === "checked_out"
                          ? "bg-green-100 text-green-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {booking.status || "booked"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-blue-500" />
                      <span>
                        {formatDate(booking.from)} - {formatDate(booking.to)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={16} className="text-orange-500" />
                      <span>{booking.checkInTime || "00:00"} Check-in</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-purple-500" />
                      <span>{booking.guest || "Guest"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CreditCard size={16} className="text-green-500" />
                      <span>
                        {booking.paymentType || "Paid"} {booking.totalAmount ? `(₹${booking.totalAmount})` : ""}
                      </span>
                    </div>
                  </div>
                  
                  {booking.purpose && (
                    <div className="mt-3 text-sm italic opacity-70 border-t pt-2 border-dashed border-gray-300 dark:border-gray-600">
                      "{booking.purpose}"
                    </div>
                  )}

                  {/* ✅ ENHANCED FEEDBACK DISPLAY */}
                  {booking.feedback && (
                    <div className="mt-3 pt-3 border-t-2 border-purple-200 dark:border-purple-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Star size={18} className="text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Guest Rating</span>
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wide ${
                          booking.feedback.rating >= 4 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : booking.feedback.rating === 3
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                            : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        }`}>
                          {booking.feedback.ratingLabel || 
                            (booking.feedback.rating === 5 ? 'Outstanding' :
                            booking.feedback.rating === 4 ? 'Good' :
                            booking.feedback.rating === 3 ? 'Average' :
                            booking.feedback.rating === 2 ? 'Below Average' : 'Poor')}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={20}
                            className={`${
                              star <= booking.feedback.rating 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'fill-gray-300 text-gray-300'
                            } transition-all`}
                          />
                        ))}
                        <span className="ml-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
                          {booking.feedback.rating}/5
                        </span>
                      </div>
                      
                      {booking.feedback.remarks && (
                        <div className="text-sm bg-white dark:bg-gray-800 p-3 rounded-lg border border-purple-200 dark:border-purple-700 shadow-sm">
                          <p className="text-gray-600 dark:text-gray-400 text-xs font-semibold mb-1">Remarks:</p>
                          <p className="text-gray-800 dark:text-gray-200 italic">"{booking.feedback.remarks}"</p>
                        </div>
                      )}
                      
                      {booking.feedback.attachments?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            Attachments ({booking.feedback.attachments.length})
                          </p>
                          <div className="flex gap-2 flex-wrap">
                            {booking.feedback.attachments.map((url, idx) => (
                              <a
                                key={idx}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="group relative"
                              >
                                <img
                                  src={url}
                                  alt={`Feedback ${idx + 1}`}
                                  className="w-16 h-16 object-cover rounded-lg border-2 border-purple-300 hover:border-purple-500 transition-all shadow-md group-hover:shadow-xl group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-lg transition-all flex items-center justify-center">
                                  <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-semibold">View</span>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex justify-end shrink-0 ${
            theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"
        }`}>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 font-medium"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const HistoryIcon = ({ size, className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
    <path d="M3 3v9h9" />
    <path d="M12 7v5l4 2" />
  </svg>
);

export default GuestHistory;