// src/pages/VenueAssistantEnquiryPage.jsx
// Assistant Portal for Venue Enquiry Approval - Based on AdminEnquiryPage pattern
// ============================================================================

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";
import NotificationBell from "../components/NotificationBell";
import {
  Home,
  FileText,
  CheckCircle2,
  XCircle,
  ListFilter,
  Download,
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  Building2,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import { BACKEND_URL, IMAGEKIT_URL_ENDPOINT } from "../utils/apiConfig";

const API = BACKEND_URL;

// Normalize ImageKit URLs
const normalizeImageKitUrl = (fileUrl) => {
  if (!fileUrl) return fileUrl;
  let url = String(fileUrl).trim();
  url = url.replace(/^[`'\"]+|[`'\"]+$/g, "");

  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (url.startsWith("https://ik.imagekit.io")) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${IMAGEKIT_URL_ENDPOINT}${url}`;
  
  return `${IMAGEKIT_URL_ENDPOINT}/${url}`;
};

// Format time with AM/PM
const formatTimeWithAMPM = (timeStr) => {
  if (!timeStr) return "";
  try {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
  } catch {
    return timeStr;
  }
};

// Format date
const formatShortDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return dt.toLocaleDateString("en-GB", { 
      day: "2-digit", 
      month: "short", 
      year: "numeric" 
    }).replace(/\s+/g, "-");
  } catch {
    return String(d);
  }
};

export default function VenueAssistantEnquiryPage({ theme = "dark" }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [enquiries, setEnquiries] = useState([]);
  
  // Feature 2: Notification Bell state
  const [newEnquiriesCount, setNewEnquiriesCount] = useState(0);
  const [newEnquiries, setNewEnquiries] = useState([]);
  
  // Feature 1: Date Editing state
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [dateConflict, setDateConflict] = useState(null);
  
  // Feature: Event Details Editing state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  
  const [editForm, setEditForm] = useState({
    checkInDate: "",
    checkInTime: "",
    checkOutDate: "",
    checkOutTime: "",
    department: "",
    societyClubName: "",
    eventName: "",
    eventDescription: "",
    purpose: "",
  });
  
  const ITEMS_PER_PAGE = 10;

  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };

  // Feature 1: Initialize edit form when selected enquiry changes
  useEffect(() => {
    if (selected) {
      setEditForm({
        checkInDate: selected.checkInDate || "",
        checkInTime: selected.checkInTime || "",
        checkOutDate: selected.checkOutDate || "",
        checkOutTime: selected.checkOutTime || "",
        department: selected.department || "",
        societyClubName: selected.societyName || selected.societyClubName || "",
        eventName: selected.eventName || "",
        eventDescription: selected.description || selected.eventDescription || "",
        purpose: selected.purpose || "",
      });
      setIsEditingDates(false);
      setIsEditingDetails(false);
      setDateConflict(null);
    }
  }, [selected]);

  // Load venue enquiries
  const loadEnquiries = async () => {
    try {
      console.log("🔥 Loading venue enquiries...");
      const res = await axios.get(`${API}/api/venue/enquiry/all`, {
        withCredentials: true,
      });
      
      console.log("✅ Fetched venue enquiries:", res.data);
      
      if (Array.isArray(res.data)) {
        setEnquiries(res.data);
        
        // Update selected enquiry if it exists
        if (selected) {
          const updatedSelected = res.data.find(e => e._id === selected._id);
          if (updatedSelected) {
            setSelected(updatedSelected);
          }
        }
      }
    } catch (error) {
      console.error("❌ Error loading venue enquiries:", error);
      showToast("Failed to load enquiries", "error");
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, []);

  // Listen for new venue enquiries
  useEffect(() => {
    const handleNewEnquiry = () => {
      console.log("📢 New venue enquiry received - refreshing list");
      loadEnquiries();
    };
    
    const handleEnquiryUpdated = () => {
      console.log("📢 Venue enquiry updated - refreshing list");
      loadEnquiries();
    };
    
    // Feature 2: Listen for new enquiries from socket
    const handleVenueEnquiryCreated = (data) => {
      console.log("🔔 New enquiry created (socket):", data);
      if (data.enquiry) {
        // Add to notification list
        setNewEnquiries((prev) => {
          const isDuplicate = prev.some((e) => e._id === data.enquiry._id);
          if (isDuplicate) return prev;
          return [data.enquiry, ...prev].slice(0, 20);
        });
        setNewEnquiriesCount((prev) => prev + 1);
        
        // Play notification sound
        try {
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
          console.warn("Could not play sound:", e);
        }
      }
    };
    
    window.addEventListener("venueEnquiryCreated", handleNewEnquiry);
    window.addEventListener("venueEnquiryUpdated", handleEnquiryUpdated);
    window.addEventListener("venue-enquiry-created", handleVenueEnquiryCreated);

    return () => {
      window.removeEventListener("venueEnquiryCreated", handleNewEnquiry);
      window.removeEventListener("venueEnquiryUpdated", handleEnquiryUpdated);
      window.removeEventListener("venue-enquiry-created", handleVenueEnquiryCreated);
    };
  }, []);

  // Feature 1: Check venue conflicts for date/time
  const handleCheckConflict = async () => {
    if (!selected) return;

    try {
      console.log("🔍 Checking conflict for dates:", editForm);
      
      const response = await axios.post(
        `${API}/api/venue/enquiry/${selected._id}/check-conflict`,
        {
          checkInDate: editForm.checkInDate,
          checkInTime: editForm.checkInTime,
          checkOutDate: editForm.checkOutDate,
          checkOutTime: editForm.checkOutTime,
        },
        {
          withCredentials: true,
        }
      );

      if (response.data.success) {
        setDateConflict(null);
        showToast("No conflicts detected ✅", "success");
      } else {
        setDateConflict(response.data.conflict);
        showToast(response.data.message, "warning");
      }
    } catch (err) {
      console.error("Conflict check error:", err);
      setDateConflict(null);
      showToast(err?.response?.data?.message || "Failed to check availability", "error");
    }
  };

  // Handle Approve
  const handleApprove = async () => {
    if (!selected) return;

    try {
      const approveData = {};
      
      // Feature 1: Include modified dates if editing
      if (isEditingDates && !dateConflict) {
        approveData.checkInDate = editForm.checkInDate;
        approveData.checkInTime = editForm.checkInTime;
        approveData.checkOutDate = editForm.checkOutDate;
        approveData.checkOutTime = editForm.checkOutTime;
      }

      // Feature: Include modified event details if editing
      if (isEditingDetails) {
        approveData.department = editForm.department;
        approveData.societyName = editForm.societyClubName;
        approveData.societyClubName = editForm.societyClubName;
        approveData.eventName = editForm.eventName;
        approveData.description = editForm.eventDescription;
        approveData.eventDescription = editForm.eventDescription;
        approveData.purpose = editForm.purpose;
      }

      await axios.put(
        `${API}/api/venue/enquiry/${selected._id}/approved`,
        approveData,
        {
          withCredentials: true,
        }
      );

      showToast("Enquiry approved and room booked successfully.", "success");
      await loadEnquiries();
      setNewEnquiriesCount(0);
    } catch (err) {
      console.error("Approve error:", err);
      showToast(err?.response?.data?.message || "Failed to approve enquiry", "error");
    }
  };

  // Handle Reject
  const handleReject = async () => {
    if (!selected) return;

    try {
      await axios.put(
        `${API}/api/venue/enquiry/${selected._id}/rejected`,
        {},
        {
          withCredentials: true,
        }
      );

      showToast("Enquiry rejected", "success");
      await loadEnquiries();
      setSelected(null);
    } catch (err) {
      console.error("Reject error:", err);
      showToast("Failed to reject enquiry", "error");
    }
  };

  // Filter enquiries
  const filteredEnquiries = enquiries.filter(e => {
    if (filter === "all") return true;
    if (filter === "pending") return e.status === "pending";
    if (filter === "approved") return e.status === "approved" || e.status === "booked";
    if (filter === "rejected") return e.status === "rejected";
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEnquiries.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEnquiries = filteredEnquiries.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  return (
    <div 
      className={`
        min-h-screen p-2 sm:p-4 md:p-6
        ${theme === "dark" ? "bg-[#202124]" : "bg-[#f8f9fa]"}
      `}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className={`text-xl sm:text-2xl md:text-3xl font-normal ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}>
              Venue Enquiry Management
            </h1>
            <p className={`text-xs sm:text-sm mt-1 ${
              theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
            }`}>
              Review and approve venue booking requests
            </p>
          </div>

          {/* Header Right: Notification Bell + Filter Buttons */}
          <div className="flex items-center gap-3 sm:gap-4">
            {/* Feature 2: Notification Bell */}
            <NotificationBell
              unreadCount={newEnquiriesCount}
              enquiries={newEnquiries}
              onEnquiryClick={(enquiry) => {
                setSelected(enquiry);
                setNewEnquiriesCount(0);
              }}
              theme={theme}
            />
            
            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-1 sm:gap-2 md:gap-3">
              {["all", "pending", "approved", "rejected"].map(f => (
                <button
                  key={f}
                  onClick={() => {
                    setFilter(f);
                    setCurrentPage(1);
                  }}
                  className={`
                    px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 md:py-2 rounded-lg text-xs sm:text-sm md:text-base font-medium transition-colors capitalize
                    ${filter === f
                      ? theme === "dark"
                        ? "bg-[#8ab4f8] text-[#202124]"
                        : "bg-[#1a73e8] text-white"
                      : theme === "dark"
                        ? "bg-[#3c4043] text-[#e8eaed] hover:bg-[#5f6368]"
                        : "bg-white text-[#5f6368] hover:bg-[#f1f3f4] border border-[#dadce0]"
                    }
                  `}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
        {/* Enquiry List - Now takes 2 out of 5 columns */}
        <div className="lg:col-span-2">
          <div className={`
            rounded-lg overflow-hidden
            ${theme === "dark" ? "bg-[#292a2d]" : "bg-white border border-[#dadce0]"}
          `}>
            <div className={`
              px-3 sm:px-4 py-2 sm:py-3 border-b
              ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}
            `}>
              <p className={`text-xs sm:text-sm font-medium ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}>
                {filteredEnquiries.length} Enquiries
              </p>
            </div>

            <div className="max-h-[calc(100vh-18rem)] overflow-y-auto">
              {paginatedEnquiries.map(e => (
                <motion.div
                  key={e._id}
                  onClick={() => setSelected(e)}
                  whileHover={{ x: 4 }}
                  className={`
                    p-3 sm:p-4 border-b cursor-pointer transition-all overflow-hidden
                    ${selected?._id === e._id
                      ? theme === "dark"
                        ? "bg-[#8ab4f8]/10 border-[#8ab4f8]"
                        : "bg-[#e8f0fe] border-[#1967d2]"
                      : theme === "dark"
                        ? "border-[#3c4043] hover:bg-[#3c4043]"
                        : "border-[#dadce0] hover:bg-[#f8f9fa]"
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-2 gap-2 overflow-hidden">
                    <p className={`font-medium text-xs sm:text-sm truncate ${
                      theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                    }`}>
                      {e.name}
                    </p>
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full flex-shrink-0
                      ${e.status === "pending"
                        ? "bg-yellow-500/20 text-yellow-600"
                        : e.status === "approved" || e.status === "booked"
                          ? "bg-green-500/20 text-green-600"
                          : "bg-red-500/20 text-red-600"
                      }
                    `}>
                      {e.status}
                    </span>
                  </div>
                  <p className={`text-xs mb-1 truncate ${
                    theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                  }`}>
                    {e.department}
                  </p>
                  <p className={`text-xs mb-1 truncate ${
                    theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                  }`}>
                    {e.hall} - {e.roomNo}
                  </p>
                  <p className={`text-xs truncate ${
                    theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                  }`}>
                    {formatShortDate(e.checkInDate || e.startDate)} • {formatTimeWithAMPM(e.checkInTime || e.startTime)}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className={`
                px-4 py-3 border-t flex items-center justify-between
                ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}
              `}>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`text-sm ${
                    theme === "dark" ? "text-[#8ab4f8]" : "text-[#1a73e8]"
                  } disabled:opacity-50`}
                >
                  Previous
                </button>
                <span className={`text-sm ${
                  theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                }`}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className={`text-sm ${
                    theme === "dark" ? "text-[#8ab4f8]" : "text-[#1a73e8]"
                  } disabled:opacity-50`}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Enquiry Details - Now takes 3 out of 5 columns */}
        <div className="lg:col-span-3">
          {selected ? (
            <div className={`
              rounded-lg p-3 sm:p-4 md:p-6 overflow-hidden
              ${theme === "dark" ? "bg-[#292a2d]" : "bg-white border border-[#dadce0]"}
            `}>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3 mb-4 sm:mb-6 overflow-hidden">
                <div className="min-w-0 overflow-hidden">
                  <h2 className={`text-lg sm:text-xl font-normal mb-1 truncate ${
                    theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                  }`}>
                    {selected.name}
                  </h2>
                  <p className={`text-xs sm:text-sm truncate ${
                    theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                  }`}>
                    {selected.department}
                  </p>
                </div>

                <span className={`
                  px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium flex-shrink-0
                  ${selected.status === "pending"
                    ? "bg-yellow-500/20 text-yellow-600"
                    : selected.status === "approved" || selected.status === "booked"
                      ? "bg-green-500/20 text-green-600"
                      : "bg-red-500/20 text-red-600"
                  }
                `}>
                  {selected.status}
                </span>
              </div>

              {/* Contact Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6 overflow-hidden">
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                  <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className={`text-xs sm:text-sm truncate ${
                    theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                  }`}>
                    {selected.email}
                  </span>
                </div>
                <div className={`text-xs sm:text-sm overflow-hidden ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  <strong>Venue:</strong> <span className="truncate">{selected.hall} - {selected.roomNo}</span>
                </div>
                <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                  <Phone className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className={`text-xs sm:text-sm truncate ${
                    theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                  }`}>
                    {selected.contact}
                  </span>
                </div>
              </div>

              {/* Feature 3: Society & President Emails */}
              {(selected.societyEmail || selected.presidentEmail) && (
                <div className={`
                  p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 overflow-hidden
                  ${theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa] border border-[#dadce0]"}
                `}>
                  <h3 className={`text-xs sm:text-sm font-medium mb-2 sm:mb-3 ${
                    theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                  }`}>
                    Financial Contacts
                  </h3>
                  
                  {selected.societyEmail && (
                    <div className="flex items-center gap-2 mb-2 min-w-0 overflow-hidden">
                      <Mail className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <div className="min-w-0 overflow-hidden">
                        <p className={`text-xs ${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>
                          Society Email
                        </p>
                        <p className={`text-xs sm:text-sm truncate ${
                          theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                        }`}>
                          {selected.societyEmail}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {selected.presidentEmail && (
                    <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                      <Mail className="w-4 h-4 text-purple-500 flex-shrink-0" />
                      <div className="min-w-0 overflow-hidden">
                        <p className={`text-xs ${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>
                          President Email
                        </p>
                        <p className={`text-xs sm:text-sm truncate ${
                          theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                        }`}>
                          {selected.presidentEmail}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Event Details */}
              <div className={`
                p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 overflow-hidden
                ${theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa] border border-[#dadce0]"}
              `}>
                <h3 className={`text-xs sm:text-sm font-medium mb-2 sm:mb-3 ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  Event Information
                </h3>

                {(selected.societyName || selected.societyClubName) && (
                  <p className={`text-xs sm:text-sm mb-2 truncate ${
                    theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                  }`}>
                    <strong>Society/Club:</strong> {selected.societyName || selected.societyClubName}
                  </p>
                )}

                <p className={`text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-3 ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  {selected.description || selected.eventDescription}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm">
                  <div className="flex items-start gap-2 min-w-0 overflow-hidden">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 overflow-hidden">
                      <p className={`truncate ${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>
                        Start
                      </p>
                      <p className={`text-xs sm:text-sm truncate ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
                        {formatShortDate(selected.checkInDate || selected.startDate)} • {formatTimeWithAMPM(selected.checkInTime || selected.startTime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 min-w-0 overflow-hidden">
                    <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 overflow-hidden">
                      <p className={`truncate ${theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}`}>
                        End
                      </p>
                      <p className={`text-xs sm:text-sm truncate ${theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}`}>
                        {formatShortDate(selected.checkOutDate || selected.endDate)} • {formatTimeWithAMPM(selected.checkOutTime || selected.endTime)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Feature 1: Edit Date/Time Section */}
              {selected.status === "pending" && (
                <div className={`
                  p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 overflow-hidden
                  ${theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa] border border-[#dadce0]"}
                `}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className={`text-xs sm:text-sm font-medium ${
                      theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                    }`}>
                      Modify Date & Time
                    </h3>
                    <button
                      onClick={() => {
                        setIsEditingDates(!isEditingDates);
                        setDateConflict(null);
                      }}
                      className={`
                        px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-colors
                        ${isEditingDates
                          ? theme === "dark"
                            ? "bg-[#5f6368] text-[#e8eaed]"
                            : "bg-gray-300 text-gray-700"
                          : theme === "dark"
                            ? "bg-[#8ab4f8] text-[#202124]"
                            : "bg-[#1a73e8] text-white"
                        }
                      `}
                    >
                      {isEditingDates ? "Cancel Edit" : "Edit Dates"}
                    </button>
                  </div>

                  {isEditingDates ? (
                    <div className="space-y-3">
                      {/* Edit Form */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={`text-xs sm:text-sm block mb-1 ${
                            theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                          }`}>
                            Check-in Date
                          </label>
                          <input
                            type="date"
                            value={editForm.checkInDate}
                            onChange={(e) => {
                              setEditForm({ ...editForm, checkInDate: e.target.value });
                              setDateConflict(null);
                            }}
                            className={`
                              w-full px-3 py-2 rounded text-xs sm:text-sm
                              ${theme === "dark"
                                ? "bg-[#5f6368] text-[#e8eaed] border border-[#3c4043]"
                                : "bg-white text-[#202124] border border-[#dadce0]"
                              }
                            `}
                          />
                        </div>
                        <div>
                          <label className={`text-xs sm:text-sm block mb-1 ${
                            theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                          }`}>
                            Check-in Time
                          </label>
                          <input
                            type="time"
                            value={editForm.checkInTime}
                            onChange={(e) => {
                              setEditForm({ ...editForm, checkInTime: e.target.value });
                              setDateConflict(null);
                            }}
                            className={`
                              w-full px-3 py-2 rounded text-xs sm:text-sm
                              ${theme === "dark"
                                ? "bg-[#5f6368] text-[#e8eaed] border border-[#3c4043]"
                                : "bg-white text-[#202124] border border-[#dadce0]"
                              }
                            `}
                          />
                        </div>
                        <div>
                          <label className={`text-xs sm:text-sm block mb-1 ${
                            theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                          }`}>
                            Check-out Date
                          </label>
                          <input
                            type="date"
                            value={editForm.checkOutDate}
                            onChange={(e) => {
                              setEditForm({ ...editForm, checkOutDate: e.target.value });
                              setDateConflict(null);
                            }}
                            className={`
                              w-full px-3 py-2 rounded text-xs sm:text-sm
                              ${theme === "dark"
                                ? "bg-[#5f6368] text-[#e8eaed] border border-[#3c4043]"
                                : "bg-white text-[#202124] border border-[#dadce0]"
                              }
                            `}
                          />
                        </div>
                        <div>
                          <label className={`text-xs sm:text-sm block mb-1 ${
                            theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                          }`}>
                            Check-out Time
                          </label>
                          <input
                            type="time"
                            value={editForm.checkOutTime}
                            onChange={(e) => {
                              setEditForm({ ...editForm, checkOutTime: e.target.value });
                              setDateConflict(null);
                            }}
                            className={`
                              w-full px-3 py-2 rounded text-xs sm:text-sm
                              ${theme === "dark"
                                ? "bg-[#5f6368] text-[#e8eaed] border border-[#3c4043]"
                                : "bg-white text-[#202124] border border-[#dadce0]"
                              }
                            `}
                          />
                        </div>
                      </div>

                      {/* Check Availability Button */}
                      <button
                        onClick={handleCheckConflict}
                        className={`
                          w-full py-2 rounded text-xs sm:text-sm font-medium transition-colors
                          ${dateConflict
                            ? theme === "dark"
                              ? "bg-[#f28b82]/20 text-[#f28b82]"
                              : "bg-[#fce8e6] text-[#d93025]"
                            : theme === "dark"
                              ? "bg-[#34a853] text-[#202124]"
                              : "bg-[#34a853] text-white"
                          }
                        `}
                      >
                        📅 Check Availability
                      </button>

                      {/* Conflict Warning */}
                      {dateConflict && (
                        <div className={`
                          p-3 rounded text-xs sm:text-sm
                          ${theme === "dark"
                            ? "bg-[#f28b82]/10 text-[#f28b82]"
                            : "bg-[#fce8e6] text-[#d93025]"
                          }
                        `}>
                          <p className="font-medium mb-1">⚠️ Booking Conflict Detected!</p>
                          <p className="text-xs">
                            <strong>{dateConflict.name}</strong> ({dateConflict.eventName}) 
                            <br />
                            {dateConflict.start} to {dateConflict.end}
                          </p>
                        </div>
                      )}

                      {/* No Conflict Message */}
                      {!dateConflict && editForm.checkInDate && (
                        <div className={`
                          p-3 rounded text-xs sm:text-sm
                          ${theme === "dark"
                            ? "bg-[#34a853]/10 text-[#34a853]"
                            : "bg-[#e6f4ea] text-[#137333]"
                          }
                        `}>
                          ✅ No conflicts detected. Safe to approve!
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className={`text-xs sm:text-sm ${
                      theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                    }`}>
                      Click "Edit Dates" to modify check-in/check-out times
                    </p>
                  )}
                </div>
              )}

              {/* Feature: Edit Event Details Section */}
              {selected.status === "pending" && (
                <div className={`
                  p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 overflow-hidden
                  ${theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa] border border-[#dadce0]"}
                `}>
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className={`text-xs sm:text-sm font-medium ${
                      theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                    }`}>
                      Modify Event Details
                    </h3>
                    <button
                      onClick={() => {
                        setIsEditingDetails(!isEditingDetails);
                      }}
                      className={`
                        px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium rounded transition-colors
                        ${isEditingDetails
                          ? theme === "dark"
                            ? "bg-[#5f6368] text-[#e8eaed]"
                            : "bg-gray-300 text-gray-700"
                          : theme === "dark"
                            ? "bg-[#8ab4f8] text-[#202124]"
                            : "bg-[#1a73e8] text-white"
                        }
                      `}
                    >
                      {isEditingDetails ? "Cancel Edit" : "Edit Details"}
                    </button>
                  </div>

                  {isEditingDetails ? (
                    <div className="space-y-3">
                      {/* Department */}
                      <div>
                        <label className={`text-xs sm:text-sm block mb-1 ${
                          theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                        }`}>
                          Department
                        </label>
                        <input
                          type="text"
                          value={editForm.department}
                          onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                          placeholder={selected.department || "Enter department"}
                          className={`
                            w-full px-3 py-2 rounded text-xs sm:text-sm
                            ${theme === "dark"
                              ? "bg-[#5f6368] text-[#e8eaed] border border-[#3c4043]"
                              : "bg-white text-[#202124] border border-[#dadce0]"
                            }
                          `}
                        />
                      </div>

                      {/* Society/Club Name */}
                      <div>
                        <label className={`text-xs sm:text-sm block mb-1 ${
                          theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                        }`}>
                          Society / Club Name
                        </label>
                        <input
                          type="text"
                          value={editForm.societyClubName}
                          onChange={(e) => setEditForm({ ...editForm, societyClubName: e.target.value })}
                          placeholder={selected.societyName || selected.societyClubName || "Enter society/club name"}
                          className={`
                            w-full px-3 py-2 rounded text-xs sm:text-sm
                            ${theme === "dark"
                              ? "bg-[#5f6368] text-[#e8eaed] border border-[#3c4043]"
                              : "bg-white text-[#202124] border border-[#dadce0]"
                            }
                          `}
                        />
                      </div>

                      {/* Event Name */}
                      <div>
                        <label className={`text-xs sm:text-sm block mb-1 ${
                          theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                        }`}>
                          Event Name
                        </label>
                        <input
                          type="text"
                          value={editForm.eventName}
                          onChange={(e) => setEditForm({ ...editForm, eventName: e.target.value })}
                          placeholder={selected.eventName || "Enter event name"}
                          className={`
                            w-full px-3 py-2 rounded text-xs sm:text-sm
                            ${theme === "dark"
                              ? "bg-[#5f6368] text-[#e8eaed] border border-[#3c4043]"
                              : "bg-white text-[#202124] border border-[#dadce0]"
                            }
                          `}
                        />
                      </div>

                      {/* Event Description */}
                      <div>
                        <label className={`text-xs sm:text-sm block mb-1 ${
                          theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                        }`}>
                          Event Description
                        </label>
                        <textarea
                          value={editForm.eventDescription}
                          onChange={(e) => setEditForm({ ...editForm, eventDescription: e.target.value })}
                          placeholder={selected.description || selected.eventDescription || "Enter event description"}
                          rows="3"
                          className={`
                            w-full px-3 py-2 rounded text-xs sm:text-sm resize-none
                            ${theme === "dark"
                              ? "bg-[#5f6368] text-[#e8eaed] border border-[#3c4043]"
                              : "bg-white text-[#202124] border border-[#dadce0]"
                            }
                          `}
                        />
                      </div>

                      {/* Purpose */}
                      <div>
                        <label className={`text-xs sm:text-sm block mb-1 ${
                          theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                        }`}>
                          Purpose
                        </label>
                        <input
                          type="text"
                          value={editForm.purpose}
                          onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                          placeholder={selected.purpose || "Enter purpose"}
                          className={`
                            w-full px-3 py-2 rounded text-xs sm:text-sm
                            ${theme === "dark"
                              ? "bg-[#5f6368] text-[#e8eaed] border border-[#3c4043]"
                              : "bg-white text-[#202124] border border-[#dadce0]"
                            }
                          `}
                        />
                      </div>

                      <div className={`
                        p-2 sm:p-3 rounded text-xs sm:text-sm
                        ${theme === "dark"
                          ? "bg-[#8ab4f8]/10 text-[#8ab4f8]"
                          : "bg-[#e8f0fe] text-[#1967d2]"
                        }
                      `}>
                        ℹ️ You can now edit the event details. Changes will be saved when you approve this enquiry.
                      </div>
                    </div>
                  ) : (
                    <p className={`text-xs sm:text-sm ${
                      theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                    }`}>
                      Click "Edit Details" to modify event information
                    </p>
                  )}
                </div>
              )}
              {selected.files && selected.files.length > 0 && (
                <div className="mb-4 sm:mb-6">
                  <h3 className={`text-xs sm:text-sm font-medium mb-2 sm:mb-3 ${
                    theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                  }`}>
                    Attachments ({selected.files.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
                    {selected.files.map((file, idx) => {
                      const fileUrl = normalizeImageKitUrl(file);
                      const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileUrl);
                      
                      return (
                        <a
                          key={idx}
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`
                            group rounded-lg overflow-hidden transition-all hover:shadow-lg
                            ${theme === "dark"
                              ? "bg-[#3c4043] hover:bg-[#5f6368] border border-[#5f6368]"
                              : "bg-[#f8f9fa] hover:bg-[#e8f0fe] border border-[#dadce0]"
                            }
                          `}
                        >
                          {isImage ? (
                            <div className="relative">
                              <img
                                src={fileUrl}
                                alt={`Attachment ${idx + 1}`}
                                className="w-full h-32 object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div 
                                className="hidden w-full h-32 items-center justify-center"
                              >
                                <FileText className={`w-12 h-12 ${
                                  theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                                }`} />
                              </div>
                              <div className={`
                                absolute bottom-0 left-0 right-0 px-2 py-1.5 text-xs font-medium
                                ${theme === "dark" 
                                  ? "bg-black/60 text-white" 
                                  : "bg-white/90 text-[#202124]"
                                }
                              `}>
                                File {idx + 1}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 flex flex-col items-center justify-center h-32">
                              <FileText className={`w-12 h-12 mb-2 ${
                                theme === "dark" ? "text-[#8ab4f8]" : "text-[#1a73e8]"
                              }`} />
                              <span className={`text-xs font-medium text-center ${
                                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                              }`}>
                                File {idx + 1}
                              </span>
                              <span className={`text-xs mt-1 ${
                                theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                              }`}>
                                Click to view
                              </span>
                            </div>
                          )}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              {selected.status === "pending" && (
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <button
                    onClick={handleReject}
                    className={`
                      flex-1 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2
                      ${theme === "dark"
                        ? "bg-[#f28b82]/20 text-[#f28b82] hover:bg-[#f28b82]/30"
                        : "bg-[#fce8e6] text-[#d93025] hover:bg-[#fad2cf] border border-[#f28b82]"
                      }
                    `}
                  >
                    <XCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">Reject</span>
                    <span className="sm:hidden">Reject</span>
                  </button>

                  <button
                    onClick={handleApprove}
                    disabled={isEditingDates && dateConflict}
                    className={`
                      flex-1 py-2 sm:py-3 rounded-lg text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1 sm:gap-2
                      ${isEditingDates && dateConflict
                        ? theme === "dark"
                          ? "bg-[#9aa0a6]/50 text-[#5f6368] cursor-not-allowed"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : theme === "dark"
                          ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                          : "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                      }
                    `}
                  >
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="hidden sm:inline">
                      {isEditingDates ? "Approve with Modified Dates" 
                       : isEditingDetails ? "Approve with Modified Details"
                       : "Approve & Book Venue"}
                    </span>
                    <span className="sm:hidden">Approve</span>
                  </button>
                </div>
              )}

              {selected.status !== "pending" && (
                <div className={`
                  p-3 sm:p-4 rounded-lg flex items-center gap-2 sm:gap-3
                  ${selected.status === "rejected"
                    ? "bg-red-500/10 text-red-600"
                    : "bg-green-500/10 text-green-600"
                  }
                `}>
                  <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm font-medium">
                    This enquiry has been {selected.status}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className={`
              rounded-lg p-6 sm:p-12 text-center
              ${theme === "dark" ? "bg-[#292a2d]" : "bg-white border border-[#dadce0]"}
            `}>
              <FileText className={`w-12 sm:w-16 h-12 sm:h-16 mx-auto mb-3 sm:mb-4 ${
                theme === "dark" ? "text-[#5f6368]" : "text-[#dadce0]"
              }`} />
              <p className={`text-xs sm:text-sm ${
                theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
              }`}>
                Select an enquiry to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}