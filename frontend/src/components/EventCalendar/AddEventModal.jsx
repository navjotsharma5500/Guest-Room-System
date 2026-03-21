// src/components/EventCalendar/AddEventModal.jsx
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { X, Upload, Calendar as CalendarIcon, Clock, MapPin, Loader, Image as ImageIcon } from "lucide-react";
import { BACKEND_URL } from "../../utils/apiConfig";

// ImageKit configuration (replace with your actual keys)
const IMAGEKIT_PUBLIC_KEY = "your_imagekit_public_key";
const IMAGEKIT_URL_ENDPOINT = "your_imagekit_url_endpoint";
const IMAGEKIT_AUTH_ENDPOINT = `${BACKEND_URL}/api/imagekit/auth`;

export default function AddEventModal({ theme, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    eventName: "",
    societyName: "",
    eventDate: "",
    eventTime: "",
    eventHall: { hall: "", roomNo: "" },
    attachments: [],
  });

  const [eventNameSuggestions, setEventNameSuggestions] = useState([]);
  const [societyNameSuggestions, setSocietyNameSuggestions] = useState([]);
  const [showEventSuggestions, setShowEventSuggestions] = useState(false);
  const [showSocietySuggestions, setShowSocietySuggestions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const eventInputRef = useRef(null);
  const societyInputRef = useRef(null);

  // Hall data (replace with actual data from your backend or props)
  const hallCategories = {
    "Hall": ["NAB Auditorium", "Academic Block Audi"],
    "Rooms": ["T105", "T106", "T107", "T108"],
    "Creativity Rooms": ["CR1", "CR2", "CR3"],
    "Green Rooms": ["GR1", "GR2"],
    "Open Area": ["Front Lawn", "OAT"],
    "Desk Area": ["Cafe Area", "Jaggi"],
    "Common Rooms": ["Block A CR", "Block B CR"],
  };

  // Fetch event name suggestions
  const fetchEventSuggestions = async (query) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKEND_URL}/api/event-calendar/suggestions/events?query=${encodeURIComponent(query)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEventNameSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch event suggestions:', error);
    }
  };

  // Fetch society name suggestions
  const fetchSocietySuggestions = async (query) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKEND_URL}/api/event-calendar/suggestions/societies?query=${encodeURIComponent(query)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSocietyNameSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to fetch society suggestions:', error);
    }
  };

  // Handle event name input change
  const handleEventNameChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, eventName: value });

    if (value.length >= 2) {
      fetchEventSuggestions(value);
      setShowEventSuggestions(true);
    } else {
      setShowEventSuggestions(false);
    }
  };

  // Handle society name input change
  const handleSocietyNameChange = (e) => {
    const value = e.target.value;
    setFormData({ ...formData, societyName: value });

    if (value.length >= 2) {
      fetchSocietySuggestions(value);
      setShowSocietySuggestions(true);
    } else {
      setShowSocietySuggestions(false);
    }
  };

  // Handle file upload to ImageKit
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    
    if (formData.attachments.length + files.length > 5) {
      alert("Maximum 5 attachments allowed");
      return;
    }

    setUploading(true);

    try {
      const uploadedUrls = [];

      for (const file of files) {
        // Get authentication parameters from backend
        const authResponse = await fetch(IMAGEKIT_AUTH_ENDPOINT);
        const authData = await authResponse.json();

        // Upload to ImageKit
        const formDataUpload = new FormData();
        formDataUpload.append('file', file);
        formDataUpload.append('publicKey', IMAGEKIT_PUBLIC_KEY);
        formDataUpload.append('signature', authData.signature);
        formDataUpload.append('expire', authData.expire);
        formDataUpload.append('token', authData.token);
        formDataUpload.append('fileName', file.name);

        const uploadResponse = await fetch(`${IMAGEKIT_URL_ENDPOINT}/upload`, {
          method: 'POST',
          body: formDataUpload,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          uploadedUrls.push(uploadData.url);
        }
      }

      setFormData({
        ...formData,
        attachments: [...formData.attachments, ...uploadedUrls],
      });
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  // Remove attachment
  const removeAttachment = (index) => {
    setFormData({
      ...formData,
      attachments: formData.attachments.filter((_, i) => i !== index),
    });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.eventName || !formData.societyName || !formData.eventDate || 
        !formData.eventTime || !formData.eventHall.hall || !formData.eventHall.roomNo) {
      alert("Please fill all required fields");
      return;
    }

    if (formData.attachments.length === 0) {
      alert("Please upload at least one attachment");
      return;
    }

    setSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BACKEND_URL}/api/event-calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Event created successfully!');
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('Submit error:', error);
      alert('Failed to create event');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
          theme === "dark"
            ? "bg-gray-800 border border-gray-700"
            : "bg-white border border-gray-200"
        }`}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <h3 className={`text-xl font-bold ${
            theme === "dark" ? "text-white" : "text-gray-900"
          }`}>
            Add New Event
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition ${
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Event Name */}
          <div className="relative">
            <label className={`block text-sm font-semibold mb-2 ${
              theme === "dark" ? "text-gray-300" : "text-gray-700"
            }`}>
              Event Name *
            </label>
            <input
              ref={eventInputRef}
              type="text"
              value={formData.eventName}
              onChange={handleEventNameChange}
              onFocus={() => formData.eventName.length >= 2 && setShowEventSuggestions(true)}
              className={`w-full px-4 py-2 rounded-lg border transition ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              placeholder="Enter event name (min 2 characters for suggestions)"
              required
            />
            
            {/* Event Name Suggestions */}
            {showEventSuggestions && eventNameSuggestions.length > 0 && (
              <div className={`absolute z-20 w-full mt-1 rounded-lg border shadow-lg max-h-48 overflow-y-auto ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-300"
              }`}>
                {eventNameSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, eventName: suggestion });
                      setShowEventSuggestions(false);
                    }}
                    className={`w-full px-4 py-2 text-left transition ${
                      theme === "dark"
                        ? "hover:bg-gray-600 text-white"
                        : "hover:bg-gray-100 text-gray-900"
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Society Name */}
          <div className="relative">
            <label className={`block text-sm font-semibold mb-2 ${
              theme === "dark" ? "text-gray-300" : "text-gray-700"
            }`}>
              Society Name *
            </label>
            <input
              ref={societyInputRef}
              type="text"
              value={formData.societyName}
              onChange={handleSocietyNameChange}
              onFocus={() => formData.societyName.length >= 2 && setShowSocietySuggestions(true)}
              className={`w-full px-4 py-2 rounded-lg border transition ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
              placeholder="Enter society name (min 2 characters for suggestions)"
              required
            />

            {/* Society Name Suggestions */}
            {showSocietySuggestions && societyNameSuggestions.length > 0 && (
              <div className={`absolute z-20 w-full mt-1 rounded-lg border shadow-lg max-h-48 overflow-y-auto ${
                theme === "dark"
                  ? "bg-gray-700 border-gray-600"
                  : "bg-white border-gray-300"
              }`}>
                {societyNameSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, societyName: suggestion });
                      setShowSocietySuggestions(false);
                    }}
                    className={`w-full px-4 py-2 text-left transition ${
                      theme === "dark"
                        ? "hover:bg-gray-600 text-white"
                        : "hover:bg-gray-100 text-gray-900"
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Event Date *
              </label>
              <div className="relative">
                <CalendarIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`} />
                <input
                  type="date"
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border transition ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  required
                />
              </div>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Event Time *
              </label>
              <div className="relative">
                <Clock className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`} />
                <input
                  type="time"
                  value={formData.eventTime}
                  onChange={(e) => {
                    const time = e.target.value;
                    // Convert to 12-hour format with AM/PM
                    const [hours, minutes] = time.split(':');
                    const hour = parseInt(hours);
                    const period = hour >= 12 ? 'PM' : 'AM';
                    const hour12 = hour % 12 || 12;
                    setFormData({ ...formData, eventTime: `${hour12}:${minutes} ${period}` });
                  }}
                  className={`w-full pl-10 pr-4 py-2 rounded-lg border transition ${
                    theme === "dark"
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  required
                />
              </div>
            </div>
          </div>

          {/* Event Hall */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Hall Category *
              </label>
              <select
                value={formData.eventHall.hall}
                onChange={(e) => setFormData({
                  ...formData,
                  eventHall: { hall: e.target.value, roomNo: "" }
                })}
                className={`w-full px-4 py-2 rounded-lg border transition ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                required
              >
                <option value="">Select Hall</option>
                {Object.keys(hallCategories).map((hall) => (
                  <option key={hall} value={hall}>{hall}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}>
                Room *
              </label>
              <select
                value={formData.eventHall.roomNo}
                onChange={(e) => setFormData({
                  ...formData,
                  eventHall: { ...formData.eventHall, roomNo: e.target.value }
                })}
                className={`w-full px-4 py-2 rounded-lg border transition ${
                  theme === "dark"
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
                required
                disabled={!formData.eventHall.hall}
              >
                <option value="">Select Room</option>
                {formData.eventHall.hall && hallCategories[formData.eventHall.hall]?.map((room) => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className={`block text-sm font-semibold mb-2 ${
              theme === "dark" ? "text-gray-300" : "text-gray-700"
            }`}>
              Event Attachments * (Max 5)
            </label>
            
            <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition ${
              uploading
                ? "opacity-50 cursor-not-allowed"
                : theme === "dark"
                ? "border-gray-600 hover:border-blue-500 bg-gray-700/50 hover:bg-gray-700"
                : "border-gray-300 hover:border-blue-500 bg-gray-50 hover:bg-gray-100"
            }`}>
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                {uploading ? (
                  <>
                    <Loader className="w-10 h-10 text-blue-600 animate-spin mb-2" />
                    <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      Uploading...
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className={`w-10 h-10 mb-2 ${
                      theme === "dark" ? "text-gray-400" : "text-gray-500"
                    }`} />
                    <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}>
                      Click to upload images
                    </p>
                  </>
                )}
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading || formData.attachments.length >= 5}
                className="hidden"
              />
            </label>

            {/* Attachment Preview */}
            {formData.attachments.length > 0 && (
              <div className="grid grid-cols-5 gap-2 mt-4">
                {formData.attachments.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Attachment ${index + 1}`}
                      className="w-full h-20 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttachment(index)}
                      className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-6 py-3 rounded-lg border transition ${
                theme === "dark"
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Event"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}