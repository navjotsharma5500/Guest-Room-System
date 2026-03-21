import bookingCancelled from "./bookingCancelled.js";
import bookingExtended from "./bookingExtended.js";
import directBooking from "./directBooking.js";
import enquiryApproved from "./enquiryApproved.js";
import enquiryReceived from "./enquiryReceived.js";
import enquiryRejected from "./enquiryRejected.js";
import { VENUE_EMAIL_TYPES } from "../../venueEmailTypes.js";

export const {
  ENQUIRY_RECEIVED,
  ENQUIRY_APPROVED,
  ENQUIRY_REJECTED,
  DIRECT_BOOKING,
  BOOKING_EXTENDED,
  BOOKING_CANCELLED,
} = VENUE_EMAIL_TYPES;

export const templates = {
  [ENQUIRY_RECEIVED]: enquiryReceived,
  [ENQUIRY_APPROVED]: enquiryApproved,
  [ENQUIRY_REJECTED]: enquiryRejected,
  [DIRECT_BOOKING]: directBooking,
  [BOOKING_EXTENDED]: bookingExtended,
  [BOOKING_CANCELLED]: bookingCancelled,
};

export const enquiry_received = enquiryReceived;
export const enquiry_approved = enquiryApproved;
export const enquiry_rejected = enquiryRejected;
export const direct_booking = directBooking;
export const booking_extended = bookingExtended;
export const booking_cancelled = bookingCancelled;