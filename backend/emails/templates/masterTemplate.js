export default function masterTemplate({ title, content }) {
  return `
  <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background: #f5f5f5;
        padding: 0;
        margin: 0;
      }

      .container {
        max-width: 650px;
        margin: auto;
        background: white;
        border-radius: 10px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        margin-top: 30px;
      }

      .header {
        background: #b30000; /* TIET Dark Red */
        color: white;
        padding: 20px;
        text-align: center;
        font-size: 22px;
        font-weight: bold;
      }

      .content {
        padding: 25px;
        font-size: 16px;
        color: #444;
        line-height: 1.6;
      }

      .footer {
        background: #fafafa;
        padding: 15px;
        text-align: center;
        font-size: 13px;
        color: #666;
        border-top: 1px solid #ddd;
      }

      .details-box {
        background: #fff5f5;
        border-left: 4px solid #b30000;
        padding: 12px 18px;
        margin: 15px 0;
        border-radius: 6px;
      }

      .details-title {
        font-weight: bold;
        color: #b30000;
        margin-bottom: 6px;
      }
    </style>
  </head>

  <body>
      <div class="container">
          <div class="header">${title}</div>

          <div class="content">
              ${content}
          </div>

          <div class="footer">
            Thapar Institute of Engineering & Technology, Patiala<br/>
            <a href="https://thapar.edu" style="color:#b30000; text-decoration:none;">thapar.edu</a>
          </div>
      </div>
  </body>
  </html>
  `;
}
