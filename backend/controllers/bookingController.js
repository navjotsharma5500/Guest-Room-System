import Booking from "../models/Booking.js";
import Hostel from "../models/Hostel.js";
import { createLog } from "../middleware/logMiddleware.js";
import { sendEmail } from "../emails/sendEmail.js";

// templates
import guestBookingApprovedFree from "../emails/templates/guestBookingApprovedFree.js";
import guestBookingApprovedPaid from "../emails/templates/guestBookingApprovedPaid.js";
import caretakerApprovedFree from "../emails/templates/caretakerApprovedFree.js";
import caretakerApprovedPaid from "../emails/templates/caretakerApprovedPaid.js";
import wardenApprovedFree from "../emails/templates/wardenApprovedFree.js";
import wardenApprovedPaid from "../emails/templates/wardenApprovedPaid.js";
import managerNotifyFree from "../emails/templates/managerNotifyFree.js";
import managerNotifyPaid from "../emails/templates/managerNotifyPaid.js";
import caretakerDirectBookingFree from "../emails/templates/caretakerDirectBookingFree.js";
import caretakerDirectBookingPaid from "../emails/templates/caretakerDirectBookingPaid.js";
import wardenDirectBookingFree from "../emails/templates/wardenDirectBookingFree.js";
import wardenDirectBookingPaid from "../emails/templates/wardenDirectBookingPaid.js";
import managerDirectBookingFree from "../emails/templates/managerDirectBookingFree.js";
import managerDirectBookingPaid from "../emails/templates/managerDirectBookingPaid.js";
import bookingCancelledGuest from "../emails/templates/bookingCancelledGuest.js";
import bookingCancelledWarden from "../emails/templates/bookingCancelledWarden.js";
import bookingCancelledManager from "../emails/templates/bookingCancelledManager.js";
import extendGuest from "../emails/templates/extendGuest.js";
import extendCaretaker from "../emails/templates/extendCaretaker.js";
import extendWarden from "../emails/templates/extendWarden.js";
import extendManager from "../emails/templates/extendManager.js";


// ================================
// CREATE BOOKING
// ================================
export const createBooking = async (req, res) => {
  try {
    const booking = await Booking.create({
      ...req.body,
      createdBy: req.user._id,
    });

    const isPaid = booking.amount > 0;
    const caretakerEmail = booking.caretakerEmail;
    const wardenEmail = booking.wardenEmail;

    if (req.user.role === "caretaker") {
      await sendEmail({
        to: booking.email,
        subject: "Guest Room Booking Confirmation",
        html: isPaid ? caretakerDirectBookingPaid(booking) : caretakerDirectBookingFree(booking)
      });

      await sendEmail({
        to: wardenEmail,
        subject: "Caretaker Direct Booking",
        html: isPaid ? wardenDirectBookingPaid(booking) : wardenDirectBookingFree(booking)
      });

      await sendEmail({
        to: "manager@thapar.edu",
        subject: "Caretaker Direct Booking Notification",
        html: isPaid ? managerDirectBookingPaid(booking) : managerDirectBookingFree(booking)
      });
    } else {
      // ADMINS / MANAGERS
      await sendEmail({
        to: booking.email,
        subject: isPaid ? "Paid Guest Room Booking Approved" : "Guest Room Booking Approved",
        html: isPaid ? guestBookingApprovedPaid(booking) : guestBookingApprovedFree(booking)
      });

      await sendEmail({
        to: caretakerEmail,
        subject: "New Guest Booking Approved",
        html: isPaid ? caretakerApprovedPaid(booking) : caretakerApprovedFree(booking)
      });

      await sendEmail({
        to: wardenEmail,
        subject: "Guest Booking Approved",
        html: isPaid ? wardenApprovedPaid(booking) : wardenApprovedFree(booking)
      });

      await sendEmail({
        to: "manager@thapar.edu",
        subject: "Booking Approved Notification",
        html: isPaid ? managerNotifyPaid(booking) : managerNotifyFree(booking)
      });
    }

    createLog("booking_created", req.user._id, { bookingId: booking._id });
    res.json({ message: "Booking created", booking });

  } catch (err) {
    console.error("Create booking error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// ================================
// EXTEND BOOKING
// ================================
export const extendBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    booking.to = req.body.newTo;
    await booking.save();

    await sendEmail({
      to: booking.email,
      subject: "Guest Booking Extended",
      html: extendGuest(booking),
    });

    await sendEmail({
      to: booking.caretakerEmail,
      subject: "Booking Extended",
      html: extendCaretaker(booking),
    });

    await sendEmail({
      to: booking.wardenEmail,
      subject: "Booking Extended",
      html: extendWarden(booking),
    });

    await sendEmail({
      to: "manager@thapar.edu",
      subject: "Booking Extension Notification",
      html: extendManager(booking),
    });

    res.json({ message: "Booking extended", booking });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



// ================================
// CANCEL BOOKING
// ================================
export const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    booking.status = "cancelled";
    await booking.save();

    await sendEmail({
      to: booking.email,
      subject: "Guest Room Booking Cancelled",
      html: bookingCancelledGuest(booking),
    });

    await sendEmail({
      to: booking.wardenEmail,
      subject: "Booking Cancelled",
      html: bookingCancelledWarden(booking),
    });

    await sendEmail({
      to: "manager@thapar.edu",
      subject: "Booking Cancelled",
      html: bookingCancelledManager(booking),
    });

    res.json({ message: "Booking cancelled", booking });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
