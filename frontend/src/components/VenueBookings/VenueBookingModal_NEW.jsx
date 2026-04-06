// src/components/VenueBookings/VenueBookingModal.jsx
// UPDATED: Daily Time Slot Model
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
import { formatTimeWithAMPM } from "../../utils/dateUtils";

const API = BACKEND_URL;

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

  const [formData, setFormData] = useState({
    name: prefill?.name || "",
    societyName: prefill?.societyName || "",
    eventName: prefill?.eventName || "",
    department: prefill?.department || "",
    contact: prefill?.contact || "",
    email: prefill?.email || "",
    societyEmail: prefill?.societyEmail || "",
    presidentEmail: prefill?.presidentEmail || "",
    bookingStartDate: checkIn || prefill?.checkInDate || prefill?.bookingStartDate || "",
    bookingEndDate: checkOut || prefill?.checkOutDate || prefill?.bookingEndDate || "",
    dailyStartTime: prefill?.checkInTime || prefill?.dailyStartTime || "10:00",
    dailyEndTime: prefill?.checkOutTime || prefill?.dailyEndTime || "16:00",
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
  const [departmentSuggestions, setDepartmentSuggestions] = useState([]);
  const [showDepartmentSuggestions, setShowDepartmentSuggestions] = useState(false);

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
      societyEmail: prefill.societyEmail || prev.societyEmail,
      presidentEmail: prefill.presidentEmail || prev.presidentEmail,
      bookingStartDate: prefill.checkInDate || prefill.bookingStartDate || prev.bookingStartDate,
      bookingEndDate: prefill.checkOutDate || prefill.bookingEndDate || prev.bookingEndDate,
      dailyStartTime: prefill.checkInTime || prefill.dailyStartTime || prev.dailyStartTime,
      dailyEndTime: prefill.checkOutTime || prefill.dailyEndTime || prev.dailyEndTime,
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

  useEffect(() => {
    const query = formData.department.trim().toLowerCase();
    if (!query) {
      setDepartmentSuggestions(VENUE_DEPARTMENTS);
      return;
    }

    const filtered = VENUE_DEPARTMENTS.filter(dept =>
      dept.toLowerCase().includes(query)
    );
    setDepartmentSuggestions(filtered);
  }, [formData.department]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (name === "societyName") {
      setShowSocietySuggestions(true);
    }
    
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

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

  const validateForm = () => {
    const newErrors = {};

    if (step >= 1) {
      if (!formData.name.trim()) newErrors.name = "Name is required";
      if (!formData.eventName.trim()) newErrors.eventName = "Event name is required";
      if (!formData.department) newErrors.department = "Department is required";
      
      if (formData.contact.trim() && !/^\d{10}$/.test(formData.contact)) {
        newErrors.contact = "Contact must be exactly 10 digits";
      }
      
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!formData.email.endsWith("@thapar.edu")) {
        newErrors.email = "Email must be @thapar.edu";
      }
    }

    if (step >= 2) {
      if (!formData.bookingStartDate) newErrors.bookingStartDate = "Start date is required";
      if (!formData.bookingEndDate) newErrors.bookingEndDate = "End date is required";
      if (!formData.dailyStartTime) newErrors.dailyStartTime = "Daily start time is required";
      if (!formData.dailyEndTime) newErrors.dailyEndTime = "Daily end time is required";

      if (formData.bookingStartDate && formData.bookingEndDate) {
        const startDate = new Date(formData.bookingStartDate);
        const endDate = new Date(formData.bookingEndDate);
        
        if (endDate < startDate) {
          newErrors.bookingEndDate = "End date must be >= start date";
        }
      }

      const startTimeMin = timeToMinutes(formData.dailyStartTime);
      const endTimeMin = timeToMinutes(formData.dailyEndTime);
      
      if (startTimeMin >= endTimeMin) {
        newErrors.dailyEndTime = "End time must be > start time";
      }
    }

    if (step >= 3) {
      if (formData.attachments.length === 0) {
        newErrors.attachments = "At least one attachment is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const timeToMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return (hours || 0) * 60 + (minutes || 0);
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
      if (!formData.bookingStartDate || !formData.bookingEndDate || !formData.dailyStartTime || !formData.dailyEndTime) {
        return false;
      }
      
      const startDate = new Date(formData.bookingStartDate);
      const endDate = new Date(formData.bookingEndDate);
      const startTimeMin = timeToMinutes(formData.dailyStartTime);
      const endTimeMin = timeToMinutes(formData.dailyEndTime);
      
      return endDate >= startDate && startTimeMin < endTimeMin;
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

    const dataToSubmit = {
      ...formData,
      checkInDate: formData.bookingStartDate,
      checkOutDate: formData.bookingEndDate,
      checkInTime: formData.dailyStartTime,
      checkOutTime: formData.dailyEndTime,
    };

    await onSubmit(dataToSubmit);
  };

  const formatDateRange = () => {
    if (!formData.bookingStartDate || !formData.bookingEndDate) return "";
    
    const options = { month: 'short', day: 'numeric' };
    const startDate = new Date(formData.bookingStartDate);
    const endDate = new Date(formData.bookingEndDate);
    
    const dayCount = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    return `${startDate.toLocaleDateString('en-IN', options)} – ${endDate.toLocaleDateString('en-IN', options)} (${dayCount}d)`;
  };

  const getDailySlotSummary = () => {
    if (!formData.dailyStartTime || !formData.dailyEndTime) return "";
    return `${formData.dailyStartTime}–${formData.dailyEndTime}`;
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

          <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
                  <div className="mb-6">
                    <h3 className={`text-xl font-semibold flex items-center gap-2 ${
                      theme === "dark" ? "text-gray-100" : "text-gray-800"
                    }`}>
                      <User className="w-6 h-6 text-red-600" />
                      Basic Information
                    </h3>
                  </div>

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
                        <motion.span key={idx} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: idx * 0.05 }} className={`px-4 py-2 rounded-full text-sm font-medium shadow-md ${
                          theme === "dark"
                            ? "bg-blue-800 text-blue-100"
                            : "bg-blue-100 text-blue-800"
                        }`}>
                          {room.hall} — {room.roomNo}
                        </motion.span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        <User className="w-4 h-4 inline mr-2 text-red-600" />
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full px-4 py-3 rounded border text-sm transition-all ${errors.name ? "border-red-500" : theme === "dark" ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]" : "bg-white border-[#dadce0] text-[#202124]"}`} placeholder="Your name" />
                      {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        <Mail className="w-4 h-4 inline mr-2 text-red-600" />
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input type="email" name="email" value={formData.email} onChange={handleChange} className={`w-full px-4 py-3 rounded border text-sm ${errors.email ? "border-red-500" : theme === "dark" ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]" : "bg-white border-[#dadce0]"}`} placeholder="example@thapar.edu" />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        <Building className="w-4 h-4 inline mr-2 text-red-600" />
                        Event Name <span className="text-red-500">*</span>
                      </label>
                      <input type="text" name="eventName" value={formData.eventName} onChange={handleChange} className={`w-full px-4 py-3 rounded border text-sm ${errors.eventName ? "border-red-500" : theme === "dark" ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]" : "bg-white border-[#dadce0]"}`} placeholder="Event name" />
                      {errors.eventName && <p className="text-red-500 text-xs mt-1">{errors.eventName}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        <Building className="w-4 h-4 inline mr-2 text-red-600" />
                        Department <span className="text-red-500">*</span>
                      </label>
                      <input type="text" name="department" value={formData.department} onChange={handleChange} className={`w-full px-4 py-3 rounded border text-sm ${errors.department ? "border-red-500" : theme === "dark" ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]" : "bg-white border-[#dadce0]"}`} placeholder="Department" />
                      {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        <Phone className="w-4 h-4 inline mr-2 text-red-600" />
                        Contact
                      </label>
                      <input type="tel" name="contact" value={formData.contact} onChange={handleChange} maxLength={10} className={`w-full px-4 py-3 rounded border text-sm ${errors.contact ? "border-red-500" : theme === "dark" ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]" : "bg-white border-[#dadce0]"}`} placeholder="10 digit number" />
                      {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
                    </div>

                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        <Mail className="w-4 h-4 inline mr-2 text-red-600" />
                        Society Name
                      </label>
                      <input type="text" name="societyName" value={formData.societyName} onChange={handleChange} className={`w-full px-4 py-3 rounded border text-sm ${theme === "dark" ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]" : "bg-white border-[#dadce0]"}`} placeholder="Society name" />
                    </div>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-8">
                  <div>
                    <h3 className={`text-lg font-semibold flex items-center gap-2 mb-4 ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>
                      <Calendar className="w-5 h-5 text-blue-600" />
                      📅 BOOKING DATES
                    </h3>
                    <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      Select the date range for your booking
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                          Start Date <span className="text-red-500">*</span>
                        </label>
                        <input type="date" name="bookingStartDate" value={formData.bookingStartDate} onChange={handleChange} className={`w-full px-4 py-3 rounded border text-sm ${errors.bookingStartDate ? "border-red-500" : theme === "dark" ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]" : "bg-white border-[#dadce0]"}`} />
                        {errors.bookingStartDate && <p className="text-red-500 text-xs mt-1">{errors.bookingStartDate}</p>}
                      </div>
                      <div>
                        <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                          End Date <span className="text-red-500">*</span>
                        </label>
                        <input type="date" name="bookingEndDate" value={formData.bookingEndDate} onChange={handleChange} min={formData.bookingStartDate} className={`w-full px-4 py-3 rounded border text-sm ${errors.bookingEndDate ? "border-red-500" : theme === "dark" ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]" : "bg-white border-[#dadce0]"}`} />
                        {errors.bookingEndDate && <p className="text-red-500 text-xs mt-1">{errors.bookingEndDate}</p>}
                      </div>
                    </div>
                  </div>

                  <div className={`p-6 rounded-xl border ${theme === "dark" ? "bg-purple-900/30 border-purple-700" : "bg-purple-50 border-purple-200"}`}>
                    <h3 className={`text-lg font-semibold flex items-center gap-2 mb-4 ${theme === "dark" ? "text-purple-300" : "text-purple-700"}`}>
                      <Clock className="w-5 h-5" />
                      ⏰ DAILY TIME SLOT
                    </h3>
                    <p className={`text-sm mb-4 ${theme === "dark" ? "text-purple-200" : "text-purple-600"}`}>
                      These times repeat every day of your booking
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                          Daily Start Time <span className="text-red-500">*</span>
                        </label>
                        <input type="time" name="dailyStartTime" value={formData.dailyStartTime} onChange={handleChange} className={`w-full px-4 py-3 rounded border text-sm ${errors.dailyStartTime ? "border-red-500" : theme === "dark" ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]" : "bg-white border-[#dadce0]"}`} />
                        {errors.dailyStartTime && <p className="text-red-500 text-xs mt-1">{errors.dailyStartTime}</p>}
                      </div>
                      <div>
                        <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                          Daily End Time <span className="text-red-500">*</span>
                        </label>
                        <input type="time" name="dailyEndTime" value={formData.dailyEndTime} onChange={handleChange} className={`w-full px-4 py-3 rounded border text-sm ${errors.dailyEndTime ? "border-red-500" : theme === "dark" ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]" : "bg-white border-[#dadce0]"}`} />
                        {errors.dailyEndTime && <p className="text-red-500 text-xs mt-1">{errors.dailyEndTime}</p>}
                      </div>
                    </div>
                  </div>

                  {formData.bookingStartDate && formData.bookingEndDate && formData.dailyStartTime && formData.dailyEndTime && (
                    <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className={`p-4 rounded-lg border-2 ${theme === "dark" ? "bg-green-900/20 border-green-600" : "bg-green-50 border-green-300"}`}>
                      <p className={`text-sm font-semibold ${theme === "dark" ? "text-green-300" : "text-green-700"}`}>
                        ✅ Booking Summary: Daily {getDailySlotSummary()} · {formatDateRange()}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
                  <div>
                    <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>
                      <Upload className="w-5 h-5 inline mr-2 text-red-600" />
                      Upload Attachments
                    </h3>
                    <p className={`text-sm mb-4 ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      Please upload supporting documents (minimum 1 required)
                    </p>
                  </div>

                  <IKUpload onUploadStart={handleUploadStart} onSuccess={handleUploadSuccess} onError={handleUploadError} folder="/venuebooking" useUniqueFileName={true} isPrivateFile={false} />

                  {uploading && <p className={`text-sm ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}>⏳ Uploading...</p>}
                  {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}

                  {formData.attachments.length > 0 && (
                    <div>
                      <h4 className={`text-sm font-semibold mb-3 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}>
                        Uploaded Files ({formData.attachments.length})
                      </h4>
                      <AttachmentGrid attachments={formData.attachments} onRemove={removeAttachment} theme={theme} />
                    </div>
                  )}

                  {errors.attachments && <p className="text-red-500 text-sm">{errors.attachments}</p>}
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="step4" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="space-y-6">
                  <h3 className={`text-lg font-semibold ${theme === "dark" ? "text-gray-100" : "text-gray-800"}`}>
                    Review Your Booking
                  </h3>

                  <div className={`p-6 rounded-lg ${theme === "dark" ? "bg-[#3c4043]" : "bg-[#f1f3f4]"}`}>
                    <div className="space-y-4">
                      <div>
                        <p className={`text-xs font-semibold ${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>Name</p>
                        <p className={`text-base ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>{formData.name}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>Booking Dates</p>
                        <p className={`text-base ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>{formatDateRange()}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>Daily Time Slot</p>
                        <p className={`text-base ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>{getDailySlotSummary()}</p>
                      </div>
                      <div>
                        <p className={`text-xs font-semibold ${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>Event</p>
                        <p className={`text-base ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>{formData.eventName}</p>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="flex gap-3">
                    <button type="button" onClick={() => setStep(3)} className={`flex-1 py-3 rounded font-medium ${theme === "dark" ? "bg-[#3c4043] text-[#e8eaed] hover:bg-[#5f6368]" : "bg-[#f1f3f4] text-[#202124] hover:bg-[#dadce0]"}`}>
                      Back
                    </button>
                    <button type="submit" className={`flex-1 py-3 rounded font-medium text-white ${theme === "dark" ? "bg-[#8ab4f8] hover:bg-[#aecbfa]" : "bg-[#1a73e8] hover:bg-[#1765cc]"}`}>
                      Complete Booking
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="px-8 py-4 border-t flex gap-3 bg-opacity-50 backdrop-blur-sm">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className={`flex-1 py-2.5 rounded font-medium transition-colors ${theme === "dark" ? "bg-[#3c4043] text-[#e8eaed] hover:bg-[#5f6368]" : "bg-[#f1f3f4] text-[#202124]"}`}>
                Back
              </button>
            )}
            {step < 4 && (
              <button onClick={handleNext} className={`flex-1 py-2.5 rounded font-medium text-white transition-colors ${theme === "dark" ? "bg-[#8ab4f8] hover:bg-[#aecbfa]" : "bg-[#1a73e8] hover:bg-[#1765cc]"}`}>
                Next
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </IKContext>
  );
}
