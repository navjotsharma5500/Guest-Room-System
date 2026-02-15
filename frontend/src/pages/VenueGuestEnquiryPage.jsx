// src/pages/VenueGuestEnquiryPage.jsx
// Public Venue Enquiry Form - Based on GuestEnquiryPage pattern
// ============================================================================

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";
import { CheckCircle2, Upload, X, FileText, Calendar, Clock, Users, Building2 } from "lucide-react";
import thaparLogo from "../assets/thapar_logo.png";
import bgImage from "../assets/ThaparBackground1.png";
import axios from "axios";
import { IKContext, IKUpload } from "imagekitio-react";
import { 
  BACKEND_URL,
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
  IMAGEKIT_AUTH_ENDPOINT
} from "../utils/apiConfig";
import { getEnabledVenueFormOptions } from "../config/venueRoomsConfig";
import { VENUE_DEPARTMENTS } from "../config/venueDepartments"; // Re-import this
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

const API = BACKEND_URL;
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID";

const INITIAL_FORM_STATE = {
  name: "",
  email: "",
  contact: "",
  department: "",
  hall: "",
  roomNo: "",
  societyName: "",
  eventName: "",
  description: "",
  purpose: "",
  checkInDate: "",
  checkInTime: "",
  checkOutDate: "",
  checkOutTime: "",
  files: [],
};

const VENUE_OPTIONS = getEnabledVenueFormOptions();

const IMAGEKIT_CONFIG = {
  PUBLIC_KEY: IMAGEKIT_PUBLIC_KEY,
  URL_ENDPOINT: IMAGEKIT_URL_ENDPOINT,
  AUTH_ENDPOINT: IMAGEKIT_AUTH_ENDPOINT,
  FOLDER: "/venuebooking",
  MAX_FILES: 5,
  MAX_FILE_SIZE: 5 * 1024 * 1024,
  TAGS: ["venuebooking"],
};

const ALLOWED_FILE_TYPES = [
  "image/jpeg", "image/jpg", "image/png", "image/webp",
  "image/gif", "application/pdf",
];

// ImageKit Authenticator
const authenticator = async () => {
  try {
    const r = await fetch(IMAGEKIT_AUTH_ENDPOINT, { 
      method: "GET",
      credentials: "include",
      headers: { "Accept": "application/json" },
    });
    
    if (!r.ok) throw new Error(`Auth request failed ${r.status}`);
    
    const data = await r.json();
    return {
      signature: data.signature,
      expire: data.expire,
      token: data.token,
      publicKey: data.publicKey,
    };
  } catch (err) {
    console.error("ImageKit auth error:", err);
    throw err;
  }
};

export default function VenueGuestEnquiryPage() {
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [societySuggestions, setSocietySuggestions] = useState([]);
  const [showSocietySuggestions, setShowSocietySuggestions] = useState(false);
  const [eventSuggestions, setEventSuggestions] = useState([]);
  const [showEventSuggestions, setShowEventSuggestions] = useState(false);
  
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };

  useEffect(() => {
    const query = form.societyName.trim();
    if (!query) {
      setSocietySuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API}/api/venue/enquiry/society-suggestions?query=${encodeURIComponent(query)}&limit=15`
        );
        if (!res.ok) return;

        const data = await res.json();
        setSocietySuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch (error) {
        console.error("Failed to fetch society suggestions:", error);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [form.societyName]);

  useEffect(() => {
    const query = form.eventName.trim();
    if (!query) {
      setEventSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API}/api/venue/enquiry/event-suggestions?query=${encodeURIComponent(query)}&limit=15`
        );
        if (!res.ok) return;

        const data = await res.json();
        setEventSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch (error) {
        console.error("Failed to fetch event suggestions:", error);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [form.eventName]);

  const handleIKSuccess = (res) => {
    const fileUrl = res?.url || res?.filePath;
    if (fileUrl) {
      setForm(prev => ({
        ...prev,
        files: [...prev.files, fileUrl]
      }));
      showToast("File uploaded successfully", "success");
    }
    setUploading(false);
  };

  const handleIKError = (err) => {
    console.error("Upload error:", err);
    setUploadError(err.message || "Upload failed");
    setUploading(false);
    showToast("Upload failed. Please try again.", "error");
  };

  const removeFile = (index) => {
    setForm(prev => ({
      ...prev,
      files: prev.files.filter((_, i) => i !== index)
    }));
  };

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential);
      console.log("✅ Google Auth Success:", decoded);
      
      setForm(prev => ({
        ...prev,
        email: decoded.email,
        name: decoded.name || prev.name,
        // If google provides phone number (rarely), we could use it but usually they don't
      }));
      setIsAuthenticated(true);
      showToast(`Welcome, ${decoded.name}!`, "success");
    } catch (error) {
      console.error("❌ Google Auth Error:", error);
      showToast("Failed to authenticate with Google", "error");
    }
  };

  const handleGoogleError = () => {
    console.error("❌ Google Login Failed");
    showToast("Google authentication failed. Please try again.", "error");
  };

  const validateForm = () => {
    if (!form.name.trim()) {
      showToast("Please enter your name", "warning");
      return false;
    }
    if (!form.email.includes("@")) {
      showToast("Please enter a valid email", "warning");
      return false;
    }
    if (form.contact.length < 10) {
      showToast("Please enter a valid contact number", "warning");
      return false;
    }
    if (!form.department) {
      showToast("Please select your department", "warning");
      return false;
    }
    if (!form.hall || !form.roomNo) {
      showToast("Please select venue", "warning");
      return false;
    }
    if (!form.societyName.trim()) {
      showToast("Please enter society name", "warning");
      return false;
    }
    if (!form.eventName.trim()) {
      showToast("Please enter event name", "warning");
      return false;
    }
    if (!form.description.trim()) {
      showToast("Please describe your event", "warning");
      return false;
    }
    if (!form.checkInDate || !form.checkInTime) {
      showToast("Please select start date and time", "warning");
      return false;
    }
    if (!form.checkOutDate || !form.checkOutTime) {
      showToast("Please select end date and time", "warning");
      return false;
    }
    
    // Validate end is after start
    const start = new Date(`${form.checkInDate}T${form.checkInTime}`);
    const end = new Date(`${form.checkOutDate}T${form.checkOutTime}`);
    if (end <= start) {
      showToast("End date/time must be after start date/time", "warning");
      return false;
    }
    
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      showToast("Please authenticate with Google first", "warning");
      return;
    }

    if (validateForm()) {
      setShowPreview(true);
    }
  };

  const handleConfirmSubmit = async () => {
    try {
      const payload = {
        ...form,
        status: "pending",
        submittedAt: new Date().toISOString(),
      };

      let res;
      try {
        res = await axios.post(`${API}/api/venue/enquiry/create`, payload, {
          timeout: 20000,
        });
      } catch (err) {
        // Route-compatibility fallback for servers exposing POST /api/venue/enquiry
        if (err?.response?.status !== 404) throw err;
        res = await axios.post(`${API}/api/venue/enquiry`, payload, {
          timeout: 20000,
        });
      }
      
      console.log("✅ Venue enquiry submitted:", res.data);
      
      // Notify assistant page
      window.dispatchEvent(
        new CustomEvent("venueEnquiryCreated", {
          detail: res.data?.enquiry || null,
        })
      );
      
      setSubmitted(true);
      showToast("Enquiry submitted successfully!", "success");
    } catch (err) {
      console.error("❌ Submit error:", err);
      showToast("Submission failed. Please try again.", "error");
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM_STATE);
    setIsAuthenticated(false);
    setSubmitted(false);
    setShowPreview(false);
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <IKContext
      publicKey={IMAGEKIT_CONFIG.PUBLIC_KEY}
      urlEndpoint={IMAGEKIT_CONFIG.URL_ENDPOINT}
      authenticationEndpoint={IMAGEKIT_CONFIG.AUTH_ENDPOINT}
      authenticator={authenticator}
    >
      <div
        className="flex flex-col items-center justify-center min-h-screen bg-cover bg-center bg-fixed relative"
        style={{
          backgroundImage: `url(${bgImage})`,
          backgroundColor: "rgba(255,248,240,0.4)",
          backgroundBlendMode: "overlay",
        }}
      >
        <AnimatePresence mode="wait">
          {/* FORM VIEW */}
          {!submitted && !showPreview && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.6 }}
              className="w-full flex flex-col items-center px-4"
            >
              <motion.img src={thaparLogo} alt="Thapar Logo" className="w-40 mb-4" />
              <h1 className="text-3xl font-bold text-blue-700 mb-8 text-center">
                Venue Booking Enquiry Form
              </h1>

              <form
                onSubmit={handleSubmit}
                className="bg-white bg-opacity-90 border-2 border-blue-600 rounded-3xl shadow-xl p-8 w-full max-w-3xl"
              >
                {/* Google Auth Section */}
                {!isAuthenticated ? (
                  <div className="text-center py-8 mb-6 border-b-2 border-gray-100">
                    <p className="text-gray-700 mb-4 font-medium text-lg">
                      Please sign in with your Thapar Google Account to continue
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
                      className="flex items-center justify-center gap-2 bg-green-50 border-2 border-green-200 rounded-xl py-3 px-4 mb-8"
                    >
                      <CheckCircle2 className="text-green-600" size={20} />
                      <span className="text-green-700 font-semibold">
                        Authenticated as {form.email}
                      </span>
                    </motion.div>

                    {/* Personal Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition bg-gray-50"
                          required
                          // readOnly // Optional: if you want to force Google name
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          readOnly
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                        />
                      </div>
  
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Contact Number *
                        </label>
                        <input
                          type="tel"
                          value={form.contact}
                          onChange={(e) => setForm({ ...form, contact: e.target.value.replace(/[^0-9]/g, "") })}
                          maxLength={10}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition"
                          required
                          placeholder="Enter 10-digit mobile number"
                        />
                      </div>
  
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Department *
                        </label>
                        <select
                          value={form.department}
                          onChange={(e) => setForm({ ...form, department: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition"
                          required
                        >
                          <option value="">Select Department</option>
                          {VENUE_DEPARTMENTS.map((dept, idx) => (
                            <option key={`${dept}-${idx}`} value={dept}>{dept}</option>
                          ))}
                        </select>
                      </div>
                    </div>
  
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Venue *
                      </label>
                      <select
                        value={form.hall && form.roomNo ? `${form.hall}||${form.roomNo}` : ""}
                        onChange={(e) => {
                          const [hall, roomNo] = e.target.value.split("||");
                          setForm({ ...form, hall: hall || "", roomNo: roomNo || "" });
                        }}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition"
                        required
                      >
                        <option value="">Select Venue Room</option>
                        {VENUE_OPTIONS.map((group) => (
                          <optgroup key={group.groupId} label={group.groupLabel}>
                            {group.rooms.map((room) => (
                              <option key={`${group.hall}-${room}`} value={`${group.hall}||${room}`}>
                                {group.hall} - {room}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
  
                    {/* Event Information */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Society / Club Name *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.societyName}
                          onFocus={() => {
                            if (societySuggestions.length > 0) setShowSocietySuggestions(true);
                          }}
                          onBlur={() => {
                            setTimeout(() => setShowSocietySuggestions(false), 120);
                          }}
                          onChange={(e) => {
                            setForm({ ...form, societyName: e.target.value });
                            setShowSocietySuggestions(true);
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition"
                          required
                        />
                        {showSocietySuggestions && societySuggestions.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {societySuggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => {
                                  setForm((prev) => ({ ...prev, societyName: suggestion }));
                                  setShowSocietySuggestions(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
  
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Event Name *
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={form.eventName}
                          onFocus={() => {
                            if (eventSuggestions.length > 0) setShowEventSuggestions(true);
                          }}
                          onBlur={() => {
                            setTimeout(() => setShowEventSuggestions(false), 120);
                          }}
                          onChange={(e) => {
                            setForm({ ...form, eventName: e.target.value });
                            setShowEventSuggestions(true);
                          }}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition"
                          required
                        />
                        {showEventSuggestions && eventSuggestions.length > 0 && (
                          <div className="absolute z-20 top-full left-0 right-0 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {eventSuggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => {
                                  setForm((prev) => ({ ...prev, eventName: suggestion }));
                                  setShowEventSuggestions(false);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
  
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Event Description *
                      </label>
                      <textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        rows={4}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition resize-none"
                        placeholder="Describe your event, expected number of attendees, and any special requirements..."
                        required
                      />
                    </div>
  
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Purpose (Optional)
                      </label>
                      <textarea
                        value={form.purpose}
                        onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition resize-none"
                        placeholder="Purpose of booking"
                      />
                    </div>
  
                    {/* Date and Time */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          Start Date *
                        </label>
                        <input
                          type="date"
                          value={form.checkInDate}
                          onChange={(e) => setForm({ ...form, checkInDate: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition"
                          required
                        />
                      </div>
  
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Start Time *
                        </label>
                        <input
                          type="time"
                          value={form.checkInTime}
                          onChange={(e) => setForm({ ...form, checkInTime: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition"
                          required
                        />
                      </div>
  
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Calendar className="w-4 h-4 inline mr-1" />
                          End Date *
                        </label>
                        <input
                          type="date"
                          value={form.checkOutDate}
                          onChange={(e) => setForm({ ...form, checkOutDate: e.target.value })}
                          min={form.checkInDate}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition"
                          required
                        />
                      </div>
  
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          <Clock className="w-4 h-4 inline mr-1" />
                          End Time *
                        </label>
                        <input
                          type="time"
                          value={form.checkOutTime}
                          onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition"
                          required
                        />
                      </div>
                    </div>
  
                    {/* File Upload */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Upload className="w-4 h-4 inline mr-1" />
                        Attachments (Max 5 files, 5MB each)
                      </label>
                      
                      {form.files.length < IMAGEKIT_CONFIG.MAX_FILES && (
                        <IKUpload
                          folder={IMAGEKIT_CONFIG.FOLDER}
                          tags={IMAGEKIT_CONFIG.TAGS}
                          onSuccess={handleIKSuccess}
                          onError={handleIKError}
                          onUploadStart={() => setUploading(true)}
                          validateFile={(file) => {
                            if (!ALLOWED_FILE_TYPES.includes(file.type)) {
                              showToast("Invalid file type", "error");
                              return false;
                            }
                            if (file.size > IMAGEKIT_CONFIG.MAX_FILE_SIZE) {
                              showToast("File too large (max 5MB)", "error");
                              return false;
                            }
                            return true;
                          }}
                          className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-600 cursor-pointer transition"
                        />
                      )}
  
                      {form.files.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {form.files.map((url, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between bg-blue-50 p-2 rounded"
                            >
                              <span className="text-sm truncate flex-1">
                                {url.split("/").pop()}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeFile(idx)}
                                className="ml-2 text-red-600 hover:text-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
  
                      {uploading && (
                        <p className="text-sm text-blue-600 mt-2">Uploading...</p>
                      )}
                    </div>
  
                    {/* Submit Button */}
                    <div className="flex justify-center">
                      <button
                        type="submit"
                        disabled={uploading}
                        className="px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Preview & Submit
                      </button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          )}

          {/* PREVIEW VIEW */}
          {showPreview && !submitted && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.6 }}
              className="w-full flex flex-col items-center px-4"
            >
              <motion.img src={thaparLogo} alt="Thapar Logo" className="w-40 mb-4" />
              <h1 className="text-3xl font-bold text-blue-700 mb-6">
                Review Your Information
              </h1>

              <div className="bg-white bg-opacity-90 border-2 border-blue-600 rounded-3xl shadow-xl p-8 w-full max-w-3xl">
                <div className="grid grid-cols-2 gap-4 text-gray-700 text-sm mb-4">
                  <p><strong>Name:</strong> {form.name}</p>
                  <p><strong>Email:</strong> {form.email}</p>
                  <p><strong>Contact:</strong> {form.contact}</p>
                  <p><strong>Department:</strong> {form.department}</p>
                  <p><strong>Venue:</strong> {form.hall} - {form.roomNo}</p>
                  <p><strong>Society/Club:</strong> {form.societyName}</p>
                  <p><strong>Event Name:</strong> {form.eventName}</p>
                </div>

                <div className="mb-4">
                  <p><strong>Event Description:</strong></p>
                  <p className="bg-gray-50 p-3 rounded mt-1 text-sm">{form.description}</p>
                </div>

                {form.purpose && (
                  <div className="mb-4">
                    <p><strong>Purpose:</strong></p>
                    <p className="bg-gray-50 p-3 rounded mt-1 text-sm">{form.purpose}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                  <p><strong>Start:</strong> {form.checkInDate} at {form.checkInTime}</p>
                  <p><strong>End:</strong> {form.checkOutDate} at {form.checkOutTime}</p>
                </div>

                <p className="mb-2"><strong>Files Uploaded:</strong> {form.files.length}</p>

                <div className="flex justify-center gap-4 mt-6">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-6 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700"
                  >
                    Confirm and Submit
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* THANK YOU VIEW */}
          {submitted && (
            <motion.div
              key="thankyou"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="flex flex-col items-center text-center bg-white bg-opacity-90 border-2 border-blue-500 rounded-3xl shadow-xl p-10 max-w-lg mx-auto"
            >
              <img src={thaparLogo} alt="Thapar Logo" className="w-24 mb-4" />
              <CheckCircle2 className="text-green-500 w-16 h-16 mb-4" />
              <h2 className="text-3xl font-bold text-blue-700 mb-3">Thank You!</h2>
              <p className="text-gray-700 mb-6">
                Your venue booking enquiry has been submitted successfully.
                Our team will review it and get back to you soon.
              </p>
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
              >
                Submit Another Enquiry
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="fixed bottom-4 right-6 z-50 flex flex-col items-end gap-1">
          <div className="bg-white/90 backdrop-blur-sm text-slate-700 px-4 py-2 rounded-full shadow-lg text-sm font-medium border border-gray-100 flex flex-col items-center">
            <a 
              href="https://www.linkedin.com/in/navjot-sharma-8360631a7/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-blue-700 transition-colors"
            >
              Created and Maintained by <span className="font-semibold text-blue-600">DoSA Office</span>
            </a>
          </div>
        </div>
      </div>
    </IKContext>
    </GoogleOAuthProvider>
  );
}
