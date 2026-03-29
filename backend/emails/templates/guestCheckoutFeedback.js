// guestCheckoutFeedback.js
import masterTemplate from "./masterTemplate.js";

export default function guestCheckoutFeedback(b) {
  return masterTemplate({
    title: "Thank You for Staying With Us",
    content: `
      <p>Dear ${b.guest || "Guest"},</p>

      <p>
        Thank you for staying with us. It was a pleasure hosting you, and we hope you had a comfortable and pleasant experience.
      </p>

      <p>
        Your feedback means a great deal to us. It helps us understand what we're doing well and where we can improve, so we can continue providing a better experience for every guest.
      </p>

      <p>
        We would truly appreciate it if you could take a minute to share your thoughts with us. Your insights make a real difference.
      </p>

      <div style="text-align:center; margin: 28px 0;">
        <a 
          href="${b.feedbackLink || "https://www.campusconnect.thapar.edu/guest-feedback"}"
          style="
            display:inline-block;
            padding:15px 42px;
            background: linear-gradient(135deg, #1b74c9 0%, #1561a8 100%);
            color:#ffffff;
            text-decoration:none;
            border-radius:40px;
            font-weight:600;
            font-size: 15px;
            box-shadow: 0 4px 15px rgba(27, 116, 201, 0.3);
          "
        >
          Share Your Feedback
        </a>
      </div>

      <p style="margin-top: 28px; line-height: 1.8;">
        Thank you once again, and we hope to welcome you back soon.<br/><br/>
        Warm regards,<br/>
        <strong>Guest Room Administration</strong>
      </p>
    `,
    skipDefaultButton: true
  });
}
