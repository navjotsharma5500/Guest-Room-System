// components/PaymentModal.jsx - PART 1: COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, AlertCircle, Receipt, Info, CheckCircle, Trash2, Building2 } from "lucide-react";
import { IKContext, IKUpload } from "imagekitio-react";
import { useToast } from "../context/ToastContext";
import { useDashboardRefresh } from "../context/DashboardRefreshContext";
import { 
  BACKEND_URL, 
  IMAGEKIT_PUBLIC_KEY, 
  IMAGEKIT_URL_ENDPOINT 
} from "../utils/apiConfig";

const API = BACKEND_URL;

export default function PaymentModal({ booking, onClose, onSuccess }) {
  const toastContext = useToast();
  const showToast = (message, type = "info") => {
    if (toastContext?.showToast) {
      toastContext.showToast(message, type);
    }
  };
  const { refreshDashboard } = useDashboardRefresh();
  
  // Refs for ImageKit upload
  const ikUploadRef = useRef(null);

  console.log("🔥 Payment Modal Opened for:", booking);

  // ✅ CALCULATE BALANCE - Handle both Free and Paid bookings + Defaulters
  const totalAmount = booking.totalAmount || booking.totalDue || 0;
  const paidSoFar = booking.paidAmount || 0;
  const previousDiscount = booking.discount || booking.waveOff || 0;
  const balance = totalAmount - paidSoFar - previousDiscount;
  const paymentType = booking.paymentType || "Paid";
  const isFreeBedding = paymentType === "Free";
  const isFullyPaid = !isFreeBedding && balance <= 0;

  console.log("💰 PaymentModal - Amounts:", {
    totalAmount,
    paidSoFar,
    previousDiscount,
    balance,
    isFreeBedding,
    isFullyPaid,
    bookingId: booking._id || booking.bookingId
  });


  // ✅ STATES
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [billPaymentType, setBillPaymentType] = useState("Full Payment");
  const [loading, setLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

  // ✅ CALCULATE DISCOUNT AMOUNT & FINAL AMOUNT
  const discountAmount = (balance * discountPercent) / 100;
  const amountAfterDiscount = Math.max(0, balance - discountAmount);

  console.log("💰 Amounts:", {
    totalAmount,
    paidSoFar,
    previousDiscount,
    balance,
    discountPercent,
    discountAmount,
    amountAfterDiscount,
    isFreeBedding
  });

  // ✅ AUTO-FILL PAID AMOUNT BASED ON PAYMENT TYPE
  useEffect(() => {
    // When discount changes, update paid amount to match discounted balance
    if (billPaymentType === "Full Payment") {
      setPaidAmount(amountAfterDiscount);
    } else {
      // For partial payment, don't auto-set, but ensure it doesn't exceed discounted amount
      if (paidAmount > amountAfterDiscount) {
        setPaidAmount(amountAfterDiscount);
      }
    }
  }, [billPaymentType, amountAfterDiscount]);

  // ✅ Update paid amount when discount changes (for Full Payment)
  useEffect(() => {
    if (billPaymentType === "Full Payment") {
      setPaidAmount(amountAfterDiscount);
    }
  }, [discountPercent]); 


  const downloadBill = async (billId) => {
    try {
      const res = await fetch(
        `${API}/api/payments/bills/${billId}/pdf`,
        { credentials: "include" }
      );

      if (!res.ok) {
        throw new Error("Failed to download bill");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `bill-${billId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Download Bill Error:", err);
      showToast("Failed to download bill", "error");
    }
  };

  // ✅ IMAGEKIT AUTHENTICATOR
  const authenticator = async () => {
    try {
      const res = await fetch(`${API}/api/imagekit/auth`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("ImageKit auth failed");
      }

      return await res.json();
    } catch (err) {
      console.error("❌ ImageKit auth error:", err);
      showToast("Failed to initialize file upload", "error");
      throw err;
    }
  };

  // ✅ HANDLE FILE UPLOAD SUCCESS
  const handleUploadSuccess = (res) => {
    console.log("✅ File uploaded successfully:", res.url);
    
    if (attachments.length >= 5) {
      showToast("⚠️ Maximum 5 attachments allowed", "warning");
      return;
    }
    
    setAttachments((prev) => [...prev, res.url]);
    showToast("✅ Attachment uploaded successfully", "success");
    setUploadingFile(false);
  };

  // ✅ HANDLE FILE UPLOAD ERROR
  const handleUploadError = (err) => {
    console.error("❌ Upload error:", err);
    showToast("❌ Failed to upload file. Please try again.", "error");
    setUploadingFile(false);
  };

  // ✅ HANDLE FILE UPLOAD START
  const handleUploadStart = () => {
    console.log("📤 Upload started...");
    setUploadingFile(true);
  };

  // ✅ REMOVE ATTACHMENT
  const removeAttachment = (index) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
    showToast("🗑️ Attachment removed", "info");
  };

  // ✅ TRIGGER FILE INPUT CLICK
  const triggerFileUpload = () => {
    if (attachments.length >= 5) {
      showToast("⚠️ Maximum 5 attachments allowed", "warning");
      return;
    }

    if (ikUploadRef.current) {
      ikUploadRef.current.click();
    } else {
      console.error("❌ IKUpload ref not found");
      showToast("Upload failed. Please retry.", "error");
    }
  };

  // ✅ VALIDATION FUNCTION
  const validatePayment = () => {
    // For free bookings, skip payment validation
    if (isFreeBedding) {
      if (!paymentRemarks.trim()) {
        showToast("⚠️ Please add remarks for free booking", "warning");
        return false;
      }
      return true;
    }

    // For paid bookings (GUEST responsibility)
    if (!paymentMode) {
      showToast("⚠️ Please select payment mode", "warning");
      return false;
    }

    if (!paidAmount || paidAmount <= 0) {
      showToast("⚠️ Payment amount is required", "warning");
      return false;
    }

    if (paidAmount > amountAfterDiscount) {
      showToast(`⚠️ Payment amount (₹${paidAmount}) exceeds balance after discount (₹${amountAfterDiscount.toFixed(2)})`, "warning");
      return false;
    }

    if (billPaymentType === "Full Payment") {
      if (Math.abs(paidAmount - amountAfterDiscount) > 0.01) {
        showToast(`⚠️ Full payment requires exact balance amount after discount: ₹${amountAfterDiscount.toFixed(2)}`, "warning");
        return false;
      }
    }

    if (billPaymentType === "Partial Payment" && paidAmount > amountAfterDiscount) {
      showToast(`⚠️ Payment amount cannot exceed balance after discount: ₹${amountAfterDiscount.toFixed(2)}`, "warning");
      return false;
    }

    if (attachments.length === 0) {
      showToast("⚠️ Payment proof attachment is mandatory", "warning");
      return false;
    }

    if (!paymentRemarks.trim()) {
      showToast("⚠️ Payment remarks are required", "warning");
      return false;
    }

    return true;
  };

  // ✅ SUBMIT PAYMENT TO BACKEND
  const submitPayment = async () => {
    if (!validatePayment()) return;

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      console.log("📤 Sending payment data:", {
        bookingId: booking._id,
        paymentType: billPaymentType === "Full Payment" ? "FULL" : "PARTIAL",
        amountPaid: paidAmount,
        paymentMethod: paymentMode,
        discountPercent,
        discountAmount,
        isFreeBedding
      });

      const response = await fetch(
        `${API}/api/payments/bookings/${booking._id}/payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          credentials: "include",
          body: JSON.stringify({
            paymentType: billPaymentType === "Full Payment" ? "FULL" : "PARTIAL",
            amountPaid: paidAmount,
            paymentMethod: paymentMode,
            transactionId: transactionId || "",
            transactionDate: transactionDate || null,
            paymentRemarks: paymentRemarks,
            paymentAttachments: attachments,
            discount: discountAmount,
            discountPercent: discountPercent,
          }),
        }
      );

      const data = await response.json();

      console.log("📥 Payment response:", data);

      if (!response.ok) {
        throw new Error(data.message || "Payment processing failed");
      }

      console.log("✅ Payment processed successfully:", data);

      showToast(data.message || "✅ Payment processed successfully", "success");

      // 🔄 REFRESH DASHBOARD
      setTimeout(() => {
        refreshDashboard(true);
        
        if (onSuccess) {
          onSuccess(data.booking);
        }
        
        onClose();
      }, 500);

    } catch (err) {
      console.error("❌ Payment error:", err);
      showToast(err.message || "Payment failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // ✅ CONTINUE TO PART 2 FOR JSX RENDERING...
  // components/PaymentModal.jsx - PART 2: JSX RENDERING

  // ✅ FULLY PAID STATE
  if (isFullyPaid) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white rounded-2xl w-full max-w-md text-center p-8 shadow-2xl"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">Fully Paid</h2>
            <p className="text-gray-600 mb-6">
              This booking has been fully paid.
            </p>
            <div className="space-y-2 text-sm text-gray-700 mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <strong>₹{totalAmount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Paid Amount:</span>
                <strong className="text-green-600">₹{paidSoFar}</strong>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span>Balance:</span>
                <strong className="text-green-600">₹0</strong>
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-gray-500 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // ✅ MAIN PAYMENT FORM
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
        >
          {/* ========================================
              HEADER
          ======================================== */}
          <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white p-5 rounded-t-2xl z-10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  {isFreeBedding ? "Free Booking Details" : "Payment Details"}
                </h2>
                <p className="text-green-100 text-sm">
                  For {booking.guest || "Guest"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 rounded-full p-1.5 transition"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* ========================================
                PAYMENT SUMMARY (Show only for Paid bookings)
            ======================================== */}
            {!isFreeBedding && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-blue-700 mb-1">Total Bill</p>
                    <p className="text-xl font-bold text-blue-900">₹{totalAmount}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700 mb-1">Paid So Far</p>
                    <p className="text-xl font-bold text-green-900">₹{paidSoFar}</p>
                  </div>
                  <div>
                    <p className="text-xs text-red-700 mb-1">Balance Due</p>
                    <p className="text-xl font-bold text-red-900">₹{balance}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================
                FREE BOOKING NOTICE
            ======================================== */}
            {isFreeBedding && (
              <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-xl border border-amber-200 flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="font-bold text-amber-900">Free Booking</p>
                  <p className="text-sm text-amber-700">No payment required. Just add remarks and submit.</p>
                </div>
              </div>
            )}

            {/* ========================================
                AMOUNT AFTER DISCOUNT (Only for Paid)
            ======================================== */}
            {!isFreeBedding && (
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-medium text-purple-700">Amount to Pay</span>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      ₹{amountAfterDiscount.toFixed(2)}
                    </p>
                    {discountPercent > 0 && (
                      <p className="text-xs text-purple-600 mt-1">
                        (After {discountPercent}% discount: ₹{discountAmount.toFixed(2)})
                      </p>
                    )}
                  </div>
                  <div className="bg-purple-500 text-white px-3 py-1.5 rounded-lg font-bold text-sm">
                    Pay Now
                  </div>
                </div>
              </div>
            )}

            {/* ========================================
                DISCOUNT INPUT (Only for Paid)
            ======================================== */}
            {!isFreeBedding && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Discount (%) <span className="text-gray-500 font-normal">(Optional - applies to all payment types)</span>
                </label>
                <input
                  type="number"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  min="0"
                  max="100"
                  placeholder="Enter discount percentage"
                  className="border-2 border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                />
                {discountPercent > 0 && (
                  <p className="text-xs text-green-600 mt-1">
                    💡 Discount amount: ₹{discountAmount.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {/* ========================================
                PAYMENT MODE (Only for Paid)
            ======================================== */}
            {!isFreeBedding && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Payment Mode <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {["UPI", "ONLINE", "BANK TRANSFER", "CARD SWIPE"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setPaymentMode(mode)}
                      className={`px-3 py-2 rounded-lg border-2 transition text-xs font-semibold ${
                        paymentMode === mode
                          ? "bg-green-600 text-white border-green-600 shadow-md"
                          : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================
                PAYMENT TYPE (Only for Paid)
            ======================================== */}
            {!isFreeBedding && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Payment Type <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {["Full Payment", "Partial Payment"].map((type) => (
                    <button
                      key={type}
                      onClick={() => setBillPaymentType(type)}
                      className={`flex-1 px-4 py-2 rounded-lg border-2 transition text-sm font-semibold ${
                        billPaymentType === type
                          ? "bg-green-600 text-white border-green-600 shadow-md"
                          : "bg-white text-gray-700 border-gray-300 hover:border-green-400"
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ========================================
                AMOUNT INPUT (Only for Paid)
            ======================================== */}
            {!isFreeBedding && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">
                  Amount Paying Now (₹) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Number(e.target.value) || 0)}
                  min="1"
                  max={amountAfterDiscount}
                  placeholder="Enter amount"
                  className="border-2 border-gray-300 p-2.5 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 font-bold text-base"
                  disabled={billPaymentType === "Full Payment"}
                />
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Info size={14} className="text-blue-500" />
                  <p className="text-xs text-gray-600">
                    {billPaymentType === "Full Payment" 
                      ? "💡 Paying full discounted balance" 
                      : `💡 You can pay up to ₹${amountAfterDiscount.toFixed(2)} (Remaining: ₹${(amountAfterDiscount - paidAmount).toFixed(2)})`}
                  </p>
                </div>
              </div>
            )}

            {/* ========================================
                TRANSACTION DETAILS (Only for Paid)
            ======================================== */}
            {!isFreeBedding && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700">
                    UTR/Transaction Number
                  </label>
                  <input
                    type="text"
                    placeholder="Enter transaction ID"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    className="border-2 border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1.5 text-gray-700">
                    Transaction Date
                  </label>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="border-2 border-gray-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                  />
                </div>
              </div>
            )}

            {/* ========================================
                REMARKS
            ======================================== */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder={isFreeBedding ? "Add remarks for free booking..." : "Add payment remarks or notes..."}
                value={paymentRemarks}
                onChange={(e) => setPaymentRemarks(e.target.value)}
                className="border-2 border-gray-300 p-2.5 rounded-lg w-full h-20 resize-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              />
            </div>

            {/* ========================================
                PAYMENT PROOF UPLOAD (Only for Paid)
            ======================================== */}
            {!isFreeBedding && (
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 flex items-center gap-2">
                  Upload Payment Proof <span className="text-red-500">* (Max 5)</span>
                  {attachments.length === 0 && (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </label>
                
                {/* ImageKit Upload */}
                <IKContext
                  publicKey={IMAGEKIT_PUBLIC_KEY}
                  urlEndpoint={IMAGEKIT_URL_ENDPOINT}
                  authenticator={authenticator}
                >
                  <div className="relative">
                    <IKUpload
                      folder="/payment-proof"
                      useUniqueFileName={true}
                      onSuccess={handleUploadSuccess}
                      onError={handleUploadError}
                      onUploadStart={handleUploadStart}
                      className="hidden"
                      ref={ikUploadRef}
                    />
                    
                    <button
                      type="button"
                      onClick={triggerFileUpload}
                      disabled={attachments.length >= 5 || uploadingFile}
                      className={`w-full border-2 border-dashed p-4 rounded-xl transition text-center ${
                        attachments.length >= 5 || uploadingFile
                          ? "border-gray-300 bg-gray-100 cursor-not-allowed" 
                          : "border-gray-400 bg-gray-50 hover:border-green-500 hover:bg-green-50 cursor-pointer"
                      }`}
                    >
                      {uploadingFile ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                          <p className="text-sm text-gray-600">Uploading...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2">
                          <Upload className="w-8 h-8 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            Click to upload payment proof
                          </p>
                          <p className="text-xs text-gray-500">
                            {attachments.length}/5 uploaded
                          </p>
                        </div>
                      )}
                    </button>
                  </div>
                </IKContext>

                {/* Uploaded Files List */}
                {attachments.length > 0 ? (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-xs font-semibold text-green-700 mb-2">
                      ✅ Uploaded Attachments ({attachments.length}/5)
                    </p>
                    <ul className="space-y-2">
                      {attachments.map((url, i) => (
                        <li key={i} className="flex items-center justify-between bg-white p-2 rounded border border-green-200">
                          <div className="flex items-center gap-2 flex-1">
                            <Upload className="w-3 h-3 text-green-600" />
                            <a 
                              href={url} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-xs text-blue-600 hover:underline truncate"
                            >
                              Attachment {i + 1}
                            </a>
                          </div>
                          <button
                            onClick={() => removeAttachment(i)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-xs font-medium text-red-700">
                      Payment proof is mandatory
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ========================================
                ACTION BUTTONS
            ======================================== */}
            <div className="flex flex-col gap-3 pt-4 border-t-2 border-gray-200">
              {/* Primary Actions Row */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-semibold text-sm shadow-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPayment}
                  disabled={loading || uploadingFile}
                  className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition font-semibold shadow-lg disabled:opacity-50 text-sm"
                >
                  {loading ? "Processing..." : isFreeBedding ? "Submit" : `Pay ₹${paidAmount}`}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ✅ END OF PAYMENT MODAL COMPONENT