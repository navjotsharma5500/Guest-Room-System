// src/components/VenueBookings/VenueDirectBookings.jsx
// Real-time Venue Availability Checking with Daily Slot Model
// ============================================================================

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Calendar, Clock, Loader } from "lucide-react";
import { isDailySlotOverlapping, timeToMinutes } from "../../utils/dateUtils";

export default function VenueDirectBookings({
  hall,
  room,
  theme = "light",
  onProceed,
  onCancel,
  existingBookings = [],
}) {
  // Form state
  const [formData, setFormData] = useState({
    startDate: "",
    endDate: "",
    startTime: "",
    endTime: "",
  });

  // Availability state
  const [availability, setAvailability] = useState({
    isLoading: false,
    hasOverlap: false,
    overlapMessage: "",
    isValid: false,
  });

  // Check availability whenever dates/times change
  useEffect(() => {
    checkAvailability();
  }, [formData.startDate, formData.endDate, formData.startTime, formData.endTime]);

  const checkAvailability = async () => {
    const { startDate, endDate, startTime, endTime } = formData;

    // If any field is empty, reset availability
    if (!startDate || !endDate || !startTime || !endTime) {
      setAvailability({
        isLoading: false,
        hasOverlap: false,
        overlapMessage: "",
        isValid: false,
      });
      return;
    }

    // VALIDATION 1: Check if end date/time is after start date/time
    const startDateTime = new Date(`${startDate}T${startTime}`);
    const endDateTime = new Date(`${endDate}T${endTime}`);

    if (endDateTime <= startDateTime) {
      setAvailability({
        isLoading: false,
        hasOverlap: true,
        overlapMessage: "❌ End time must be after start time",
        isValid: false,
      });
      return;
    }

    // VALIDATION 2: If same day, check time order
    if (startDate === endDate) {
      const startTimeMin = timeToMinutes(startTime);
      const endTimeMin = timeToMinutes(endTime);
      if (endTimeMin <= startTimeMin) {
        setAvailability({
          isLoading: false,
          hasOverlap: true,
          overlapMessage: "❌ End time must be after start time",
          isValid: false,
        });
        return;
      }
    }

    setAvailability((prev) => ({ ...prev, isLoading: true }));

    try {
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Check for overlaps with existing bookings
      let hasOverlap = false;
      let conflictingBooking = null;

      for (const booking of existingBookings) {
        if (
          booking.status === "booked" ||
          booking.status === "checked_in" ||
          booking.status === "approved"
        ) {
          const overlap = isDailySlotOverlapping(
            startDate,
            endDate,
            startTime,
            endTime,
            booking.checkInDate,
            booking.checkOutDate,
            booking.checkInTime,
            booking.checkOutTime
          );

          if (overlap) {
            hasOverlap = true;
            conflictingBooking = booking;
            break;
          }
        }
      }

      if (hasOverlap && conflictingBooking) {
        const conflictStart = new Date(conflictingBooking.checkInDate);
        const conflictEnd = new Date(conflictingBooking.checkOutDate);
        const dateFormat = { month: "short", day: "numeric" };

        setAvailability({
          isLoading: false,
          hasOverlap: true,
          overlapMessage: `❌ Time overlap detected: This venue is already booked from ${conflictStart.toLocaleDateString(
            "en-IN",
            dateFormat
          )} to ${conflictEnd.toLocaleDateString("en-IN", dateFormat)} during ${
            conflictingBooking.checkInTime
          }–${conflictingBooking.checkOutTime}.`,
          isValid: false,
        });
      } else {
        setAvailability({
          isLoading: false,
          hasOverlap: false,
          overlapMessage: "",
          isValid: true,
        });
      }
    } catch (error) {
      console.error("Error checking availability:", error);
      setAvailability({
        isLoading: false,
        hasOverlap: false,
        overlapMessage: `Error checking availability: ${error.message}`,
        isValid: false,
      });
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProceed = () => {
    if (availability.isValid && onProceed) {
      onProceed(formData);
    }
  };

  const isFormComplete =
    formData.startDate &&
    formData.endDate &&
    formData.startTime &&
    formData.endTime;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="w-full"
    >
      <div
        className={`
          p-6 rounded-xl border-2
          ${theme === "dark" ? "bg-[#292a2d] border-[#3c4043]" : "bg-white border-[#dadce0]"}
        `}
      >
        {/* Header */}
        <div className="mb-6">
          <h3
            className={`text-lg font-semibold flex items-center gap-2 ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}
          >
            <Calendar className="w-5 h-5 text-blue-600" />
            Booking Details
          </h3>
          <p
            className={`text-sm mt-1 ${
              theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
            }`}
          >
            {hall} - Room {room?.roomNo || room?.name}
          </p>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Start Date */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              Start Date *
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => handleInputChange("startDate", e.target.value)}
              className={`
                w-full px-3 py-2 rounded border text-sm
                transition-all duration-200 outline-none
                ${
                  theme === "dark"
                    ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                    : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8]"
                }
              `}
            />
          </div>

          {/* End Date */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}
            >
              <Calendar className="w-4 h-4 inline mr-1" />
              End Date *
            </label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => handleInputChange("endDate", e.target.value)}
              min={formData.startDate}
              className={`
                w-full px-3 py-2 rounded border text-sm
                transition-all duration-200 outline-none
                ${
                  theme === "dark"
                    ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                    : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8]"
                }
              `}
            />
          </div>

          {/* Start Time */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}
            >
              <Clock className="w-4 h-4 inline mr-1" />
              Start Time *
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) => handleInputChange("startTime", e.target.value)}
              className={`
                w-full px-3 py-2 rounded border text-sm
                transition-all duration-200 outline-none
                ${
                  theme === "dark"
                    ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                    : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8]"
                }
              `}
            />
          </div>

          {/* End Time */}
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}
            >
              <Clock className="w-4 h-4 inline mr-1" />
              End Time *
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) => handleInputChange("endTime", e.target.value)}
              className={`
                w-full px-3 py-2 rounded border text-sm
                transition-all duration-200 outline-none
                ${
                  theme === "dark"
                    ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                    : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8]"
                }
              `}
            />
          </div>
        </div>

        {/* Daily Slot Info Text */}
        <div
          className={`text-xs mb-6 px-3 py-2 rounded ${
            theme === "dark"
              ? "bg-blue-900/20 text-blue-300"
              : "bg-blue-50 text-blue-700"
          }`}
        >
          <p>
            💡 This time slot will be applied daily for the selected date range.
          </p>
        </div>

        {/* Availability Status */}
        <AnimatePresence>
          {isFormComplete && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6"
            >
              {availability.isLoading ? (
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                    theme === "dark"
                      ? "bg-blue-900/20 border-blue-700 text-blue-400"
                      : "bg-blue-50 border-blue-200 text-blue-700"
                  }`}
                >
                  <Loader className="w-4 h-4 animate-spin flex-shrink-0" />
                  <span className="text-sm font-medium">Checking availability...</span>
                </div>
              ) : availability.hasOverlap ? (
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 ${
                    theme === "dark"
                      ? "bg-red-900/20 border-red-700"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <AlertCircle
                    className={`w-5 h-5 flex-shrink-0 ${
                      theme === "dark" ? "text-red-400" : "text-red-600"
                    }`}
                  />
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        theme === "dark" ? "text-red-300" : "text-red-700"
                      }`}
                    >
                      Conflict Detected
                    </p>
                    <p
                      className={`text-xs mt-1 ${
                        theme === "dark" ? "text-red-200" : "text-red-600"
                      }`}
                    >
                      {availability.overlapMessage}
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 ${
                    theme === "dark"
                      ? "bg-green-900/20 border-green-700"
                      : "bg-green-50 border-green-200"
                  }`}
                >
                  <CheckCircle2
                    className={`w-5 h-5 flex-shrink-0 ${
                      theme === "dark" ? "text-green-400" : "text-green-600"
                    }`}
                  />
                  <span
                    className={`text-sm font-medium ${
                      theme === "dark" ? "text-green-300" : "text-green-700"
                    }`}
                  >
                    ✓ Venue is available for this time slot
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className={`
              px-6 py-2.5 rounded-lg font-medium text-sm transition-all
              ${
                theme === "dark"
                  ? "bg-transparent border border-[#5f6368] text-[#e8eaed] hover:bg-[#3c4043]"
                  : "bg-transparent border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]"
              }
            `}
          >
            Cancel
          </button>
          <button
            onClick={handleProceed}
            disabled={!availability.isValid}
            className={`
              px-6 py-2.5 rounded-lg font-medium text-sm transition-all
              ${
                availability.isValid
                  ? theme === "dark"
                    ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                    : "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                  : theme === "dark"
                  ? "bg-[#5f6368] text-[#9aa0a6] cursor-not-allowed"
                  : "bg-[#dadce0] text-[#9aa0a6] cursor-not-allowed"
              }
            `}
          >
            Proceed to Booking
          </button>
        </div>
      </div>
    </motion.div>
  );
}
