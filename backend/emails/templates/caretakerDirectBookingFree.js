// caretakerDirectBookingFree.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerDirectBookingFree(b) {
  return masterTemplate({
    title: `Direct Guest Room Booking – ${b.guest}`,
    content: `
      <p>Dear Caretaker,</p>

      <p>
        A <strong>complimentary direct guest room booking</strong> has been created successfully.
        Please find the booking details below.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Details</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
        <p><strong>Contact:</strong> ${b.contact || "-"}</p>
        <p><strong>Email:</strong> ${b.email || "-"}</p>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p>
          <strong>Check-in:</strong>
          ${new Date(b.from).toDateString()} ${b.checkInTime || ""}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}
        </p>
      </div>

      ${
        b.freeRemarks || b.remarks
          ? `
          <div class="details-box">
            <div class="details-title">Special Remarks</div>
            <p>${b.freeRemarks || b.remarks}</p>
          </div>
        `
          : ""
      }

      <p>
        Kindly ensure the room is prepared and assist the guest upon arrival.
        No payment collection is required for this booking.
      </p>

      <p>
        This notification has also been shared with the warden and administration.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
