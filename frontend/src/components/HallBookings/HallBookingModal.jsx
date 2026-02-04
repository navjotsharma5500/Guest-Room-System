// src/components/HallBookings/HallBookingModal.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Calendar, Clock, User, Mail, Phone, Building, FileText, CheckCircle, AlertCircle, Trash2 } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { IKContext, IKUpload } from "imagekitio-react";
import { useEscapeKey } from "../../hooks/useEscapeKey";
import { 
  IMAGEKIT_PUBLIC_KEY, 
  IMAGEKIT_URL_ENDPOINT, 
  IMAGEKIT_AUTH_ENDPOINT 
} from "../../utils/apiConfig";
import AttachmentGrid from "../AttachmentGrid";

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

export default function HallBookingModal({
  theme,
  selectedRooms,
  checkIn,
  checkOut,
  onClose,
  onSubmit,
}) {
  useEscapeKey(onClose);
  const { showToast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    societyName: "",
    eventName: "",
    contact: "",
    email: "",
    checkInDate: checkIn || "",
    checkInTime: "",
    checkOutDate: checkOut || "",
    checkOutTime: "",
    purpose: "",
    description: "",
    attachments: [],
  });

  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [step, setStep] = useState(1);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
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
      if (!formData.societyName.trim()) newErrors.societyName = "Society name is required";
      if (!formData.eventName.trim()) newErrors.eventName = "Event name is required";
      
      // Contact validation (10 digits only)
      if (!formData.contact.trim()) {
        newErrors.contact = "Contact is required";
      } else if (!/^\d{10}$/.test(formData.contact)) {
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

      // Date validation
      if (formData.checkInDate && formData.checkOutDate) {
        const checkIn = new Date(formData.checkInDate);
        const checkOut = new Date(formData.checkOutDate);
        
        if (checkOut <= checkIn) {
          newErrors.checkOutDate = "Check-out must be after check-in";
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
        formData.societyName.trim() &&
        formData.eventName.trim() &&
        /^\d{10}$/.test(formData.contact) &&
        formData.email.endsWith("@thapar.edu")
      );
    }
    if (step === 2) {
      return (
        formData.checkInDate &&
        formData.checkInTime &&
        formData.checkOutDate &&
        formData.checkOutTime &&
        new Date(formData.checkOutDate) > new Date(formData.checkInDate)
      );
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
          className={`rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden ${
            theme === "dark" 
              ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" 
              : "bg-gradient-to-br from-white via-red-50 to-white"
          }`}
          initial={{ scale: 0.9, y: 30 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 30 }}
        >
          {/* Header */}
          <div className={`px-8 py-6 border-b-2 ${
            theme === "dark" 
              ? "border-gray-700 bg-gradient-to-r from-red-900/30 to-orange-900/30" 
              : "border-red-100 bg-gradient-to-r from-red-600 to-red-700"
          }`}>
            <div className="flex justify-between items-center">
              <div>
                <h2 className={`text-3xl font-bold flex items-center gap-3 ${
                  theme === "dark" ? "text-red-400" : "text-white"
                }`}>
                  <motion.div
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Building className="w-8 h-8" />
                  </motion.div>
                  New Hall Booking
                </h2>
                <p className={`text-sm mt-1 ${
                  theme === "dark" ? "text-red-300" : "text-red-100"
                }`}>
                  Step {step} of 4
                </p>
              </div>
              <motion.button
                whileHover={{ rotate: 90, scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${
                  theme === "dark"
                    ? "text-gray-400 hover:text-red-400 hover:bg-gray-800"
                    : "text-white hover:text-red-200 hover:bg-red-600"
                }`}
              >
                <X size={28} />
              </motion.button>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 flex gap-2">
              {[1, 2, 3, 4].map((s) => (
                <motion.div
                  key={s}
                  className={`h-2 flex-1 rounded-full ${
                    s <= step
                      ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                      : theme === "dark"
                      ? "bg-gray-700"
                      : "bg-red-300"
                  }`}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: s <= step ? 1 : 0.3 }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
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
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                          errors.name 
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/20" 
                            : theme === "dark"
                            ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                            : "border-gray-300 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                        } outline-none`}
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
                    <div>
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <Building className="w-4 h-4 text-red-600" />
                        Society Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="societyName"
                        value={formData.societyName}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                          errors.societyName 
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/20" 
                            : theme === "dark"
                            ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                            : "border-gray-300 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                        } outline-none`}
                        placeholder="Society name"
                      />
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
                    <div>
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
                        onChange={handleChange}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                          errors.eventName 
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/20" 
                            : theme === "dark"
                            ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                            : "border-gray-300 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                        } outline-none`}
                        placeholder="Event name"
                      />
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Contact */}
                    <div>
                      <label className={`block text-sm font-semibold mb-2 flex items-center gap-2 ${
                        theme === "dark" ? "text-gray-300" : "text-gray-700"
                      }`}>
                        <Phone className="w-4 h-4 text-red-600" />
                        Contact <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="contact"
                        value={formData.contact}
                        onChange={handleChange}
                        maxLength={10}
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                          errors.contact 
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/20" 
                            : theme === "dark"
                            ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                            : "border-gray-300 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                        } outline-none`}
                        placeholder="10 digit number"
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
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                          errors.email 
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/20" 
                            : theme === "dark"
                            ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                            : "border-gray-300 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                        } outline-none`}
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
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                          errors.checkInDate 
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/20" 
                            : theme === "dark"
                            ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-green-500 focus:ring-4 focus:ring-green-500/20"
                            : "border-gray-300 bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/20"
                        } outline-none`}
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
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                          errors.checkInTime 
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/20" 
                            : theme === "dark"
                            ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-green-500 focus:ring-4 focus:ring-green-500/20"
                            : "border-gray-300 bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/20"
                        } outline-none`}
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
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                          errors.checkOutDate 
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/20" 
                            : theme === "dark"
                            ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                            : "border-gray-300 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                        } outline-none`}
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
                        className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                          errors.checkOutTime 
                            ? "border-red-500 focus:ring-4 focus:ring-red-500/20" 
                            : theme === "dark"
                            ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                            : "border-gray-300 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                        } outline-none`}
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
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                        theme === "dark"
                          ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                          : "border-gray-300 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                      } outline-none`}
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
                      className={`w-full px-4 py-3 rounded-xl border-2 transition-all ${
                        theme === "dark"
                          ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                          : "border-gray-300 bg-white focus:border-red-500 focus:ring-4 focus:ring-red-500/20"
                      } outline-none resize-none`}
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
                        fileName="hall-booking-attachment"
                        folder="/hall-bookings"
                        tags={["hall", "booking", "attachment"]}
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
                        className={`cursor-pointer inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                          uploading
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl"
                        } text-white`}
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
                  className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    theme === "dark"
                      ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  }`}
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
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  theme === "dark"
                    ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                    : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                }`}
              >
                Cancel
              </motion.button>

              {step < 4 ? (
                <motion.button
                  type="button"
                  whileHover={{ 
                    scale: canProceedToNext() ? 1.05 : 1,
                    x: canProceedToNext() ? 5 : 0,
                    boxShadow: canProceedToNext() ? "0 10px 25px rgba(220, 38, 38, 0.3)" : "none"
                  }}
                  whileTap={{ scale: canProceedToNext() ? 0.95 : 1 }}
                  onClick={handleNext}
                  disabled={!canProceedToNext()}
                  className={`px-8 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 ${
                    canProceedToNext()
                      ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg cursor-pointer"
                      : "bg-gray-400 text-gray-200 cursor-not-allowed"
                  }`}
                >
                  Next →
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  whileHover={{
                    scale: 1.05,
                    boxShadow: "0 10px 25px rgba(34, 197, 94, 0.4)",
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmit}
                  className="px-10 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-xl shadow-lg font-bold transition-all flex items-center gap-2"
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