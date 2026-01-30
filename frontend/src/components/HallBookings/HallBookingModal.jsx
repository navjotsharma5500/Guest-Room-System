// src/components/HallBookings/HallBookingModal.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Upload, Calendar, Clock, User, Mail, Phone, Building } from "lucide-react";
import { useToast } from "../../context/ToastContext";

export default function HallBookingModal({
  theme,
  selectedRooms,
  checkIn,
  checkOut,
  onClose,
  onSubmit,
}) {
  const { showToast } = useToast();

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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    
    if (files.length + formData.attachments.length > 5) {
      showToast("⚠️ Maximum 5 attachments allowed", "warning");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files].slice(0, 5),
    }));
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    // Mandatory fields
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
    
    // Date and time validation
    if (!formData.checkInDate) newErrors.checkInDate = "Check-in date is required";
    if (!formData.checkInTime) newErrors.checkInTime = "Check-in time is required";
    if (!formData.checkOutDate) newErrors.checkOutDate = "Check-out date is required";
    if (!formData.checkOutTime) newErrors.checkOutTime = "Check-out time is required";
    
    // Attachments validation
    if (formData.attachments.length === 0) {
      newErrors.attachments = "At least one attachment is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`rounded-2xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto ${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        }`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2
            className={`text-2xl font-bold ${
              theme === "dark" ? "text-red-400" : "text-red-700"
            }`}
          >
            New Hall Booking
          </h2>
          <motion.button
            whileHover={{ rotate: 90, scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className={
              theme === "dark"
                ? "text-gray-400 hover:text-red-400"
                : "text-gray-500 hover:text-red-700"
            }
          >
            <X size={24} />
          </motion.button>
        </div>

        {/* Selected Rooms Display */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm font-semibold text-blue-700 mb-2">
            Selected Halls/Rooms ({selectedRooms.length}):
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedRooms.map((room, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
              >
                {room.hall} - {room.roomNo}
              </span>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Name, Society Name, Event Name */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.name ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-red-500 outline-none`}
                placeholder="Your name"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Society Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="societyName"
                value={formData.societyName}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.societyName ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-red-500 outline-none`}
                placeholder="Society name"
              />
              {errors.societyName && <p className="text-red-500 text-xs mt-1">{errors.societyName}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Event Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="eventName"
                value={formData.eventName}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.eventName ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-red-500 outline-none`}
                placeholder="Event name"
              />
              {errors.eventName && <p className="text-red-500 text-xs mt-1">{errors.eventName}</p>}
            </div>
          </div>

          {/* Row 2: Contact & Email */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                name="contact"
                value={formData.contact}
                onChange={handleChange}
                maxLength={10}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.contact ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-red-500 outline-none`}
                placeholder="10 digit number"
              />
              {errors.contact && <p className="text-red-500 text-xs mt-1">{errors.contact}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.email ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-red-500 outline-none`}
                placeholder="example@thapar.edu"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Row 3: Check-in Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Check-in Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="checkInDate"
                value={formData.checkInDate}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.checkInDate ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-red-500 outline-none`}
              />
              {errors.checkInDate && <p className="text-red-500 text-xs mt-1">{errors.checkInDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Check-in Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="checkInTime"
                value={formData.checkInTime}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.checkInTime ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-red-500 outline-none`}
              />
              {errors.checkInTime && <p className="text-red-500 text-xs mt-1">{errors.checkInTime}</p>}
            </div>
          </div>

          {/* Row 4: Check-out Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Check-out Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="checkOutDate"
                value={formData.checkOutDate}
                onChange={handleChange}
                min={formData.checkInDate}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.checkOutDate ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-red-500 outline-none`}
              />
              {errors.checkOutDate && <p className="text-red-500 text-xs mt-1">{errors.checkOutDate}</p>}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Check-out Time <span className="text-red-500">*</span>
              </label>
              <input
                type="time"
                name="checkOutTime"
                value={formData.checkOutTime}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  errors.checkOutTime ? "border-red-500" : "border-gray-300"
                } focus:ring-2 focus:ring-red-500 outline-none`}
              />
              {errors.checkOutTime && <p className="text-red-500 text-xs mt-1">{errors.checkOutTime}</p>}
            </div>
          </div>

          {/* Row 5: Purpose */}
          <div>
            <label className="block text-sm font-semibold mb-2">Purpose</label>
            <input
              type="text"
              name="purpose"
              value={formData.purpose}
              onChange={handleChange}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="Booking purpose (optional)"
            />
          </div>

          {/* Row 6: Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">Description or Info</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none resize-none"
              placeholder="Additional information (optional)"
            />
          </div>

          {/* Row 7: Attachments */}
          <div>
            <label className="block text-sm font-semibold mb-2 flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Attachments <span className="text-red-500">*</span> (Up to 5 files)
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              accept="image/*,.pdf"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-red-500 outline-none"
            />
            {errors.attachments && <p className="text-red-500 text-xs mt-1">{errors.attachments}</p>}
            
            {formData.attachments.length > 0 && (
              <div className="mt-2 space-y-2">
                {formData.attachments.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center p-2 bg-gray-100 rounded-lg"
                  >
                    <span className="text-sm truncate">{file.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4">
            <motion.button
              type="button"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClose}
              className={`px-6 py-2.5 rounded-xl font-medium transition ${
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 text-gray-100"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
            >
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{
                scale: 1.05,
                boxShadow: "0 10px 25px rgba(220, 38, 38, 0.3)",
              }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl shadow-lg font-semibold transition"
            >
              Submit Booking
            </motion.button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}