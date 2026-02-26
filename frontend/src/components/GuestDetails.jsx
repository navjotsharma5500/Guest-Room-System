/* GuestDetails.jsx - FIXED VERSION */
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";
import { Info, Save, X, Building2, Receipt, Upload, Trash2, CheckCircle } from "lucide-react";
import PaymentModal from "./PaymentModal";
import PaymentWaiverModal from "./PaymentWaiverModal";
import { IKContext, IKUpload } from "imagekitio-react";
import GuestHistory from "./GuestHistory";
import ReportedModal from "./ReportedModal";
import CancelModal from "./CancelModal";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAuth } from "../context/AuthContext";
import PaymentSection from "./GuestDetails/PaymentSection";
import AttachmentsSection from "./GuestDetails/AttachmentsSection";
import GuestProfile from "./GuestDetails/GuestProfile";
import GuestActions from "./GuestDetails/GuestActions";
import thaparLogo from "../assets/thapar_logo.png";
import BillHistoryModal from "./BillHistoryModal";
import {
  formatTimeWithAMPM,
  formatDate,
  formatCreatedAt
} from "./GuestDetails/utils";
import { BACKEND_URL, IMAGEKIT_PUBLIC_KEY, IMAGEKIT_URL_ENDPOINT } from "../utils/apiConfig";

const API = BACKEND_URL;

const imagekitAuthenticator = async () => {
  try {
    const response = await fetch(`${API}/api/imagekit/auth`, { credentials: "include" });
    if (!response.ok) throw new Error("Failed to fetch ImageKit auth parameters");
    return response.json();
  } catch (err) {
    console.error("ImageKit authenticator error:", err);
    throw err;
  }
};

export default function GuestDetails({ activeRoomRef = null, onCancel = () => {}, theme = "light", setExtensionModal = () => {}, hideExtendButton = false, onClose = null }) {
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };
  const { token, currentUser } = useAuth();
  const userRole = currentUser?.role || currentUser?.user?.role;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchAttempts, setFetchAttempts] = useState(0);
  const [isUploadingProfile, setIsUploadingProfile] = useState(false);
  const [uploadedProfileUrl, setUploadedProfileUrl] = useState(null);
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGuestHistory, setShowGuestHistory] = useState(false);
  const mongoFetchSuccessRef = useRef(false);
  const maxRetries = 3;
  const [formData, setFormData] = useState({});
  const [showReportedModal, setShowReportedModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [checkOutComment, setCheckOutComment] = useState("");
  const [showBillHistory, setShowBillHistory] = useState(false);
  const [enquiryFiles, setEnquiryFiles] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelRemarks, setCancelRemarks] = useState("");
  const [showDepartmentPayModal, setShowDepartmentPayModal] = useState(false);
  const [deptPayRemarks, setDeptPayRemarks] = useState("");
  const [showPaymentWaiverModal, setShowPaymentWaiverModal] = useState(false);
  // Department pay modal extra fields
  const [deptPayAttachments, setDeptPayAttachments] = useState([]);
  const [deptPayDeptName, setDeptPayDeptName] = useState("");
  const [deptPayDeptEmail, setDeptPayDeptEmail] = useState("");
  const [deptPayUploading, setDeptPayUploading] = useState(false);
  const deptPayIkRef = useRef(null);
  const isDepartmentPayment = booking?.paymentResponsibility === "DEPARTMENT";

  // ✅ FIXED: Close Guest Details panel on checkout
  useEffect(() => {
    const handleGuestCheckedOut = (event) => {
      const { bookingId } = event.detail || {};
      const currentBookingId = booking?._id || booking?.id;
      
      if (bookingId === currentBookingId) {
        console.log("📡 Guest checked out - closing details panel...");
        
        // ✅ Clear the booking data (this will close the panel)
        setBooking(null);
        
        // ✅ If there's a parent component managing activeRoomRef, notify it
        if (onCancel && typeof onCancel === 'function') {
          onCancel(); // This typically closes modals/panels in parent
        }
      }
    };

    window.addEventListener("guestCheckedOut", handleGuestCheckedOut);
    
    return () => {
      window.removeEventListener("guestCheckedOut", handleGuestCheckedOut);
    };
  }, [booking, onCancel]);

  useEffect(() => {
    const handleBookingDataUpdated = (event) => {
      if (!booking?._id) return;

      console.log("📡 Booking data updated by cron, refreshing booking...");

      const authToken = token || localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;

      fetch(`${API}/api/bookings/${booking._id}`, {
        method: "GET",
        credentials: "include",
        headers
      })
        .then(res => res.json())
        .then(data => {
          if (data?.success && data.booking) {
            setBooking(normalizeBooking(data.booking));
          }
        })
        .catch(err => console.error("❌ Failed to refresh after cron:", err));
    };

    window.addEventListener("bookingDataUpdated", handleBookingDataUpdated);

    return () => {
      window.removeEventListener("bookingDataUpdated", handleBookingDataUpdated);
    };
  }, [booking?._id, token]);


  // Fetch enquiry files when booking has enquiryId
  useEffect(() => {
    if (!booking?.enquiryId) {
      console.log("❌ No enquiryId found in booking");
      setEnquiryFiles([]);
      return;
    }

    const enquiryId = typeof booking.enquiryId === 'object' 
      ? booking.enquiryId.$oid || booking.enquiryId._id 
      : booking.enquiryId;

    console.log("🔥 Fetching enquiry files for:", enquiryId);
    console.log("📋 Booking enquiryId structure:", booking.enquiryId);

    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    fetch(`${API}/api/enquiry/${enquiryId}`, {
      credentials: "include",
      headers,
    })
      .then(res => {
        console.log("📡 Enquiry fetch response status:", res.status);
        return res.json();
      })
      .then(data => {
        console.log("📦 Enquiry API response:", data);
        
        if (data?.success && data?.enquiry) {
          const files = Array.isArray(data.enquiry.files) ? data.enquiry.files : [];
          console.log("✅ Enquiry files extracted:", files);
          setEnquiryFiles(files);
        } else {
          console.warn("⚠️ No files found in enquiry response");
          setEnquiryFiles([]);
        }
      })
      .catch(err => {
        console.error("❌ Error fetching enquiry:", err);
        setEnquiryFiles([]);
      });
  }, [booking?.enquiryId]);

  // Listen for real-time booking updates
  useEffect(() => {
    const handleBookingCancelled = (event) => {
    const { bookingId } = event.detail || {};
    const currentBookingId = booking?._id || booking?.id;
    
    if (bookingId === currentBookingId) {
      console.log("📡 Current booking cancelled - closing details panel...");
      
      // ✅ Clear the booking data (this will close the panel)
      setBooking(null);
      
      // ✅ If there's a parent component managing activeRoomRef, notify it
      if (onCancel && typeof onCancel === 'function') {
        onCancel(); // This typically closes modals/panels in parent
      }
    }
  };

    const handleBookingExtended = (event) => {
      const { bookingId } = event.detail || {};
      const currentBookingId = booking?._id || booking?.id;
      
      if (bookingId === currentBookingId) {
        console.log("📡 Current booking extended - refreshing...");
        
        // ✅ FORCE REFRESH FROM API
        const authToken = token || localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
        
        fetch(`${API}/api/bookings/${bookingId}`, { 
          method: "GET", 
          credentials: "include", 
          headers 
        })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.booking) {
              console.log("✅ Booking refreshed after extension:", data.booking);
              setBooking(normalizeBooking(data.booking));
            }
          })
          .catch(err => console.error("Failed to refresh booking:", err));
      }
    };

    const handlePaymentUpdated = (event) => {
      const { bookingId } = event.detail || {};
      const currentBookingId = booking?._id || booking?.id;
      
      if (bookingId === currentBookingId) {
        console.log("📡 Payment updated - refreshing...");
        // Trigger a re-fetch (same logic as handleBookingExtended)
        if (activeRoomRef?.booking) {
          const b = activeRoomRef.booking;
          const bookingId = b?._id || b?.id || null;
          const hasValidMongoId = typeof bookingId === "string" && !bookingId.startsWith("b_");
          
          if (hasValidMongoId) {
            const authToken = token || localStorage.getItem("token");
            const headers = { "Content-Type": "application/json" };
            if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
            
            fetch(`${API}/api/bookings/${bookingId}`, { 
              method: "GET", 
              credentials: "include", 
              headers 
            })
              .then(res => res.json())
              .then(data => {
                if (data.success && data.booking) {
                  setBooking(normalizeBooking(data.booking));
                }
              })
              .catch(err => console.error("Failed to refresh booking:", err));
          }
        }
      }
    };

    // ✅ ADD THIS NEW HANDLER
    const handleGuestReported = (event) => {
      const { bookingId } = event.detail || {};
      const currentBookingId = booking?._id || booking?.id;
      
      if (bookingId === currentBookingId) {
        console.log("📡 Guest reported - refreshing booking data...");
        
        // Trigger full refresh to get updated dates
        const authToken = token || localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
        
        fetch(`${API}/api/bookings/${bookingId}`, { 
          method: "GET", 
          credentials: "include", 
          headers 
        })
          .then(res => res.json())
          .then(data => {
            if (data.success && data.booking) {
              setBooking(normalizeBooking(data.booking));
              console.log("✅ Booking refreshed after guest reported");
            }
          })
          .catch(err => console.error("Failed to refresh booking:", err));
      }
    };

    // Register event listeners
    window.addEventListener("bookingCancelled", handleBookingCancelled);
    window.addEventListener("bookingExtended", handleBookingExtended);
    window.addEventListener("paymentUpdated", handlePaymentUpdated);
    window.addEventListener("guestReported", handleGuestReported); // ✅ ADD THIS

    // Cleanup
    return () => {
      window.removeEventListener("bookingCancelled", handleBookingCancelled);
      window.removeEventListener("bookingExtended", handleBookingExtended);
      window.removeEventListener("paymentUpdated", handlePaymentUpdated);
      window.removeEventListener("guestReported", handleGuestReported); // ✅ ADD THIS
    };
  }, [booking, activeRoomRef, token]);

  const normalizeBooking = (b = {}) => {
    let normalizedEnquiryId = null;
    if (b.enquiryId) {
      if (typeof b.enquiryId === 'string') {
        normalizedEnquiryId = b.enquiryId;
      } else if (b.enquiryId.$oid) {
        normalizedEnquiryId = b.enquiryId.$oid;
      } else if (b.enquiryId._id) {
        normalizedEnquiryId = b.enquiryId._id;
      }
    }

    return { 
      ...b, 
      enquiryId: normalizedEnquiryId,
      rollno: b.rollno ?? "", 
      department: b.department ?? "", 
      reference: b.reference ?? "", 
      gender: b.gender ?? "", 
      approvalDocuments: Array.isArray(b.approvalDocuments) ? b.approvalDocuments : [],
      paymentAttachments: Array.isArray(b.paymentAttachments) ? b.paymentAttachments : [],
      extensionAttachments: Array.isArray(b.extensionAttachments) ? b.extensionAttachments : [],
      files: Array.isArray(b.files) ? b.files : [],
      hostel: b.hostel || activeRoomRef?.hostel || "",
      roomNo: b.roomNo || activeRoomRef?.roomNo || ""
    };
  };

  useEffect(() => {
    if (!activeRoomRef?.booking) { 
      setBooking(null); 
      mongoFetchSuccessRef.current = false; 
      return; 
    }
    
    const b = activeRoomRef.booking;
    setBooking(prev => ({ ...prev, ...b }));
    
    const bookingId = b?._id || b?.id || null;
    const hasValidMongoId = typeof bookingId === "string" && !bookingId.startsWith("b_");
    
    if (hasValidMongoId) {
      setLoading(true);
      const authToken = token || localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
      
      fetch(`${API}/api/bookings/${bookingId}`, { 
        method: "GET", 
        credentials: "include", 
        headers 
      })
        .then(res => { 
          if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`); 
          return res.json(); 
        })
        .then(async (data) => {
          let fetchedBooking;
          if (data.success && data.booking) fetchedBooking = data.booking;
          else if (data._id || data.guest) fetchedBooking = data;
          else throw new Error("Invalid booking data format");
          
          if (!(fetchedBooking.guest || fetchedBooking.email || fetchedBooking.contact)) {
            throw new Error("Incomplete booking data");
          }
          
          const preservedBooking = { 
            ...fetchedBooking, 
            _id: fetchedBooking._id || b._id, 
            id: fetchedBooking._id || b._id,
            hostel: fetchedBooking.hostel || activeRoomRef?.hostel || "",
            roomNo: fetchedBooking.roomNo || activeRoomRef?.roomNo || ""
          };
          
          setBooking(normalizeBooking(preservedBooking));
          mongoFetchSuccessRef.current = true;
          setFetchAttempts(0);
        })
        .catch(err => {
          console.error("Fetch error:", err);
          if (fetchAttempts < maxRetries) {
            setTimeout(() => setFetchAttempts(prev => prev + 1), 1000);
          } else { 
            console.warn("Max retries reached"); 
            setBooking(normalizeBooking(b)); 
            mongoFetchSuccessRef.current = false; 
          }
        })
        .finally(() => setLoading(false));
    } else { 
      setBooking(normalizeBooking(b)); 
      mongoFetchSuccessRef.current = false; 
    }
  }, [activeRoomRef?.booking, token, fetchAttempts]);

  if (!activeRoomRef) {
    return (
      <div className="flex flex-col items-center justify-center mt-10 text-gray-500 italic">
        <Info className="w-6 h-6 mb-2 text-red-400" />
        <p>Select a room to view guest details.</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center mt-10 text-gray-500 italic">
        <p>Loading guest details...</p>
        {fetchAttempts > 0 && (
          <p className="text-xs text-gray-400 mt-2">Retry {fetchAttempts}/{maxRetries}</p>
        )}
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Loading booking details…
      </div>
    );
  }

  const b = normalizeBooking(booking || {});

  console.log("🎯 Booking extensionAttachments:", {
    extensionAttachments: b.extensionAttachments,
    count: b.extensionAttachments?.length || 0,
    type: typeof b.extensionAttachments,
    isArray: Array.isArray(b.extensionAttachments)
  });
  
  if (Object.keys(b).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-10 text-gray-500 italic">
        <Info className="w-6 h-6 mb-2 text-red-400" />
        <p>No booking information available.</p>
      </div>
    );
  }

  const profilePicture = uploadedProfileUrl || b.profilePicture;

  const handlePaymentSuccess = (updatedBooking) => { 
    setBooking(normalizeBooking(updatedBooking)); 
    setPaymentModalOpen(false); 
  };

  const handleCancelBooking = async (remarks) => {
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const response = await fetch(`${API}/api/bookings/${b._id || b.id}/cancel`, {
        method: "PUT",
        headers,
        credentials: "include",
        body: JSON.stringify({ remarks })
      });
      
      const data = await response.json();
      
      if (data.success) {
      // Update booking with cancelled status
      setBooking(normalizeBooking({ ...b, status: "cancelled", cancelRemarks: remarks }));
      setShowCancelModal(false);
      setCancelRemarks("");
      showToast("✅ Booking cancelled successfully!", "success");
      
      // ✅ Close the guest details panel after short delay
      setTimeout(() => {
        if (onClose) {
          onClose();
        } else if (onCancel) {
          onCancel();
        }
      }, 1500); // 1.5 second delay to let user see the success message
    } else {
        throw new Error(data.message || "Failed to cancel booking");
      }
    } catch (err) {
      console.error("Cancel error:", err);
      showToast(err.message || "Failed to cancel booking", "error");
    }
  };
  
  // ============================================================================
  // ✅ ADVANCED GUEST PROFILE PDF GENERATOR
  // ============================================================================
  const handleDownloadPDF = async () => {
    try {
      const doc = new jsPDF();
      let yPos = 20;

      // ============================================
      // HEADER SECTION WITH LOGO - FIXED
      // ============================================
      
      // Add Thapar Logo (left side)
      try {
        doc.addImage(thaparLogo, 'PNG', 15, yPos, 25, 25);
      } catch (err) {
        console.warn("Logo not found, using placeholder");
        doc.setFillColor(220, 38, 38);
        doc.rect(15, yPos, 25, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text("T", 23, yPos + 16);
      }

      // Institute Name (right of logo) - FIXED: No special characters
      doc.setTextColor(153, 27, 27);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Thapar Institute of Engineering and Technology", 45, yPos + 8);

      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.setFont("helvetica", "normal");
      doc.text("Patiala, Punjab - 147001", 45, yPos + 16);

      // Red line separator
      yPos = 50;
      doc.setDrawColor(220, 38, 38);
      doc.setLineWidth(2);
      doc.line(15, yPos, 195, yPos);

      // Title
      yPos = 60;
      doc.setFontSize(16);
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
      doc.text("GUEST PROFILE REPORT", 105, yPos, { align: "center" });

      // ============================================
      // GUEST PROFILE SECTION - FIXED
      // ============================================
      yPos = 75;

      // Profile Picture (if available) - FIXED: Proper fallback
      if (b.profilePicture) {
        try {
          doc.addImage(b.profilePicture, 'JPEG', 15, yPos, 30, 30);
        } catch (err) {
          // Fallback: Empty circle with user icon
          doc.setFillColor(220, 38, 38);
          doc.circle(30, yPos + 15, 15, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(24);
          doc.setFont("helvetica", "bold");
          // Use simple text instead of emoji
          doc.text("U", 26, yPos + 19);
        }
      } else {
        // Default user icon circle - FIXED: No special characters
        doc.setFillColor(239, 68, 68);
        doc.circle(30, yPos + 15, 15, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        // Simple "U" for User instead of emoji
        doc.text("U", 26, yPos + 19);
      }

      // Guest Name
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.setFont("helvetica", "bold");
      doc.text(b.guest || "Guest Name", 50, yPos + 8);

      // Grid for basic details
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);

      const basicDetails = [
        { label: "Gender:", value: b.gender || "N/A", x: 50, y: yPos + 15 },
        { label: "Email:", value: b.email || "N/A", x: 110, y: yPos + 15 },
        { label: "Roll No./Emp ID:", value: b.rollno || "N/A", x: 50, y: yPos + 22 },
        { label: "Department:", value: b.department || "N/A", x: 110, y: yPos + 22 },
        { label: "Phone:", value: b.contact || "N/A", x: 50, y: yPos + 29 },
        { label: "Resident Status:", value: "GUEST", x: 110, y: yPos + 29 }
      ];

      basicDetails.forEach(detail => {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(107, 114, 128);
        doc.text(detail.label, detail.x, detail.y);
        
        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 41, 55);
        doc.text(detail.value, detail.x + 30, detail.y);
      });

      // ============================================
      // HOSTEL STAY DETAILS - FIXED
      // ============================================
      yPos = 120;

      // Section header with background - FIXED: No special characters
      doc.setFillColor(254, 242, 242);
      doc.rect(15, yPos, 180, 10, 'F');
      doc.setFontSize(12);
      doc.setTextColor(220, 38, 38);
      doc.setFont("helvetica", "bold");
      doc.text("Hostel Stay Details", 18, yPos + 7);

      yPos += 15;

      const stayDetails = [
        { label: "Hostel Name:", value: b.hostel || "N/A" },
        { label: "Check-in Date:", value: formatDate(b.from) },
        { label: "Guest Room No.:", value: b.roomNo || "N/A" },
        { label: "Reported In Date:", value: b.actualCheckInDate ? formatDate(b.actualCheckInDate) : "Not Reported" },
        { label: "Check-out Date:", value: formatDate(b.to) },
        { label: "Total Stay Days:", value: calculateStayDays(b.from, b.to) + " days" }
      ];

      stayDetails.forEach((detail, index) => {
        const xPos = index % 2 === 0 ? 20 : 110;
        const yOffset = Math.floor(index / 2) * 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text(detail.label, xPos, yPos + yOffset);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 41, 55);
        doc.text(detail.value, xPos + 40, yPos + yOffset);
      });

      // ============================================
      // ADDRESS & OTHER DETAILS - FIXED
      // ============================================
      yPos += 35;

      // Section header - FIXED: No special characters
      doc.setFillColor(239, 246, 255);
      doc.rect(15, yPos, 180, 10, 'F');
      doc.setFontSize(12);
      doc.setTextColor(30, 64, 175);
      doc.setFont("helvetica", "bold");
      doc.text("Address & Other Details", 18, yPos + 7);

      yPos += 15;

      const addressDetails = [
        { label: "City:", value: b.city || "N/A" },
        { label: "State:", value: b.state || "N/A" },
        { label: "Reference:", value: b.reference || "N/A" },
        { label: "Purpose:", value: b.purpose || "N/A" }
      ];

      addressDetails.forEach((detail, index) => {
        const xPos = index % 2 === 0 ? 20 : 110;
        const yOffset = Math.floor(index / 2) * 7;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text(detail.label, xPos, yPos + yOffset);

        doc.setFont("helvetica", "bold");
        doc.setTextColor(31, 41, 55);
        const value = detail.value.length > 30 ? detail.value.substring(0, 30) + "..." : detail.value;
        doc.text(value, xPos + 25, yPos + yOffset);
      });

      // ============================================
      // BILLING SUMMARY - FIXED WITH BILLS TABLE
      // ============================================
      yPos += 25;

      // Section header - FIXED: No special characters
      doc.setFillColor(240, 253, 244);
      doc.rect(15, yPos, 180, 10, 'F');
      doc.setFontSize(12);
      doc.setTextColor(21, 128, 61);
      doc.setFont("helvetica", "bold");
      doc.text("Billing Summary", 18, yPos + 7);

      yPos += 15;

      const amount = b.totalAmount || b.amount || 0;
      const paidAmount = b.paidAmount || 0;
      const balanceAmount = b.balanceAmount || (amount - paidAmount);
      const isPaid = b.paymentStatus === "PAID" || balanceAmount === 0;

      // Overall Payment Status
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(107, 114, 128);
      doc.text("Total Amount:", 20, yPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(31, 41, 55);
      doc.text(`Rs. ${amount}`, 60, yPos);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text("Paid Amount:", 110, yPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(21, 128, 61);
      doc.text(`Rs. ${paidAmount}`, 145, yPos);

      yPos += 7;

      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text("Status:", 20, yPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(isPaid ? 21 : 220, isPaid ? 128 : 38, isPaid ? 61 : 38);
      doc.text(isPaid ? "PAID" : "UNPAID", 60, yPos);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(107, 114, 128);
      doc.text("Balance:", 110, yPos);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(220, 38, 38);
      doc.text(`Rs. ${balanceAmount}`, 145, yPos);

      yPos += 12;

      // Fetch and display all bills
      try {
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(`${API}/api/payments/bookings/${b._id || b.id}/payment-history`, {
          credentials: "include",
          headers
        });

        if (response.ok) {
          const data = await response.json();
          const bills = data.bills || [];

          if (bills.length > 0) {
            // Bills table header
            doc.setFillColor(21, 128, 61);
            doc.rect(15, yPos, 180, 8, 'F');

            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 255, 255);
            
            doc.text("Bill ID", 18, yPos + 5);
            doc.text("Amount", 45, yPos + 5);
            doc.text("Mode", 70, yPos + 5);
            doc.text("Type", 95, yPos + 5);
            doc.text("Transaction ID", 120, yPos + 5);
            doc.text("Date", 165, yPos + 5);

            yPos += 8;

            // Table rows
            bills.forEach((bill, index) => {
              // Alternate row colors
              if (index % 2 === 0) {
                doc.setFillColor(249, 250, 251);
                doc.rect(15, yPos, 180, 7, 'F');
              }

              doc.setFontSize(7);
              doc.setFont("helvetica", "normal");
              doc.setTextColor(31, 41, 55);

              // Bill Number
              doc.text(bill.billNumber || "N/A", 18, yPos + 4.5);

              // Amount
              doc.setFont("helvetica", "bold");
              doc.setTextColor(21, 128, 61);
              doc.text(`Rs. ${bill.amountPaid || 0}`, 45, yPos + 4.5);

              // Payment Mode
              doc.setFont("helvetica", "normal");
              doc.setTextColor(31, 41, 55);
              doc.text(bill.paymentMethod || "N/A", 70, yPos + 4.5);

              // Payment Type
              doc.setFont("helvetica", "bold");
              doc.setTextColor(bill.paymentType === "FULL" ? 21 : 30, bill.paymentType === "FULL" ? 128 : 64, bill.paymentType === "FULL" ? 61 : 175);
              doc.text(bill.paymentType || "FULL", 95, yPos + 4.5);

              // Transaction ID
              doc.setFont("helvetica", "normal");
              doc.setTextColor(75, 85, 99);
              const txnId = bill.transactionId || "N/A";
              doc.text(txnId.length > 15 ? txnId.substring(0, 15) + "..." : txnId, 120, yPos + 4.5);

              // Date
              doc.text(formatDate(bill.createdAt), 165, yPos + 4.5);

              yPos += 7;

              // Add new page if needed
              if (yPos > 270 && index < bills.length - 1) {
                doc.addPage();
                yPos = 20;
              }
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch bill details:", err);
      }

      // ============================================
      // FOOTER
      // ============================================
      yPos = 280;
      doc.setDrawColor(229, 231, 235);
      doc.setLineWidth(0.5);
      doc.line(15, yPos, 195, yPos);

      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.setFont("helvetica", "normal");
      doc.text("Generated on: " + new Date().toLocaleString('en-IN'), 105, yPos + 5, { align: "center" });
      doc.text("This is a computer-generated document. For queries: hostel.admin@thapar.edu", 105, yPos + 10, { align: "center" });

      // Save PDF
      doc.save(`Guest_${b.guest || "Profile"}_${new Date().toISOString().split('T')[0]}.pdf`);
      setShowActionsDropdown(false);

    } catch (err) {
      console.error("PDF generation error:", err);
      showToast("❌ Failed to generate PDF. Please try again.", "error");
    }
  };

  // ============================================
  // HELPER FUNCTIONS (Add these after handleDownloadPDF)
  // ============================================

  // Calculate stay duration
  const calculateStayDays = (from, to) => {
    if (!from || !to) return 0;
    const start = new Date(from);
    const end = new Date(to);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays || 1;
  };

  // Format date helper (if not already defined in utils)
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, "0");
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      return "Invalid Date";
    }
  };

  const handleBillHistory = () => {
    setShowBillHistory(true);
    setShowActionsDropdown(false);
  };
  
  const handleGuestHistory = () => { 
    setShowGuestHistory(true); 
    setShowActionsDropdown(false); 
  };
  
  const handleEditDetails = () => { 
    setFormData({ 
      guest: b.guest, 
      rollno: b.rollno, 
      department: b.department, 
      contact: b.contact, 
      email: b.email, 
      gender: b.gender, 
      numGuests: b.numGuests, 
      males: b.males, 
      females: b.females, 
      city: b.city, 
      state: b.state, 
      purpose: b.purpose 
    }); 
    setIsEditMode(true); 
    setShowActionsDropdown(false); 
  };
  
  const handleInputChange = (e) => { 
    const { name, value } = e.target; 
    setFormData(prev => ({ ...prev, [name]: value })); 
  };
  
  const handleSaveEdit = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const response = await fetch(`${API}/api/bookings/${b._id || b.id}/details`, { 
        method: "PUT", 
        headers, 
        body: JSON.stringify(formData) 
      });
      
      const data = await response.json();
      
      if (data.success) { 
        setBooking(normalizeBooking(data.booking)); 
        setIsEditMode(false); 
        showToast("✅ Updated successfully!", "success");
      } else {
        throw new Error(data.message || "Failed to update");
      }
    } catch (err) { 
      console.error("Update error:", err); 
      showToast(err.message || "❌ Failed to save changes", "error");
    }
  };

  const handleCancelEdit = () => setIsEditMode(false);

  console.log("🎯 ATTACHMENTS DEBUG:", {
    enquiryId: b.enquiryId,
    enquiryFiles: enquiryFiles,
    enquiryFilesCount: enquiryFiles.length,
    bookingFiles: b.files,
    bookingFilesCount: b.files?.length || 0,
    approvalDocs: b.approvalDocuments,
    approvalDocsCount: b.approvalDocuments?.length || 0,
    paymentAttachments: b.paymentAttachments,
    paymentAttachmentsCount: b.paymentAttachments?.length || 0,
    extensionAttachments: b.extensionAttachments,
    extensionAttachmentsCount: b.extensionAttachments?.length || 0,
    totalEnquiryTab: enquiryFiles.length + (b.files?.length || 0),
  });

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }} 
        className={`rounded-xl shadow-lg border overflow-hidden ${
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        {/* Header Section */}
        <div className={`p-5 border-b-4 border-red-500 ${
          theme === "dark" 
            ? "bg-gradient-to-r from-gray-900 to-gray-700" 
            : "bg-gradient-to-r from-gray-200 to-gray-100"
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <h2 className={`${
                theme === "dark" ? "text-white" : "text-gray-900"
              } text-2xl font-bold mb-1`}>
                Guest Booking Details
              </h2>
              <p className={`${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              } text-base`}>
                Guest profile, accommodation, documents and timeline
              </p>
            </div>
            <GuestActions
              showActionsDropdown={showActionsDropdown}
              setShowActionsDropdown={setShowActionsDropdown}
              theme={theme}
              booking={b}
              onEditDetails={handleEditDetails}
              onGuestHistory={handleGuestHistory}
              onBillHistory={handleBillHistory}
              onDownloadPDF={handleDownloadPDF}
              onPayAmount={() => setPaymentModalOpen(true)}
              onExtendBooking={() => {
                setExtensionModal({
                  hostel: b.hostel,
                  roomNo: b.roomNo,
                  booking: b,
                });
              }}
              onCancelBooking={() => setShowCancelModal(true)} 
              onPaymentWaiver={() => setShowPaymentWaiverModal(true)}
              userRole={userRole}
            />
          </div>
          <div className="flex justify-between items-center mt-4">
            <p className={`${
              theme === "dark" ? "text-gray-300" : "text-gray-700"
            } text-sm`}>
              {formatCreatedAt(b.createdAt)}
            </p>
            {mongoFetchSuccessRef.current && (
              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                ✓ MongoDB
              </span>
            )}
          </div>
        </div>

        {/* 1. PROFILE SECTION */}
        <GuestProfile 
          booking={b} 
          theme={theme} 
          profilePicture={profilePicture} 
          isUploadingProfile={isUploadingProfile} 
          setIsUploadingProfile={setIsUploadingProfile} 
          setUploadedProfileUrl={setUploadedProfileUrl} 
          imagekitAuthenticator={imagekitAuthenticator} 
        />

        {/* 2. BOOKING INFO SECTION */}
        <div className={`p-6 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
            Booking Information
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Hostel
              </p>
              <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {b.hostel || "—"}
              </p>
            </div>
            <div>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Room Number
              </p>
              <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {b.roomNo || "—"}
              </p>
            </div>
            <div>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Check-in Date
              </p>
              <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {formatDate(b.from)} at {formatTimeWithAMPM(b.checkInTime)}
              </p>
            </div>
            <div>
              <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                Check-out Date
              </p>
              <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {/* ✅ FIXED: Show actual checkout date/time if guest checked out early, otherwise show planned checkout */}
                {b.status === "checked_out" && (b.actualCheckoutDate || b.actualCheckoutTime) ? (
                  <>
                    {formatDate(b.actualCheckoutDate || b.checkedOutAt)} at {formatTimeWithAMPM(b.actualCheckoutTime)}
                    <span className="ml-2 text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                      Actual
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      Planned: {formatDate(b.to)} at {formatTimeWithAMPM(b.checkOutTime)}
                    </p>
                  </>
                ) : (
                  <>
                    {formatDate(b.to)} at {formatTimeWithAMPM(b.checkOutTime)}
                  </>
                )}
              </p>
            </div>
            {(b.remarks || b.freeRemarks) && (
              <div className="col-span-2">
                <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  Remarks
                </p>
                <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {b.remarks || b.freeRemarks}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 3. GUEST DETAILS SECTION */}
        <div className={`p-6 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className={`font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Guest Details
            </h3>
            {isEditMode && (
              <div className="flex gap-3">
                <button 
                  onClick={handleSaveEdit} 
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all"
                >
                  <Save className="w-4 h-4" />Save
                </button>
                <button 
                  onClick={handleCancelEdit} 
                  className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-all"
                >
                  <X className="w-4 h-4" />Cancel
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-x-16 gap-y-5">
            <div className="space-y-5">
              {["guest", "rollno", "department", "contact", "email"].map(field => (
                <div key={field}>
                  <p className={`font-medium mb-1 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </p>
                  {isEditMode ? (
                    <input 
                      type={field === "email" ? "email" : "text"} 
                      name={field} 
                      value={formData[field] || ""} 
                      onChange={handleInputChange} 
                      className={`w-full p-2 rounded border ${
                        theme === "dark" 
                          ? "bg-gray-700 border-gray-600 text-white" 
                          : "bg-white border-gray-300"
                      }`} 
                    />
                  ) : (
                    <p className={`font-semibold text-lg ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>
                      {b[field] || "—"}
                    </p>
                  )}
                </div>
              ))}
              <div>
                <p className={`font-medium mb-1 ${
                  theme === "dark" ? "text-gray-400" : "text-gray-500"
                }`}>
                  Gender
                </p>
                {isEditMode ? (
                  <select 
                    name="gender" 
                    value={formData.gender || ""} 
                    onChange={handleInputChange} 
                    className={`w-full p-2 rounded border ${
                      theme === "dark" 
                        ? "bg-gray-700 border-gray-600 text-white" 
                        : "bg-white border-gray-300"
                    }`}
                  >
                    <option value="">Select</option>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                ) : (
                  <p className={`font-semibold text-lg ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    {b.gender || "—"}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-5">
              {["numGuests", "males", "females", "city", "state", "purpose"].map(field => (
                <div key={field}>
                  <p className={`font-medium mb-1 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-500"
                  }`}>
                    {field.charAt(0).toUpperCase() + field.slice(1)}
                  </p>
                  {isEditMode ? (
                    field === "purpose" ? (
                      <textarea 
                        name={field} 
                        value={formData[field] || ""} 
                        onChange={handleInputChange} 
                        rows={2} 
                        className={`w-full p-2 rounded border ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-white" 
                            : "bg-white border-gray-300"
                        }`} 
                      />
                    ) : (
                      <input 
                        type={["numGuests", "males", "females"].includes(field) ? "number" : "text"} 
                        name={field} 
                        value={formData[field] || ""} 
                        onChange={handleInputChange} 
                        className={`w-full p-2 rounded border ${
                          theme === "dark" 
                            ? "bg-gray-700 border-gray-600 text-white" 
                            : "bg-white border-gray-300"
                        }`} 
                      />
                    )
                  ) : (
                    <p className={`font-semibold text-lg ${
                      theme === "dark" ? "text-white" : "text-gray-900"
                    }`}>
                      {b[field] ?? "—"}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4. PAYMENT SECTION */}
        {/* 4. PAYMENT SECTION */}
        <div className={`p-6 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
          <div className="col-span-2">
            <p className={`font-medium mb-1 ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
              Payment
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              {/* Payment Text */}
              <p className={`font-semibold text-lg ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                {b.paymentType === "Paid"
                  ? `Paid ${b.totalAmount ? `(₹${b.totalAmount})` : ""}`
                  : b.paymentType === "Free"
                  ? `Free ${b.remarks || b.freeRemarks ? `- Remarks: ${b.remarks || b.freeRemarks}` : ""}`
                  : b.paymentType}
              </p>

              {/* Make Payment Button - Only for non-department regular payments */}
              {(() => {
                // ✅ Calculate actual balance to determine if payment button should show
                const totalAmount = Number(b.totalAmount || b.amount || 0);
                const paidAmount = Number(b.paidAmount || 0);
                const discount = Number(b.discount || b.waveOff || 0);
                const actualBalance = totalAmount - paidAmount - discount;
                
                // Show button if there's a balance AND it's not department payment AND it's not free
                const shouldShowPaymentButton = !isDepartmentPayment && 
                                               b.paymentType !== "Free" && 
                                               actualBalance > 0;
                
                return shouldShowPaymentButton && (
                  <button
                    onClick={() => setPaymentModalOpen(true)}
                    className="ml-auto px-4 py-2 bg-green-600 text-white rounded-lg
                              hover:bg-green-700 transition font-medium flex items-center gap-2"
                  >
                    <Receipt size={16} />
                    Make Payment {actualBalance > 0 && `(₹${actualBalance.toLocaleString()})`}
                  </button>
                );
              })()}

              {/* ✅ Department Pay Later Button */}
              {(() => {
                // ✅ Calculate actual balance to determine if department pay button should show
                const totalAmount = Number(b.totalAmount || b.amount || 0);
                const paidAmount = Number(b.paidAmount || 0);
                const discount = Number(b.discount || b.waveOff || 0);
                const actualBalance = totalAmount - paidAmount - discount;
                
                // Show button if there's a balance AND it's not already department payment AND not checked out AND it's not free
                const shouldShowDeptPayButton = !isDepartmentPayment && 
                                               b.status !== "checked_out" &&
                                               b.paymentType !== "Free" && 
                                               actualBalance > 0;
                
                return shouldShowDeptPayButton && (
                  <button
                    onClick={() => setShowDepartmentPayModal(true)}
                    className="ml-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                              hover:bg-blue-700 transition font-medium flex items-center gap-2"
                  >
                    <Building2 size={16} />
                    Department Pay Later
                  </button>
                );
              })()}

              {/* Payment Status Badge */}
              {b.paymentStatus && (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  b.paymentStatus === "PAID"
                    ? "bg-green-100 text-green-700"
                    : b.paymentStatus === "PARTIALLY_PAID"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {b.paymentStatus === "PAID" && "✅ Fully Paid"}
                  {b.paymentStatus === "PARTIALLY_PAID" &&
                    `⚡ Partial (₹${b.paidAmount || 0} / ₹${b.totalAmount || 0})`}
                  {b.paymentStatus === "UNPAID" && "⏳ Unpaid"}
                </span>
              )}
            </div>

            {/* Department Payment Pending Card */}
            {isDepartmentPayment && b.balanceAmount > 0 && (
              <div className="mt-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-400 rounded-xl p-5 shadow-md">
                <div className="flex items-start gap-3 mb-4">
                  <div className="p-2 bg-orange-500 rounded-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-900 mb-1">
                      💼 Department Payment Pending
                    </h3>
                    <p className="text-sm text-orange-700">
                      This payment will be made by the department
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-white/70 rounded-lg p-3 border border-orange-200">
                    <p className="text-xs text-orange-700 font-medium mb-1">Total Amount</p>
                    <p className="text-lg font-bold text-orange-900">
                      ₹{b.totalAmount?.toLocaleString() || 0}
                    </p>
                  </div>

                  <div className="bg-white/70 rounded-lg p-3 border border-green-200">
                    <p className="text-xs text-green-700 font-medium mb-1">Paid So Far</p>
                    <p className="text-lg font-bold text-green-900">
                      ₹{(b.paidAmount || 0).toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-white/70 rounded-lg p-3 border border-red-200">
                    <p className="text-xs text-red-700 font-medium mb-1">Balance Due</p>
                    <p className="text-lg font-bold text-red-900">
                      ₹{b.balanceAmount?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>

                {b.paymentRemarks && (
                  <div className="bg-white/50 rounded-lg p-3 border border-orange-200 mb-4">
                    <p className="text-xs text-orange-700 font-medium mb-1">Remarks</p>
                    <p className="text-sm text-gray-700">{b.paymentRemarks}</p>
                  </div>
                )}

                <button
                  onClick={() => setPaymentModalOpen(true)}
                  className="w-full bg-gradient-to-r from-orange-600 to-red-600 text-white px-6 py-3 
                            rounded-lg hover:from-orange-700 hover:to-red-700 transition font-bold 
                            shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <Receipt className="w-5 h-5" />
                  Pay Now (Department)
                </button>
              </div>
            )}

            {/* Regular Payment Breakdown */}
            {!isDepartmentPayment && b.paymentStatus !== "PAID" && b.totalAmount > 0 && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-700 font-medium">Total Amount</p>
                    <p className="text-blue-900 font-bold text-lg">₹{b.totalAmount || 0}</p>
                  </div>
                  <div>
                    <p className="text-green-700 font-medium">Paid So Far</p>
                    <p className="text-green-900 font-bold text-lg">₹{b.paidAmount || 0}</p>
                  </div>
                  <div>
                    <p className="text-red-700 font-medium">Balance Due</p>
                    <p className="text-red-900 font-bold text-lg">₹{b.balanceAmount ?? b.totalAmount ?? 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Fully Paid Indicator */}
            {b.paymentStatus === "PAID" && (
              <div className="mt-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500 rounded-full">
                    <Receipt className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-green-900 font-bold text-lg">✅ Payment Complete</p>
                    <p className="text-sm text-green-700">
                      Total Paid: ₹{b.paidAmount?.toLocaleString() || 0}
                      {b.discount > 0 && ` | Discount: ₹${b.discount?.toLocaleString()}`}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. ATTACHMENTS SECTION */}
        <AttachmentsSection
          enquiryFiles={[
            ...enquiryFiles,
            ...(Array.isArray(b.files) ? b.files : [])
          ]}
          
          approvalFiles={
            Array.isArray(b.approvalDocuments) ? b.approvalDocuments : []
          }
          
          paymentFiles={
            Array.isArray(b.paymentAttachments) ? b.paymentAttachments : []
          }
          
          extensionFiles={
            Array.isArray(b.extensionAttachments) ? b.extensionAttachments : []
          }
          
          theme={theme}
        />

        {/* Cancel Modal */}
        <CancelModal
          modal={showCancelModal ? { hostel: b.hostel, room: { roomNo: b.roomNo } } : null}
          remarksText={cancelRemarks}
          setRemarksText={setCancelRemarks}
          onClose={() => {
            setShowCancelModal(false);
            setCancelRemarks("");
          }}
          onDone={handleCancelBooking}
        />

        {/* 6. CHECK-IN / CHECK-OUT ACTION */}
        {/* ✅ FIXED: Hide button if guest is checked out */}
        {b.status !== "checked_out" && b.status !== "cancelled" && b.status !== "no_show" && (
          <div className="px-6 py-4 border-t">
            <button
              onClick={() => setShowReportedModal(true)}
              className={`px-5 py-2 rounded-lg font-semibold transition ${
                b.status === "checked_in"
                  ? "bg-purple-600 hover:bg-purple-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {b.status === "checked_in" ? "Check Out Guest" : "Report Guest"}
            </button>
          </div>
        )}

        {/* 7. STATUS BADGE */}
        <div className={`px-6 py-3 border-t ${
          theme === "dark" ? "border-gray-700" : "border-gray-200"
        }`}>
          <span className={`px-3 py-1 text-sm rounded-full font-medium ${
            b.status === "cancelled" 
              ? `bg-red-100 text-red-800 ${theme === "dark" ? "dark:bg-red-900 dark:text-red-200" : ""}` 
              : `bg-green-100 text-green-800 ${theme === "dark" ? "dark:bg-green-900 dark:text-green-200" : ""}`
          }`}>
            {b.status === "cancelled" ? "Cancelled" : "Active"}
          </span>
        </div>
      </motion.div>

      {/* Modals */}
      {paymentModalOpen && (
        <PaymentModal 
          booking={b} 
          onClose={() => setPaymentModalOpen(false)} 
          onSuccess={handlePaymentSuccess} 
        />
      )}
      
      <ReportedModal 
        booking={booking} 
        open={showReportedModal} 
        onClose={() => setShowReportedModal(false)} 
        onSuccess={(updatedBooking) => { 
          setBooking(updatedBooking); 
          setShowReportedModal(false); 
          showToast("✅ Reported!", "success");
        }}
        onOpenPaymentModal={() => {
          setShowReportedModal(false);
          setPaymentModalOpen(true);
        }}
      />
      
      <AnimatePresence>
        {showGuestHistory && (
          <GuestHistory 
            contact={b.contact} 
            email={b.email} 
            onClose={() => setShowGuestHistory(false)} 
            theme={theme} 
          />
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {showBillHistory && (
          <BillHistoryModal
            booking={b}
            onClose={() => setShowBillHistory(false)}
            theme={theme}
          />
        )}
      </AnimatePresence>

      {/* ✅ Payment Waiver Modal */}
      <AnimatePresence>
        {showPaymentWaiverModal && (
          <PaymentWaiverModal
            booking={b}
            theme={theme}
            onClose={() => setShowPaymentWaiverModal(false)}
            onSuccess={(updatedBooking) => {
              setBooking(normalizeBooking(updatedBooking));
              setShowPaymentWaiverModal(false);
            }}
          />
        )}
      </AnimatePresence>
      {/* Department Pay Later Modal - Updated with Dept Name, Email & Attachments */}
      <AnimatePresence>
        {showDepartmentPayModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowDepartmentPayModal(false);
              setDeptPayRemarks("");
              setDeptPayDeptName("");
              setDeptPayDeptEmail("");
              setDeptPayAttachments([]);
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className={`${
                theme === "dark" ? "bg-gray-800" : "bg-white"
              } rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto`}
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                <div className="flex items-center gap-3">
                  <Building2 className="w-8 h-8" />
                  <div>
                    <h3 className="text-xl font-bold">Mark as Department Pay Later</h3>
                    <p className="text-sm text-blue-100 mt-1">Guest can checkout — email will be sent to department</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-50 border-l-4 border-amber-500 rounded">
                  <p className="text-sm text-amber-800">
                    <strong>⚠️ Important:</strong> An email will be automatically sent to the department with full guest and payment details.
                  </p>
                </div>

                {/* Department Name */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={deptPayDeptName}
                    onChange={(e) => setDeptPayDeptName(e.target.value)}
                    placeholder="e.g., Civil Engineering Department"
                    className={`w-full p-3 border rounded-lg text-sm ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                  />
                </div>

                {/* Department Email */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Department Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={deptPayDeptEmail}
                    onChange={(e) => setDeptPayDeptEmail(e.target.value)}
                    placeholder="department@example.edu"
                    className={`w-full p-3 border rounded-lg text-sm ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                  />
                </div>

                {/* Remarks */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Remarks <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={deptPayRemarks}
                    onChange={(e) => setDeptPayRemarks(e.target.value)}
                    placeholder="Enter reason for department payment (e.g., Official visit, Conference attendee)"
                    className={`w-full p-3 border rounded-lg resize-none text-sm ${
                      theme === "dark"
                        ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500"
                    }`}
                    rows={3}
                  />
                </div>

                {/* Attachments */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-200" : "text-gray-700"}`}>
                    Attachments <span className="text-red-500">*</span>
                    <span className={`ml-2 text-xs font-normal ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                      ({deptPayAttachments.length}/5)
                    </span>
                  </label>
                  {deptPayAttachments.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {deptPayAttachments.map((file, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-2 rounded-lg border ${
                          theme === "dark" ? "bg-gray-700 border-gray-600" : "bg-green-50 border-green-200"
                        }`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-xs truncate text-green-700 dark:text-green-400">
                              {file.name || `Attachment ${idx + 1}`}
                            </span>
                          </div>
                          <button onClick={() => setDeptPayAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 text-red-500 hover:text-red-700">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {deptPayAttachments.length < 5 && (
                    <IKContext
                      publicKey={IMAGEKIT_PUBLIC_KEY}
                      urlEndpoint={IMAGEKIT_URL_ENDPOINT}
                      authenticator={imagekitAuthenticator}
                    >
                      <IKUpload
                        ref={deptPayIkRef}
                        onUploadStart={() => setDeptPayUploading(true)}
                        onSuccess={(res) => {
                          setDeptPayAttachments(prev => [...prev, { url: res.url, fileId: res.fileId, name: res.name || res.filePath }]);
                          setDeptPayUploading(false);
                          showToast("✅ Attachment uploaded", "success");
                        }}
                        onError={(err) => {
                          setDeptPayUploading(false);
                          showToast("Upload failed: " + (err?.message || "Unknown error"), "error");
                        }}
                        folder="/dept-pay-attachments"
                        className="hidden"
                        accept="image/*,application/pdf"
                      />
                      <button
                        type="button"
                        onClick={() => deptPayIkRef.current?.click()}
                        disabled={deptPayUploading}
                        className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed transition text-sm ${
                          deptPayUploading
                            ? "border-gray-300 text-gray-400 cursor-not-allowed"
                            : theme === "dark"
                            ? "border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400"
                            : "border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-500"
                        }`}
                      >
                        {deptPayUploading ? (
                          <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Uploading...</>
                        ) : (
                          <><Upload className="w-4 h-4" /> Upload Attachment</>
                        )}
                      </button>
                    </IKContext>
                  )}
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-0">
                <button
                  onClick={() => {
                    setShowDepartmentPayModal(false);
                    setDeptPayRemarks("");
                    setDeptPayDeptName("");
                    setDeptPayDeptEmail("");
                    setDeptPayAttachments([]);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!deptPayDeptName.trim()) { showToast("⚠️ Department Name is required", "warning"); return; }
                    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!deptPayDeptEmail.trim() || !emailRx.test(deptPayDeptEmail)) { showToast("⚠️ Valid Department Email is required", "warning"); return; }
                    if (!deptPayRemarks.trim()) { showToast("⚠️ Remarks are required", "warning"); return; }
                    if (deptPayAttachments.length === 0) { showToast("⚠️ At least one attachment is required", "warning"); return; }

                    try {
                      const token = localStorage.getItem("token");
                      const response = await fetch(`${API}/api/bookings/${b._id}/mark-department-pay`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        credentials: "include",
                        body: JSON.stringify({
                          remarks: deptPayRemarks,
                          departmentName: deptPayDeptName,
                          departmentEmail: deptPayDeptEmail,
                          attachments: deptPayAttachments,
                        }),
                      });
                      const data = await response.json();
                      if (!data.success) throw new Error(data.message || "Failed to mark department payment");

                      showToast("✅ Marked as Department Pay Later & Email Sent", "success");
                      setShowDepartmentPayModal(false);
                      setDeptPayRemarks("");
                      setDeptPayDeptName("");
                      setDeptPayDeptEmail("");
                      setDeptPayAttachments([]);
                      
                      const authToken = localStorage.getItem("token");
                      const headers2 = { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` };
                      const refreshRes = await fetch(`${API}/api/bookings/${b._id}`, { credentials: "include", headers: headers2 });
                      const refreshData = await refreshRes.json();
                      if (refreshData.success && refreshData.booking) setBooking(normalizeBooking(refreshData.booking));
                    } catch (error) {
                      console.error("❌ Error:", error);
                      showToast(error.message || "Failed to mark department payment", "error");
                    }
                  }}
                  disabled={!deptPayRemarks.trim() || !deptPayDeptName.trim() || !deptPayDeptEmail.trim() || deptPayAttachments.length === 0}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                    deptPayRemarks.trim() && deptPayDeptName.trim() && deptPayDeptEmail.trim() && deptPayAttachments.length > 0
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  <Building2 size={18} />
                  Confirm & Send Email
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}