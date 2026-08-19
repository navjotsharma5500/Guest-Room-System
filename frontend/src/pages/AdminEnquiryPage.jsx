// src/pages/AdminEnquiryPage.jsx - COMPLETE FIXED VERSION
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../context/ToastContext";
import {
  Home,
  FileText,
  CheckCircle2,
  X,
  XCircle,
  ListFilter,
  Download,
} from "lucide-react";
import bgImage from "../assets/ThaparBackground1.png";
import axios from "axios";
import { fetchEnquiries } from "../utils/api";
import { 
  BACKEND_URL, 
  IMAGEKIT_URL_ENDPOINT 
} from "../utils/apiConfig";

const API = BACKEND_URL;

// ============ IMAGEKIT URL HANDLER ============
const normalizeImageKitUrl = (fileUrl) => {
  if (!fileUrl) return fileUrl;

  let url = String(fileUrl).trim();
  url = url.replace(/^[`'\"]+|[`'\"]+$/g, "");

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  
  if (url.startsWith("https://ik.imagekit.io")) {
    console.log("✅ URL is already full ImageKit URL:", url);
    return url;
  }
  
  if (url.startsWith("http://") || url.startsWith("https://")) {
    console.log("✅ URL is external:", url);
    return url;
  }
  
  if (url.startsWith("/")) {
    const fullUrl = `${IMAGEKIT_URL_ENDPOINT}${url}`;
    console.log("✅ Constructed full URL from path:", fullUrl);
    return fullUrl;
  }
  
  const fullUrl = `${IMAGEKIT_URL_ENDPOINT}/${url}`;
  console.log("✅ Constructed full URL from filename:", fullUrl);
  return fullUrl;
};

// ✅ Format time as 08:00 AM
const formatTimeWithAMPM = (timeStr) => {
  if (!timeStr) return "";
  try {
    const timeParts = timeStr.split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    
    const period = hours >= 12 ? "PM" : "AM";
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    
    return `${String(displayHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
  } catch (err) {
    console.error("❌ Error formatting time:", timeStr, err);
    return timeStr;
  }
};

// ✅ Format date as 06-Dec-2025
const formatShortDate = (d) => {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (isNaN(dt)) return String(d);
    return dt
      .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      .replace(/\s+/g, "-");
  } catch (err) {
    return String(d);
  }
};

export default function AdminEnquiryPage({ setActiveTab }) {
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", color: "" });
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editMode, setEditMode] = useState(false);
  const [editSchedule, setEditSchedule] = useState({
    from: "",
    to: "",
    checkInTime: "",
    checkOutTime: "",
    roomId: "",
  });
  const [hostelOptions, setHostelOptions] = useState([]);
  const [approvalPayment, setApprovalPayment] = useState(null);
  const [approvalPaymentForm, setApprovalPaymentForm] = useState({
    paymentType: "Free",
    totalAmount: "",
    freeRemarks: "",
  });
  const ITEMS_PER_PAGE = 10;
  
  const [enquiries, setEnquiries] = useState([]);

  const loadEnquiries = async () => {
    try {
      console.log("🔥 Loading enquiries...");
      const data = await fetchEnquiries();
      console.log("✅ Fetched data:", data);
      
      if (Array.isArray(data)) {
        console.log("✅ Setting enquiries. Total count:", data.length);
        
        // ✅ Log status distribution for debugging
        const statusCount = data.reduce((acc, e) => {
          acc[e.status || 'pending'] = (acc[e.status || 'pending'] || 0) + 1;
          return acc;
        }, {});
        console.log("📊 Status distribution:", statusCount);
        
        setEnquiries(data);
        
        // ✅ If an enquiry is currently selected, update it with fresh data
        if (selected) {
          const updatedSelected = data.find(e => e._id === selected._id);
          if (updatedSelected) {
            console.log("🔄 Updating selected enquiry with fresh data:", updatedSelected);
            console.log("🎯 CURRENT SELECTED STATUS:", updatedSelected.status);
            setSelected(updatedSelected);
          }
        }
      } else {
        console.error("❌ Data is not an array:", data);
        setEnquiries([]);
      }
    } catch (error) {
      console.error("❌ Error loading enquiries:", error);
      setEnquiries([]);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, []);

  useEffect(() => {
    const loadHostelOptions = async () => {
      try {
        const res = await axios.get(`${API}/api/hostels/public-options`, { withCredentials: true });
        setHostelOptions(Array.isArray(res.data?.hostels) ? res.data.hostels : []);
      } catch (err) {
        console.warn("Failed to load hostel room options", err);
      }
    };
    loadHostelOptions();
  }, []);

  useEffect(() => {
    if (!selected) {
      setEditMode(false);
      return;
    }
    setEditSchedule({
      from: selected.from ? new Date(selected.from).toISOString().slice(0, 10) : "",
      to: selected.to ? new Date(selected.to).toISOString().slice(0, 10) : "",
      checkInTime: selected.checkInTime || "00:00",
      checkOutTime: selected.checkOutTime || "23:59",
      roomId: selected.roomId || "",
    });
    setEditMode(false);
  }, [selected?._id]);

  // ✅ Listen for booking completion to refresh enquiry status
  useEffect(() => {
    const handleBookingCompleted = async () => {
      console.log("🔄 Booking completed — refreshing enquiries from backend");

      // Wait a bit for backend to process
      setTimeout(async () => {
        const freshData = await fetchEnquiries();

        if (Array.isArray(freshData)) {
          setEnquiries(freshData);

          // 🔒 Re-sync selected enquiry from backend
          if (selected) {
            const updated = freshData.find(e => e._id === selected._id);
            if (updated) {
              console.log("✅ Updated enquiry status:", updated.status);
              setSelected(updated);
            } else {
              setSelected(null);
            }
          }
        }
      }, 1000); // Wait 1 second for backend processing
    };

    window.addEventListener("bookingCompleted", handleBookingCompleted);
    return () => {
      window.removeEventListener("bookingCompleted", handleBookingCompleted);
    };
  }, [selected]);


  // ✅ NEW: Instant refresh on new enquiry
  useEffect(() => {
    const handleNewEnquiry = () => {
      console.log("📢 New guest enquiry received - refreshing list");
      loadEnquiries();
    };
    
    const handleEnquiryUpdated = () => {
      console.log("📢 Enquiry updated - refreshing list");
      loadEnquiries();
    };
    
    // Listen for both custom events and Socket.IO events
    window.addEventListener("guestEnquiryCreated", handleNewEnquiry);
    window.addEventListener("enquiryCreated", handleNewEnquiry);
    window.addEventListener("enquiryUpdated", handleEnquiryUpdated);

    return () => {
      window.removeEventListener("guestEnquiryCreated", handleNewEnquiry);
      window.removeEventListener("enquiryCreated", handleNewEnquiry);
      window.removeEventListener("enquiryUpdated", handleEnquiryUpdated);
    };
  }, []); 

  // ✅ Toast helper
  const showToast = (message, color) => {
    setToast({ show: true, message, color });
    setTimeout(() => setToast({ show: false, message: "", color: "" }), 4000);
  };

  // ✅ Handle Approve / Reject
  const handleDecision = async (status) => {
    if (!selected) return;

    if (status === "approved") {
      // ✅ RESTORED: Faculty/Staff enquiries never carry a hostel/room at
      // enquiry time, so they must NOT go through the ParentStudent
      // approval-payment modal / PUT /api/enquiry/:id/approved path below.
      // This reinstates the pre-0231c2c behavior: prepare a room-selection
      // prefill and hand off to AllHostelsPortal without touching backend
      // approval status yet.
      if (selected.bookingCategory === "FacultyStaff") {
        // Don't update backend status yet - just prepare for room selection

        // Store the enquiry in localStorage for AllHostelsPortal
        const approvedGuest = {
          id: "b_" + Date.now(),
          enquiryId: selected._id,
          name: selected.name,
          guest: selected.name,
          rollno: selected.rollno || "",
          department: selected.department || "",
          numGuests: Number(selected.guests || selected.numGuests || 1),
          females: selected.females || 0,
          males: selected.males || 0,
          contact: selected.contact || "",
          email: selected.email || "",
          gender: selected.gender || "",
          state: selected.state || "",
          city: selected.city || "",
          purpose: selected.purpose || "",
          reference: selected.reference || "",
          checkInTime: selected.checkInTime || "00:00",
          checkOutTime: selected.checkOutTime || "23:59",
          files: selected.files || [],
          enquiryAttachments: selected.files || [],
          paymentType: "Pending",
          amount: 0,
          from: selected.from,
          to: selected.to,
          status: "pending-room-selection",
        };

        localStorage.setItem("lastApprovedGuest", JSON.stringify(approvedGuest));
        window.dispatchEvent(new Event("lastApprovedGuestChanged"));

        showToast("Please select a guest room to complete approval", "blue");

        // Navigate to AllHostelsPortal
        if (typeof setActiveTab === "function") {
          const container = document.querySelector(".admin-page-container");
          if (container) container.classList.add("fade-out");
          setTimeout(() => {
            setActiveTab("AllHostelsPortal");
            if (container) container.classList.remove("fade-out");
          }, 300);
        }

        return;
      }

      if (selected.hostelId && selected.roomId) {
        try {
          await axios.get(`${API}/api/enquiry/${selected._id}/availability`, { withCredentials: true });
        } catch (err) {
          showToast(
            err.response?.data?.message ||
              "Selected Guest Room is already occupied during requested dates. Please edit the enquiry dates or choose another room.",
            "red"
          );
          return;
        }
      }

      setApprovalPayment(selected);
      setApprovalPaymentForm({
        paymentType: "Free",
        totalAmount: "",
        freeRemarks: "",
      });
      return;
    }  

    // ✅ For "rejected" status
    try {
      await axios.put(
        `${API}/api/enquiry/${selected._id}/${status}`,
        {},
        {
          withCredentials: true,
        }
      );

      // If this enquiry was previously approved but not booked → clear it
      const raw = localStorage.getItem("lastApprovedGuest");
      if (raw) {
        const j = JSON.parse(raw);
        if (j?.enquiryId === selected._id) {
          localStorage.removeItem("lastApprovedGuest");
          window.dispatchEvent(new Event("lastApprovedGuestChanged"));
        }
      }
      
      setTimeout(() => {
        window.dispatchEvent(new Event("reloadHostelData"));
      }, 300);  

      showToast("Enquiry rejected!", "red");

      // ✅ CRITICAL: Reload data and clear selection
      await loadEnquiries();
      setSelected(null);

    } catch (err) {
      console.error("Decision error:", err);
      showToast("Failed to update enquiry", "red");
    }
  };

  const handleSaveSchedule = async () => {
    if (!selected) return;
    try {
      const res = await axios.patch(
        `${API}/api/enquiry/${selected._id}/schedule`,
        editSchedule,
        { withCredentials: true }
      );
      const updated = res.data?.enquiry;
      showToast("Enquiry schedule updated", "blue");
      setEditMode(false);
      await loadEnquiries();
      if (updated) setSelected(updated);
    } catch (err) {
      showToast(err.response?.data?.message || "Failed to update enquiry schedule", "red");
    }
  };

  const handleApproveWithPayment = async () => {
    if (!approvalPayment) return;
    if (approvalPaymentForm.paymentType === "Paid" && Number(approvalPaymentForm.totalAmount || 0) <= 0) {
      showToast("Enter a valid paid booking amount", "red");
      return;
    }
    if (approvalPaymentForm.paymentType === "Free" && !approvalPaymentForm.freeRemarks.trim()) {
      showToast("Enter remarks for free booking", "red");
      return;
    }

    try {
      await axios.put(
        `${API}/api/enquiry/${approvalPayment._id}/approved`,
        {
          hostel: approvalPayment.hostelName,
          roomNo: approvalPayment.roomName,
          checkInTime: approvalPayment.checkInTime || "00:00",
          checkOutTime: approvalPayment.checkOutTime || "23:59",
          paymentType: approvalPaymentForm.paymentType,
          totalAmount: approvalPaymentForm.paymentType === "Paid" ? Number(approvalPaymentForm.totalAmount || 0) : 0,
          freeRemarks: approvalPaymentForm.freeRemarks,
          approvalDocuments: approvalPayment.files || [],
        },
        { withCredentials: true }
      );

      localStorage.removeItem("lastApprovedGuest");
      window.dispatchEvent(new Event("lastApprovedGuestChanged"));
      window.dispatchEvent(new Event("reloadHostelData"));
      showToast("Enquiry approved and booking created", "green");
      setApprovalPayment(null);
      await loadEnquiries();
      setSelected(null);
    } catch (err) {
      showToast(
        err.response?.data?.message ||
          "Failed to approve enquiry. Please verify room availability and payment details.",
        "red"
      );
    }
  };

  // ✅ Download approved and rejected guests as CSV
  const handleDownloadCSV = () => {
    const toDownload = enquiries.filter((e) => 
      e.status === "approved" || 
      e.status === "booked" || 
      e.status === "rejected"
    );
    
    if (toDownload.length === 0) {
      showToast("No enquiries to download.", "red");
      return;
    }

    const headers = [
      "Name", "Contact", "Email", "Gender", "From", "To", "Guests",
      "Purpose", "State", "City", "Reference", "Payment Type", "Amount", "Remarks", "Status"
    ];

    const rows = toDownload.map((e) => [
      e.name,
      e.contact,
      e.email,
      e.gender,
      e.from,
      e.to,
      e.guests,
      e.purpose,
      e.state,
      e.city,
      e.reference,
      e.paymentType || "",
      e.amount || "",
      e.remarks || "",
      e.status || "pending",
    ]);

    const csv =
      headers.join(",") +
      "\n" +
      rows.map((r) => r.map((v) => `"${String(v || "")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "all_enquiries_list.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const editableRooms = selected
    ? (hostelOptions.find((hostel) => String(hostel._id) === String(selected.hostelId))?.rooms || [])
    : [];

  const filteredEnquiries =
    (filter === "all"
      ? enquiries
      : enquiries.filter((e) => e.status === filter))
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });    

  const totalPages = Math.ceil(filteredEnquiries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEnquiries = filteredEnquiries.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  return (
    <motion.div
      className="admin-page-container min-h-screen bg-cover bg-center bg-fixed relative p-4 sm:p-6 z-10 dark:bg-gray-900"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundColor: "rgba(255, 248, 240, 0.92)",
        backgroundBlendMode: "overlay",
      }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, type: "spring" }}
    >
      {/* ===== Header Section ===== */}
      <motion.div className="flex flex-col items-center gap-4 mb-8 px-4 sm:px-6 md:px-8 py-4 sm:py-6 rounded-2xl shadow-lg bg-gradient-to-r from-red-700 via-red-600 to-red-700 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 backdrop-blur-md">
        <motion.div
          className="px-6 sm:px-8 py-2 sm:py-3 bg-white/90 dark:bg-gray-800/90 border-2 border-red-700 dark:border-gray-600 rounded-full shadow-lg text-center"
          whileHover={{ scale: 1.03 }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-red-700 dark:text-gray-200 tracking-wide drop-shadow-sm">
            Guest Enquiry Management
          </h1>
        </motion.div>

        {/* ===== Filter + Buttons ===== */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-3 w-full px-2">
          {[
            {
              label: "Approved",
              icon: <CheckCircle2 size={18} />,
              filterType: "approved",
            },
            {
              label: "Booked",
              icon: <CheckCircle2 size={18} />,
              filterType: "booked",
            },
            {
              label: "Rejected",
              icon: <XCircle size={18} />,
              filterType: "rejected",
            },
            {
              label: "All",
              icon: <ListFilter size={18} />,
              filterType: "all",
            },
          ].map((btn, i) => (
            <motion.button
              key={i}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilter(btn.filterType)}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2 rounded-xl shadow-md border-2 font-medium transition-all duration-300 text-xs sm:text-sm ${
                filter === btn.filterType
                  ? "bg-red-600 text-white border-red-700 dark:bg-gray-700 dark:border-gray-600"
                  : "bg-white text-red-700 border-red-300 hover:bg-red-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
              }`}
            >
              {btn.icon} {btn.label}
            </motion.button>
          ))}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleDownloadCSV}
            className="flex items-center gap-2 bg-red-600 dark:bg-gray-700 text-white px-3 sm:px-5 py-2 rounded-xl shadow-md border border-red-700 dark:border-gray-600 hover:bg-red-700 dark:hover:bg-gray-600 transition-all duration-300 font-medium text-xs sm:text-sm"
          >
            <Download size={18} /> Download
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab("Home")}
            className="flex items-center gap-2 bg-white dark:bg-gray-700 text-red-700 dark:text-gray-200 px-3 sm:px-5 py-2 rounded-xl shadow-md hover:bg-red-50 dark:hover:bg-gray-600 transition-all duration-300 font-medium border border-red-300 dark:border-gray-600 text-xs sm:text-sm"
          >
            <Home size={18} /> Home
          </motion.button>
        </div>
      </motion.div>

      {/* ===== Enquiry List or Details ===== */}
      <motion.div
        className="bg-white dark:bg-gray-800 bg-opacity-95 dark:bg-opacity-100 border border-red-300 dark:border-gray-700 rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <AnimatePresence>
          {!selected ? (
            filteredEnquiries.length === 0 ? (
              <p className="text-center text-gray-600 dark:text-gray-400 italic text-sm sm:text-base">
                {filter === "approved"
                  ? "No approved guests yet."
                  : filter === "booked"
                  ? "No booked guests yet."
                  : filter === "rejected"
                  ? "No rejected guests yet."
                  : "No guest enquiries yet."}
              </p>
            ) : (
              <div className="grid gap-3 sm:gap-4">
                {paginatedEnquiries.map((e, i) => (
                  <motion.div
                    key={i}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-red-50 dark:bg-gray-700 border border-red-200 dark:border-gray-600 rounded-xl px-4 sm:px-6 py-3 sm:py-4 shadow-sm hover:shadow-md hover:bg-red-100 dark:hover:bg-gray-600 cursor-pointer transition-all gap-3 sm:gap-4 overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelected(e)}
                  >
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <h3 className="text-base sm:text-lg font-semibold text-red-700 dark:text-gray-200 truncate">
                        {e.name}
                      </h3>
                      <span className="mt-1 inline-flex w-fit rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-700">
                        {e.bookingCategory === "ParentStudent" ? "Parent / Student" : "Faculty"}
                      </span>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {new Date(e.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true
                        }).replace(",", "").replace(" ", "-")}
                      </p>    
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 mt-1 italic truncate">
                        {e.purpose || "No purpose provided"}
                      </p>

                      {/* ✅ Show check-in/check-out dates and times */}
                      {(e.from || e.to) && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 flex flex-wrap gap-2">
                          {e.from && (
                            <>
                              <span>Check-in: <strong>{formatTimeWithAMPM(e.checkInTime)}</strong> on{" "}
                              <strong>{formatShortDate(e.from)}</strong></span>
                            </>
                          )}
                          {e.to && (
                            <>
                              {e.from && <span>|</span>}
                              <span>Check-out: <strong>{formatTimeWithAMPM(e.checkOutTime)}</strong> on{" "}
                              <strong>{formatShortDate(e.to)}</strong></span>
                            </>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                      {e.files?.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                          <FileText size={16} className="sm:w-5 sm:h-5" />
                          <span className="text-xs sm:text-sm">
                            {e.files.length}
                          </span>
                        </div>
                      )}
                      {(!e.status || e.status === "pending") ? (
                        <span className="text-xs sm:text-sm font-semibold text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                          New
                        </span>
                      ) : e.status === "pending-approval" ? (
                        <span className="text-xs sm:text-sm font-semibold text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                          Pending
                        </span>
                      ) : (
                        <span
                          className={`text-xs sm:text-sm font-semibold capitalize whitespace-nowrap ${
                            e.status === "approved" || e.status === "booked"
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {e.status.replace("-", " ")}
                        </span>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            // ===== Selected Enquiry Details =====
            <motion.div
              key="details"
              className="p-4 sm:p-6 bg-red-50 dark:bg-gray-700 border border-red-200 dark:border-gray-600 rounded-2xl shadow-inner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", duration: 0.6 }}
            >
              <h2 className="text-xl sm:text-2xl font-bold text-red-700 dark:text-gray-200 mb-4">
                {selected.name}
              </h2>
              <div className="space-y-2 text-sm sm:text-base text-gray-700 dark:text-gray-300">
                
                {/* ✅ Unified detail list for Guest Enquiry */}
                {[
                  { label: "Name / Society Name", key: "name" },
                  { label: "Category", key: "bookingCategory" },
                  { label: "Roll No / Employee ID", key: "rollno" },
                  { label: "Department", key: "department" },
                  { label: "Requested Hostel", key: "hostelName" },
                  { label: "Requested Guest Room", key: "roomName" },
                  { label: "Gender", key: "gender" },
                  { label: "Number of Guests", key: "numGuests", altKey: "guests" },
                  { label: "Number of Females", key: "females", altKey: "femaleGuests" },
                  { label: "Number of Males", key: "males", altKey: "maleGuests" },
                  { label: "Contact", key: "contact" },
                  { label: "Email", key: "email" },
                  { label: "State", key: "state" },
                  { label: "City", key: "city" },
                  { label: "Purpose of Stay", key: "purpose" },
                  { label: "Reference", key: "reference" },
                  { label: "From", key: "from" },
                  { label: "To", key: "to" }
                ].map((item) => {
                  const value = selected[item.key] ?? selected[item.altKey];
                  if (!value) return null;

                  const displayValue = (item.key === 'from' || item.key === 'to') ? formatShortDate(value) : String(value);

                  return (
                    <p key={item.key}>
                      <strong>{item.label}:</strong> {displayValue}
                    </p>
                  );
                })}
              </div>

              {editMode && (
                <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-gray-500 dark:bg-gray-600">
                  <h3 className="mb-3 font-semibold text-blue-700 dark:text-blue-300">Edit Schedule & Guest Room</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium sm:col-span-2">
                      Guest Room
                      <select
                        value={editSchedule.roomId}
                        onChange={(e) => setEditSchedule((prev) => ({ ...prev, roomId: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      >
                        <option value="">Select guest room</option>
                        {editableRooms.map((room) => (
                          <option key={room._id} value={room._id}>
                            {room.roomNo} {room.roomType ? `(${room.roomType})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="text-sm font-medium">
                      Check In Date
                      <input
                        type="date"
                        value={editSchedule.from}
                        onChange={(e) => setEditSchedule((prev) => ({ ...prev, from: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Check Out Date
                      <input
                        type="date"
                        value={editSchedule.to}
                        onChange={(e) => setEditSchedule((prev) => ({ ...prev, to: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Check In Time
                      <input
                        type="time"
                        value={editSchedule.checkInTime}
                        onChange={(e) => setEditSchedule((prev) => ({ ...prev, checkInTime: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Check Out Time
                      <input
                        type="time"
                        value={editSchedule.checkOutTime}
                        onChange={(e) => setEditSchedule((prev) => ({ ...prev, checkOutTime: e.target.value }))}
                        className="mt-1 w-full rounded-lg border px-3 py-2"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* ✅ Data Verification Section */}
              {selected && (
                <div className="mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-gray-600 rounded-lg border border-blue-200 dark:border-gray-500">
                  <h3 className="font-semibold text-sm sm:text-base text-blue-700 dark:text-blue-300 mb-3">
                    ✅ Enquiry Details Verification
                  </h3>  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Roll No:</p>
                      <p className="font-semibold">{selected.rollno || "—"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Category:</p>
                      <p className="font-semibold">{selected.bookingCategory === "ParentStudent" ? "Parent / Student" : "Faculty"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Requested Hostel:</p>
                      <p className="font-semibold">{selected.hostelName || "—"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Requested Guest Room:</p>
                      <p className="font-semibold">{selected.roomName || "—"}</p>
                    </div>
                    <div>  
                      <p className="font-medium text-gray-600 dark:text-gray-400">Department:</p>
                      <p className="font-semibold">{selected.department || "—"}</p>
                    </div>
                    <div>  
                      <p className="font-medium text-gray-600 dark:text-gray-400">Gender:</p>
                      <p className="font-semibold">{selected.gender || "—"}</p>
                    </div>
                    <div>  
                      <p className="font-medium text-gray-600 dark:text-gray-400">Number of Males:</p>
                      <p className="font-semibold">{selected.males || "—"}</p>
                    </div>
                    <div>  
                      <p className="font-medium text-gray-600 dark:text-gray-400">Number of Females:</p>
                      <p className="font-semibold">{selected.females || "—"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Reference:</p>
                      <p className="font-semibold">{selected.reference || "—"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Check-In Time:</p>
                      <p className="font-semibold">{formatTimeWithAMPM(selected.checkInTime) || "—"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">Check-Out Time:</p>
                      <p className="font-semibold">{formatTimeWithAMPM(selected.checkOutTime) || "—"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">State:</p>
                      <p className="font-semibold">{selected.state || "—"}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-600 dark:text-gray-400">City:</p>
                      <p className="font-semibold">{selected.city || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="font-medium text-gray-600 dark:text-gray-400">Purpose:</p>
                      <p className="font-semibold">{selected.purpose || "—"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== Attachments ===== */}
              {selected.files && selected.files.length > 0 && (
                <div className="mt-5">
                  <p className="font-semibold text-sm sm:text-base text-red-700 dark:text-red-300 mb-3">
                    Attachments: ({selected.files.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {selected.files.map((fileUrl, index) => {
                      const normalizedUrl = normalizeImageKitUrl(fileUrl);

                      const isImage =
                        normalizedUrl.includes("ik.imagekit.io") &&
                        /\.(jpg|jpeg|png|gif|webp|heic|heif)$/i.test(normalizedUrl);

                      const isPdf = normalizedUrl.endsWith(".pdf");  
                      
                      return (
                        <motion.div
                          key={index}
                          whileHover={{ scale: 1.03 }}
                          className="flex flex-col items-center bg-white rounded-lg shadow-md p-2 sm:p-3 cursor-pointer hover:shadow-lg transition"
                          onClick={() => {
                            if (!normalizedUrl) return;
                            const newTab = window.open();
                            if (!newTab) return;

                            if (isPdf) {
                              newTab.location.href = normalizedUrl;
                            } else if (isImage) {
                              newTab.document.write(
                                `<html style='background:#111;margin:0'><body style='display:flex;justify-content:center;align-items:center;height:100vh;background:#111'><img src='${normalizedUrl}' style='max-width:95%;max-height:95%;border-radius:12px'/></body></html>`
                              );
                            } else {
                              newTab.location.href = normalizedUrl;
                            }
                          }}
                        >
                          {isImage ? (
                            <img
                              src={normalizedUrl}
                              alt={`Attachment ${index + 1}`}
                              className="w-full h-24 sm:h-32 object-contain bg-white rounded-md mb-2 transition-transform duration-300 hover:scale-105"
                              onError={(e) => {
                                console.error("❌ Image failed to load");
                                e.target.src =
                                  "https://cdn-icons-png.flaticon.com/512/337/337946.png";
                              }}
                              onLoad={() => {
                                console.log("✅ Image loaded successfully");
                              }}
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-24 sm:h-32 bg-gray-100 text-gray-600 rounded-md mb-2">
                              <FileText size={20} className="sm:w-6 sm:h-6" />
                            </div>
                          )}        
                          <p className="text-xs text-gray-600 text-center truncate w-full" title={normalizedUrl}>
                            {`Attachment ${index + 1}`}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ===== Action Buttons & Status ===== */}
              {selected && (
                <>
                  {/* Show Approve/Reject buttons ONLY if status is "pending" (initial state) */}
                  {[undefined, "pending", "pending-approval"].includes(selected.status) && (
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-4 mt-6 sm:mt-8">
                      {editMode ? (
                        <>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleSaveSchedule}
                            className="flex items-center justify-center sm:justify-start gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all font-semibold text-sm sm:text-base"
                          >
                            Save Schedule
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setEditMode(false)}
                            className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all font-semibold text-sm sm:text-base"
                          >
                            Cancel Edit
                          </motion.button>
                        </>
                      ) : (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setEditMode(true)}
                          className="flex items-center justify-center sm:justify-start gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-all font-semibold text-sm sm:text-base"
                        >
                          Edit
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDecision("approved")}
                        className="flex items-center justify-center sm:justify-start gap-2 bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg hover:bg-green-700 transition-all font-semibold text-sm sm:text-base"
                      >
                        <CheckCircle2 size={20} /> Approve
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleDecision("rejected")}
                        className="flex items-center justify-center sm:justify-start gap-2 bg-red-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg hover:bg-red-700 transition-all font-semibold text-sm sm:text-base"
                      >
                        <XCircle size={20} /> Reject
                      </motion.button>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelected(null)}
                        className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all font-semibold text-sm sm:text-base"
                      >
                        Back
                      </motion.button>
                    </div>
                  )}

                  {/* Show status badge ONLY if booked or rejected (final states) */}
                  {["booked", "rejected"].includes(selected.status) && (
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:gap-4 mt-6 sm:mt-8">
                      <div
                        className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold shadow-lg flex items-center gap-2 text-sm sm:text-base ${
                          selected.status === "booked" || selected.status === "approved"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {selected.status === "booked" || selected.status === "approved" ? (
                          <CheckCircle2 size={20} className="text-green-600" />
                        ) : (
                          <XCircle size={20} className="text-red-600" />
                        )}
                        Status: <span className="font-bold capitalize">
                          {selected.status}
                        </span>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelected(null)}
                        className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 sm:px-6 py-2 sm:py-3 rounded-xl shadow-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-all font-semibold text-sm sm:text-base"
                      >
                        Back
                      </motion.button>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== Pagination Controls ===== */}
        {filteredEnquiries.length > 0 && totalPages > 1 && !selected && (
          <div className="flex flex-col sm:flex-row sm:justify-center sm:items-center gap-2 sm:gap-3 mt-6 px-3 sm:px-0">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                currentPage === 1
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              Previous
            </button>
            
            <span className="text-xs sm:text-sm font-medium text-gray-700 text-center">
              Page {currentPage} of {totalPages} ({filteredEnquiries.length} total)
            </span>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition-all text-sm ${
                currentPage === totalPages
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              Next
            </button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {approvalPayment && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl"
              initial={{ scale: 0.95, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 12 }}
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-bold text-green-700">Approve & Create Booking</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {approvalPayment.name} • {approvalPayment.hostelName} • {approvalPayment.roomName}
                  </p>
                </div>
                <button onClick={() => setApprovalPayment(null)} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-semibold text-gray-700">
                  Payment Type
                  <select
                    value={approvalPaymentForm.paymentType}
                    onChange={(e) =>
                      setApprovalPaymentForm((prev) => ({
                        ...prev,
                        paymentType: e.target.value,
                        totalAmount: e.target.value === "Free" ? "" : prev.totalAmount,
                      }))
                    }
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  >
                    <option value="Free">Free</option>
                    <option value="Paid">Paid</option>
                  </select>
                </label>

                {approvalPaymentForm.paymentType === "Paid" && (
                  <label className="block text-sm font-semibold text-gray-700">
                    Total Amount
                    <input
                      type="number"
                      min="1"
                      value={approvalPaymentForm.totalAmount}
                      onChange={(e) => setApprovalPaymentForm((prev) => ({ ...prev, totalAmount: e.target.value }))}
                      className="mt-1 w-full rounded-lg border px-3 py-2"
                      placeholder="Enter booking amount"
                    />
                  </label>
                )}

                <label className="block text-sm font-semibold text-gray-700">
                  Remarks {approvalPaymentForm.paymentType === "Free" ? "*" : ""}
                  <textarea
                    value={approvalPaymentForm.freeRemarks}
                    onChange={(e) => setApprovalPaymentForm((prev) => ({ ...prev, freeRemarks: e.target.value }))}
                    className="mt-1 min-h-24 w-full rounded-lg border px-3 py-2"
                    placeholder="Payment / approval remarks"
                  />
                </label>

                <div className="rounded-xl border bg-green-50 p-3 text-sm text-green-800">
                  Availability has already been checked. Submitting will create a standard guest room booking and mark this enquiry as booked.
                </div>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setApprovalPayment(null)}
                  className="rounded-lg bg-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveWithPayment}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Create Booking
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== Toast ===== */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.4 }}
            className={`fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-white border-l-8 ${
              toast.color === "green" ? "border-green-500" : "border-red-500"
            } shadow-xl px-4 sm:px-6 py-3 sm:py-4 rounded-xl text-gray-800 font-medium flex items-center gap-3 text-sm sm:text-base`}
          >
            {toast.color === "green" ? (
              <CheckCircle2 className="text-green-500 flex-shrink-0" size={24} />
            ) : (
              <XCircle className="text-red-500 flex-shrink-0" size={24} />
            )}
            <span className="flex-1">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
