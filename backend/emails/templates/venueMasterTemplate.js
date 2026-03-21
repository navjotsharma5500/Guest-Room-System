export default function venueMasterTemplate({ title, content, skipDefaultButton = false }) {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />

<style>
@keyframes fadeIn {
  from {opacity:0; transform:translateY(20px);}
  to {opacity:1; transform:translateY(0);}
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(27,116,201,.6);}
  70% { box-shadow: 0 0 0 14px rgba(27,116,201,0);}
  100% { box-shadow: 0 0 0 0 rgba(27,116,201,0);}
}
</style>
</head>

<body style="
margin:0;
padding:0;
width:100%;
font-family:Arial, Helvetica, sans-serif;
background:#f4f6f9;
color:#1f2937;
">

<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 12px;">
<tr>
<td align="center">

<!-- MAIN CARD -->
<table width="600" cellpadding="0" cellspacing="0" style="
max-width:600px;
background:#ffffff;
border-radius:14px;
overflow:hidden;
box-shadow:0 10px 25px rgba(0,0,0,0.08);
animation:fadeIn 1.3s ease-in-out;
">

<!-- HEADER -->
<tr>
<td style="
background:linear-gradient(135deg,#0f4c81,#1b74c9);
padding:34px 28px;
color:#ffffff;
">

<img src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png"
width="110"
style="display:block;margin-bottom:14px;" />

<div style="font-size:22px;font-weight:700;">
Thapar Institute of Engineering and Technology
</div>

<div style="font-size:13px;opacity:.9;">
Venue Booking Management System
</div>

</td>
</tr>

<!-- CONTENT AREA -->
<tr>
<td style="padding:36px 32px; text-align:center;">

<div style="
font-size:20px;
font-weight:700;
color:#0f4c81;
margin-bottom:14px;
">
${title}
</div>

<div style="
font-size:15px;
line-height:1.7;
color:#1f2937;
margin-bottom:26px;
">
${content}
</div>

<!-- CTA BUTTON (Only shown if skipDefaultButton is not true) -->
${skipDefaultButton ? '' : `
<a href="{{FEEDBACK_LINK}}" style="
display:inline-block;
padding:14px 38px;
background:#1b74c9;
color:#ffffff;
text-decoration:none;
border-radius:40px;
font-size:15px;
font-weight:600;
animation:pulse 2s infinite;
">
Share Your Feedback
</a>

<div style="margin-top:22px;font-size:13px;color:#6b7280;">
Your experience helps us serve you better.
</div>
`}

</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="
background:#f0f3f7;
padding:22px;
font-size:12.5px;
color:#6b7280;
text-align:center;
">

<div style="font-weight:600;color:#111827;margin-bottom:6px;">
Thapar Institute Venue Booking Management
</div>

Patiala, Punjab •  
<a href="https://thapar.edu" style="color:#2563eb;text-decoration:none;">
thapar.edu
</a>

<div style="margin-top:10px;font-size:11px;color:#9ca3af;">
System generated email – please do not reply
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
