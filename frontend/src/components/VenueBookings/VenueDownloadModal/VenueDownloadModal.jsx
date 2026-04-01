import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Calendar, Download } from "lucide-react";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { isDDAssistantRole, isDDOfficeRoom } from "../../../utils/venueAccessPolicy";

export default function VenueDownloadModal({ theme, venueData, onClose, currentUser }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleDownload = () => {
    if (!startDate || !endDate) return;

    // Filter bookings based on date range
    const bookings = [];
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));
    const isDDAssistant = isDDAssistantRole(currentUser?.role);

    console.log("Starting CSV Download:", { start, end, isDDAssistant });

    Object.keys(venueData).forEach((hallName) => {
      const hall = venueData[hallName];
      if (hall.rooms) {
        hall.rooms.forEach((room) => {
          // Role-specific room filter
          if (isDDAssistant && !isDDOfficeRoom(room.roomNo)) {
            return; // Skip rooms not allowed for DD Assistant
          }

          if (room.bookings) {
            room.bookings.forEach((booking) => {
              // Only exclude pending bookings if desired, otherwise include all history
              // If you want "booked", "cancelled", "rejected", "completed", etc.
              // Just filter out "pending" if you don't want unprocessed ones.
              // Or remove the status check entirely to get EVERYTHING.
              
              const bookingStart = parseISO(booking.checkInDate);
              const bookingEnd = parseISO(booking.checkOutDate);

              // Check if booking overlaps with selected range
              if (
                isWithinInterval(bookingStart, { start, end }) ||
                isWithinInterval(bookingEnd, { start, end }) ||
                (bookingStart < start && bookingEnd > end)
              ) {
                bookings.push({
                  ...booking,
                  hall: hallName,
                  roomNo: room.roomNo,
                });
              }
            });
          }
        });
      }
    });

    console.log("Bookings found for CSV:", bookings.length);

    if (bookings.length === 0) {
      alert("No bookings found for the selected date range.");
      // We still download the empty file with headers as per logic, 
      // but alerting the user is helpful.
    }

    // Convert to CSV
    const headers = [
      "Name",
      "Email",
      "Contact Number",
      "Department",
      "Venue",
      "Room",
      "Society / Club Name",
      "Society Email",
      "President Email",
      "Event Name",
      "Event Description",
      "Purpose",
      "Start Date",
      "Start Time",
      "End Date",
      "End Time",
      "Status",
    ];

    const csvContent = [
      headers.join(","),
      ...bookings.map((b) =>
        [
          `"${b.name || ""}"`,
          `"${b.email || ""}"`,
          `"${b.contact || ""}"`,
          `"${b.department || ""}"`,
          `"${b.hall || ""}"`,
          `"${b.roomNo || ""}"`,
          `"${b.societyName || ""}"`,
          `"${b.societyEmail || ""}"`,
          `"${b.presidentEmail || ""}"`,
          `"${b.eventName || ""}"`,
          `"${(b.description || "").replace(/"/g, '""')}"`,
          `"${(b.purpose || "").replace(/"/g, '""')}"`,
          b.checkInDate,
          b.checkInTime,
          b.checkOutDate,
          b.checkOutTime,
          b.status,
        ].join(",")
      ),
    ].join("\n");

    // Download file
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `venue_bookings_${format(start, "yyyy-MM-dd")}_to_${format(
        end,
        "yyyy-MM-dd"
      )}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-md rounded-2xl shadow-xl overflow-hidden ${
          theme === "dark" ? "bg-[#292a2d]" : "bg-white"
        }`}
      >
        <div
          className={`px-6 py-4 border-b flex justify-between items-center ${
            theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"
          }`}
        >
          <h3
            className={`text-lg font-medium ${
              theme === "dark" ? "text-[#e8eaed]" : "text-[#202124]"
            }`}
          >
            Download Bookings
          </h3>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${
              theme === "dark"
                ? "hover:bg-[#3c4043] text-[#9aa0a6]"
                : "hover:bg-[#f1f3f4] text-[#5f6368]"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label
              className={`block text-sm font-medium mb-1 ${
                theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
              }`}
            >
              Start Date
            </label>
            <div
              className={`flex items-center px-3 py-2 rounded-lg border ${
                theme === "dark"
                  ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]"
                  : "bg-white border-[#dadce0] text-[#202124]"
              }`}
            >
              <Calendar size={18} className="mr-2 opacity-50" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none outline-none w-full"
              />
            </div>
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-1 ${
                theme === "dark" ? "text-[#9aa0a6]" : "text-[#5f6368]"
              }`}
            >
              End Date
            </label>
            <div
              className={`flex items-center px-3 py-2 rounded-lg border ${
                theme === "dark"
                  ? "bg-[#3c4043] border-[#5f6368] text-[#e8eaed]"
                  : "bg-white border-[#dadce0] text-[#202124]"
              }`}
            >
              <Calendar size={18} className="mr-2 opacity-50" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none outline-none w-full"
              />
            </div>
          </div>
        </div>

        <div
          className={`px-6 py-4 border-t flex justify-end gap-3 ${
            theme === "dark" ? "border-[#3c4043]" : "border-[#dadce0]"
          }`}
        >
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === "dark"
                ? "text-[#e8eaed] hover:bg-[#3c4043]"
                : "text-[#5f6368] hover:bg-[#f1f3f4]"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleDownload}
            disabled={!startDate || !endDate}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              !startDate || !endDate
                ? "opacity-50 cursor-not-allowed bg-gray-400 text-white"
                : theme === "dark"
                ? "bg-[#8ab4f8] text-[#202124] hover:bg-[#aecbfa]"
                : "bg-[#1a73e8] text-white hover:bg-[#1967d2]"
            }`}
          >
            <Download size={16} />
            Download CSV
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}