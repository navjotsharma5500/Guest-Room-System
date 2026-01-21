// masterTemplate.js
export default function masterTemplate({ title, content }) {
  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f5f5f5;
        padding: 0;
        margin: 0;
      }

      .email-wrapper {
        max-width: 650px;
        width: 100%;
        margin: 30px auto;
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .email-header {
        background: white;
        padding: 20px;
        text-align: center;
        border-bottom: 3px solid #b30000;
      }

      .email-header img {
        max-width: 80px;
        height: auto;
        margin-bottom: 10px;
      }

      .email-header h1 {
        color: #b30000;
        font-size: 18px;
        font-weight: bold;
        margin: 8px 0 4px 0;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .email-header p {
        color: #666;
        font-size: 13px;
        margin: 0;
        font-style: italic;
      }

      .email-title {
        background: #b30000;
        color: white;
        padding: 15px 20px;
        font-size: 16px;
        font-weight: bold;
        text-align: center;
      }

      .email-content {
        padding: 25px;
        font-size: 15px;
        color: #333;
        line-height: 1.7;
      }

      .email-content p {
        margin: 12px 0;
      }

      .details-box {
        background: #fff5f5;
        border-left: 4px solid #b30000;
        padding: 15px 20px;
        margin: 20px 0;
        border-radius: 4px;
      }

      .details-title {
        font-weight: bold;
        color: #b30000;
        font-size: 16px;
        margin-bottom: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .details-box p {
        margin: 8px 0;
        color: #444;
      }

      .email-footer {
        background: #f9f9f9;
        padding: 20px;
        text-align: center;
        font-size: 13px;
        color: #666;
        border-top: 1px solid #e0e0e0;
      }

      .email-footer strong {
        display: block;
        margin-bottom: 5px;
        color: #333;
      }

      .email-footer a {
        color: #b30000;
        text-decoration: none;
        font-weight: 500;
      }

      .email-footer .system-notice {
        margin-top: 15px;
        padding-top: 15px;
        border-top: 1px solid #e0e0e0;
        font-size: 11px;
        color: #999;
        font-style: italic;
      }

      strong {
        color: #b30000;
      }
    </style>
  </head>
  <body>
    <div class="email-wrapper">
      <!-- Header with Logo -->
      <div class="email-header">
        <img src="cid:thapar_logo" alt="Thapar Institute Logo" />
        <h1>Thapar Institute of Engineering and Technology</h1>
        <p>(Deemed to be University)</p>
      </div>

      <!-- Title Bar -->
      <div class="email-title">
        ${title}
      </div>

      <!-- Main Content -->
      <div class="email-content">
        ${content}
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <strong>Hostel ITMH Team</strong>
        Thapar Institute of Engineering & Technology<br/>
        Patiala, Punjab<br/>
        <a href="https://thapar.edu">thapar.edu</a>
        
        <div class="system-notice">
          This is a system-generated email. Please do not reply.
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}