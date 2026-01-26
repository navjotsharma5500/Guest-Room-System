// GuestActions.jsx - FIXED VERSION (Download Bill button removed)
import React from "react";
import { MoreVertical, Edit, History, Receipt, Download, CreditCard, Calendar, XCircle, MessageCircle, Mail } from "lucide-react";
import { useToast } from "../../context/ToastContext";
import { motion, AnimatePresence } from "framer-motion";

export default function GuestActions({
  showActionsDropdown,
  setShowActionsDropdown,
  theme,
  booking,
  onEditDetails,
  onGuestHistory,
  onBillHistory,
  onDownloadPDF,
  // onDownloadBill, // ❌ REMOVED - Not needed anymore
  onPayAmount,
  onExtendBooking,
  onCancelBooking,
}) {
  const { showToast } = useToast();
  // Check if booking exists and isn't cancelled/checked out
  const canExtend = booking && booking.status !== "cancelled" && booking.status !== "checked_out";
  const canCancel = booking && booking.status !== "cancelled" && booking.status !== "checked_out";

  // ✅ WhatsApp and Email handlers
  const handleWhatsAppChat = () => {
    if (booking?.contact) {
      const phoneNumber = booking.contact.replace(/\D/g, "");
      const message = encodeURIComponent(
        `Hello ${booking.guest || "Guest"}, I'm contacting you regarding your booking at ${booking.hostel || ""} - Room ${booking.roomNo || ""}.`
      );
      window.open(`https://wa.me/${phoneNumber}?text=${message}`, "_blank");
      setShowActionsDropdown(false);
    } else {
      showToast("No contact number available", "error");
    }
  };

  const handleSendEmail = () => {
    if (booking?.email) {
      const subject = encodeURIComponent(`Booking Update - ${booking.hostel || ""} Room ${booking.roomNo || ""}`);
      const body = encodeURIComponent(
        `Dear ${booking.guest || "Guest"},\n\nThis is regarding your booking:\n\nHostel: ${booking.hostel || ""}\nRoom: ${booking.roomNo || ""}\nCheck-in: ${booking.from || ""}\nCheck-out: ${booking.to || ""}\n\nBest regards`
      );
      window.location.href = `mailto:${booking.email}?subject=${subject}&body=${body}`;
      setShowActionsDropdown(false);
    } else {
      showToast("No email address available", "error");
    }
  };

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowActionsDropdown(!showActionsDropdown)}
        className={`p-2 rounded-lg transition-colors ${
          theme === "dark"
            ? "hover:bg-gray-700 text-gray-300"
            : "hover:bg-gray-100 text-gray-600"
        }`}
        aria-label="More actions"
      >
        <MoreVertical className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {showActionsDropdown && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setShowActionsDropdown(false)}
            />

            {/* Dropdown Menu */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className={`absolute right-0 mt-2 w-56 rounded-xl shadow-xl border z-50 overflow-hidden ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700"
                  : "bg-white border-gray-200"
              }`}
            >
              <div className="py-1">
                {/* ✅ WhatsApp Chat */}
                {booking?.contact && (
                  <ActionButton
                    icon={<MessageCircle className="w-4 h-4" />}
                    label="WhatsApp Chat"
                    onClick={handleWhatsAppChat}
                    theme={theme}
                    whatsapp
                  />
                )}

                {/* ✅ Send Email */}
                {booking?.email && (
                  <ActionButton
                    icon={<Mail className="w-4 h-4" />}
                    label="Send Email"
                    onClick={handleSendEmail}
                    theme={theme}
                    email
                  />
                )}

                {/* Separator if contact methods exist */}
                {(booking?.contact || booking?.email) && (
                  <div className={`my-1 border-t ${
                    theme === "dark" ? "border-gray-700" : "border-gray-200"
                  }`} />
                )}

                {/* Edit Details */}
                <ActionButton
                  icon={<Edit className="w-4 h-4" />}
                  label="Edit Details"
                  onClick={onEditDetails}
                  theme={theme}
                />

                {/* Guest History */}
                <ActionButton
                  icon={<History className="w-4 h-4" />}
                  label="Guest History"
                  onClick={onGuestHistory}
                  theme={theme}
                />

                {/* Bill History */}
                <ActionButton
                  icon={<Receipt className="w-4 h-4" />}
                  label="Bill History"
                  onClick={onBillHistory}
                  theme={theme}
                />

                {/* Download PDF (Guest Profile) */}
                <ActionButton
                  icon={<Download className="w-4 h-4" />}
                  label="Download PDF"
                  onClick={onDownloadPDF}
                  theme={theme}
                />

                {/* ❌ REMOVED: Download Bill button - bills are downloaded from Bill History modal */}

                {/* Pay Amount */}
                <ActionButton
                  icon={<CreditCard className="w-4 h-4" />}
                  label="Pay Amount"
                  onClick={onPayAmount}
                  theme={theme}
                />

                {/* Extend Booking */}
                {canExtend && (
                  <ActionButton
                    icon={<Calendar className="w-4 h-4" />}
                    label="Extend Booking"
                    onClick={onExtendBooking}
                    theme={theme}
                    highlight
                  />
                )}

                {/* Cancel Booking */}
                {canCancel && (
                  <>
                    <div className={`my-1 border-t ${
                      theme === "dark" ? "border-gray-700" : "border-gray-200"
                    }`} />
                    <ActionButton
                      icon={<XCircle className="w-4 h-4" />}
                      label="Cancel Booking"
                      onClick={onCancelBooking}
                      theme={theme}
                      danger
                    />
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({ icon, label, onClick, theme, highlight, danger, whatsapp, email }) {
  return (
    <button
      onClick={() => {
        onClick();
      }}
      className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors ${
        danger
          ? theme === "dark"
            ? "text-red-400 hover:bg-red-900/30"
            : "text-red-600 hover:bg-red-50"
          : whatsapp
          ? theme === "dark"
            ? "text-green-400 hover:bg-green-900/30"
            : "text-green-600 hover:bg-green-50"
          : email
          ? theme === "dark"
            ? "text-blue-400 hover:bg-blue-900/30"
            : "text-blue-600 hover:bg-blue-50"
          : highlight
          ? theme === "dark"
            ? "text-blue-400 hover:bg-blue-900/30"
            : "text-blue-600 hover:bg-blue-50"
          : theme === "dark"
          ? "text-gray-300 hover:bg-gray-700"
          : "text-gray-700 hover:bg-gray-50"
      }`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}