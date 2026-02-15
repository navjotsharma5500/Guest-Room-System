// src/pages/PublicGuestFeedback.jsx
// ============================================================================
//Profile Picture Display & No Loading Animation
// ============================================================================

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { Star, Send, CheckCircle, AlertCircle, UserCircle } from 'lucide-react';
import axios from 'axios';
import { BACKEND_URL } from '../utils/apiConfig';

const HOSTELS = [
  'Agira Hall (A)', 'Budh Hall (B)', 'Cauvery Hall (C)', 'Damodar Hall (D)',
  'Eros Hall (E)', 'Falgu Hall (F)', 'Gomti Hall (G)', 'Hooghly Hall (H)',
  'Jhelum Hall (J)', 'Kosi Hall (K)', 'Lohit Hall (L)', 'Mahanadi Hall (M)',
  'Narmada Hall (N)'
];

function PublicGuestFeedbackFixed() {
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

  useEffect(() => {
    if (hostelFromURL && HOSTELS.includes(hostelFromURL)) {
      setFormData(prev => ({ ...prev, hostel: hostelFromURL }));
    }
  }, [hostelFromURL]);

  // ✅ FIXED: Upload image to ImageKit
  const uploadToImageKit = async (imageUrl) => {
    try {
      console.log('📤 Starting ImageKit upload for:', imageUrl);
      
      // Method 1: Try direct URL upload (ImageKit supports this)
      try {
        const uploadResponse = await axios.post(`${BACKEND_URL}/api/upload/imagekit`, {
          file: imageUrl, // Send URL directly
          fileName: `guest-profile-${Date.now()}.jpg`,
          folder: '/guest-profiles',
          useUrl: true // Flag to indicate URL upload
        });
        
        console.log('✅ ImageKit upload successful (URL method):', uploadResponse.data.url);
        return uploadResponse.data.url;
      } catch (urlError) {
        console.log('⚠️ URL upload failed, trying base64...', urlError.message);
        
        // Method 2: Fallback to base64 upload
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        
        const base64String = await base64Promise;
        
        const uploadResponse = await axios.post(`${BACKEND_URL}/api/upload/imagekit`, {
          file: base64String,
          fileName: `guest-profile-${Date.now()}.jpg`,
          folder: '/guest-profiles'
        });

        console.log('✅ ImageKit upload successful (base64 method):', uploadResponse.data.url);
        return uploadResponse.data.url;
      }
    } catch (err) {
      console.error('❌ ImageKit upload error:', err);
      // Return original Google URL as fallback
      return imageUrl;
    }
  };

  // ✅ FIXED: Handle Google Login Success
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      console.log('🔐 Google User Data:', decoded);

      setGoogleUser(decoded);
      setIsAuthenticated(true);

      // Get profile picture URL from Google
      let profilePicUrl = decoded.picture || '';
      
      console.log('🖼️ Google Profile Picture URL:', profilePicUrl);

      // Upload to ImageKit in background (non-blocking)
      if (decoded.picture) {
        uploadToImageKit(decoded.picture).then(imagekitUrl => {
          console.log('✅ Profile picture uploaded to ImageKit:', imagekitUrl);
          setFormData(prev => ({
            ...prev,
            profilePictureUrl: imagekitUrl,
          }));
        }).catch(err => {
          console.error('⚠️ ImageKit upload failed, using Google URL:', err);
          setFormData(prev => ({
            ...prev,
            profilePictureUrl: profilePicUrl,
          }));
        });
      }

      // Set initial form data immediately (don't wait for ImageKit)
      setFormData(prev => ({
        ...prev,
        name: decoded.name || '',
        email: decoded.email || '',
        profilePictureUrl: profilePicUrl, // Use Google URL immediately
      }));

    } catch (err) {
      console.error('❌ Google login error:', err);
      setError('Failed to authenticate with Google. Please try again.');
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  // ✅ FIXED: Handle Form Submit (no loading animation)
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

      const response = await axios.post(
        `${BACKEND_URL}/api/guest-feedback/submit`,
        {
          name: formData.name.trim(),
          contact: formData.contact.trim(),
          email: formData.email.trim(),
          hostel: formData.hostel,
          rating: formData.rating,
          description: formData.description.trim(),
          profilePictureUrl: formData.profilePictureUrl,
          submittedAt: new Date(),
        }
      );

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
      console.error('❌ Submit error:', err);
      setError(err.response?.data?.message || 'Failed to submit feedback. Please try again.');
      setLoading(false);
    }
  };

  // Star Rating Component
  const StarRating = () => (
    <div className="flex items-center gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
          onMouseEnter={() => setHoveredStar(star)}
          onMouseLeave={() => setHoveredStar(0)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <Star
            size={40}
            fill={star <= (hoveredStar || formData.rating) ? '#F59E0B' : 'none'}
            stroke={star <= (hoveredStar || formData.rating) ? '#F59E0B' : '#D1D5DB'}
            strokeWidth={2}
          />
        </button>
      ))}
      {formData.rating > 0 && (
        <span className="ml-2 text-sm font-semibold text-gray-700">
          {['', 'Poor', 'Below Average', 'Average', 'Good', 'Excellent'][formData.rating]}
        </span>
      )}
    </div>
  );

  // Success Screen
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Thank You! 🎉</h2>
          <p className="text-gray-600 mb-4">
            Your feedback has been submitted successfully.
          </p>
          <p className="text-sm text-gray-500">
            We appreciate your time and will use your feedback to improve our services.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center">
            <img
              src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
              alt="Thapar Logo"
              className="w-24 h-auto mx-auto mb-4"
            />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Guest Feedback Form
            </h1>
            <p className="text-gray-600">
              {hostelFromURL 
                ? `Share your experience at ${hostelFromURL}` 
                : 'Share your hostel experience with us'}
            </p>
          </div>
        </div>

        {/* Google Auth Section */}
        {!isAuthenticated ? (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Sign in with Google
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
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-8">
            {/* ✅ FIXED: User Profile Preview with actual image */}
            <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
              {formData.profilePictureUrl ? (
                <img
                  src={formData.profilePictureUrl}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover border-2 border-red-200"
                  onError={(e) => {
                    console.error('❌ Image failed to load:', formData.profilePictureUrl);
                    // Fallback to default avatar on error
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center"
                style={{ display: formData.profilePictureUrl ? 'none' : 'flex' }}
              >
                <UserCircle className="text-gray-400" size={40} />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{googleUser?.name || 'Guest'}</p>
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
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition"
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
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition"
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
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition"
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
                <div className="px-4 py-3 bg-gray-100 border-2 border-gray-200 rounded-lg text-gray-700 font-semibold">
                  {formData.hostel}
                </div>
              ) : (
                <select
                  value={formData.hostel}
                  onChange={(e) => setFormData(prev => ({ ...prev, hostel: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition"
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
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Rating <span className="text-red-500">*</span>
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
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-red-500 focus:outline-none transition resize-none"
                rows={4}
                placeholder="Share your experience, suggestions, or concerns..."
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded flex items-start gap-2">
                <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* ✅ FIXED: Submit Button - No loading spinner */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 rounded-lg font-bold text-lg hover:from-red-700 hover:to-red-800 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              <Send size={20} />
              {loading ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Your feedback is valuable and helps us improve our services. Thank you!
          </p>
        </div>
      </div>
    </div>
  );
}

export default PublicGuestFeedbackFixed;