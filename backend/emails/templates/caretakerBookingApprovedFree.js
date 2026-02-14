// caretakerBookingApprovedFree.js
import masterTemplate from "./masterTemplate.js";

export default function caretakerBookingApprovedFree(b) {
  return masterTemplate({
    title: "Guest Room Booking Approved",
    content: `
      <p style="margin-top:0;">Dear Caretaker,</p>

      <p>
        This is to inform you that a guest room booking has been 
        <strong>approved</strong>. Kindly make the necessary arrangements 
        as per the details below.
      </p>

      <div style="
        background:#f8fafc;
        border-radius:12px;
        padding:18px 20px;
        margin:18px 0;
        text-align:left;
        font-size:14.5px;
      ">

        <div style="font-weight:600;margin-bottom:10px;color:#0f4c81;">
          Booking Details
        </div>

        <strong>Guest Name:</strong> ${b.guest}<br/>
        <strong>Contact Number:</strong> ${b.contact || "—"}<br/>
        <strong>Hostel:</strong> ${b.hostel}<br/>
        <strong>Room Number:</strong> ${b.roomNo}<br/>
        <strong>Check-in:</strong> ${new Date(b.from).toDateString()} ${b.checkInTime || ""}<br/>
        <strong>Check-out:</strong> ${new Date(b.to).toDateString()} ${b.checkOutTime || ""}<br/>
        <strong>Purpose of Stay:</strong> ${b.purpose || "—"}

      </div>

      <p>
        Please ensure the room is prepared prior to the guest’s arrival. 
        Verify the guest’s identification at check-in and assist with 
        smooth room handover.
      </p>

      <p>
        For any clarification, kindly coordinate with the Hostel Manager.
      </p>

      <p style="margin-bottom:0;">
        Regards,<br/>
        <strong>Guest Room Administration</strong>
      </p>
    `,
  });
}
