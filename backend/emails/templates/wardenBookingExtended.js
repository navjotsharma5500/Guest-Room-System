// wardenBookingExtended.js
import masterTemplate from "./masterTemplate.js";

export default function wardenBookingExtended(b) {
  return masterTemplate({
    title: "Guest Room Booking Extended",
    content: `
      <p>Dear Warden,</p>

      <p>
        Please note that the guest room booking for
        <strong>${b.guest}</strong> has been <strong>extended</strong>.
      </p>

      <div class="details-box">
        <div class="details-title">Extension Summary</div>
        <p><strong>Hostel:</strong> ${b.hostel}</p>
        <p><strong>Room No.:</strong> ${b.roomNo}</p>
        <p>
          <strong>Previous Checkout:</strong>
          ${b.previousTo ? new Date(b.previousTo).toDateString() : "As per earlier booking"}
        </p>
        <p>
          <strong>New Checkout:</strong>
          ${new Date(b.to).toDateString()}
        </p>
      </div>

      <p>
        Kindly take note of the revised checkout date. The caretaker and
        management have been informed.
      </p>
    `,
  });
}
