export default function masterTemplate({ title, content }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="margin:0; padding:0; font-family:Arial, Helvetica, sans-serif; color:#1f2937; background:#ffffff;">

  <!-- MAIN WRAPPER -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <!-- CONTENT WIDTH -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:720px;">

          <!-- HEADER -->
          <tr>
            <td align="left" style="padding-bottom:16px;">
              <img
                src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png"
                alt="Thapar Institute of Engineering and Technology"
                width="110"
                style="display:block; margin-bottom:10px;"
              />

              <div style="font-size:18px; font-weight:700; color:#111827;">
                Thapar Institute of Engineering and Technology
              </div>

              <div style="font-size:13px; color:#6b7280;">
                (Deemed to be University)
              </div>
            </td>
          </tr>

          <!-- DIVIDER -->
          <tr>
            <td style="border-top:1px solid #e5e7eb; padding-top:16px;"></td>
          </tr>

          <!-- TITLE -->
          <tr>
            <td style="padding:12px 0 8px; font-size:16px; font-weight:600; color:#111827;">
              ${title}
            </td>
          </tr>

          <!-- CONTENT -->
          <tr>
            <td style="font-size:14.5px; line-height:1.7; color:#1f2937;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding-top:24px; font-size:12.5px; color:#6b7280;">
              <div style="margin-bottom:6px; font-weight:600; color:#111827;">
                Thapar Institute Guest Room Management
              </div>

              Thapar Institute of Engineering & Technology<br/>
              Patiala, Punjab<br/>
              <a href="https://thapar.edu" style="color:#2563eb; text-decoration:none;">
                thapar.edu
              </a>

              <div style="margin-top:12px; font-size:11px; color:#9ca3af;">
                This is a system-generated email. Please do not reply.
              </div>
            </td>
          </tr>

        </table>
        <!-- END CONTENT WIDTH -->

      </td>
    </tr>
  </table>

</body>
</html>
`;
}
