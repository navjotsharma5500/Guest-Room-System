// src/components/BillHistoryModal.jsx - COMPLETE FIXED VERSION
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, CreditCard, Download, FileText, X, Receipt, TrendingUp, DollarSign } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { BACKEND_URL } from "../utils/apiConfig";

const API = BACKEND_URL;

const BillHistoryModal = ({ booking, onClose, theme = "light" }) => {
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    let isMounted = true;
    
    const fetchBillHistory = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const headers = { "Content-Type": "application/json" };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const response = await fetch(
          `${API}/api/payments/bookings/${booking._id || booking.id}/payment-history`,
          {
            method: "GET",
            headers,
            credentials: "include",
          }
        );

        const data = await response.json();

        if (isMounted) {
          if (data.success) {
            setBills(data.bills || []);
            
            // Calculate total paid
            const total = (data.bills || []).reduce((sum, bill) => sum + (bill.amountPaid || 0), 0);
            setTotalPaid(total);
          } else {
            throw new Error(data.message || "Failed to fetch bill history");
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching bill history:", err);
          setError(err.message);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (booking && (booking._id || booking.id)) {
      fetchBillHistory();
    } else {
      setLoading(false);
      setError("No booking information provided.");
    }

    return () => {
      isMounted = false;
    };
  }, [booking._id, booking.id]);

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleDownloadBill = (billId) => {
    try {
      console.log("📄 Opening bill PDF:", billId);
      
      // ✅ OPTION 1: Simple direct open (works best)
      const url = `${API}/api/payments/bills/${billId}/pdf`;
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      // ✅ Check if popup was blocked
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        console.warn("⚠️ Popup blocked, trying fallback...");
        
        // Fallback: Create a temporary link and click it
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.log("✅ PDF opened in new tab");
      }
      
    } catch (err) {
      console.error("Error opening bill:", err);
      showToast(`Failed to open bill: ${err.message}`, "error");
    }
  };

  // Calculate balance with proper rounding
  const totalBill = booking.totalAmount || 0;
  const totalDiscount = booking.waveOff || booking.discount || 0; // ✅ Get discount from booking
  const waveOff = totalDiscount; // ✅ Wave Off = Total Discount
  const balanceDue = Math.max(0, totalBill - totalPaid - waveOff); // ✅ Balance after payments AND discount

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col ${
          theme === "dark" ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Receipt size={24} />
              Payment & Bill History
            </h3>
            <p className="text-green-100 text-sm mt-1">
              {booking.guest || "Guest"} - {booking.hostel} Room {booking.roomNo}
            </p>
          </div>
          <button
            onClick={onClose}
            className="bg-white/20 hover:bg-white/30 rounded-full p-2 transition focus:outline-none focus:ring-2 focus:ring-white/50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Payment Summary Card */}
        <div className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-b shrink-0">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Total Bill</p>
              <p className="text-2xl font-bold text-green-700">₹{totalBill}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Paid Amount</p>
              <p className="text-2xl font-bold text-blue-700">₹{totalPaid.toFixed(1)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Wave Off</p>
              <p className="text-2xl font-bold text-orange-700">
                ₹{waveOff.toFixed(1)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Balance Due</p>
              <p className="text-2xl font-bold text-red-700">
                ₹{balanceDue === 0 ? '0' : balanceDue.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
              <p className="text-gray-500">Loading bill history...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 text-red-500 bg-red-50 rounded-lg p-6">
              <p className="font-medium">Error loading bill history</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
              <FileText size={48} className="text-gray-300 mb-2" />
              <p>No payment records found.</p>
              <p className="text-sm mt-1">Bills will appear here once payments are made.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bills.map((bill, index) => {
                // ✅ Debug logging (BEFORE the return statement)
                console.log("📊 Bill data:", {
                  billNumber: bill.billNumber,
                  balanceBeforePayment: bill.balanceBeforePayment,
                  balanceAfterPayment: bill.balanceAfterPayment,  // This should be 500
                  discountAmount: bill.discountAmount,
                  amountPaid: bill.amountPaid
                });

                return (
                  <motion.div
                    key={bill._id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`p-5 rounded-xl border transition hover:shadow-lg ${
                      theme === "dark"
                        ? "bg-gray-700/50 border-gray-600 hover:bg-gray-700"
                        : "bg-white border-gray-200 hover:border-green-300 hover:shadow-green-100"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="bg-green-100 p-2 rounded-lg">
                            <Receipt size={20} className="text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg">Bill #{bill.billNumber}</h4>
                            <p className="text-xs text-gray-500">
                              Transaction ID: {bill.transactionId || "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ₹{bill.amountPaid || 0}
                        </p>
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mt-1 ${
                            bill.paymentType === "FULL"
                              ? "bg-green-100 text-green-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {bill.paymentType || "FULL"} PAYMENT
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                      {/* Date */}
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-blue-500" />
                        <span>
                          {formatDate(bill.createdAt || bill.paidAt || new Date())}
                          <span className="text-xs text-gray-500 ml-1">
                            {formatTime(bill.createdAt || bill.paidAt || new Date())}
                          </span>
                        </span>
                      </div>
                      
                      {/* Payment Method */}
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className="text-purple-500" />
                        <span>{bill.paymentMethod || "N/A"}</span>
                      </div>
                      
                      {/* Balance Before */}
                      <div className="flex items-center gap-2">
                        <TrendingUp size={16} className="text-orange-500" />
                        <span>
                          Balance Before: ₹{Number(bill.balanceBeforePayment || 0).toFixed(2)}
                        </span>
                      </div>
                      
                      {/* Balance After - ✅ USE bill.balanceAfterPayment DIRECTLY */}
                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-red-500" />
                        <span>
                          Balance After: ₹{Number(bill.balanceAfterPayment || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Discount Badge - Shows if discount was applied */}
                    {(bill.discountAmount > 0 || bill.discountPercent > 0) && (
                      <div className="mb-3">
                        <span className="inline-flex items-center gap-2 text-xs bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full font-semibold">
                          <span className="text-base">💰</span>
                          <span>
                            Discount Applied: ₹{Number(bill.discountAmount || 0).toFixed(2)}
                            {bill.discountPercent > 0 && ` (${bill.discountPercent}% off)`}
                          </span>
                        </span>
                      </div>
                    )}

                    {/* Payment Proof */}
                    {bill.paymentProof && bill.paymentProof.length > 0 && (
                      <div className="mb-3 text-xs">
                        <span className="text-gray-600">Payment Proof:</span>
                        <div className="flex gap-2 mt-1">
                          {bill.paymentProof.map((proof, i) => (
                            <a
                              key={i}
                              href={proof}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              🔎 Attachment {i + 1}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-600">
                      <div className="text-xs text-gray-500">
                        Created by: {bill.createdBy?.name || "System"}
                      </div>
                      <button
                        onClick={() => handleDownloadBill(bill._id)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition shadow-lg shadow-green-500/30 font-medium text-sm"
                      >
                        <Download size={16} />
                        Download PDF
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`p-4 border-t flex justify-between items-center shrink-0 ${
            theme === "dark" ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="text-sm text-gray-600">
            Total Records: <strong>{bills.length}</strong>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-lg shadow-green-500/30 font-medium"
          >
            Close
          </button>
        </div>
      </motion.div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #10b981;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #059669;
        }
      `}</style>
    </div>
  );
};

export default BillHistoryModal;