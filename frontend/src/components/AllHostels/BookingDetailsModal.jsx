// src/components/AllHostels/BookingDetailsModal.jsx
import React from "react";
import { motion } from "framer-motion";
import { X, Plus } from "lucide-react";
import GuestDetails from "../GuestDetails";

export default function BookingDetailsModal({
  theme,
  modal,
  onClose,
  onExtend,
  onCancel,
  onAddNewBooking,
}) {
  return (
    <motion.div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className={`rounded-2xl shadow-2xl p-4 sm:p-6 w-full max-w-[95%] sm:max-w-[780px] mx-4 max-h-[85vh] overflow-y-auto ${
          theme === "dark" ? "bg-gray-800" : "bg-white"
        }`}
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2
            className={`text-xl sm:text-2xl font-bold ${
              theme === "dark" ? "text-red-400" : "text-red-700"
            }`}
          >
            Booking Details
          </h2>

          <div className="flex items-center gap-2">
            {new Date(modal.booking.to) >= new Date() && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title="Extend Booking"
                onClick={() => onExtend(modal.booking)}
                className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:shadow-lg text-xs sm:text-sm font-medium"
              >
                Extend
              </motion.button>
            )}
            <motion.button
              whileHover={{ rotate: 90, scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className={
                theme === "dark"
                  ? "text-gray-400 hover:text-red-400"
                  : "text-gray-500 hover:text-red-700"
              }
              onClick={onClose}
            >
              <X size={24} />
            </motion.button>
          </div>
        </div>

        <GuestDetails
          activeRoomRef={{
            hostel: modal.hostel,
            roomNo: modal.room.roomNo,
            booking: modal.booking,
          }}
          theme={theme}
          onCancel={(payload) => {
            onCancel(payload);
          }}
          hideExtendButton={true}
          onAddNewBooking={onAddNewBooking}
        />

        <div className="flex flex-col sm:flex-row justify-end mt-6 gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className={`px-4 py-2 w-full sm:w-auto rounded-lg font-medium text-sm sm:text-base ${
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600"
                : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            Close
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)" }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center gap-2 px-5 py-2 w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium shadow-lg text-sm sm:text-base"
            onClick={onAddNewBooking}
          >
            <Plus className="w-4 h-4" />
            Add New Booking
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}