// wardenDirectBookingFree.js
import masterTemplate from "./masterTemplate.js";

export default function wardenDirectBookingFree(b) {
  const remarks = b.freeRemarks || b.remarks || "";

  return masterTemplate({
    title: `Direct Guest Room Booking — ${b.guest}`,
    content: `
      <p>Dear Warden,</p>

      <p>
        This is to inform you that a <strong>complimentary direct guest room booking</strong>
        has been made by the hostel caretaker for
        <strong>${b.guest}</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Booking Summary</div>
        <p><strong>Guest Name:</strong> ${b.guest}</p>
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
        remarks
          ? `
          <div class="details-box">
            <div class="details-title">Special Remarks</div>
            <p>${remarks}</p>
          </div>
        `
          : ""
      }

      <p>
        Kindly note this booking for your records. The caretaker has been
        instructed to manage room readiness and guest coordination.
      </p>

      <p>
        Regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
