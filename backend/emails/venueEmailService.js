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
// Feature 4: Send to 3 recipients (guest, society, president)
export const sendEnquiryRejectedEmail = async (enquiry) => {
  try {
    // Send email with guest and society recipients
    await sendVenueEmail({
      type: VENUE_EMAIL_TYPES.ENQUIRY_REJECTED,
      roomNo: enquiry.roomNo,
      guestEmail: enquiry.email,
      societyEmail: enquiry.societyEmail || undefined,
      data: enquiry,
    });
    
    console.log('✅ Rejection email sent successfully');
  } catch (error) {
    console.error('⚠️ Rejection email failed (non-critical):', error.message);
    // Don't throw - this is non-critical
  }
};

// ✅ 3. ENQUIRY APPROVED / BOOKING CREATED EMAIL
// Feature 4: Send to approved recipients (guest and society)
export const sendEnquiryApprovedEmail = async (enquiry, booking) => {
  try {
    // Send email with guest and society recipients
    await sendVenueEmail({
      type: VENUE_EMAIL_TYPES.ENQUIRY_APPROVED,
      roomNo: booking.roomNo,
      guestEmail: booking.email,
      societyEmail: enquiry.societyEmail || undefined,
      data: booking,
    });
    
    console.log('✅ Approval email sent successfully');
  } catch (error) {
    console.error('⚠️ Approval email failed (non-critical):', error.message);
    // Don't throw - this is non-critical
  }
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