// src/pages/VenueAssistantEnquiryPage.jsx
// Assistant Portal for Venue Enquiry Approval - Based on AdminEnquiryPage pattern
// ============================================================================

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";
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
  
  const ITEMS_PER_PAGE = 10;

  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };

  // Load venue enquiries
  const loadEnquiries = async () => {
    try {
      console.log("🔥 Loading venue enquiries...");
      const res = await axios.get(`${API}/api/venue/enquiry/all`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
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
    
    window.addEventListener("venueEnquiryCreated", handleNewEnquiry);
    window.addEventListener("venueEnquiryUpdated", handleEnquiryUpdated);

    return () => {
      window.removeEventListener("venueEnquiryCreated", handleNewEnquiry);
      window.removeEventListener("venueEnquiryUpdated", handleEnquiryUpdated);
    };
  }, []);

  // Handle Approve
  const handleApprove = async () => {
    if (!selected) return;

    try {
      await axios.put(
        `${API}/api/venue/enquiry/${selected._id}/approved`,
        {},
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      showToast("Enquiry approved and room booked successfully.", "success");
      await loadEnquiries();
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
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
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
        min-h-screen p-6
        ${theme === "dark" ? "bg-[#202124]" : "bg-[#f8f9fa]"}
      `}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-2xl font-normal ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}>
              Venue Enquiry Management
            </h1>
            <p className={`text-sm mt-1 ${
              theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
            }`}>
              Review and approve venue booking requests
            </p>
          </div>

          {/* Filter Buttons */}
          <div className="flex gap-2">
            {["all", "pending", "approved", "rejected"].map(f => (
              <button
                key={f}
                onClick={() => {
                  setFilter(f);
                  setCurrentPage(1);
                }}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Enquiry List - Now takes 2 out of 5 columns */}
        <div className="lg:col-span-2">
          <div className={`
            rounded-lg overflow-hidden
            ${theme === "dark" ? "bg-[#292a2d]" : "bg-white border border-[#dadce0]"}
          `}>
            <div className={`
              px-4 py-3 border-b
              ${theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"}
            `}>
              <p className={`text-sm font-medium ${
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
                    p-4 border-b cursor-pointer transition-all
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
                  <div className="flex items-start justify-between mb-2">
                    <p className={`font-medium text-sm ${
                      theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                    }`}>
                      {e.name}
                    </p>
                    <span className={`
                      text-xs px-2 py-0.5 rounded-full
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
                  <p className={`text-xs mb-1 ${
                    theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                  }`}>
                    {e.department}
                  </p>
                  <p className={`text-xs mb-1 ${
                    theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                  }`}>
                    {e.hall} - {e.roomNo}
                  </p>
                  <p className={`text-xs ${
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
              rounded-lg p-6
              ${theme === "dark" ? "bg-[#292a2d]" : "bg-white border border-[#dadce0]"}
            `}>
              {/* Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className={`text-xl font-normal mb-1 ${
                    theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                  }`}>
                    {selected.name}
                  </h2>
                  <p className={`text-sm ${
                    theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                  }`}>
                    {selected.department}
                  </p>
                </div>

                <span className={`
                  px-3 py-1 rounded-full text-sm font-medium
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
                <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-500" />
                  <span className={`text-sm ${
                    theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                  }`}>
                    {selected.email}
                  </span>
                </div>
                <div className={`text-sm mb-6 ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  <strong>Venue:</strong> {selected.hall} - {selected.roomNo}
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-blue-500" />
                  <span className={`text-sm ${
                    theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                  }`}>
                    {selected.contact}
                  </span>
                </div>
              </div>

              {/* Event Details */}
              <div className={`
                p-4 rounded-lg mb-6
                ${theme === "dark" ? "bg-[#3c4043]" : "bg-[#f8f9fa] border border-[#dadce0]"}
              `}>
                <h3 className={`text-sm font-medium mb-3 ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  Event Information
                </h3>

                {(selected.societyName || selected.societyClubName) && (
                  <p className={`text-sm mb-2 ${
                    theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
                  }`}>
                    <strong>Society/Club:</strong> {selected.societyName || selected.societyClubName}
                  </p>
                )}

                <p className={`text-sm mb-3 ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  {selected.description || selected.eventDescription}
                </p>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-green-500" />
                    <div>
                      <p className={theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}>
                        Start
                      </p>
                      <p className={theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}>
                        {formatShortDate(selected.checkInDate || selected.startDate)} • {formatTimeWithAMPM(selected.checkInTime || selected.startTime)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-red-500" />
                    <div>
                      <p className={theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"}>
                        End
                      </p>
                      <p className={theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"}>
                        {formatShortDate(selected.checkOutDate || selected.endDate)} • {formatTimeWithAMPM(selected.checkOutTime || selected.endTime)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attachments */}
              {selected.files && selected.files.length > 0 && (
                <div className="mb-6">
                  <h3 className={`text-sm font-medium mb-3 ${
                    theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                  }`}>
                    Attachments ({selected.files.length})
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
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
                <div className="flex gap-3">
                  <button
                    onClick={handleReject}
                    className={`
                      flex-1 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                      ${theme === "dark"
                        ? "bg-[#f28b82]/20 text-[#f28b82] hover:bg-[#f28b82]/30"
                        : "bg-[#fce8e6] text-[#d93025] hover:bg-[#fad2cf] border border-[#f28b82]"
                      }
                    `}
                  >
                    <XCircle className="w-5 h-5" />
                    Reject
                  </button>

                  <button
                    onClick={handleApprove}
                    className={`
                      flex-1 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2
                      ${theme === "dark"
                        ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                        : "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                      }
                    `}
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    Approve & Book Venue
                  </button>
                </div>
              )}

              {selected.status !== "pending" && (
                <div className={`
                  p-4 rounded-lg flex items-center gap-3
                  ${selected.status === "rejected"
                    ? "bg-red-500/10 text-red-600"
                    : "bg-green-500/10 text-green-600"
                  }
                `}>
                  <AlertCircle className="w-5 h-5" />
                  <p className="text-sm font-medium">
                    This enquiry has been {selected.status}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className={`
              rounded-lg p-12 text-center
              ${theme === "dark" ? "bg-[#292a2d]" : "bg-white border border-[#dadce0]"}
            `}>
              <FileText className={`w-16 h-16 mx-auto mb-4 ${
                theme === "dark" ? "text-[#5f6368]" : "text-[#dadce0]"
              }`} />
              <p className={`text-sm ${
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