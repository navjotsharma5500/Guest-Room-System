// src/components/HallBookings/HallBookingModal.jsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Calendar, Clock, User, Mail, Phone, Building, FileText, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { IKContext, IKUpload } from "imagekitio-react";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { 
  BACKEND_URL,
  IMAGEKIT_PUBLIC_KEY, 
  IMAGEKIT_URL_ENDPOINT, 
  IMAGEKIT_AUTH_ENDPOINT 
} from "../../utils/apiConfig";
import AttachmentGrid from "../AttachmentGrid";
import { VENUE_DEPARTMENTS } from "../../config/venueDepartments";

const API = BACKEND_URL;

// ImageKit authenticator
const authenticator = async () => {
  try {
    const response = await fetch(IMAGEKIT_AUTH_ENDPOINT, { 
      method: "GET",
      credentials: "include"
    });
    
    if (!response.ok) {
      throw new Error(`Auth request failed ${response.status}`);
    }
    
    const data = await response.json();
    return {
      signature: data.signature,
      expire: data.expire,
      token: data.token,
      publicKey: data.publicKey,
    };
  } catch (err) {
    console.error("❌ ImageKit authenticator error:", err);
    throw err;
  }
};

export default function VenueBookingModal({
  theme,
  selectedRooms,
  checkIn,
  checkOut,
  prefill,
  onClose,
  onSubmit,
}) {
  useEscapeKey(onClose);
  const { showToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: prefill?.name || "",
    societyName: prefill?.societyName || "",
    eventName: prefill?.eventName || "",
    department: prefill?.department || "",
    contact: prefill?.contact || "",
    email: prefill?.email || "",
    checkInDate: checkIn || prefill?.checkInDate || "",
    checkInTime: prefill?.checkInTime || "",
    checkOutDate: checkOut || prefill?.checkOutDate || "",
    checkOutTime: prefill?.checkOutTime || "",
    purpose: prefill?.purpose || "",
    description: prefill?.description || "",
    attachments: Array.isArray(prefill?.attachments) ? prefill.attachments : [],
  });

  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [step, setStep] = useState(1);
  const [societySuggestions, setSocietySuggestions] = useState([]);
  const [showSocietySuggestions, setShowSocietySuggestions] = useState(false);
  const [eventSuggestions, setEventSuggestions] = useState([]);
  const [showEventSuggestions, setShowEventSuggestions] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setFormData((prev) => ({
      ...prev,
      name: prefill.name || prev.name,
      societyName: prefill.societyName || prev.societyName,
      eventName: prefill.eventName || prev.eventName,
      department: prefill.department || prev.department,
      contact: prefill.contact || prev.contact,
      email: prefill.email || prev.email,
      checkInDate: prefill.checkInDate || prev.checkInDate,
      checkInTime: prefill.checkInTime || prev.checkInTime,
      checkOutDate: prefill.checkOutDate || prev.checkOutDate,
      checkOutTime: prefill.checkOutTime || prev.checkOutTime,
      purpose: prefill.purpose || prev.purpose,
      description: prefill.description || prev.description,
      attachments: Array.isArray(prefill.attachments) ? prefill.attachments : prev.attachments,
    }));
  }, [prefill]);

  useEffect(() => {
    const query = formData.societyName.trim();
    if (!query) {
      setSocietySuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API}/api/venue/enquiry/society-suggestions?query=${encodeURIComponent(query)}&limit=15`,
          { method: "GET", credentials: "include" }
        );
        if (!response.ok) return;

        const data = await response.json();
        setSocietySuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch (error) {
        console.error("Failed to fetch society suggestions:", error);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formData.societyName]);

  useEffect(() => {
    const query = formData.eventName.trim();
    if (!query) {
      setEventSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API}/api/venue/enquiry/event-suggestions?query=${encodeURIComponent(query)}&limit=15`,
          { method: "GET", credentials: "include" }
        );
        if (!response.ok) return;

        const data = await response.json();
        setEventSuggestions(Array.isArray(data?.suggestions) ? data.suggestions : []);
      } catch (error) {
        console.error("Failed to fetch event suggestions:", error);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formData.eventName]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "societyName") {
      setShowSocietySuggestions(true);
    }
    
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // ImageKit upload handlers
  const handleUploadStart = () => {
    setUploading(true);
    setUploadError("");
  };

  const handleUploadSuccess = (res) => {
    console.log("✅ ImageKit upload success:", res);
    
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, res.url],
    }));
    
    setUploading(false);
    showToast("✅ File uploaded successfully", "success");
    
    // Clear error if it was about attachments
    if (errors.attachments) {
      setErrors((prev) => ({ ...prev, attachments: "" }));
    }
  };

  const handleUploadError = (err) => {
    console.error("❌ ImageKit upload error:", err);
    setUploading(false);
    setUploadError("Failed to upload file. Please try again.");
    showToast("❌ File upload failed", "error");
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  // Validation functions
  const validateForm = () => {
    const newErrors = {};

    // Step 1 validations
    if (step >= 1) {
      if (!formData.name.trim()) newErrors.name = "Name is required";
      if (!formData.eventName.trim()) newErrors.eventName = "Event name is required";
      if (!formData.department) newErrors.department = "Department is required";
      
      // Contact validation (optional, but if provided must be 10 digits)
      if (formData.contact.trim() && !/^\d{10}$/.test(formData.contact)) {
        newErrors.contact = "Contact must be exactly 10 digits";
      }
      
      // Email validation (@thapar.edu only)
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!formData.email.endsWith("@thapar.edu")) {
        newErrors.email = "Email must be @thapar.edu";
      }
    }

    // Step 2 validations
    if (step >= 2) {
      if (!formData.checkInDate) newErrors.checkInDate = "Check-in date is required";
      if (!formData.checkInTime) newErrors.checkInTime = "Check-in time is required";
      if (!formData.checkOutDate) newErrors.checkOutDate = "Check-out date is required";
      if (!formData.checkOutTime) newErrors.checkOutTime = "Check-out time is required";

      // Date & Time validation - Allow same-day bookings
      if (formData.checkInDate && formData.checkOutDate && formData.checkInTime && formData.checkOutTime) {
        const checkInDateTime = new Date(`${formData.checkInDate}T${formData.checkInTime}`);
        const checkOutDateTime = new Date(`${formData.checkOutDate}T${formData.checkOutTime}`);
        
        if (checkOutDateTime <= checkInDateTime) {
          newErrors.checkOutTime = "Check-out must be after check-in time";
        }
        
        // Minimum booking duration: 5 minutes
        const durationInMinutes = (checkOutDateTime - checkInDateTime) / (1000 * 60);
        if (durationInMinutes < 5) {
          newErrors.checkOutTime = "Minimum booking duration is 5 minutes";
        }
      }
    }

    // Step 3 validations
    if (step >= 3) {
      if (formData.attachments.length === 0) {
        newErrors.attachments = "At least one attachment is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canProceedToNext = () => {
    if (step === 1) {
      return (
        formData.name.trim() &&
        formData.eventName.trim() &&
        formData.department &&
        (!formData.contact.trim() || /^\d{10}$/.test(formData.contact)) &&
        formData.email.endsWith("@thapar.edu")
      );
    }
    if (step === 2) {
      if (!formData.checkInDate || !formData.checkInTime || !formData.checkOutDate || !formData.checkOutTime) {
        return false;
      }
      
      const checkInDateTime = new Date(`${formData.checkInDate}T${formData.checkInTime}`);
      const checkOutDateTime = new Date(`${formData.checkOutDate}T${formData.checkOutTime}`);
      const durationInMinutes = (checkOutDateTime - checkInDateTime) / (1000 * 60);
      
      return checkOutDateTime > checkInDateTime && durationInMinutes >= 5;
    }
    if (step === 3) {
      return formData.attachments.length > 0;
    }
    return false;
  };

  const handleNext = () => {
    if (validateForm() && canProceedToNext()) {
      setStep((prev) => prev + 1);
    } else {
      showToast("⚠️ Please fill all required fields correctly", "warning");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast("⚠️ Please fill all required fields correctly", "warning");
      return;
    }

    // Pass data to parent handler
    await onSubmit(formData);
  };

  return (
    <IKContext
      publicKey={IMAGEKIT_PUBLIC_KEY}
      urlEndpoint={IMAGEKIT_URL_ENDPOINT}
      authenticator={authenticator}
    >
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-md flex justify-center items-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className={`
            relative w-full max-w-2xl max-h-[90vh] overflow-hidden
            rounded-lg shadow-2xl
            ${theme === "dark" ? "bg-[#292a2d]" : "bg-white"}
          `}
        >
          {/* Header */}
          <div className={`
            px-6 py-4 border-b flex items-center justify-between
            ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}
          `}>
            <div>
              <h2 className={`text-xl font-normal ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}>
                {step === 1 ? "Guest Information" : step === 2 ? "Booking Details" : step === 3 ? "Attachments" : "Review"}
              </h2>
              <p className={`text-sm mt-1 ${
                theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
              }`}>
                Step {step} of 4
              </p>
            </div>
            <button
              onClick={onClose}
              className={`
                p-2 rounded-full transition-colors
                ${theme === "dark" 
                  ? "hover:bg-[#3c4043] text-[#9aa0a6]" 
                  : "hover:bg-[#f1f3f4] text-[#5f6368]"
                }
              `}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
            <AnimatePresence mode="wait">
              {/* Step 1: Basic Information */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-6"
                >
                  <div className="mb-6">
                    <h3 className={`text-xl font-semibold flex items-center gap-2 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      <User className="w-6 h-6 text-red-600" />
                      Basic Information
                    </h3>
                    <p className={`text-sm mt-1 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}>
                      Please provide the event and contact details
                    </p>
                  </div>

                  {/* Selected Rooms Display */}
                  <div className={`p-5 rounded-2xl border-2 ${
                    theme === "dark"
                      ? "bg-blue-900/20 border-blue-700"
                      : "bg-blue-50 border-blue-200"
                  }`}>
                    <p className={`text-sm font-semibold mb-3 flex items-center gap-2 ${
                      theme === "dark" ? "text-blue-400" : "text-blue-700"
                    }`}>
                      <CheckCircle className="w-4 h-4" />
                      Selected Halls/Rooms ({selectedRooms.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedRooms.map((room, idx) => (
                        <motion.span
                          key={idx}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`px-4 py-2 rounded-full text-sm font-medium shadow-md ${
                            theme === "dark"
                              ? "bg-blue-800 text-blue-100"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {room.hall} — {room.roomNo}
                        </motion.span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Name */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <User className="w-4 h-4 text-red-600" />
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className={`
                          w-full px-4 py-3 rounded border text-sm
                          transition-all duration-200 outline-none
                          ${errors.name 
                            ? "border-red-500 focus:border-red-500" 
                            : theme === "dark"
                            ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                            : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                          }
                        `}
                        placeholder="Your name"
                      />
                      {errors.name && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {errors.name}
                        </motion.p>
                      )}
                    </div>

                    {/* Society Name */}
                    <div className="relative">
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <Building className="w-4 h-4 text-red-600" />
                        Society Name
                      </label>
                      <input
                        type="text"
                        name="societyName"
                        value={formData.societyName}
                        onFocus={() => {
                          if (societySuggestions.length > 0) setShowSocietySuggestions(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowSocietySuggestions(false), 120);
                        }}
                        onChange={handleChange}
                        className={`
                          w-full px-4 py-3 rounded border text-sm
                          transition-all duration-200 outline-none
                          ${errors.societyName 
                            ? "border-red-500 focus:border-red-500" 
                            : theme === "dark"
                            ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                            : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                          }
                        `}
                        placeholder="Society name"
                      />
                      {showSocietySuggestions && societySuggestions.length > 0 && (
                        <div
                          className={`absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded border shadow-lg ${
                            theme === "dark"
                              ? "bg-[#3c4043] border-[#5f6368]"
                              : "bg-white border-[#dadce0]"
                          }`}
                        >
                          {societySuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, societyName: suggestion }));
                                setShowSocietySuggestions(false);
                                if (errors.societyName) {
                                  setErrors((prev) => ({ ...prev, societyName: "" }));
                                }
                              }}
                              className={`w-full px-3 py-2 text-left text-sm ${
                                theme === "dark"
                                  ? "text-[#e8eaed] hover:bg-[#5f6368]"
                                  : "text-[#202124] hover:bg-[#f1f3f4]"
                              }`}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                      {errors.societyName && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {errors.societyName}
                        </motion.p>
                      )}
                    </div>

                    {/* Event Name */}
                    <div className="relative">
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <FileText className="w-4 h-4 text-red-600" />
                        Event Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="eventName"
                        value={formData.eventName}
                        onFocus={() => {
                          if (eventSuggestions.length > 0) setShowEventSuggestions(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowEventSuggestions(false), 120);
                        }}
                        onChange={(e) => {
                          handleChange(e);
                          setShowEventSuggestions(true);
                        }}
                        className={`
                          w-full px-4 py-3 rounded border text-sm
                          transition-all duration-200 outline-none
                          ${errors.eventName 
                            ? "border-red-500 focus:border-red-500" 
                            : theme === "dark"
                            ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                            : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                          }
                        `}
                        placeholder="Event name"
                      />
                      {showEventSuggestions && eventSuggestions.length > 0 && (
                        <div
                          className={`absolute z-30 mt-1 w-full max-h-52 overflow-y-auto rounded border shadow-lg ${
                            theme === "dark"
                              ? "bg-[#3c4043] border-[#5f6368]"
                              : "bg-white border-[#dadce0]"
                          }`}
                        >
                          {eventSuggestions.map((suggestion) => (
                            <button
                              key={suggestion}
                              type="button"
                              onClick={() => {
                                setFormData((prev) => ({ ...prev, eventName: suggestion }));
                                setShowEventSuggestions(false);
                                if (errors.eventName) {
                                  setErrors((prev) => ({ ...prev, eventName: "" }));
                                }
                              }}
                              className={`w-full px-3 py-2 text-left text-sm ${
                                theme === "dark"
                                  ? "text-[#e8eaed] hover:bg-[#5f6368]"
                                  : "text-[#202124] hover:bg-[#f1f3f4]"
                              }`}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                      {errors.eventName && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {errors.eventName}
                        </motion.p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Contact */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <Phone className="w-4 h-4 text-red-600" />
                        Contact
                      </label>
                      <input
                        type="tel"
                        name="contact"
                        value={formData.contact}
                        onChange={handleChange}
                        maxLength={10}
                        className={`
                          w-full px-4 py-3 rounded border text-sm
                          transition-all duration-200 outline-none
                          ${errors.contact 
                            ? "border-red-500 focus:border-red-500" 
                            : theme === "dark"
                            ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                            : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                          }
                        `}
                        placeholder="10 digit number (optional)"
                      />
                      {errors.contact && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {errors.contact}
                        </motion.p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <Mail className="w-4 h-4 text-red-600" />
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={`
                          w-full px-4 py-3 rounded border text-sm
                          transition-all duration-200 outline-none
                          ${errors.email 
                            ? "border-red-500 focus:border-red-500" 
                            : theme === "dark"
                            ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                            : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                          }
                        `}
                        placeholder="example@thapar.edu"
                      />
                      {errors.email && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {errors.email}
                        </motion.p>
                      )}
                    </div>

                    {/* Department */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <Building className="w-4 h-4 text-red-600" />
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className={`
                          w-full px-4 py-3 rounded border text-sm
                          transition-all duration-200 outline-none
                          ${errors.department
                            ? "border-red-500 focus:border-red-500"
                            : theme === "dark"
                            ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                            : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                          }
                        `}
                      >
                        <option value="">Select Department</option>
                        {VENUE_DEPARTMENTS.map((dept, idx) => (
                          <option key={`${dept}-${idx}`} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                      {errors.department && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {errors.department}
                        </motion.p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Date & Time */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-6"
                >
                  <div className="mb-6">
                    <h3 className={`text-xl font-semibold flex items-center gap-2 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      <Calendar className="w-6 h-6 text-red-600" />
                      Schedule Details
                    </h3>
                    <p className={`text-sm mt-1 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}>
                      Select check-in and check-out dates & times
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Check-in Date */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <Calendar className="w-4 h-4 text-green-600" />
                        Check-in Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="checkInDate"
                        value={formData.checkInDate}
                        onChange={handleChange}
                        className={`
                          w-full px-4 py-3 rounded border text-sm
                          transition-all duration-200 outline-none
                          ${errors.checkInDate 
                            ? "border-red-500 focus:border-red-500" 
                            : theme === "dark"
                            ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                            : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                          }
                        `}
                      />
                      {errors.checkInDate && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {errors.checkInDate}
                        </motion.p>
                      )}
                    </div>

                    {/* Check-in Time */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <Clock className="w-4 h-4 text-green-600" />
                        Check-in Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="checkInTime"
                        value={formData.checkInTime}
                        onChange={handleChange}
                        className={`
                          w-full px-4 py-3 rounded border text-sm
                          transition-all duration-200 outline-none
                          ${errors.checkInTime 
                            ? "border-red-500 focus:border-red-500" 
                            : theme === "dark"
                            ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                            : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                          }
                        `}
                      />
                      {errors.checkInTime && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {errors.checkInTime}
                        </motion.p>
                      )}
                    </div>

                    {/* Check-out Date */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <Calendar className="w-4 h-4 text-red-600" />
                        Check-out Date <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="checkOutDate"
                        value={formData.checkOutDate}
                        onChange={handleChange}
                        min={formData.checkInDate}
                        className={`
                          w-full px-4 py-3 rounded border text-sm
                          transition-all duration-200 outline-none
                          ${errors.checkOutDate 
                            ? "border-red-500 focus:border-red-500" 
                            : theme === "dark"
                            ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                            : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                          }
                        `}
                      />
                      {errors.checkOutDate && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {errors.checkOutDate}
                        </motion.p>
                      )}
                    </div>

                    {/* Check-out Time */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <Clock className="w-4 h-4 text-red-600" />
                        Check-out Time <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="time"
                        name="checkOutTime"
                        value={formData.checkOutTime}
                        onChange={handleChange}
                        className={`
                          w-full px-4 py-3 rounded border text-sm
                          transition-all duration-200 outline-none
                          ${errors.checkOutTime 
                            ? "border-red-500 focus:border-red-500" 
                            : theme === "dark"
                            ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                            : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                          }
                        `}
                      />
                      {errors.checkOutTime && (
                        <motion.p
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-red-500 text-xs mt-1 flex items-center gap-1"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {errors.checkOutTime}
                        </motion.p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 3: Additional Details & Attachments */}
              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-6"
                >
                  <div className="mb-6">
                    <h3 className={`text-xl font-semibold flex items-center gap-2 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      <FileText className="w-6 h-6 text-red-600" />
                      Additional Information
                    </h3>
                    <p className={`text-sm mt-1 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}>
                      Provide purpose, description, and required attachments
                    </p>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Purpose
                    </label>
                    <input
                      type="text"
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      className={`
                        w-full px-4 py-3 rounded border text-sm
                        transition-all duration-200 outline-none
                        ${theme === "dark"
                          ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                          : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                        }
                      `}
                      placeholder="Booking purpose (optional)"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Description or Info
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      className={`
                        w-full px-4 py-3 rounded border text-sm
                        transition-all duration-200 outline-none resize-none
                        ${theme === "dark"
                          ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                          : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                        }
                      `}
                      placeholder="Additional information (optional)"
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                      theme === "dark" ? "text-gray-300" : "text-gray-700"
                    }`}>
                      <Upload className="w-4 h-4 text-red-600" />
                      Attachments <span className="text-red-500">*</span> (Up to 5 files)
                    </label>

                    <div className={`border-2 border-dashed rounded-xl p-6 text-center ${
                      errors.attachments
                        ? "border-red-500"
                        : theme === "dark"
                        ? "border-gray-600"
                        : "border-gray-300"
                    }`}>
                      <IKUpload
                        fileName="venue-booking-attachment"
                        folder="/venue-bookings"
                        tags={["venue", "booking", "attachment"]}
                        useUniqueFileName={true}
                        validateFile={(file) => {
                          if (formData.attachments.length >= 5) {
                            showToast("⚠️ Maximum 5 files allowed", "warning");
                            return false;
                          }

                          const allowedTypes = [
                            "image/jpeg",
                            "image/jpg",
                            "image/png",
                            "image/webp",
                            "image/gif",
                            "application/pdf",
                            "image/heic",
                            "image/heif",
                          ];

                          if (!allowedTypes.includes(file.type)) {
                            showToast("⚠️ Only JPG, PNG, GIF, WEBP, HEIC, or PDF allowed", "warning");
                            return false;
                          }

                          if (file.size > 5 * 1024 * 1024) {
                            showToast("⚠️ File size must be under 5MB", "warning");
                            return false;
                          }

                          return true;
                        }}
                        onUploadStart={handleUploadStart}
                        onSuccess={handleUploadSuccess}
                        onError={handleUploadError}
                        className="hidden"
                        id="file-upload"
                      />

                      <label
                        htmlFor="file-upload"
                        className={`
                          cursor-pointer inline-flex items-center gap-2 
                          px-6 py-2.5 rounded text-sm font-medium
                          transition-all duration-200
                          ${uploading
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                          }
                          ${theme === "dark"
                            ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                            : "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                          }
                        `}
                      >
                        <Upload className="w-5 h-5" />
                        {uploading ? "Uploading..." : "Upload File"}
                      </label>

                      <p className={`text-xs mt-2 ${
                        theme === "dark" ? "text-gray-400" : "text-gray-500"
                      }`}>
                        JPG, PNG, GIF, WEBP, HEIC, PDF (Max 5MB)
                      </p>
                    </div>

                    {uploading && (
                      <div className="mt-4 flex items-center justify-center gap-3 text-blue-600">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        </motion.div>
                        <span className="text-sm font-medium">Uploading file...</span>
                      </div>
                    )}

                    {uploadError && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red-600 text-sm mt-2 flex items-center gap-1"
                      >
                        <AlertCircle className="w-4 h-4" />
                        {uploadError}
                      </motion.p>
                    )}

                    {errors.attachments && (
                      <motion.p
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-red-500 text-xs mt-2 flex items-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {errors.attachments}
                      </motion.p>
                    )}

                    {formData.attachments.length > 0 && (
                      <div className="mt-4">
                        <p className={`text-sm font-semibold mb-3 ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}>
                          Uploaded Files ({formData.attachments.length}/5):
                        </p>
                        <div className="space-y-2">
                          {formData.attachments.map((url, idx) => (
                            <motion.div
                              key={idx}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                theme === "dark"
                                  ? "bg-gray-800 border-gray-700"
                                  : "bg-green-50 border-green-200"
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                                <span className={`text-sm truncate ${
                                  theme === "dark" ? "text-gray-300" : "text-gray-700"
                                }`}>
                                  File {idx + 1}
                                </span>
                              </div>
                              <motion.button
                                type="button"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => removeAttachment(idx)}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                <Trash2 className="w-5 h-5" />
                              </motion.button>
                            </motion.div>
                          ))}
                        </div>

                        <div className="mt-4">
                          <AttachmentGrid files={formData.attachments} theme={theme} />
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  className="space-y-6"
                >
                  <div className="mb-6">
                    <h3 className={`text-xl font-semibold flex items-center gap-2 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      Review Booking Details
                    </h3>
                    <p className={`text-sm mt-1 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-600"
                    }`}>
                      Please verify all information before submitting
                    </p>
                  </div>

                  <div className={`rounded-2xl p-6 space-y-4 ${
                    theme === "dark"
                      ? "bg-gray-800 border border-gray-700"
                      : "bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200"
                  }`}>
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Name</p>
                        <p className={`font-semibold ${
                          theme === "dark" ? "text-gray-100" : "text-gray-800"
                        }`}>
                          {formData.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Society</p>
                        <p className={`font-semibold ${
                          theme === "dark" ? "text-gray-100" : "text-gray-800"
                        }`}>
                          {formData.societyName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Event</p>
                        <p className={`font-semibold ${
                          theme === "dark" ? "text-gray-100" : "text-gray-800"
                        }`}>
                          {formData.eventName}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Contact</p>
                        <p className={`font-semibold ${
                          theme === "dark" ? "text-gray-100" : "text-gray-800"
                        }`}>
                          {formData.contact}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Department</p>
                        <p className={`font-semibold ${
                          theme === "dark" ? "text-gray-100" : "text-gray-800"
                        }`}>
                          {formData.department}
                        </p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 mb-1">Email</p>
                        <p className={`font-semibold ${
                          theme === "dark" ? "text-gray-100" : "text-gray-800"
                        }`}>
                          {formData.email}
                        </p>
                      </div>
                    </div>

                    <div className={`border-t pt-4 ${
                      theme === "dark" ? "border-gray-700" : "border-gray-300"
                    }`}>
                      <p className="text-xs text-gray-500 mb-3">Schedule</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                          <Calendar className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="text-xs text-green-700 font-medium">Check-in</p>
                            <p className="text-sm font-bold text-green-800">
                              {formData.checkInDate} at {formData.checkInTime}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <Calendar className="w-5 h-5 text-red-600" />
                          <div>
                            <p className="text-xs text-red-700 font-medium">Check-out</p>
                            <p className="text-sm font-bold text-red-800">
                              {formData.checkOutDate} at {formData.checkOutTime}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {(formData.purpose || formData.description) && (
                      <div className={`border-t pt-4 ${
                        theme === "dark" ? "border-gray-700" : "border-gray-300"
                      }`}>
                        {formData.purpose && (
                          <div className="mb-3">
                            <p className="text-xs text-gray-500 mb-1">Purpose</p>
                            <p className={`font-semibold ${
                              theme === "dark" ? "text-gray-100" : "text-gray-800"
                            }`}>
                              {formData.purpose}
                            </p>
                          </div>
                        )}
                        {formData.description && (
                          <div>
                            <p className="text-xs text-gray-500 mb-1">Description</p>
                            <p className={`font-semibold ${
                              theme === "dark" ? "text-gray-100" : "text-gray-800"
                            }`}>
                              {formData.description}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`border-t pt-4 ${
                      theme === "dark" ? "border-gray-700" : "border-gray-300"
                    }`}>
                      <p className="text-xs text-gray-500 mb-3">Attachments</p>
                      <AttachmentGrid files={formData.attachments} theme={theme} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Navigation */}
          <div className={`px-8 py-6 border-t-2 flex justify-between items-center ${
            theme === "dark" 
              ? "border-gray-700 bg-gray-900" 
              : "border-gray-200 bg-gray-50"
          }`}>
            <div>
              {step > 1 && (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05, x: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setStep((prev) => prev - 1)}
                  className={`
                    px-6 py-2.5 rounded text-sm font-medium
                    transition-all duration-200 flex items-center gap-2
                    ${theme === "dark"
                      ? "bg-transparent border border-[#5f6368] text-[#e8eaed] hover:bg-[#3c4043]"
                      : "bg-transparent border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]"
                    }
                  `}
                >
                  ← Back
                </motion.button>
              )}
            </div>

            <div className="flex gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
                className={`
                  px-6 py-2.5 rounded text-sm font-medium
                  transition-all duration-200
                  ${theme === "dark"
                    ? "bg-transparent border border-[#5f6368] text-[#e8eaed] hover:bg-[#3c4043]"
                    : "bg-transparent border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]"
                  }
                `}
              >
                Cancel
              </motion.button>

              {step < 4 ? (
                <motion.button
                  type="button"
                  whileHover={{ 
                    scale: canProceedToNext() ? 1.05 : 1,
                    x: canProceedToNext() ? 5 : 0
                  }}
                  whileTap={{ scale: canProceedToNext() ? 0.95 : 1 }}
                  onClick={handleNext}
                  disabled={!canProceedToNext()}
                  className={`
                    px-6 py-2.5 rounded text-sm font-medium
                    transition-all duration-200 flex items-center gap-2
                    ${canProceedToNext()
                      ? theme === "dark"
                        ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                        : "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                      : "opacity-50 cursor-not-allowed"
                    }
                    ${theme === "dark"
                      ? "bg-[#8ab4f8] text-[#202124]"
                      : "bg-[#1a73e8] text-white"
                    }
                  `}
                >
                  Next →
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  className={`
                    px-6 py-2.5 rounded text-sm font-medium
                    transition-all duration-200 flex items-center gap-2
                    ${theme === "dark"
                      ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                      : "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                    }
                  `}
                >
                  <CheckCircle className="w-5 h-5" />
                  Confirm Booking
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </IKContext>
  );
}
