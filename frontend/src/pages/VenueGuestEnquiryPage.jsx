// src/pages/VenueGuestEnquiryPage.jsx
// Public Venue Enquiry Form - Based on GuestEnquiryPage pattern
// ============================================================================

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";
import { Mail, CheckCircle2, Upload, X, FileText, Calendar, Clock, Users, Building2, AlertCircle } from "lucide-react";
import { isDailySlotOverlapping, timeToMinutes } from "../utils/dateUtils";
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
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import PublicPageWidgets from "../components/PublicPageWidgets";
import useVenueConfig from "../hooks/useVenueConfig";

const API = BACKEND_URL;
const INITIAL_FORM_STATE = {
  name: "",
  email: "",
  contact: "",
  department: "",
  hall: "",
  roomNo: "",
  societyName: "",
  eventName: "",
  societyEmail: "",
  presidentEmail: "",
  description: "",
  purpose: "",
  checkInDate: "",
  checkInTime: "",
  checkOutDate: "",
  checkOutTime: "",
  files: [],
};

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
  const { enabledVenueConfig } = useVenueConfig();
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [societySuggestions, setSocietySuggestions] = useState([]);
  const [showSocietySuggestions, setShowSocietySuggestions] = useState(false);
  const [eventSuggestions, setEventSuggestions] = useState([]);
  const [showEventSuggestions, setShowEventSuggestions] = useState(false);
  const [departmentSuggestions, setDepartmentSuggestions] = useState([]);
  const [showDepartmentSuggestions, setShowDepartmentSuggestions] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState(null);
  const [attachmentError, setAttachmentError] = useState("");
  
  const toastContext = useToast();
  const venueOptions = useMemo(
    () => getEnabledVenueFormOptions(enabledVenueConfig),
    [enabledVenueConfig]
  );
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };

  const checkAvailabilityFunc = useCallback(async () => {
    if (!form.hall || !form.roomNo || !form.checkInDate || !form.checkInTime || !form.checkOutDate || !form.checkOutTime) {
      setAvailabilityStatus(null);
      return;
    }

    // VALIDATION 1: Check if end date/time is after start date/time
    const startDateTime = new Date(`${form.checkInDate}T${form.checkInTime}`);
    const endDateTime = new Date(`${form.checkOutDate}T${form.checkOutTime}`);

    if (endDateTime <= startDateTime) {
      setAvailabilityStatus("invalid");
      return;
    }

    // VALIDATION 2: If same day, double check time order
    if (form.checkInDate === form.checkOutDate) {
      const startTimeMin = timeToMinutes(form.checkInTime);
      const endTimeMin = timeToMinutes(form.checkOutTime);
      if (endTimeMin <= startTimeMin) {
        setAvailabilityStatus("invalid");
        return;
      }
    }

    setAvailabilityStatus("checking");

    try {
      const response = await fetch(`${API}/api/venue-bookings`);
      if (!response.ok) {
        console.warn("Failed to fetch venue bookings");
        setAvailabilityStatus(null);
        return;
      }

      const data = await response.json();
      const bookings = Array.isArray(data) ? data : data.bookings || [];

      const relevantBookings = bookings.filter(booking => {
        const bookingVenue = `${booking.hall}||${booking.roomNo}`;
        const selectedVenue = `${form.hall}||${form.roomNo}`;
        return bookingVenue === selectedVenue && ["approved", "booked", "checked_in"].includes(booking.status?.toLowerCase());
      });

      let hasOverlap = false;
      for (const booking of relevantBookings) {
        // Use new daily slot overlap logic
        const overlap = isDailySlotOverlapping(
          form.checkInDate,
          form.checkOutDate,
          form.checkInTime,
          form.checkOutTime,
          booking.checkInDate || booking.from,
          booking.checkOutDate || booking.to,
          booking.checkInTime || "00:00",
          booking.checkOutTime || "23:59"
        );
        
        if (overlap) {
          hasOverlap = true;
          break;
        }
      }

      setAvailabilityStatus(hasOverlap ? "overlap" : "available");
    } catch (error) {
      console.warn("Availability check error:", error);
      setAvailabilityStatus(null);
    }
  }, [form.hall, form.roomNo, form.checkInDate, form.checkInTime, form.checkOutDate, form.checkOutTime]);

  useEffect(() => {
    const timer = setTimeout(() => {
      checkAvailabilityFunc();
    }, 500);

    return () => clearTimeout(timer);
  }, [form.hall, form.roomNo, form.checkInDate, form.checkInTime, form.checkOutDate, form.checkOutTime, checkAvailabilityFunc]);

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

  useEffect(() => {
    const query = form.department.trim().toLowerCase();
    if (!query) {
      setDepartmentSuggestions(VENUE_DEPARTMENTS);
      return;
    }

    const filtered = VENUE_DEPARTMENTS.filter(dept =>
      dept.toLowerCase().includes(query)
    );
    setDepartmentSuggestions(filtered);
  }, [form.department]);

  const handleIKSuccess = (res) => {
    const fileUrl = res?.url || res?.filePath;
    if (fileUrl) {
      setForm(prev => ({
        ...prev,
        files: [...prev.files, fileUrl]
      }));
      // ✅ Clear attachment error when file is uploaded
      setAttachmentError("");
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

  const handleCheckAvailabilityClick = () => {
    window.open("https://campusconnect.thapar.edu/venue-calendar", "_blank");
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
    if (!form.societyEmail || !form.societyEmail.includes("@")) {
      showToast("Please enter a valid society email", "warning");
      return false;
    }
    if (!form.presidentEmail || !form.presidentEmail.includes("@")) {
      showToast("Please enter a valid president email", "warning");
      return false;
    }
    
    // ✅ MANDATORY: Validate attachment is required
    if (!form.files || form.files.length === 0) {
      setAttachmentError("Attachment is required to submit the enquiry.");
      showToast("Attachment is required to submit the enquiry.", "warning");
      return false;
    }
    // Clear error if validation passes
    setAttachmentError("");
    
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
    // 🔒 PREVENT DOUBLE SUBMISSION
    if (isSubmitting) {
      return;
    }

    // 🔒 BLOCK IF FILES UPLOADING
    if (uploading) {
      showToast("Please wait for file upload to complete", "warning");
      return;
    }

    setIsSubmitting(true);

    try {
      const requestId = `${form.email}-${Date.now()}`;
      const payload = {
        ...form,
        requestId,
        status: "pending",
        submittedAt: new Date().toISOString(),
      };

      let res;
      try {
        res = await axios.post(`${API}/api/venue/enquiry/create`, payload, {
          timeout: 20000,
        });
      } catch (err) {
        if (err?.response?.status !== 404) throw err;
        res = await axios.post(`${API}/api/venue/enquiry`, payload, {
          timeout: 20000,
        });
      }

      console.log("✅ Venue enquiry submitted:", res.data);

      window.dispatchEvent(
        new CustomEvent("venueEnquiryCreated", {
          detail: res.data?.enquiry || null,
        })
      );

      setSubmitted(true);
      showToast("Enquiry submitted successfully!", "success");

    } catch (err) {
      console.error("❌ Submit error:", err);

      // 🚨 CRITICAL FIX: HANDLE FALSE 500 ERROR (backend saved but returned error)
      if (err?.response?.status === 500) {
        const msg = err?.response?.data?.message || "";
        console.warn("⚠️ Got 500 - checking if actually saved...");

        // If backend indicates duplicate/already saved
        if (msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("already")) {
          showToast("Enquiry already submitted.", "info");
          setSubmitted(true);
          return;
        }

        // Conservative approach: assume success on 500 with unclear reason
        // (This handles the case where backend saves but throws error)
        showToast(
          "Submission completed but server response unclear. Your enquiry may be saved. Please check your dashboard.",
          "warning"
        );
        setSubmitted(true);
        return;
      }

      // 🚨 TIMEOUT: Backend may have still processed
      if (err.code === "ECONNABORTED") {
        console.warn("⚠️ Request timeout - backend may have saved");
        showToast(
          "Request timeout. Your enquiry may have been submitted. Please check your dashboard.",
          "warning"
        );
        setSubmitted(true);
        return;
      }

      // ❌ REAL ERROR: Allow retry
      showToast("Submission failed. Please try again.", "error");

    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm(INITIAL_FORM_STATE);
    setIsAuthenticated(false);
    setSubmitted(false);
    setShowPreview(false);
  };

  return (
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
                        theme="filled_blue"
                        size="large"
                        text="continue_with"
                        shape="pill"
                        auto_select={false} // Disable auto-select to prevent FedCM conflicts
                        useOneTap={false}   // Disable One Tap to prevent AbortError and COOP issues
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

                      {/* NEW: Society & President Emails - Feature 3 */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <Mail className="w-4 h-4 inline mr-1" />
                            Society Email *
                          </label>
                          <input
                            type="email"
                            value={form.societyEmail}
                            onChange={(e) => setForm({ ...form, societyEmail: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="society@example.com"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            <Mail className="w-4 h-4 inline mr-1" />
                            President Email *
                          </label>
                          <input
                            type="email"
                            value={form.presidentEmail}
                            onChange={(e) => setForm({ ...form, presidentEmail: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="president@example.com"
                            required
                          />
                        </div>
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
                        <div className="relative">
                          <input
                            type="text"
                            value={form.department}
                            onChange={(e) => {
                              setForm({ ...form, department: e.target.value });
                              setShowDepartmentSuggestions(true);
                            }}
                            onFocus={() => setShowDepartmentSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowDepartmentSuggestions(false), 200)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none transition"
                            placeholder="Type or select department..."
                            required
                          />
                          {showDepartmentSuggestions && departmentSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                              {departmentSuggestions.map((dept, idx) => (
                                <div
                                  key={`${dept}-${idx}`}
                                  onClick={() => {
                                    setForm({ ...form, department: dept });
                                    setShowDepartmentSuggestions(false);
                                  }}
                                  className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                >
                                  {dept}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
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
                        {venueOptions.map((group) => (
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

                    {/* Daily Time Slot Helper Text */}
                    <div className="mb-6 text-center">
                      <p className="text-sm text-gray-500">
                         This time slot will be applied on a daily basis for the selected date range.
                      </p>
                    </div>
  
                    {/* Check Availability Button */}
                    <div className="mb-6 flex justify-center">
                      <button
                        type="button"
                        onClick={handleCheckAvailabilityClick}
                        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition font-medium"
                      >
                        Check Availability
                      </button>
                    </div>

                    {/* Availability Status */}
                    {availabilityStatus && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
                          availabilityStatus === "checking"
                            ? "bg-blue-50 border border-blue-200"
                            : availabilityStatus === "available"
                            ? "bg-green-50 border border-green-200"
                            : "bg-red-50 border border-red-200"
                        }`}
                      >
                        {availabilityStatus === "checking" && (
                          <>
                            <svg className="animate-spin h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span className="text-blue-700 text-sm font-medium">Checking availability...</span>
                          </>
                        )}
                        {availabilityStatus === "available" && (
                          <>
                            <CheckCircle2 className="text-green-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="text-green-700 text-sm font-medium">✅ Venue available for selected slot.</span>
                          </>
                        )}
                        {availabilityStatus === "invalid" && (
                          <>
                            <AlertCircle className="text-red-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="text-red-700 text-sm font-medium">❌ End time must be after start time</span>
                          </>
                        )}
                        {availabilityStatus === "overlap" && (
                          <>
                            <AlertCircle className="text-red-600 w-5 h-5 flex-shrink-0 mt-0.5" />
                            <span className="text-red-700 text-sm font-medium">❌ Selected date or time is already booked for this venue.</span>
                          </>
                        )}
                      </motion.div>
                    )}
  
                    {/* File Upload */}
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Upload className="w-4 h-4 inline mr-1" />
                        Attachments (Max 5 files, 5MB each)
                        <span className="text-red-600 ml-1">*</span>
                      </label>
                      
                      {/* ✅ Attachment validation error */}
                      {attachmentError && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-red-700 font-medium">{attachmentError}</span>
                        </div>
                      )}
                      
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
                        disabled={uploading || isSubmitting || availabilityStatus === "overlap" || availabilityStatus === "invalid" || availabilityStatus === "checking" || form.files.length === 0}
                        className="px-8 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Submitting...
                          </>
                        ) : (
                          "Preview & Submit"
                        )}
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
                  <p><strong>Society Email:</strong> {form.societyEmail}</p>
                  <p><strong>President Email:</strong> {form.presidentEmail}</p>
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
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleConfirmSubmit}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      "Confirm and Submit"
                    )}
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
        <PublicPageWidgets
          footerMode="flow"
          footerClassName="mt-auto pt-12 w-full"
          echoClassName="bottom-24"
        />
      </div>
    </IKContext>
  );
}
