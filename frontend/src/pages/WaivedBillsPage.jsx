// pages/WaivedBillsPage.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Receipt,
  User,
  Building2,
  Calendar,
  Clock,
  IndianRupee,
  UserCheck,
  FileText,
  Loader,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { BACKEND_URL } from "../utils/apiConfig";
import { formatBillingDate } from "../utils/billingDate";

const API = BACKEND_URL;

function formatDate(dateString) {
  return formatBillingDate(dateString);
}

function formatDateTime(dateString) {
  if (!dateString) return "—";
  const d = new Date(dateString);
  return (
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  );
}

export default function BillsPage({ onBack, theme = "light", currentUser }) {
  const [activeTab, setActiveTab] = useState("waived");
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isDark = theme === "dark";

  useEffect(() => {
    fetchBills();
  }, [activeTab]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      const endpoint = activeTab === "waived" ? "waived-bills" : "cancelled-bills";
      
      const response = await fetch(`${API}/api/payments/${endpoint}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        credentials: "include",
      });
      const data = await response.json();
      
      // ✅ Handle 403 Access Denied gracefully
      if (response.status === 403) {
        throw new Error("You do not have permission to view these bills.");
      }
      
      if (!response.ok) throw new Error(data.message || "Failed to fetch bills");
      
      console.log(`📥 ${activeTab} bills:`, data);

      if (activeTab === "waived") {
        setBills(data.waivedBills || []);
      } else {
        setBills(data.cancelledBills || []);
      }

    } catch (err) {
      console.error(`Fetch ${activeTab} bills error:`, err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const currentBills = bills || [];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 px-4 sm:px-6 py-4 border-b shadow-sm ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}>
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          <button
            onClick={onBack}
            className={`p-2 rounded-lg transition ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"}`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Receipt className="w-6 h-6 text-orange-500" />
              Bills Management
            </h1>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Review waived and cancelled bills
            </p>
          </div>
          <div className="ml-auto">
            <span className={`px-3 py-1.5 rounded-full text-sm font-semibold ${
              isDark ? "bg-orange-900/40 text-orange-400" : "bg-orange-100 text-orange-700"
            }`}>
              {currentBills.length} bill{currentBills.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 max-w-6xl mx-auto mt-4">
          <button 
            onClick={() => setActiveTab("waived")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "waived" 
                ? "bg-orange-500 text-white shadow-lg shadow-orange-200" 
                : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Waiver Bills
          </button>
          <button 
            onClick={() => setActiveTab("cancelled")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "cancelled" 
                ? "bg-red-500 text-white shadow-lg shadow-red-200" 
                : isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Cancelled Bills
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-10 h-10 animate-spin text-orange-500 mb-4" />
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Loading bills...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-red-500 font-medium">{error}</p>
            <button
              onClick={fetchBills}
              className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
            >
              Retry
            </button>
          </div>
        ) : currentBills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Receipt className="w-16 h-16 text-gray-300 mb-4" />
            <p className={`text-lg font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              No {activeTab === "waived" ? "Waived" : "Cancelled"} Bills
            </p>
            <p className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              No bills found in this category.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentBills.map((bill, index) => (
              <motion.div
                key={bill._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`rounded-2xl border shadow-sm overflow-hidden ${
                  isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
                }`}
              >
                {/* Card Header */}
                <div className={`px-5 py-3 flex items-center justify-between ${
                  activeTab === "waived" ? "bg-gradient-to-r from-orange-500 to-red-500" : "bg-gradient-to-r from-red-600 to-rose-600"
                }`}>
                  <div className="flex items-center gap-2 text-white">
                    <Receipt className="w-4 h-4" />
                    <span className="font-bold text-sm">
                      {bill.billNumber || `${activeTab.toUpperCase()}-${index + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <IndianRupee className="w-4 h-4" />
                    <span className="font-bold text-lg">
                      {/* ✅ For Cancelled Bills, show Total Amount as 0 or strike-through */}
                      {activeTab === "waived" 
                        ? Number(bill.waiverAmount || 0).toLocaleString()
                        : Number(bill.totalAmount || 0).toLocaleString()
                      }
                    </span>
                    <span className="text-white/70 text-xs">{activeTab === "waived" ? "waived" : "cancelled"}</span>
                  </div>
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {/* Guest Details */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-blue-500" />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Guest Details
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-bold text-base">{bill.guestName || "—"}</p>
                      {bill.guestEmail && (
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {bill.guestEmail}
                        </p>
                      )}
                      {bill.guestContact && (
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          📞 {bill.guestContact}
                        </p>
                      )}
                      {bill.department && (
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          🏢 {bill.department}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Room & Dates */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-purple-500" />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Room & Dates
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-semibold">{bill.hostel || "—"}</p>
                      <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Room {bill.roomNo || "—"}
                      </p>
                      {bill.from && (
                        <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          <Calendar className="w-3 h-3 inline mr-1" />
                          {formatDate(bill.from)} → {formatDate(bill.to)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Payment Summary */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <IndianRupee className="w-4 h-4 text-green-500" />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Payment Summary
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className={isDark ? "text-gray-400" : "text-gray-500"}>Total Bill</span>
                        <span className="font-medium">₹{Number(bill.totalAmount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className={isDark ? "text-gray-400" : "text-gray-500"}>Paid</span>
                        <span className="font-medium text-green-600">₹{Number(bill.paidBeforeWaiver || bill.amountPaid || 0).toLocaleString()}</span>
                      </div>
                      {activeTab === "waived" && (
                        <div className="flex justify-between text-sm border-t pt-1 mt-1">
                          <span className="font-semibold text-orange-600">Waived Off</span>
                          <span className="font-bold text-orange-600">₹{Number(bill.waiverAmount || 0).toLocaleString()}</span>
                        </div>
                      )}
                      {activeTab === "cancelled" && (
                        <div className="flex justify-between text-sm border-t pt-1 mt-1">
                          <span className="font-semibold text-red-600">Status</span>
                          <span className="font-bold text-red-600 uppercase">CANCELLED</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remarks */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <FileText className="w-4 h-4 text-yellow-500" />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Remarks
                      </span>
                    </div>
                    <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {bill.waiverRemarks || bill.remarks || "—"}
                    </p>
                  </div>

                  {/* Action By */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <UserCheck className="w-4 h-4 text-indigo-500" />
                      <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                        Action By
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <p className="font-semibold text-sm">
                        {bill.waivedBy?.name || bill.cancelMeta?.cancelledByName || bill.createdByName || "System"}
                      </p>
                      {bill.waivedBy?.email && (
                        <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                          {bill.waivedBy.email}
                        </p>
                      )}
                      <p className={`text-xs flex items-center gap-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                        <Clock className="w-3 h-3" />
                        {formatDateTime(bill.waivedAt || bill.cancelMeta?.cancelledAt || bill.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Attachments */}
                {bill.waiverAttachments && bill.waiverAttachments.length > 0 && (
                  <div className={`px-5 pb-5 ${isDark ? "border-t border-gray-700" : "border-t border-gray-100"} pt-4`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                      Attachments ({bill.waiverAttachments.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {bill.waiverAttachments.map((att, i) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            isDark
                              ? "bg-gray-700 text-blue-400 hover:bg-gray-600"
                              : "bg-blue-50 text-blue-600 hover:bg-blue-100"
                          }`}
                        >
                          <ExternalLink className="w-3 h-3" />
                          {att.name || `Attachment ${i + 1}`}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
