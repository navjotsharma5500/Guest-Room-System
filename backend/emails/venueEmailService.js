import { sendVenueEmail } from "./venue/index.js";
import { VENUE_EMAIL_TYPES } from "./venue/venueEmailTypes.js";
import SocietyNameSuggestion from "../models/SocietyNameSuggestion.js";

// Fetch society email from database
const getSocietyEmail = async (societyName) => {
  if (!societyName) return null;
  
  try {
    const society = await SocietyNameSuggestion.findOne({ 
      name: societyName.trim() 
    });
    return society?.email || null;
  } catch (error) {
    console.error('Error fetching society email:', error);
    return null;
  }
};

// 📨 1. ENQUIRY SUBMITTED EMAIL
export const sendEnquirySubmittedEmail = async (enquiry) => {
  await sendVenueEmail({
    type: VENUE_EMAIL_TYPES.ENQUIRY_RECEIVED,
    roomNo: enquiry.roomNo,
    guestEmail: enquiry.email,
    societyEmail: null, // No society email on submission
    data: enquiry,
  });
};

// ❌ 2. ENQUIRY REJECTED EMAIL
export const sendEnquiryRejectedEmail = async (enquiry) => {
  const societyEmail = await getSocietyEmail(enquiry.societyName);
  
  await sendVenueEmail({
    type: VENUE_EMAIL_TYPES.ENQUIRY_REJECTED,
    roomNo: enquiry.roomNo,
    guestEmail: enquiry.email,
    societyEmail,
    data: enquiry,
  });
};

// ✅ 3. ENQUIRY APPROVED / BOOKING CREATED EMAIL
export const sendEnquiryApprovedEmail = async (enquiry, booking) => {
  const societyEmail = await getSocietyEmail(booking.societyName);

  await sendVenueEmail({
    type: VENUE_EMAIL_TYPES.ENQUIRY_APPROVED,
    roomNo: booking.roomNo,
    guestEmail: booking.email,
    societyEmail,
    data: booking,
  });
};

// ⚡ 4. DIRECT BOOKING CREATED EMAIL
export const sendDirectBookingEmail = async (booking) => {
  const societyEmail = await getSocietyEmail(booking.societyName);

  await sendVenueEmail({
    type: VENUE_EMAIL_TYPES.DIRECT_BOOKING,
    roomNo: booking.roomNo,
    guestEmail: booking.email,
    societyEmail,
    data: booking,
  });
};

// ⏩ 5. BOOKING EXTENDED EMAIL
export const sendBookingExtendedEmail = async (booking) => {
  const societyEmail = await getSocietyEmail(booking.societyName);

  await sendVenueEmail({
    type: VENUE_EMAIL_TYPES.BOOKING_EXTENDED,
    roomNo: booking.roomNo,
    guestEmail: booking.email,
    societyEmail,
    data: booking,
  });
};

// ❎ 6. BOOKING CANCELLED EMAIL
export const sendBookingCancelledEmail = async (booking) => {
  const societyEmail = await getSocietyEmail(booking.societyName);

  await sendVenueEmail({
    type: VENUE_EMAIL_TYPES.BOOKING_CANCELLED,
    roomNo: booking.roomNo,
    guestEmail: booking.email,
    societyEmail,
    data: booking,
  });
};