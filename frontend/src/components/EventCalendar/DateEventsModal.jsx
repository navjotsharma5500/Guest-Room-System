// src/components/EventCalendar/DateEventsModal.jsx
import React from "react";
import { motion } from "framer-motion";
import { X, Calendar as CalendarIcon, Clock, MapPin, Users } from "lucide-react";

export default function DateEventsModal({ theme, date, onClose, onEventClick }) {
  const formattedDate = new Date(date.date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`max-w-2xl w-full max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl ${
          theme === "dark"
            ? "bg-gray-800 border border-gray-700"
            : "bg-white border border-gray-200"
        }`}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
          theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
        }`}>
          <div>
            <h3 className={`text-xl font-bold ${
              theme === "dark" ? "text-white" : "text-gray-900"
            }`}>
              Events on {formattedDate}
            </h3>
            <p className={`text-sm mt-1 ${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            }`}>
              {date.events.length} event{date.events.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition ${
              theme === "dark"
                ? "hover:bg-gray-700 text-gray-400"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Events List */}
        <div className="p-6 space-y-4">
          {date.events.map((event, index) => (
            <motion.div
              key={event._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              onClick={() => onEventClick(event)}
              className={`p-5 rounded-xl border cursor-pointer transition ${
                theme === "dark"
                  ? "bg-gray-700/30 border-gray-600 hover:bg-gray-700/50"
                  : "bg-gray-50 border-gray-200 hover:bg-gray-100"
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <h4 className={`font-bold text-lg ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  {event.eventName}
                </h4>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  event.status === 'upcoming'
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                    : event.status === 'ongoing'
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : event.status === 'completed'
                    ? "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                }`}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Users className={`w-4 h-4 ${
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  }`} />
                  <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                    {event.societyName}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Clock className={`w-4 h-4 ${
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  }`} />
                  <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                    {event.eventTime}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm col-span-2">
                  <MapPin className={`w-4 h-4 ${
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  }`} />
                  <span className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
                    {event.eventHall.hall} - {event.eventHall.roomNo}
                  </span>
                </div>
              </div>

              {/* Attachments Preview */}
              {event.attachments && event.attachments.length > 0 && (
                <div className="mt-4 flex gap-2">
                  {event.attachments.slice(0, 3).map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt={`Event ${idx + 1}`}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  ))}
                  {event.attachments.length > 3 && (
                    <div className={`w-16 h-16 rounded-lg flex items-center justify-center text-sm font-semibold ${
                      theme === "dark" ? "bg-gray-600 text-white" : "bg-gray-200 text-gray-700"
                    }`}>
                      +{event.attachments.length - 3}
                    </div>
                  )}
                </div>
              )}

              <p className={`text-xs mt-3 ${
                theme === "dark" ? "text-gray-500" : "text-gray-500"
              }`}>
                Click to view full details
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}