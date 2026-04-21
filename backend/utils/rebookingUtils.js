// utils/rebookingUtils.js
import Booking from "../models/Booking.js";

/**
 * Detects if a guest is rebooking within 24 hours of their last checkout
 * 
 * @param {String} email - Guest email
 * @param {String} contact - Guest contact number
 * @param {String} hostel - Hostel name
 * @returns {Promise<Boolean>} true if rebooking within 24hrs, false otherwise
 */
export const isRebookingWithin24hrs = async (email, contact, hostel) => {
  try {
    // Find latest COMPLETED booking where:
    // * hostel matches
    // * status = "checked_out" (ONLY completed stays)
    // * AND (email matches OR contact matches)
    
    console.log("🔍 Checking rebooking conditions:", {
      email,
      contact,
      hostel
    });

    const latestBooking = await Booking.findOne({
      hostel: hostel,
      status: "checked_out",  // ✅ ONLY completed checkouts
      $or: [
        { email: email },
        { contact: contact }
      ]
    })
    .sort({ checkedOutAt: -1 })
    .lean();

    if (!latestBooking) {
      console.log("✅ No previous checked_out booking found - allow new booking");
      return false;
    }

    console.log("📋 Last booking found:", {
      bookingId: latestBooking._id,
      guest: latestBooking.guest,
      hostel: latestBooking.hostel,
      status: latestBooking.status,
      checkedOutAt: latestBooking.checkedOutAt,
      checkOut: latestBooking.checkOut
    });

    // ✅ CRITICAL: Extract checkout time with proper priority
    let checkoutTime = null;

    if (latestBooking.checkedOutAt) {
      // Priority 1: Use actual checkout timestamp
      checkoutTime = new Date(latestBooking.checkedOutAt);
      console.log("✅ Using checkedOutAt field:", checkoutTime.toISOString());
    } else if (latestBooking.checkOut) {
      // Priority 2: Fallback to checkOut field
      checkoutTime = new Date(latestBooking.checkOut);
      console.log("✅ Using checkOut field (fallback):", checkoutTime.toISOString());
    } else {
      // No valid checkout time found
      console.log("⚠️ No valid checkout time found - allow booking");
      return false;
    }

    // Calculate time difference in hours
    const now = new Date();
    const timeDiffMs = now - checkoutTime;
    const diffInHours = timeDiffMs / (1000 * 60 * 60);

    console.log("⏱️ Time calculation:", {
      now: now.toISOString(),
      checkoutTime: checkoutTime.toISOString(),
      diffInHours: diffInHours.toFixed(2),
      within24hrs: diffInHours <= 24
    });

    // ✅ Return true ONLY if within 24 hours
    if (diffInHours <= 24) {
      console.log(`🚨 REBOOKING DETECTED: Guest rebooking within ${diffInHours.toFixed(2)} hours - REQUIRE APPROVAL`);
      return true;
    }

    console.log(`✅ Previous checkout was ${diffInHours.toFixed(2)} hours ago - ALLOW NORMAL BOOKING`);
    return false;

  } catch (error) {
    console.error("❌ Error checking rebooking status:", error);
    return false;
  }
};

/**
 * Sets up the rebooking approval for a booking
 * 
 * @param {Object} booking - The booking document
 * @returns {Object} Updated booking object with approval fields set
 */
export const setupRebookingApproval = (booking, isRebookingValid) => {
  if (isRebookingValid) {
    booking.approvalStatus = "under_review";
    booking.isRebookingWithin24hrs = true;
    // Set review deadline to 4 hours from now
    const now = new Date();
    booking.reviewDeadline = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  } else {
    booking.approvalStatus = "auto_approved";
    booking.isRebookingWithin24hrs = false;
  }
  return booking;
};

export default {
  isRebookingWithin24hrs,
  setupRebookingApproval
};
