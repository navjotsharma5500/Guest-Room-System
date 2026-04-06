// INTEGRATION EXAMPLE
// How to use VenueDirectBookings in your booking flow

import React, { useState, useEffect } from "react";
import VenueDirectBookings from "../components/VenueBookings/VenueDirectBookings";

export default function VenueBookingFlowExample() {
  const [step, setStep] = useState(1); // 1: booking details, 2: confirmation
  const [selectedHall, setSelectedHall] = useState("Auditoriums");
  const [selectedRoom, setSelectedRoom] = useState({ roomNo: "Main Auditorium" });
  const [bookingData, setBookingData] = useState(null);
  const [existingBookings, setExistingBookings] = useState([]);
  const [theme, setTheme] = useState("light");

  // Fetch existing bookings from API
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch("/api/venue-bookings");
        const data = await response.json();
        
        // Filter bookings for selected venue
        const venueBookings = data.filter(
          (b) =>
            b.hall === selectedHall &&
            b.roomNo === selectedRoom.roomNo &&
            ["booked", "checked_in", "approved"].includes(b.status)
        );
        
        setExistingBookings(venueBookings);
      } catch (error) {
        console.error("Failed to fetch bookings:", error);
      }
    };

    if (selectedHall && selectedRoom?.roomNo) {
      fetchBookings();
    }
  }, [selectedHall, selectedRoom]);

  const handleProceedWithBooking = (formData) => {
    // formData contains: { startDate, endDate, startTime, endTime }
    console.log("Proceeding with booking:", formData);
    
    setBookingData(formData);
    setStep(2); // Move to confirmation step
  };

  const handleCancelBooking = () => {
    console.log("User cancelled booking");
    setStep(1);
    setSelectedRoom(null);
  };

  return (
    <div className={`p-8 ${theme === "dark" ? "bg-[#202124]" : "bg-white"}`}>
      <h1 className={`text-2xl font-bold mb-8 ${
        theme === "dark" ? "text-white" : "text-black"
      }`}>
        Venue Direct Booking
      </h1>

      {/* Step 1: Select Dates & Times */}
      {step === 1 && (
        <VenueDirectBookings
          hall={selectedHall}
          room={selectedRoom}
          theme={theme}
          existingBookings={existingBookings}
          onProceed={handleProceedWithBooking}
          onCancel={handleCancelBooking}
        />
      )}

      {/* Step 2: Confirmation */}
      {step === 2 && bookingData && (
        <div className={`p-6 rounded-lg border-2 ${
          theme === "dark"
            ? "bg-[#292a2d] border-[#3c4043]"
            : "bg-[#f5f5f5] border-[#dadce0]"
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${
            theme === "dark" ? "text-white" : "text-black"
          }`}>
            Booking Summary
          </h2>
          
          <div className="space-y-3">
            <p className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
              <strong>Venue:</strong> {selectedHall} - {selectedRoom.roomNo}
            </p>
            <p className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
              <strong>Dates:</strong> {bookingData.startDate} to {bookingData.endDate}
            </p>
            <p className={theme === "dark" ? "text-gray-300" : "text-gray-700"}>
              <strong>Daily Time:</strong> {bookingData.startTime} - {bookingData.endTime}
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setStep(1)}
              className={`px-6 py-2 rounded font-medium ${
                theme === "dark"
                  ? "bg-[#3c4043] text-white hover:bg-[#4a4d50]"
                  : "bg-gray-300 text-black hover:bg-gray-400"
              }`}
            >
              Back
            </button>
            <button
              onClick={() => {
                console.log("Creating booking with data:", bookingData);
                // Call your API to create the booking
              }}
              className={`px-6 py-2 rounded font-medium text-white ${
                theme === "dark"
                  ? "bg-[#8ab4f8] hover:bg-[#aecbfa]"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              Confirm Booking
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// EXAMPLE: Using with real API data
// ============================================================================

export function AdvancedBookingFlowExample() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch bookings from your venue endpoint
    const loadBookings = async () => {
      try {
        const response = await fetch("/api/venue-bookings");
        const data = await response.json();
        setBookings(data);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, []);

  if (loading) {
    return <div>Loading availability...</div>;
  }

  // Get bookings for specific venue
  const getVenueBookings = (hallName, roomNo) => {
    return bookings.filter(
      (b) =>
        b.hall === hallName &&
        b.roomNo === roomNo &&
        ["booked", "checked_in", "approved"].includes(b.status)
    );
  };

  return (
    <VenueDirectBookings
      hall="Auditoriums"
      room={{ roomNo: "Main Auditorium" }}
      theme="dark"
      existingBookings={getVenueBookings("Auditoriums", "Main Auditorium")}
      onProceed={(formData) => {
        console.log("Booking details:", formData);
        // Proceed to next step
      }}
      onCancel={() => console.log("Booking cancelled")}
    />
  );
}

// ============================================================================
// HELPER: Check if a specific time slot is available
// ============================================================================

export function isTimeSlotAvailable(
  startDate,
  endDate,
  startTime,
  endTime,
  existingBookings
) {
  const { isDailySlotOverlapping } = require("../utils/dateUtils");

  for (const booking of existingBookings) {
    if (["booked", "checked_in", "approved"].includes(booking.status)) {
      if (
        isDailySlotOverlapping(
          startDate,
          endDate,
          startTime,
          endTime,
          booking.checkInDate,
          booking.checkOutDate,
          booking.checkInTime,
          booking.checkOutTime
        )
      ) {
        return {
          available: false,
          conflict: booking,
        };
      }
    }
  }

  return {
    available: true,
    conflict: null,
  };
}

// USAGE:
// const result = isTimeSlotAvailable(
//   "2026-04-10",
//   "2026-04-12",
//   "10:00",
//   "16:00",
//   existingBookings
// );
// 
// if (result.available) {
//   console.log("Slot is available!");
// } else {
//   console.log("Conflict with booking:", result.conflict);
// }
