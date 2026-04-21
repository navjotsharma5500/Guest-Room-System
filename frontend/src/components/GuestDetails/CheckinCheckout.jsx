//CheckinCheckout.jsx
import React from "react";
import { motion } from "framer-motion";
import { X, LogOut, AlertTriangle } from "lucide-react";

export default function CheckinCheckout({
  booking,
  theme,
  showCheckOutModal,
  setShowCheckOutModal,
  checkOutComment,
  setCheckOutComment,
  onCheckOut,
  onReport
}) {
  return (
    <>
      <div className={`p-6 border-b ${theme === "dark" ? "border-gray-700" : "border-gray-200"}`}>
        <h3 className={`font-semibold mb-3 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Check-in / Check-out Actions
        </h3>
        
        {/* Only show buttons if booking is NOT already checked out, cancelled, no-show, OR under review */}
        {booking.status !== "checked_out" &&
         booking.status !== "cancelled" &&
         booking.status !== "no_show" &&
         booking.approvalStatus !== "under_review" && (  {/* ✅ NEW: Block when under review */}
          <div className="flex gap-4">
            <button 
              onClick={() => setShowCheckOutModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-md"
            >
              <LogOut size={18} />
              Check Out Guest
            </button>
            <button 
              onClick={onReport}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition shadow-md"
            >
              <AlertTriangle size={18} />
              Report Guest
            </button>
          </div>
        )}
      </div>

      {/* Check Out Modal */}
      {showCheckOutModal && (
        <motion.div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div 
            className="bg-white p-6 rounded-xl max-w-md w-full shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">Check Out Guest</h3>
              <button 
                onClick={() => setShowCheckOutModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X size={24} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Guest: <strong>{booking.guest || "Ã¢â‚¬â€"}</strong><br />
              Room: <strong>{booking.hostel} - {booking.roomNo}</strong>
            </p>

            <textarea
              value={checkOutComment}
              onChange={(e) => setCheckOutComment(e.target.value)}
              placeholder="Add checkout remarks (optional)"
              className="w-full p-3 border-2 border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />

            <div className="flex gap-3">
              <button 
                onClick={onCheckOut} 
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                Confirm Check Out
              </button>
              <button 
                onClick={() => setShowCheckOutModal(false)} 
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition font-semibold"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}