// src/pages/ApprovalPage.jsx — FULL REDESIGN
// Matches WaivedBillsPage design system: cards, dark mode, tabs, motion
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Building2,
  ArrowLeft,
  Loader,
  AlertCircle,
  IndianRupee,
  FileText,
  ShieldCheck,
  RefreshCw,
  Filter,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  BadgeCheck,
  Ban,
  CalendarDays,
  Info,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import Sidebar from "../components/Sidebar";
import { BACKEND_URL } from "../utils/apiConfig";
import AttachmentGrid from "../components/AttachmentGrid";

const API = BACKEND_URL;

const STATUS_TABS = ["PENDING", "APPROVED", "REJECTED"];

const STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    color: "amber",
    icon: Clock,
    badgeBg: "bg-amber-100 text-amber-700",
    darkBadgeBg: "bg-amber-900/40 text-amber-400",
    headerGradient: "from-amber-500 to-orange-500",
    tabActive: "bg-amber-500 text-white shadow-lg shadow-amber-200",
  },
  APPROVED: {
    label: "Approved",
    color: "green",
    icon: CheckCircle,
    badgeBg: "bg-green-100 text-green-700",
    darkBadgeBg: "bg-green-900/40 text-green-400",
    headerGradient: "from-green-500 to-emerald-600",
    tabActive: "bg-green-500 text-white shadow-lg shadow-green-200",
  },
  REJECTED: {
    label: "Rejected",
    color: "red",
    icon: XCircle,
    badgeBg: "bg-red-100 text-red-700",
    darkBadgeBg: "bg-red-900/40 text-red-400",
    headerGradient: "from-red-500 to-rose-600",
    tabActive: "bg-red-500 text-white shadow-lg shadow-red-200",
  },
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─────────────────────────────────────────
// Review Modal (Approve)
// ─────────────────────────────────────────
function ReviewModal({ request, isDark, onClose, onSubmit, submitting }) {
  const [updatedAmount, setUpdatedAmount] = useState(request?.amount || 0);
  const [updatedDate, setUpdatedDate] = useState(
    request?.newCheckOutDate
      ? new Date(request.newCheckOutDate).toISOString().split("T")[0]
      : ""
  );

  if (!request) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={`rounded-2xl w-full max-w-md shadow-2xl overflow-hidden ${
            isDark ? "bg-gray-800" : "bg-white"
          }`}
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Approve Extension</h3>
                <p className="text-white/80 text-sm">
                  {request.guest} — {request.hostel}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Info row */}
            <div
              className={`rounded-xl p-4 text-sm space-y-2 ${
                isDark ? "bg-gray-700" : "bg-gray-50"
              }`}
            >
              <div className="flex justify-between">
                <span className={isDark ? "text-gray-400" : "text-gray-500"}>Room</span>
                <span className="font-semibold">
                  {request.hostel} — {request.roomNo}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                  Current Checkout
                </span>
                <span className="font-semibold">
                  {formatDate(request.currentCheckOutDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className={isDark ? "text-gray-400" : "text-gray-500"}>
                  Requested Days
                </span>
                <span className="font-bold text-blue-600">{request.days} day(s)</span>
              </div>
            </div>

            {/* Editable: Checkout Date */}
            <div>
              <label
                className={`block text-sm font-semibold mb-1.5 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                <CalendarDays className="w-4 h-4 inline mr-1.5 text-blue-500" />
                Final Checkout Date
              </label>
              <input
                type="date"
                value={updatedDate}
                onChange={(e) => setUpdatedDate(e.target.value)}
                className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 outline-none transition ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>

            {/* Editable: Amount */}
            {request.paymentType === "Paid" && (
              <div>
                <label
                  className={`block text-sm font-semibold mb-1.5 ${
                    isDark ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  <IndianRupee className="w-4 h-4 inline mr-1.5 text-green-500" />
                  Final Amount (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={updatedAmount}
                  onChange={(e) => setUpdatedAmount(e.target.value)}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:ring-2 focus:ring-green-400 outline-none transition ${
                    isDark
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  }`}
                  placeholder="Enter approved amount"
                />
              </div>
            )}

            {request.paymentType === "Free" && (
              <div
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
                  isDark
                    ? "bg-emerald-900/30 text-emerald-400"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                <BadgeCheck className="w-4 h-4" />
                Free Extension — No payment required
              </div>
            )}

            {/* Remarks */}
            {request.remarks && (
              <div
                className={`rounded-xl px-4 py-3 text-sm italic ${
                  isDark ? "bg-gray-700 text-gray-300" : "bg-blue-50 text-blue-700"
                }`}
              >
                <Info className="w-4 h-4 inline mr-1.5" />
                "{request.remarks}"
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                disabled={submitting}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  onSubmit({
                    requestId: request._id,
                    updatedAmount: Number(updatedAmount),
                    updatedCheckOutDate: updatedDate,
                  })
                }
                disabled={submitting || !updatedDate}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" /> Approving…
                  </span>
                ) : (
                  "✓ Confirm Approval"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// Reject Modal
// ─────────────────────────────────────────
function RejectModal({ request, isDark, onClose, onSubmit, submitting }) {
  const [reason, setReason] = useState("");
  if (!request) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={`rounded-2xl w-full max-w-md shadow-2xl overflow-hidden ${
            isDark ? "bg-gray-800" : "bg-white"
          }`}
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-full p-2">
                <XCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Reject Extension</h3>
                <p className="text-white/80 text-sm">
                  {request.guest} — {request.hostel}
                </p>
              </div>
            </div>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label
                className={`block text-sm font-semibold mb-1.5 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Reason for Rejection <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                placeholder="Enter reason for rejecting this extension request..."
                className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-2 focus:ring-red-400 outline-none resize-none transition ${
                  isDark
                    ? "bg-gray-700 border-gray-600 text-white placeholder-gray-500"
                    : "bg-white border-gray-300 text-gray-900"
                }`}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={submitting}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                  isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  onSubmit({ requestId: request._id, reason: reason.trim() })
                }
                disabled={submitting || !reason.trim()}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader className="w-4 h-4 animate-spin" /> Rejecting…
                  </span>
                ) : (
                  "✗ Confirm Rejection"
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────
// Request Card
// ─────────────────────────────────────────
function RequestCard({ request, isDark, canAct, onApprove, onReject, index }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.PENDING;
  const StatusIcon = cfg.icon;
  const extensionFiles = Array.isArray(request.extensionAttachments) ? request.extensionAttachments : [];
  const paymentFiles = Array.isArray(request.extensionPaymentAttachments) ? request.extensionPaymentAttachments : [];
  const allFiles = [...extensionFiles, ...paymentFiles];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`rounded-2xl border shadow-sm overflow-hidden ${
        isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
      }`}
    >
      {/* Card Header */}
      <div
        className={`px-5 py-3 flex items-center justify-between bg-gradient-to-r ${cfg.headerGradient}`}
      >
        <div className="flex items-center gap-2 text-white">
          <ClipboardList className="w-4 h-4" />
          <span className="font-bold text-sm">
            {request.days} Day{request.days !== 1 ? "s" : ""} Extension
          </span>
          <span className="text-white/70 text-xs ml-1">
            — {request.requiredApprovalLevel === "co_warden" ? "Co-Warden" : request.requiredApprovalLevel === "adosa" ? "ADOSA" : "DoSA"} Level
          </span>
        </div>
        <div className="flex items-center gap-2">
          <StatusIcon className="w-4 h-4 text-white/90" />
          <span className="text-white font-semibold text-sm capitalize">
            {request.status.charAt(0) + request.status.slice(1).toLowerCase()}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Guest */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-blue-500" />
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Guest
            </span>
          </div>
          <p className="font-bold text-base">{request.guest}</p>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Request #{request._id?.slice(-6).toUpperCase()}
          </p>
          <div className={`mt-3 space-y-1 text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            {request.email && <p>Email: {request.email}</p>}
            {request.contact && <p>Contact: {request.contact}</p>}
            {request.rollno && <p>Roll No: {request.rollno}</p>}
            {request.department && <p>Department: {request.department}</p>}
            {request.gender && <p>Gender: {request.gender}</p>}
            {request.purpose && <p>Purpose: {request.purpose}</p>}
          </div>
        </div>

        {/* Room & Dates */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Building2 className="w-4 h-4 text-purple-500" />
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Room & Dates
            </span>
          </div>
          <p className="font-semibold">{request.hostel}</p>
          <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
            Room {request.roomNo}
          </p>
          <div
            className={`mt-2 text-xs space-y-1 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          >
            <p>
              <span className="font-medium">Current:</span>{" "}
              {formatDate(request.currentCheckOutDate)}
            </p>
            <p>
              <span className="font-medium">Requested:</span>{" "}
              <span className="font-bold text-blue-600">
                {formatDate(request.finalCheckOutDate || request.newCheckOutDate)}
              </span>
            </p>
          </div>
        </div>

        {/* Payment */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <IndianRupee className="w-4 h-4 text-green-500" />
            <span
              className={`text-xs font-semibold uppercase tracking-wide ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Payment
            </span>
          </div>
          <p className="font-bold text-lg">
            {request.paymentType === "Free"
              ? "Free"
              : `₹${(request.finalAmount || request.amount || 0).toLocaleString()}`}
          </p>
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              request.paymentType === "Free"
                ? isDark
                  ? "bg-emerald-900/40 text-emerald-400"
                  : "bg-emerald-100 text-emerald-700"
                : isDark
                ? "bg-blue-900/40 text-blue-400"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {request.paymentType}
          </span>
          <p
            className={`text-xs mt-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}
          >
            Submitted {formatDateTime(request.createdAt)}
          </p>
        </div>
      </div>

      {allFiles.length > 0 && (
        <div
          className={`px-5 pb-5 ${
            isDark ? "border-t border-gray-700" : "border-t border-gray-100"
          }`}
        >
          <div className="flex items-center justify-between pt-4 pb-2">
            <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Attachments
            </span>
            <span className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>
              Extension {extensionFiles.length} • Payment {paymentFiles.length}
            </span>
          </div>
          <AttachmentGrid files={allFiles} theme={isDark ? "dark" : "light"} />
        </div>
      )}

      {/* Expandable Remarks / Rejection */}
      {(request.remarks || request.rejectionReason) && (
        <div
          className={`px-5 pb-1 ${
            isDark ? "border-t border-gray-700" : "border-t border-gray-100"
          }`}
        >
          <button
            onClick={() => setExpanded((p) => !p)}
            className={`flex items-center gap-1.5 py-3 text-xs font-semibold uppercase tracking-wide transition ${
              isDark
                ? "text-gray-400 hover:text-gray-200"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            {request.rejectionReason ? "Rejection Reason" : "Remarks"}
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-1" />
            )}
          </button>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <p
                  className={`pb-4 text-sm italic ${
                    request.rejectionReason
                      ? isDark
                        ? "text-red-400"
                        : "text-red-600"
                      : isDark
                      ? "text-gray-300"
                      : "text-gray-700"
                  }`}
                >
                  "{request.rejectionReason || request.remarks}"
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Action Buttons (only for PENDING + canAct) */}
      {request.status === "PENDING" && canAct && (
        <div
          className={`px-5 py-4 flex gap-3 ${
            isDark
              ? "border-t border-gray-700 bg-gray-800/80"
              : "border-t border-gray-100 bg-gray-50"
          }`}
        >
          <button
            onClick={() => onReject(request)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition border ${
              isDark
                ? "border-red-700 text-red-400 hover:bg-red-900/30"
                : "border-red-200 text-red-600 hover:bg-red-50"
            }`}
          >
            <Ban className="w-4 h-4" />
            Reject
          </button>
          <button
            onClick={() => onApprove(request)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold shadow-md hover:shadow-lg transition"
          >
            <ShieldCheck className="w-4 h-4" />
            Approve
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────
export default function ApprovalPage({ onBack, theme = "light" }) {
  const isDark = theme === "dark";
  const { currentUser } = useAuth();
  const { showToast } = useToast();
  const role = currentUser?.role || currentUser?.user?.role || "";

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("PENDING");
  const [submitting, setSubmitting] = useState(false);

  const [approveModal, setApproveModal] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/extensions`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        // ✅ FIX: Helper for date-only diff (same logic as backend)
        // Strips the time component so 10 Mar → 11 Mar = 1 day always,
        // regardless of UTC/IST offset stored in the DB date.
        const toDateOnly = (d) => {
          const dt = new Date(d);
          return Date.UTC(dt.getFullYear(), dt.getMonth(), dt.getDate());
        };

         const mapped = data.requests.map(r => {
             // ✅ FIX: Date-only days — never inflated by IST/UTC gap
             const days = Math.round(
               (toDateOnly(r.requestedCheckout) - toDateOnly(r.oldCheckout)) / 86400000
             );

             // ✅ FIX: Read extensionAmount (proposed) not approvedAmount (0 for pending)
             const proposedAmount = r.extensionAmount ?? r.paymentData?.extensionAmount ?? 0;
             const paymentType    = r.extensionPaymentType
               || r.paymentData?.extensionPaymentType
               || "Paid";

             const extensionAttachmentFiles = [
               ...(Array.isArray(r.extensionAttachments) ? r.extensionAttachments : []),
               ...(Array.isArray(r.attachments) ? r.attachments : []),
               ...(Array.isArray(r.paymentData?.extensionAttachments) ? r.paymentData.extensionAttachments : [])
             ];
             const extensionPaymentAttachmentFiles = [
               ...(Array.isArray(r.extensionPaymentAttachments) ? r.extensionPaymentAttachments : []),
               ...(Array.isArray(r.paymentAttachments) ? r.paymentAttachments : []),
               ...(Array.isArray(r.paymentData?.extensionPaymentAttachments) ? r.paymentData.extensionPaymentAttachments : [])
             ];

             return {
               ...r,
               requestId: r._id,
               guest: r.bookingId?.guest,
               roomNo: r.bookingId?.roomNo,
               contact: r.bookingId?.contact,
               email: r.bookingId?.email,
               rollno: r.bookingId?.rollno,
               department: r.bookingId?.department,
               gender: r.bookingId?.gender,
               purpose: r.bookingId?.purpose,
               hostel: r.hostel,
               currentCheckOutDate: r.oldCheckout,
               newCheckOutDate: r.requestedCheckout,
               finalCheckOutDate: r.status === "approved" ? r.requestedCheckout : null,
               days,
               status: r.status.toUpperCase(),
               // amount = proposed (what requester entered), shown in card and pre-filled in approve modal
               amount: proposedAmount,
               // finalAmount = what was actually approved (populated after approval)
               finalAmount: r.approvedAmount || 0,
               paymentType,
               remarks: r.remarks,
               rejectionReason: r.rejectionReason,
               extensionAttachments: extensionAttachmentFiles,
               extensionPaymentAttachments: extensionPaymentAttachmentFiles,
             };
         });
         setRequests(mapped || []);
      } else {
        setError(data.message || "Failed to load requests");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load extension requests");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const canApproveRequest = (request) => {
    if (role === "admin") return true;
    if (role === "adosa" && request.days > 2 && request.days <= 10) return true;
    if (role === "co_warden" && request.days <= 2) return true;
    return false;
  };

  const handleApproveSubmit = async ({ requestId, updatedAmount, updatedCheckOutDate }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/extensions/${requestId}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ approvedCheckout: updatedCheckOutDate, approvedAmount: updatedAmount }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        showToast("✅ Extension approved and applied", "success");
        setApproveModal(null);
        fetchRequests();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async ({ requestId, reason }) => {
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/extensions/${requestId}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
        credentials: "include",
      });
      const data = await res.json();
      if (data.success) {
        showToast("Extension request rejected", "info");
        setRejectModal(null);
        fetchRequests();
      } else {
        throw new Error(data.message);
      }
    } catch (err) {
      showToast(`❌ ${err.message}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter by tab + role visibility
  const filtered = requests.filter((r) => {
    // Status tab filter
    if (r.status !== activeTab) return false;
    // Visibility: caretaker/warden see own hostel only
    if (["caretaker", "warden"].includes(role)) {
      return r.hostel === (currentUser?.assignedHostel || currentUser?.hostel);
    }
    return true;
  });

  const tabCounts = STATUS_TABS.reduce((acc, s) => {
    acc[s] = requests.filter((r) => {
      if (r.status !== s) return false;
      if (["caretaker", "warden"].includes(role)) {
        return r.hostel === (currentUser?.assignedHostel || currentUser?.hostel);
      }
      return true;
    }).length;
    return acc;
  }, {});

  const cfg = STATUS_CONFIG[activeTab];

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* ── Sticky Header ── */}
      <div
        className={`sticky top-0 z-10 px-4 sm:px-6 py-4 border-b shadow-sm ${
          isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        <div className="flex items-center gap-4 max-w-6xl mx-auto">
          {onBack && (
            <button
              onClick={onBack}
              className={`p-2 rounded-lg transition ${
                isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-blue-500" />
              Extension Approvals
            </h1>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Review and manage booking extension requests
            </p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            {/* Role badge */}
            <span
              className={`hidden sm:inline-flex px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                isDark
                  ? "bg-blue-900/40 text-blue-400"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {role}
            </span>
            <button
              onClick={fetchRequests}
              disabled={loading}
              className={`p-2 rounded-lg transition ${
                isDark ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-3 max-w-6xl mx-auto mt-4">
          {STATUS_TABS.map((s) => {
            const c = STATUS_CONFIG[s];
            const isActive = activeTab === s;
            return (
              <button
                key={s}
                onClick={() => setActiveTab(s)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? c.tabActive
                    : isDark
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {s.charAt(0) + s.slice(1).toLowerCase()}
                {tabCounts[s] > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      isActive
                        ? "bg-white/25 text-white"
                        : isDark
                        ? "bg-gray-600 text-gray-300"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {tabCounts[s]}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader className="w-10 h-10 animate-spin text-blue-500 mb-4" />
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
              Loading requests…
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-24">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-red-500 font-medium">{error}</p>
            <button
              onClick={fetchRequests}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <ClipboardList
              className={`w-16 h-16 mb-4 ${isDark ? "text-gray-600" : "text-gray-300"}`}
            />
            <p
              className={`text-lg font-semibold ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              No {activeTab.charAt(0) + activeTab.slice(1).toLowerCase()} Requests
            </p>
            <p
              className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
            >
              {activeTab === "PENDING"
                ? "All extension requests have been reviewed."
                : "No requests match this status."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((req, i) => (
              <RequestCard
                key={req._id}
                request={req}
                isDark={isDark}
                index={i}
                canAct={canApproveRequest(req)}
                onApprove={setApproveModal}
                onReject={setRejectModal}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {approveModal && (
          <ReviewModal
            key="approve-modal"
            request={approveModal}
            isDark={isDark}
            onClose={() => setApproveModal(null)}
            onSubmit={handleApproveSubmit}
            submitting={submitting}
          />
        )}
        {rejectModal && (
          <RejectModal
            key="reject-modal"
            request={rejectModal}
            isDark={isDark}
            onClose={() => setRejectModal(null)}
            onSubmit={handleRejectSubmit}
            submitting={submitting}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
