// src/pages/PublicGuestFeedback.jsx
// ============================================================================
// Fixed: ImageKit Upload + Enhanced Animated Red Sparkles Background
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Star, Send, CheckCircle, AlertCircle, UserCircle, Sparkles } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../utils/apiConfig';

const HOSTELS = [
  'Agira Hall (A)', 'Amritam Hall (B)', 'Prithvi Hall (C)', 'Neeram Hall (D)',
  'Vyan Hall (H)', 'Ira Hall (I)', 'Tejas Hall (J)', 'Ambaram Hall (K)',
  'Viyat Hall (L)', 'Anantam Hall (M)', 'Ananta Hall (N)', 'Vyom Hall (O)',
  'Dhriti Hall (PG)', 'Vahni Hostel (Q)'
];

// ============================================================================
// ENHANCED ANIMATED SPARKLE BACKGROUND COMPONENT
// ============================================================================
function EnhancedSparkleBackground() {
  const [sparkles, setSparkles] = useState([]);
  const [floatingSparkles, setFloatingSparkles] = useState([]);

  useEffect(() => {
    // Generate 40 random twinkling sparkles
    const newSparkles = Array.from({ length: 40 }, (_, i) => ({
      id: `sparkle-${i}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 5 + 2,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 5,
      opacity: Math.random() * 0.5 + 0.3,
      color: ['#ef4444', '#f87171', '#fb923c'][Math.floor(Math.random() * 3)],
    }));
    setSparkles(newSparkles);

    // Generate 15 floating sparkles
    const newFloatingSparkles = Array.from({ length: 15 }, (_, i) => ({
      id: `float-${i}`,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 8 + 4,
      duration: Math.random() * 6 + 4,
      delay: Math.random() * 3,
      color: ['#ef4444', '#f87171'][Math.floor(Math.random() * 2)],
    }));
    setFloatingSparkles(newFloatingSparkles);
  }, []);

  return (
    <>
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Gradient overlay */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 30% 40%, rgba(239, 68, 68, 0.04) 0%, transparent 50%), radial-gradient(circle at 70% 60%, rgba(251, 146, 60, 0.04) 0%, transparent 50%)',
          }}
        />

        {/* Twinkling sparkles */}
        {sparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className="absolute rounded-full"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
              width: `${sparkle.size}px`,
              height: `${sparkle.size}px`,
              backgroundColor: sparkle.color,
              boxShadow: `0 0 ${sparkle.size * 2}px ${sparkle.color}`,
              animation: `sparkle ${sparkle.duration}s ease-in-out ${sparkle.delay}s infinite`,
              opacity: 0,
            }}
          />
        ))}

        {/* Floating sparkles */}
        {floatingSparkles.map((sparkle) => (
          <div
            key={sparkle.id}
            className="absolute rounded-full blur-sm"
            style={{
              left: `${sparkle.x}%`,
              top: `${sparkle.y}%`,
              width: `${sparkle.size}px`,
              height: `${sparkle.size}px`,
              backgroundColor: sparkle.color,
              animation: `float ${sparkle.duration}s ease-in-out ${sparkle.delay}s infinite, sparkle ${sparkle.duration * 0.7}s ease-in-out ${sparkle.delay}s infinite`,
              opacity: 0,
            }}
          />
        ))}
      </div>
      
      <style jsx>{`
        @keyframes sparkle {
          0%, 100% {
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          25% {
            opacity: 0.4;
            transform: scale(0.8) rotate(90deg);
          }
          50% {
            opacity: 0.7;
            transform: scale(1.2) rotate(180deg);
          }
          75% {
            opacity: 0.4;
            transform: scale(0.8) rotate(270deg);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px);
          }
          33% {
            transform: translateY(-15px) translateX(10px);
          }
          66% {
            transform: translateY(-5px) translateX(-10px);
          }
        }
      `}</style>
    </>
  );
}

function PublicGuestFeedback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const hostelFromURL = searchParams.get('hostel');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact: '',
    hostel: hostelFromURL || '',
    rating: 0,
    description: '',
    profilePictureUrl: '',
  });

  // UI State
  const [googleUser, setGoogleUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);

  // Debug URL
  useEffect(() => {
    console.log("🔌 PublicGuestFeedback mounted");
    console.log("🔌 BACKEND_URL:", BACKEND_URL);
    console.log("🔌 ImageKit endpoint:", `${BACKEND_URL}/upload/imagekit`);
  }, []);

  useEffect(() => {
    if (hostelFromURL && HOSTELS.includes(hostelFromURL)) {
      setFormData(prev => ({ ...prev, hostel: hostelFromURL }));
    }
  }, [hostelFromURL]);

  // ✅ FIXED: Upload image to ImageKit with correct endpoint
  const uploadToImageKit = async (imageUrl) => {
    try {
      console.log('📤 Starting ImageKit upload for:', imageUrl);
      
      // Method 1: Try URL upload first
      try {
        console.log('🌐 Attempting URL upload to:', `${BACKEND_URL}/api/upload/imagekit`);
        
        const uploadResponse = await axios.post(
          `${BACKEND_URL}/api/upload/imagekit`,  // ✅ FIXED: Added /api/ prefix
          {
            file: imageUrl,
            fileName: `guest-${Date.now()}.jpg`,
            folder: '/guest-profiles',
            useUrl: true
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 15000 // 15 second timeout
          }
        );
        
        console.log('✅ ImageKit upload successful (URL method):', uploadResponse.data.url);
        return uploadResponse.data.url;
        
      } catch (urlError) {
        console.log('⚠️ URL upload failed, trying base64 conversion...', urlError.message);
        
        // Method 2: Fallback to base64 upload
        const response = await fetch(imageUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        
        const base64String = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        console.log('🔄 Converting to base64, uploading...');
        
        const uploadResponse = await axios.post(
          `${BACKEND_URL}/api/upload/imagekit`,  // ✅ FIXED: Added /api/ prefix
          {
            file: base64String,
            fileName: `guest-${Date.now()}.jpg`,
            folder: '/guest-profiles'
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: 15000
          }
        );

        console.log('✅ ImageKit upload successful (base64 method):', uploadResponse.data.url);
        return uploadResponse.data.url;
      }
      
    } catch (err) {
      console.error('❌ ImageKit upload error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      // Return original Google URL as fallback
      console.log('⚠️ Using Google URL as fallback');
      return imageUrl;
    }
  };

  // ✅ Handle Google Login Success
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      console.log('🔐 Google User Data:', decoded);

      setGoogleUser(decoded);
      setIsAuthenticated(true);

      // Get profile picture URL from Google
      const profilePicUrl = decoded.picture || '';
      
      console.log('🖼️ Google Profile Picture URL:', profilePicUrl);

      // Set initial form data immediately (don't wait for ImageKit)
      setFormData(prev => ({
        ...prev,
        name: decoded.name || '',
        email: decoded.email || '',
        profilePictureUrl: profilePicUrl, // Use Google URL immediately
      }));

      // Upload to ImageKit in background (non-blocking)
      if (decoded.picture) {
        uploadToImageKit(decoded.picture).then(imagekitUrl => {
          if (imagekitUrl !== decoded.picture) {
            console.log('✅ Profile picture uploaded to ImageKit:', imagekitUrl);
            setFormData(prev => ({
              ...prev,
              profilePictureUrl: imagekitUrl,
            }));
          }
        }).catch(err => {
          console.error('⚠️ ImageKit upload failed, keeping Google URL:', err);
        });
      }

    } catch (err) {
      console.error('❌ Google login error:', err);
      setError('Failed to authenticate with Google. Please try again.');
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  // Handle Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.email.trim()) {
      setError('Email is required');
      return;
    }

    if (!formData.contact.trim() || !/^[0-9]{10}$/.test(formData.contact)) {
      setError('Valid 10-digit contact number is required');
      return;
    }

    if (!formData.hostel) {
      setError('Please select your hostel');
      return;
    }

    if (formData.rating === 0) {
      setError('Please provide a rating');
      return;
    }

    try {
      setLoading(true);

      console.log('📤 Submitting feedback:', {
        ...formData,
        endpoint: `${BACKEND_URL}/api/guest-feedback/submit`
      });

      const response = await axios.post(
        `${BACKEND_URL}/api/guest-feedback/submit`,  // ✅ FIXED: Added /api/ prefix
        {
          name: formData.name.trim(),
          contact: formData.contact.trim(),
          email: formData.email.trim(),
          hostel: formData.hostel,
          rating: formData.rating,
          description: formData.description.trim(),
          profilePictureUrl: formData.profilePictureUrl,
          submittedAt: new Date(),
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 10000
        }
      );

      console.log('✅ Feedback submitted successfully:', response.data);

      if (response.data.success) {
        setSuccess(true);
        setLoading(false);
        
        // Reset form after 3 seconds
        setTimeout(() => {
          setFormData({
            name: '',
            email: '',
            contact: '',
            hostel: hostelFromURL || '',
            rating: 0,
            description: '',
            profilePictureUrl: '',
          });
          setGoogleUser(null);
          setIsAuthenticated(false);
          setSuccess(false);
        }, 3000);
      }

    } catch (err) {
      console.error('❌ Submit feedback error:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      setLoading(false);
      setError(
        err.response?.data?.message || 
        'Failed to submit feedback. Please try again.'
      );
    }
  };

  // Star Rating Component
  const StarRating = () => {
    const ratingLabels = ['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'];
    
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="transition-transform hover:scale-125 active:scale-110"
            >
              <Star
                size={40}
                className={`${
                  star <= (hoveredStar || formData.rating)
                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                    : 'text-gray-300'
                } transition-all duration-200`}
              />
            </button>
          ))}
        </div>
        {formData.rating > 0 && (
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-red-500" />
            <p className="text-lg font-semibold text-gray-700">
              {ratingLabels[formData.rating]}
            </p>
            <Sparkles size={20} className="text-red-500" />
          </div>
        )}
      </div>
    );
  };

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 flex items-center justify-center p-4 relative overflow-hidden">
        <EnhancedSparkleBackground />
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative z-10 border-2 border-red-100">
          <div className="mb-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
              <CheckCircle className="text-green-600" size={48} />
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              Thank You! 🎉
            </h2>
            <p className="text-gray-600 mb-4">
              Your feedback has been submitted successfully.
            </p>
            <p className="text-sm text-gray-500">
              We appreciate your time and will use your feedback to improve our services.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 py-8 px-4 relative overflow-hidden">
      <EnhancedSparkleBackground />
      
      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 border-2 border-red-100">
          <div className="text-center">
            <img
              src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
              alt="Thapar Logo"
              className="w-24 h-auto mx-auto mb-4"
            />
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="text-red-500" size={24} />
              <h1 className="text-3xl font-bold text-gray-800">
                Guest Feedback Form
              </h1>
              <Sparkles className="text-red-500" size={24} />
            </div>
            <p className="text-gray-600">
              {hostelFromURL 
                ? `Share your experience at ${hostelFromURL}` 
                : 'Share your hostel experience with us'}
            </p>
          </div>
        </div>

        {/* Google Auth Section */}
        {!isAuthenticated ? (
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-red-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Sign in with Google 🔐
              </h2>
              <p className="text-gray-600">
                We'll auto-fill your details to make feedback quick and easy
              </p>
            </div>

            <div className="flex justify-center">
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="filled_blue"
                size="large"
                text="continue_with"
                shape="rectangular"
              />
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border-l-4 border-red-500 rounded flex items-start gap-2">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}
          </div>
        ) : (
          /* Feedback Form */
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8 border-2 border-red-100">
            {/* User Profile Preview */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-gradient-to-r from-red-50 via-pink-50 to-blue-50 rounded-xl border-2 border-red-200 shadow-sm">
              {formData.profilePictureUrl ? (
                <img
                  src={formData.profilePictureUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg ring-2 ring-red-200"
                  onError={(e) => {
                    console.error('❌ Image failed to load:', formData.profilePictureUrl);
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center shadow-lg ring-2 ring-red-200"
                style={{ display: formData.profilePictureUrl ? 'none' : 'flex' }}
              >
                <UserCircle className="text-gray-400" size={40} />
              </div>
              <div>
                <p className="font-semibold text-gray-800 text-lg">{googleUser?.name || 'Guest'}</p>
                <p className="text-sm text-gray-600">{googleUser?.email || 'No email'}</p>
              </div>
            </div>

            {/* Name Field */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition"
                placeholder="Your full name"
                required
              />
            </div>

            {/* Email Field */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition"
                placeholder="your.email@example.com"
                required
              />
            </div>

            {/* Contact Field */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.contact}
                onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition"
                placeholder="10-digit mobile number"
                maxLength={10}
                required
              />
            </div>

            {/* Hostel Field */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hostel <span className="text-red-500">*</span>
              </label>
              {hostelFromURL ? (
                <div className="px-4 py-3 bg-gradient-to-r from-red-50 to-blue-50 border-2 border-red-200 rounded-lg text-gray-700 font-semibold">
                  🏠 {formData.hostel}
                </div>
              ) : (
                <select
                  value={formData.hostel}
                  onChange={(e) => setFormData(prev => ({ ...prev, hostel: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition"
                  required
                >
                  <option value="">Select your hostel</option>
                  {HOSTELS.map(hostel => (
                    <option key={hostel} value={hostel}>{hostel}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Rating */}
            <div className="mb-6 bg-gray-50 rounded-xl p-6 border-2 border-gray-200">
              <label className="block text-sm font-semibold text-gray-700 mb-4 text-center">
                How was your experience? <span className="text-red-500">*</span>
              </label>
              <StarRating />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200 transition resize-none"
                rows={4}
                placeholder="Share your experience, suggestions, or concerns..."
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded flex items-start gap-2 animate-shake">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-lg font-bold text-lg hover:from-red-700 hover:to-red-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Send size={20} />
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 flex items-center justify-center gap-2">
            <Sparkles size={16} className="text-red-400" />
            Your feedback is valuable and helps us improve our services. Thank you! 🙏
            <Sparkles size={16} className="text-red-400" />
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicGuestFeedback;