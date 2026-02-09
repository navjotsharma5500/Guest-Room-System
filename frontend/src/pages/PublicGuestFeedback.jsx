// src/pages/PublicGuestFeedback.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, CheckCircle2, Send, Loader2, Sparkles } from "lucide-react";
import axios from "axios";
import { BACKEND_URL } from "../utils/apiConfig";
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const API = BACKEND_URL;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

const HOSTELS = [
  "Agira Hall (A)",
  "Amritam Hall (B)", 
  "Prithvi Hall (C)",
  "Neeram Hall (D)",
  "Vyan Hall (H)",
  "Tejas Hall (J)",
  "Ambaram Hall (K)",
  "Viyat Hall (L)",
  "Anantam Hall (M)",
  "Ananta Hall (N)",
  "Vyom Hall (O)",
  "Dhriti Hall (PG)",
  "Vahni Hall (Q)"
];

const INITIAL_FORM_STATE = {
  name: "",
  contact: "",
  email: "",
  hostel: "",
  rating: 0,
  description: "",
};

const RATING_CONFIG = {
  1: { label: 'Poor', emoji: '😞', color: '#ef4444', bgColor: '#fee2e2' },
  2: { label: 'Below Average', emoji: '😕', color: '#f97316', bgColor: '#ffedd5' },
  3: { label: 'Average', emoji: '😐', color: '#eab308', bgColor: '#fef3c7' },
  4: { label: 'Good', emoji: '😊', color: '#3b82f6', bgColor: '#dbeafe' },
  5: { label: 'Excellent', emoji: '🤩', color: '#10b981', bgColor: '#d1fae5' }
};

function PublicGuestFeedback() {
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const currentRating = hoveredRating || form.rating;
  const ratingInfo = RATING_CONFIG[currentRating] || null;

  useEffect(() => {
    // Floating particle effect
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'floating-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
      particle.style.opacity = Math.random() * 0.5 + 0.3;
      document.querySelector('.particles-container')?.appendChild(particle);
      
      setTimeout(() => particle.remove(), 5000);
    };

    const interval = setInterval(createParticle, 300);
    return () => clearInterval(interval);
  }, []);

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      console.log("✅ Google Auth Success:", decoded);
      
      setForm(prev => ({
        ...prev,
        email: decoded.email,
        name: decoded.name || prev.name,
      }));
      setIsAuthenticated(true);
    } catch (error) {
      console.error("❌ Google Auth Error:", error);
      alert("Failed to authenticate with Google");
    }
  };

  const handleGoogleError = () => {
    console.error("❌ Google Login Failed");
    alert("Google authentication failed. Please try again.");
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.contact.trim()) newErrors.contact = "Contact is required";
    if (!/^\d{10}$/.test(form.contact)) newErrors.contact = "Enter valid 10-digit contact";
    if (!form.email.trim()) newErrors.email = "Email is required";
    if (!form.hostel) newErrors.hostel = "Please select a hostel";
    if (form.rating === 0) newErrors.rating = "Please rate your experience";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      alert("Please authenticate with Google first");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        name: form.name,
        contact: form.contact,
        email: form.email,
        hostel: form.hostel,
        rating: form.rating,
        description: form.description || "",
        submittedAt: new Date(),
      };

      console.log("📤 Submitting guest feedback:", payload);

      const response = await axios.post(`${API}/api/guest-feedback/submit`, payload, {
        timeout: 20000,
      });

      console.log("✅ Guest feedback submitted:", response.data);

      // Emit real-time event
      window.dispatchEvent(
        new CustomEvent("guestFeedbackSubmitted", {
          detail: response.data?.feedback || null,
        })
      );

      setSubmitted(true);
    } catch (error) {
      console.error("❌ Submit Error:", error);
      alert(error.response?.data?.message || "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM_STATE);
    setIsAuthenticated(false);
    setSubmitted(false);
    setErrors({});
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-red-50 via-white to-red-50">
        {/* Animated Background */}
        <div className="particles-container fixed inset-0 pointer-events-none z-0"></div>
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-red-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-300 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-red-100 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 py-12">
          <AnimatePresence mode="wait">
            {!submitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -40 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-2xl"
              >
                {/* Header */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="text-center mb-8"
                >
                  <img
                    src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
                    alt="Thapar Logo"
                    className="w-32 h-auto mx-auto mb-6 drop-shadow-lg"
                  />
                  <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent mb-3 flex items-center justify-center gap-3">
                    <Sparkles className="text-red-600" size={32} />
                    Guest Feedback
                    <Sparkles className="text-red-600" size={32} />
                  </h1>
                  <p className="text-gray-600 text-lg">
                    Share your experience at Thapar Hostel
                  </p>
                </motion.div>

                {/* Form Card */}
                <motion.form
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                  onSubmit={handleSubmit}
                  className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-red-100 p-8 space-y-6"
                >
                  {/* Google Auth */}
                  {!isAuthenticated ? (
                    <div className="text-center py-6">
                      <p className="text-gray-700 mb-4 font-medium">
                        Please authenticate with Google to continue
                      </p>
                      <div className="flex justify-center">
                        <GoogleLogin
                          onSuccess={handleGoogleSuccess}
                          onError={handleGoogleError}
                          useOneTap
                          theme="filled_blue"
                          size="large"
                          text="continue_with"
                          shape="pill"
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Authenticated Badge */}
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center justify-center gap-2 bg-green-50 border-2 border-green-200 rounded-xl py-3 px-4"
                      >
                        <CheckCircle2 className="text-green-600" size={20} />
                        <span className="text-green-700 font-semibold">
                          Authenticated as {form.email}
                        </span>
                      </motion.div>

                      {/* Name */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Full Name <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          placeholder="Enter your full name"
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 transition ${
                            errors.name ? 'border-red-400' : 'border-gray-200'
                          }`}
                        />
                        {errors.name && (
                          <p className="text-red-600 text-sm mt-1">{errors.name}</p>
                        )}
                      </div>

                      {/* Contact */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contact Number <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="tel"
                          value={form.contact}
                          onChange={(e) => setForm({ ...form, contact: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                          placeholder="Enter 10-digit mobile number"
                          maxLength="10"
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 transition ${
                            errors.contact ? 'border-red-400' : 'border-gray-200'
                          }`}
                        />
                        {errors.contact && (
                          <p className="text-red-600 text-sm mt-1">{errors.contact}</p>
                        )}
                      </div>

                      {/* Email (read-only) */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email Address <span className="text-red-600">*</span>
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          readOnly
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600"
                        />
                      </div>

                      {/* Hostel Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Select Hostel <span className="text-red-600">*</span>
                        </label>
                        <select
                          value={form.hostel}
                          onChange={(e) => setForm({ ...form, hostel: e.target.value })}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 transition ${
                            errors.hostel ? 'border-red-400' : 'border-gray-200'
                          }`}
                        >
                          <option value="">Choose hostel...</option>
                          {HOSTELS.map(h => (
                            <option key={h} value={h}>Hostel {h}</option>
                          ))}
                        </select>
                        {errors.hostel && (
                          <p className="text-red-600 text-sm mt-1">{errors.hostel}</p>
                        )}
                      </div>

                      {/* Rating */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-3">
                          Rate Your Experience <span className="text-red-600">*</span>
                        </label>
                        
                        <div className="flex justify-center gap-3 mb-4">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setForm({ ...form, rating: star })}
                              onMouseEnter={() => setHoveredRating(star)}
                              onMouseLeave={() => setHoveredRating(0)}
                              className="focus:outline-none transition-transform hover:scale-110 active:scale-95"
                            >
                              <Star
                                size={48}
                                className="transition-all duration-200"
                                style={{
                                  fill: star <= currentRating ? ratingInfo?.color : '#e5e7eb',
                                  color: star <= currentRating ? ratingInfo?.color : '#e5e7eb',
                                }}
                              />
                            </button>
                          ))}
                        </div>

                        {/* Rating Label */}
                        <div className="min-h-[80px] flex items-center justify-center">
                          {ratingInfo && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl transition-colors duration-200"
                              style={{ backgroundColor: ratingInfo.bgColor }}
                            >
                              <span className="text-4xl">{ratingInfo.emoji}</span>
                              <div>
                                <p className="text-xl font-bold" style={{ color: ratingInfo.color }}>
                                  {ratingInfo.label}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {form.rating} out of 5 stars
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </div>

                        {errors.rating && (
                          <p className="text-red-600 text-sm text-center mt-2">{errors.rating}</p>
                        )}
                      </div>

                      {/* Description (Optional) */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Additional Comments <span className="text-gray-500">(Optional)</span>
                        </label>
                        <textarea
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          placeholder="Share your detailed feedback, suggestions, or any issues you faced..."
                          rows={4}
                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-red-100 focus:border-red-500 transition resize-none"
                        />
                      </div>

                      {/* Submit Button */}
                      <motion.button
                        type="submit"
                        disabled={submitting}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-3"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="animate-spin" size={24} />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <Send size={24} />
                            Submit Feedback
                          </>
                        )}
                      </motion.button>
                    </>
                  )}
                </motion.form>

                {/* Footer Note */}
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center text-gray-500 text-sm mt-6"
                >
                  Your feedback helps us improve the hostel experience for everyone
                </motion.p>
              </motion.div>
            ) : (
              /* Thank You Screen */
              <motion.div
                key="thankyou"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.6 }}
                className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border-2 border-green-200 p-12 max-w-lg text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                >
                  <CheckCircle2 className="w-24 h-24 text-green-500 mx-auto mb-6" />
                </motion.div>

                <h2 className="text-3xl font-bold text-gray-800 mb-3">
                  Thank You! 🎉
                </h2>
                
                <p className="text-gray-600 mb-8 text-lg">
                  Your feedback has been submitted successfully. We appreciate you taking the time to share your experience!
                </p>

                <motion.button
                  onClick={resetForm}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-gradient-to-r from-red-600 to-red-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  Submit Another Feedback
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Support Link */}
        <div className="fixed bottom-6 left-6 z-50">
          <a
            href="guestroom.hostels@thapar.edu"
            className="flex items-center gap-2 bg-white/90 backdrop-blur-sm text-red-600 px-4 py-2 rounded-full hover:bg-red-600 hover:text-white shadow-lg transition-all duration-300 font-medium"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5" 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            Support
          </a>
        </div>

        {/* Custom Styles */}
        <style jsx>{`
          .floating-particle {
            position: absolute;
            width: 4px;
            height: 4px;
            background: linear-gradient(45deg, #dc2626, #ef4444);
            border-radius: 50%;
            animation: float-up linear infinite;
            pointer-events: none;
          }

          @keyframes float-up {
            0% {
              transform: translateY(100vh) scale(0);
              opacity: 0;
            }
            10% {
              opacity: 1;
            }
            90% {
              opacity: 1;
            }
            100% {
              transform: translateY(-100px) scale(1);
              opacity: 0;
            }
          }

          @keyframes blob {
            0%, 100% {
              transform: translate(0, 0) scale(1);
            }
            25% {
              transform: translate(20px, -50px) scale(1.1);
            }
            50% {
              transform: translate(-20px, 20px) scale(0.9);
            }
            75% {
              transform: translate(50px, 50px) scale(1.05);
            }
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
        `}</style>
      </div>
    </GoogleOAuthProvider>
  );
}

export default PublicGuestFeedback;
