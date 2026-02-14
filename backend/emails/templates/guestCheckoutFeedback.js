// guestCheckoutFeedback.js
import masterTemplate from "./masterTemplate.js";

export default function guestCheckoutFeedback(b) {
  return masterTemplate({
    title: "Thank You for Staying With Us",
    content: `
      <p>Dear ${b.guest || "Guest"},</p>

      <p>
        Thank you for choosing to stay with us at
        <strong>Thapar Institute of Engineering and Technology</strong>.
        It was our pleasure to host you.
      </p>

      <div class="details-box">
        <div class="details-title">Your Stay Summary</div>
        <p><strong>Hostel:</strong> ${b.hostel || "—"}</p>
        <p><strong>Room Number:</strong> ${b.roomNo || "—"}</p>
        <p>
          <strong>Check-in:</strong>
          ${b.from ? new Date(b.from).toDateString() : "—"}
        </p>
        <p>
          <strong>Check-out:</strong>
          ${b.to ? new Date(b.to).toDateString() : "—"}
        </p>
      </div>

      <p>
        We hope you had a comfortable and pleasant stay.
        Your feedback is extremely valuable in helping us improve
        our guest room services.
      </p>

      <div style="text-align:center; margin: 25px 0;">
        <a 
          href="${b.feedbackLink || "https://www.guestapp.in/guest-feedback"}"
          style="
            display:inline-block;
            padding:14px 36px;
            background:#1b74c9;
            color:#ffffff;
            text-decoration:none;
            border-radius:40px;
            font-weight:600;
          "
        >
          Share Your Experience
        </a>
      </div>

      <p style="font-size:14px; color:#777; text-align:center;">
        It only takes a minute and helps us serve you better.
      </p>

      <p>
        Warm regards,<br/>
        <strong>Guest Room Administration</strong><br/>
        Thapar Institute of Engineering and Technology
      </p>
    `,
  });
}
