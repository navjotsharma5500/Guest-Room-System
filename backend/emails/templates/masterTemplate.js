export default function masterTemplate({ title, content }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="margin:0; padding:0; background:#f2f4f7; font-family:Arial, Helvetica, sans-serif;">

  <!-- OUTER WRAPPER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7; padding:24px 0;">
    <tr>
      <td align="center">

        <!-- MAIN CONTAINER -->
        <table width="680" cellpadding="0" cellspacing="0"
          style="background:#ffffff; border:1px solid #e5e7eb; border-radius:6px; overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td align="center" style="padding:24px 20px 16px;">
              <img
                src="https://guestapp.in/assets/thapar_logo.png"
                alt="Thapar Institute of Engineering and Technology"
                width="90"
                style="display:block; margin:0 auto 12px auto;"
              />
              <div style="font-size:18px; font-weight:700; color:#111827;">
                Thapar Institute of Engineering and Technology
              </div>
              <div style="font-size:13px; color:#6b7280; margin-top:4px;">
                (Deemed to be University)
              </div>
            </td>
          </tr>

          <!-- TITLE -->
          <tr>
            <td align="center"
              style="padding:14px 20px; font-size:16px; font-weight:600;
                     color:#111827; background:#f9fafb;
                     border-top:1px solid #e5e7eb;
                     border-bottom:1px solid #e5e7eb;">
              ${title}
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="padding:22px; font-size:14.5px; line-height:1.7; color:#1f2937;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center"
              style="padding:18px; font-size:12.5px; color:#6b7280;
                     background:#fafafa; border-top:1px solid #e5e7eb;">
              <strong style="display:block; margin-bottom:4px; color:#111827;">
                Thapar Institute Guest Room Management
              </strong>
              Thapar Institute of Engineering & Technology<br/>
              Patiala, Punjab<br/>
              <a href="https://thapar.edu"
                 style="color:#2563eb; text-decoration:none;">
                thapar.edu
              </a>

              <div style="margin-top:10px; font-size:11px; color:#9ca3af;">
                This is a system-generated email. Please do not reply.
              </div>
            </td>
          </tr>

        </table>
        <!-- END MAIN CONTAINER -->

      </td>
    </tr>
  </table>

</body>
</html>
`;
}
