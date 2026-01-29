export default function masterTemplate({ title, content }) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>

<body style="
  margin:0;
  padding:0;
  width:100%;
  font-family:Arial, Helvetica, sans-serif;
  color:#1f2937;
  background:#ffffff;
">

<!-- FULL WIDTH WRAPPER -->
<table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;">
  <tr>
    <td style="padding:24px 32px;">

      <!-- HEADER -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td>
            <img
              src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png"
              alt="Thapar Institute of Engineering and Technology"
              width="120"
              style="display:block; margin-bottom:12px;"
            />

            <div style="font-size:18px; font-weight:700; color:#111827;">
              Thapar Institute of Engineering and Technology
            </div>

            <div style="font-size:13px; color:#6b7280;">
              (Deemed to be University)
            </div>
          </td>
        </tr>
      </table>

      <!-- DIVIDER -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
        <tr>
          <td style="border-top:1px solid #e5e7eb;"></td>
        </tr>
      </table>

      <!-- TITLE -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="
            font-size:16px;
            font-weight:600;
            color:#111827;
            padding-bottom:8px;
          ">
            ${title}
          </td>
        </tr>
      </table>

      <!-- CONTENT -->
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="
            font-size:14.5px;
            line-height:1.7;
            color:#1f2937;
          ">
            ${content}
          </td>
        </tr>
      </table>

      <!-- FOOTER -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
        <tr>
          <td style="font-size:12.5px; color:#6b7280;">
            <div style="font-weight:600; color:#111827; margin-bottom:6px;">
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

    </td>
  </tr>
</table>

</body>
</html>
`;
}
