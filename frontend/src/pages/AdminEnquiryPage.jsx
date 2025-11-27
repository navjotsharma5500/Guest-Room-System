import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  FileText,
  CheckCircle2,
  XCircle,
  ListFilter,
  Download,
} from "lucide-react";
import bgImage from "../assets/ThaparBackground1.png";
import axios from "axios";

export default function AdminEnquiryPage({ setActiveTab }) {
  const [enquiries, setEnquiries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState({ show: false, message: "", color: "" });
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    loadEnquiries();
  }, []);

  // ✅ Toast helper
  const showToast = (message, color) => {
    setToast({ show: true, message, color });
    setTimeout(() => setToast({ show: false, message: "", color: "" }), 4000);
  };

  // ✅ Load enquiries safely
  function loadEnquiries() {
  axios
    .get(`${process.env.REACT_APP_API_URL}/api/enquiry`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
    .then((res) => {
      const mapped = res.data.map((e) => ({
        ...e,

        // 🔥 Map NEW backend fields → OLD frontend format
        name: e.guestName,
        email: e.guestEmail,
        contact: e.guestPhone,
        gender: e.fullData?.gender,
        rollno: e.fullData?.rollno,
        department: e.fullData?.department,

        from: e.fullData?.from,
        to: e.fullData?.to,

        guests: e.fullData?.guests,
        females: e.fullData?.females,
        males: e.fullData?.males,

        state: e.fullData?.state,
        city: e.fullData?.city,

        purpose: e.message,
        reference: e.fullData?.reference,

        files: e.fullData?.files || [],

        // Keep existing status
        status: e.status,
      }));

      // Sort by latest enquiry first
      const sorted = mapped.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      setEnquiries(sorted);
    })
    .catch((err) => {  
      console.error("Failed to fetch enquiries", err);
      setEnquiries([]);
    });
}             

  // ✅ Handle Approve / Reject
  const handleDecision = async (status) => {
  if (!selected) return;

  try {
    // 🔥 Update backend (approve or reject)
    await axios.put(
      `${process.env.REACT_APP_API_URL}/api/enquiry/${selected._id}/${status}`,
      {},
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    // 🔥 Your existing logic MUST stay INSIDE the function
    if (status === "approved") {
      const approvedGuest = {
        id: "b_" + Date.now(),
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
        files: selected.files || [],

        paymentType: "Pending",
        amount: 0,
        from: selected.from,
        to: selected.to,

        status: "pending-approval",
      };

      // Pass approved enquiry to AllHostelsPortal
      window.selectedEnquiry = approvedGuest;
    }
    showToast(
      status === "approved" ? "Enquiry approved!" : "Enquiry rejected!",
      status === "approved" ? "green" : "red"
    );

    // Refresh table
    loadEnquiries();
    setSelected(null);

    // Redirect depending on status
    if (typeof setActiveTab === "function") {
      const container = document.querySelector(".admin-page-container");
      if (container) container.classList.add("fade-out");
      setTimeout(() => {
        setActiveTab(status === "approved" ? "AllHostelsPortal" : "Home");
        if (container) container.classList.remove("fade-out");
      }, 300);
    }

  } catch (err) {
    console.error("Decision error:", err);
    showToast("Failed to update enquiry", "red");
  }
};

  // ✅ Download approved guests as CSV
  const handleDownloadCSV = () => {
    const approved = enquiries.filter((e) => e.status === "approved");
    if (approved.length === 0)
      return alert("No approved guests to download.");

    const headers = [
      "Name",
      "Contact",
      "Email",
      "Gender",
      "From",
      "To",
      "Guests",
      "Purpose",
      "State",
      "City",
      "Reference",
    ];

    const rows = approved.map((e) => [
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
    ]);

    const csv =
      headers.join(",") +
      "\n" +
      rows.map((r) => r.map((v) => `"${String(v || "")}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "approved_guest_list.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFilePreviewUrl = (file) => {
    if (!file) return null;
    if (
      typeof file === "string" &&
      (file.startsWith("http") || file.startsWith("data:"))
    )
      return file;
    if (file instanceof File) return URL.createObjectURL(file);
    return null;
  };

  const filteredEnquiries =
    filter === "all"
      ? enquiries
      : enquiries.filter((e) => e.status === filter);

  // ✅ Pagination calculations
  const totalPages = Math.ceil(filteredEnquiries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEnquiries = filteredEnquiries.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  // ✅ UI Rendering
  return (
    <motion.div
      className="admin-page-container min-h-screen bg-cover bg-center bg-fixed relative p-6 z-10 ml-64 dark:bg-gray-900"
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
      <motion.div className="flex flex-col items-center gap-4 mb-8 px-8 py-6 rounded-2xl shadow-lg bg-gradient-to-r from-red-700 via-red-600 to-red-700 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 backdrop-blur-md">
        <motion.div
          className="px-8 py-3 bg-white/90 dark:bg-gray-800/90 border-2 border-red-700 dark:border-gray-600 rounded-full shadow-lg text-center"
          whileHover={{ scale: 1.03 }}
        >
          <h1 className="text-2xl font-extrabold text-red-700 dark:text-gray-200 tracking-wide drop-shadow-sm">
            Guest Enquiry Management
          </h1>
        </motion.div>

        {/* ===== Filter + Buttons ===== */}
        <div className="flex flex-wrap justify-center gap-3 mt-3">
          {[
            {
              label: "Approved",
              icon: <CheckCircle2 size={18} />,
              filterType: "approved",
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
              className={`flex items-center gap-2 px-5 py-2 rounded-xl shadow-md border-2 font-medium transition-all duration-300 ${
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
            className="flex items-center gap-2 bg-red-600 dark:bg-gray-700 text-white px-5 py-2 rounded-xl shadow-md border border-red-700 dark:border-gray-600 hover:bg-red-700 dark:hover:bg-gray-600 transition-all duration-300"
          >
            <Download size={18} /> Download
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveTab("Home")}
            className="flex items-center gap-2 bg-white dark:bg-gray-700 text-red-700 dark:text-gray-200 px-5 py-2 rounded-xl shadow-md hover:bg-red-50 dark:hover:bg-gray-600 transition-all duration-300 font-medium border border-red-300 dark:border-gray-600"
          >
            <Home size={18} /> Home
          </motion.button>
        </div>
      </motion.div>

      {/* ===== Enquiry List or Details ===== */}
      <motion.div
        className="bg-white dark:bg-gray-800 bg-opacity-95 dark:bg-opacity-100 border border-red-300 dark:border-gray-700 rounded-3xl shadow-2xl p-8 max-w-5xl mx-auto"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.6 }}
      >
        <AnimatePresence>
          {!selected ? (
            filteredEnquiries.length === 0 ? (
              <p className="text-center text-gray-600 italic">
                {filter === "approved"
                  ? "No approved guests yet."
                  : filter === "rejected"
                  ? "No rejected guests yet."
                  : "No guest enquiries yet."}
              </p>
            ) : (
              <div className="grid gap-4">
                {paginatedEnquiries.map((e, i) => (
                  <motion.div
                    key={i}
                    className="flex justify-between items-center bg-red-50 dark:bg-gray-700 border border-red-200 dark:border-gray-600 rounded-xl px-6 py-4 shadow-sm hover:shadow-md hover:bg-red-100 dark:hover:bg-gray-600 cursor-pointer transition-all"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => setSelected(e)}
                  >
                    <div>
                      <h3 className="text-lg font-semibold text-red-700 dark:text-gray-200">
                        {e.name}
                      </h3>
                      <p className="text-sm text-gray-600">{new Date(e.createdAt).toLocaleString()}</p>
                      <p className="text-sm text-gray-700 mt-1 italic">
                        {e.purpose || "No purpose provided"}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      {e.files?.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <FileText size={18} />
                          <span className="text-sm">
                            {e.files.length} file
                            {e.files.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                      {(!e.status || e.status === "pending") ? (
                        <span className="text-sm font-semibold text-yellow-600">
                          New Enquiry
                        </span>
                      ) : e.status === "pending-approval" ? (
                        <span className="text-sm font-semibold text-blue-600">
                          Awaiting Room Assignment
                        </span>
                      ) : (
                        <span
                          className={`text-sm font-semibold capitalize ${
                            e.status === "approved"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {e.status}
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
              className="p-6 bg-red-50 dark:bg-gray-700 border border-red-200 dark:border-gray-600 rounded-2xl shadow-inner"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ type: "spring", duration: 0.6 }}
            >
              <h2 className="text-2xl font-bold text-red-700 dark:text-gray-200 mb-4">
                {selected.name}
              </h2>
              <div className="space-y-2 text-gray-700 dark:text-gray-300">
                
                {/* 🔥 Unified detail list for Guest Enquiry */}
                {[
                  { label: "Name / Society Name", key: "name" },
                  { label: "Roll No / Employee ID", key: "rollno" },
                  { label: "Department", key: "department" },
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
                  { label: "Payment Type", key: "paymentType" },
                  { label: "Amount", key: "amount" },
                  { label: "From", key: "from" },
                  { label: "To", key: "to" }
                ].map((item) => {
                  const value = selected[item.key] ?? selected[item.altKey];
                  if (!value) return null;

                  return (
                    <p key={item.key}>
                      <strong>{item.label}:</strong> {String(value)}
                    </p>
                  );  
                })}

              </div>    

              {/* Attachments */}
              {selected.files && selected.files.length > 0 && (
                <div className="mt-5">
                  <p className="font-semibold text-red-700 mb-3">
                    Attachments:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {selected.files.map((file, index) => {
                      const fileUrl = getFilePreviewUrl(file);
                      const fileName =
                        typeof file === "string"
                          ? `Attachment ${index + 1}`
                          : file.name || `Attachment ${index + 1}`;
                      const isImage =
                        fileUrl &&
                        (fileUrl.startsWith("data:image/") || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileUrl));
                      return (
                        <motion.div
                          key={index}
                          whileHover={{ scale: 1.03 }}
                          className="flex flex-col items-center bg-white rounded-lg shadow-md p-3 cursor-pointer hover:shadow-lg transition"
                          onClick={() => {
                            if (!fileUrl) return;
                            const isPdf =
                              fileUrl.startsWith("data:application/pdf") ||
                              fileUrl.endsWith(".pdf");
                            const newTab = window.open();
                            if (!newTab) return;
                            if (isPdf) newTab.location.href = fileUrl;
                            else
                              newTab.document.write(
                                `<html style='background:#111;margin:0'><body style='display:flex;justify-content:center;align-items:center;height:100vh;background:#111'><img src='${fileUrl}' style='max-width:95%;max-height:95%;border-radius:12px'/></body></html>`
                              );
                          }}
                        >
                          {isImage ? (
                            <img
                              src={fileUrl}
                              alt=""
                              className="w-full h-32 object-contain bg-white rounded-md mb-2 transition-transform duration-300 hover:scale-105"
                              onError={(e) => {
                                e.target.src =
                                  "https://cdn-icons-png.flaticon.com/512/337/337946.png";
                              }}    
                            />
                          ) : (
                            <div className="flex items-center justify-center w-full h-32 bg-gray-100 text-gray-600 rounded-md mb-2">
                              <FileText size={24} />
                            </div>
                          )}
                          <p className="text-xs text-gray-600 text-center truncate w-full">
                            {fileName}
                          </p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(!selected.status || selected.status === "pending" || selected.status === "pending-approval") && (
                <div className="flex justify-end gap-4 mt-8">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDecision("approved")}
                    className="flex items-center gap-2 bg-green-600 text-white px-5 py-2 rounded-lg shadow hover:bg-green-700 transition"
                  >
                    <CheckCircle2 size={18} /> Approve
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleDecision("rejected")}
                    className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg shadow hover:bg-red-700 transition"
                  >
                    <XCircle size={18} /> Reject
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(null)}
                    className="bg-gray-200 text-gray-800 px-5 py-2 rounded-lg shadow hover:bg-gray-300 transition"
                  >
                    Back
                  </motion.button>
                </div>
              )}

              {selected.status && selected.status !== "pending" && (
                <div className="flex justify-end gap-4 mt-8">
                  <div className="px-5 py-2 bg-gray-100 text-gray-600 rounded-lg">
                    Status: <span className="font-semibold capitalize">{selected.status}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelected(null)}
                    className="bg-gray-200 text-gray-800 px-5 py-2 rounded-lg shadow hover:bg-gray-300 transition"
                  >
                    Back
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== Pagination Controls ===== */}
        {filteredEnquiries.length > 0 && totalPages > 1 && !selected && (
          <div className="flex justify-center items-center gap-3 mt-6">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                currentPage === 1
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}
            >
              Previous
            </button>
            
            <span className="text-sm font-medium text-gray-700">
              Page {currentPage} of {totalPages} ({filteredEnquiries.length} total)
            </span>
            
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
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

      {/* ===== Toast ===== */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.4 }}
            className={`fixed bottom-6 right-6 bg-white border-l-8 ${
              toast.color === "green" ? "border-green-500" : "border-red-500"
            } shadow-xl px-6 py-4 rounded-xl text-gray-800 font-medium flex items-center gap-3`}
          >
            {toast.color === "green" ? (
              <CheckCircle2 className="text-green-500" size={24} />
            ) : (
              <XCircle className="text-red-500" size={24} />
            )}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
