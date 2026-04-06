// src/components/HallBookings/HallFilterModal.jsx - Google Material Design
import React from "react";
import { motion } from "framer-motion";
import { X, Calendar, Search } from "lucide-react";
import { useEscapeKey } from "../../hooks/useEscapeKey";

export default function FilterModal({
  theme,
  checkIn,
  checkOut,
  setCheckIn,
  setCheckOut,
  dailyStart,
  setDailyStart,
  dailyEnd,
  setDailyEnd,
  onClose,
  onSubmit,
}) {
  useEscapeKey(onClose);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!checkIn || !checkOut) {
      return;
    }
    // If only one time field is filled, show error
    if ((dailyStart && !dailyEnd) || (!dailyStart && dailyEnd)) {
      return;
    }
    onSubmit();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`
          w-full max-w-md rounded-lg p-6 shadow-2xl
          ${theme === "dark" ? "bg-[#292a2d]" : "bg-white"}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              theme === "dark" ? "bg-[#3c4043]" : "bg-[#e8f0fe]"
            }`}>
              <Search className={`w-5 h-5 ${
                theme === "dark" ? "text-[#8ab4f8]" : "text-[#1a73e8]"
              }`} />
            </div>
            <div>
              <h2 className={`text-xl font-normal ${
                theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
              }`}>
                Check Vacancy
              </h2>
              <p className={`text-sm ${
                theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
              }`}>
                Find available hall rooms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`
              p-2 rounded-full transition-colors
              ${theme === "dark" 
                ? "hover:bg-[#3c4043] text-[#9aa0a6]" 
                : "hover:bg-[#f1f3f4] text-[#5f6368]"
              }
            `}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}>
              <Calendar className="w-4 h-4 inline mr-2" />
              Check-in Date
            </label>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className={`
                w-full px-4 py-3 rounded border text-sm
                transition-all duration-200 outline-none
                ${theme === "dark"
                  ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                  : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                }
              `}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-2 ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}>
              <Calendar className="w-4 h-4 inline mr-2" />
              Check-out Date
            </label>
            <input
              type="date"
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              min={checkIn}
              className={`
                w-full px-4 py-3 rounded border text-sm
                transition-all duration-200 outline-none
                ${theme === "dark"
                  ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed] focus:border-[#8ab4f8]"
                  : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]"
                }
              `}
              required
            />
          </div>

          {/* Daily Time Slot Section */}
          <div className={`p-3 rounded-lg border ${
            theme === "dark" ? "bg-[#3c4043] border-[#5f6368]" : "bg-[#f5f5f5] border-[#e0e0e0]"
          }`}>
            <p className={`text-xs font-medium mb-3 ${
              theme === "dark" ? "text-[#8ab4f8]" : "text-[#1a73e8]"
            }`}>
              ⏰ OPTIONAL DAILY TIME SLOT
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  Start Time (HH:MM)
                </label>
                <input
                  type="time"
                  value={dailyStart}
                  onChange={(e) => setDailyStart(e.target.value)}
                  placeholder="10:00"
                  className={`
                    w-full px-3 py-2 rounded border text-xs
                    transition-all duration-200 outline-none
                    ${theme === "dark"
                      ? "bg-[#292a2d] border-[#3c4043] text-[#e8eaed] focus:border-[#8ab4f8]"
                      : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8]"
                    }
                  `}
                />
              </div>
              <div>
                <label className={`block text-xs font-medium mb-1.5 ${
                  theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
                }`}>
                  End Time (HH:MM)
                </label>
                <input
                  type="time"
                  value={dailyEnd}
                  onChange={(e) => setDailyEnd(e.target.value)}
                  placeholder="16:00"
                  className={`
                    w-full px-3 py-2 rounded border text-xs
                    transition-all duration-200 outline-none
                    ${theme === "dark"
                      ? "bg-[#292a2d] border-[#3c4043] text-[#e8eaed] focus:border-[#8ab4f8]"
                      : "bg-white border-[#dadce0] text-[#202124] focus:border-[#1a73e8]"
                    }
                  `}
                />
              </div>
            </div>
            <p className={`text-xs mt-2 ${
              theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
            }`}>
              Leave blank to search all day
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`
                flex-1 py-2.5 rounded text-sm font-medium transition-colors
                ${theme === "dark"
                  ? "bg-transparent border border-[#5f6368] text-[#e8eaed] hover:bg-[#3c4043]"
                  : "bg-transparent border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4]"
                }
              `}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`
                flex-1 py-2.5 rounded text-sm font-medium transition-colors
                ${theme === "dark"
                  ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                  : "bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                }
              `}
            >
              Search Vacancy
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}