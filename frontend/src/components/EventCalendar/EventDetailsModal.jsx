// src/components/EventCalendar/EventDetailsModal.jsx
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar as CalendarIcon, Clock, MapPin, Users, Image as ImageIcon, ExternalLink } from "lucide-react";

export default function EventDetailsModal({ theme, event, onClose }) {
  const [selectedImage, setSelectedImage] = useState(null);

  const formattedDate = new Date(event.eventDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
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
          className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl ${
            theme === "dark"
              ? "bg-gray-800 border border-gray-700"
              : "bg-white border border-gray-200"
          }`}
        >
          {/* Header */}
          <div className={`sticky top-0 z-10 flex items-center justify-between p-6 border-b ${
            theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  Event Details
                </h3>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold inline-block mt-1 ${
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

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Event Name */}
            <div>
              <h2 className={`text-3xl font-bold mb-2 ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}>
                {event.eventName}
              </h2>
              <p className={`text-lg ${
                theme === "dark" ? "text-blue-400" : "text-blue-600"
              }`}>
                by {event.societyName}
              </p>
            </div>

            {/* Event Info Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-xl ${
              theme === "dark" ? "bg-gray-700/30" : "bg-gray-50"
            }`}>
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-blue-600/20" : "bg-blue-100"
                }`}>
                  <CalendarIcon className={`w-5 h-5 ${
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  }`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Date
                  </p>
                  <p className={`text-base font-bold ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    {formattedDate}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-blue-600/20" : "bg-blue-100"
                }`}>
                  <Clock className={`w-5 h-5 ${
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  }`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Time
                  </p>
                  <p className={`text-base font-bold ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    {event.eventTime}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-blue-600/20" : "bg-blue-100"
                }`}>
                  <MapPin className={`w-5 h-5 ${
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  }`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Venue
                  </p>
                  <p className={`text-base font-bold ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    {event.eventHall.hall}
                  </p>
                  <p className={`text-sm ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Room: {event.eventHall.roomNo}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  theme === "dark" ? "bg-blue-600/20" : "bg-blue-100"
                }`}>
                  <Users className={`w-5 h-5 ${
                    theme === "dark" ? "text-blue-400" : "text-blue-600"
                  }`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    theme === "dark" ? "text-gray-400" : "text-gray-600"
                  }`}>
                    Organized By
                  </p>
                  <p className={`text-base font-bold ${
                    theme === "dark" ? "text-white" : "text-gray-900"
                  }`}>
                    {event.societyName}
                  </p>
                </div>
              </div>
            </div>

            {/* Event Attachments */}
            {event.attachments && event.attachments.length > 0 && (
              <div>
                <h4 className={`text-lg font-bold mb-3 flex items-center gap-2 ${
                  theme === "dark" ? "text-white" : "text-gray-900"
                }`}>
                  <ImageIcon className="w-5 h-5" />
                  Event Gallery ({event.attachments.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {event.attachments.map((url, index) => (
                    <motion.div
                      key={index}
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setSelectedImage(url)}
                      className="relative aspect-square rounded-xl overflow-hidden cursor-pointer shadow-lg group"
                    >
                      <img
                        src={url}
                        alt={`Event attachment ${index + 1}`}
                        className="w-full h-full object-cover transition group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center">
                        <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Creator Info */}
            {event.createdBy && (
              <div className={`p-4 rounded-xl border ${
                theme === "dark"
                  ? "bg-gray-700/30 border-gray-600"
                  : "bg-gray-50 border-gray-200"
              }`}>
                <p className={`text-sm ${
                  theme === "dark" ? "text-gray-400" : "text-gray-600"
                }`}>
                  Created by <strong className={theme === "dark" ? "text-white" : "text-gray-900"}>
                    {event.createdBy.name}
                  </strong> on {new Date(event.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Image Lightbox */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              className="relative max-w-6xl w-full"
            >
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition z-10"
              >
                <X size={24} />
              </button>
              <img
                src={selectedImage}
                alt="Full size"
                className="w-full h-auto max-h-[90vh] object-contain rounded-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}