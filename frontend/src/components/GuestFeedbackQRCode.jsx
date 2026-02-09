// src/components/GuestFeedbackQRCode.jsx
import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Copy, Check } from 'lucide-react';
import { GUEST_FEEDBACK_URL } from "../utils/apiConfig";

// Update this URL to your production domain
function GuestFeedbackQRCode() {
  const feedbackURL = GUEST_FEEDBACK_URL;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(feedbackURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = document.getElementById('qr-code');
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL('image/png');
      
      const downloadLink = document.createElement('a');
      downloadLink.download = 'guest-feedback-qr-code.png';
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 mb-2">
          Guest Feedback QR Code
        </h2>
        <p className="text-gray-600">
          Print and display this QR code in hostels for guests to submit feedback
        </p>
      </div>

      {/* QR Code Display */}
      <div className="bg-gradient-to-br from-red-50 to-white p-8 rounded-xl border-2 border-red-100 mb-6">
        <div className="flex flex-col items-center">
          {/* Thapar Logo */}
          <img
            src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
            alt="Thapar Logo"
            className="w-24 h-auto mb-4"
          />
          
          {/* QR Code */}
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <QRCodeSVG
              id="qr-code"
              value={feedbackURL}
              size={280}
              level="H"
              includeMargin={true}
              imageSettings={{
                src: "https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744",
                height: 40,
                width: 40,
                excavate: true,
              }}
            />
          </div>

          {/* Instructions */}
          <div className="mt-6 text-center">
            <p className="text-lg font-semibold text-red-700 mb-2">
              📱 Scan to Share Your Feedback
            </p>
            <p className="text-gray-600 text-sm">
              Help us improve your hostel experience
            </p>
          </div>
        </div>
      </div>

      {/* URL Display */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Feedback URL:
        </label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={feedbackURL}
            readOnly
            className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-gray-700 font-mono text-sm"
          />
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2"
          >
            {copied ? (
              <>
                <Check size={18} />
                Copied!
              </>
            ) : (
              <>
                <Copy size={18} />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <button
          onClick={handleDownload}
          className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition flex items-center justify-center gap-2 shadow-lg"
        >
          <Download size={20} />
          Download QR Code
        </button>
        <a
          href={feedbackURL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-white border-2 border-red-600 text-red-600 py-3 rounded-lg font-semibold hover:bg-red-50 transition flex items-center justify-center gap-2"
        >
          Test Link
        </a>
      </div>

      {/* Printing Instructions */}
      <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <h3 className="font-semibold text-blue-900 mb-2">📋 Printing Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Download the QR code image</li>
          <li>Print on A4 size paper or poster</li>
          <li>Display prominently in hostel common areas</li>
          <li>Recommended locations: reception desk, notice boards, dining halls</li>
          <li>Ensure good lighting for easy scanning</li>
        </ol>
      </div>

      {/* Distribution Checklist */}
      <div className="mt-6 bg-green-50 border-l-4 border-green-500 p-4 rounded">
        <h3 className="font-semibold text-green-900 mb-2">✅ Distribution Checklist:</h3>
        <div className="space-y-2">
          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N'].map(hostel => (
            <label key={hostel} className="flex items-center gap-2 text-sm text-green-800">
              <input type="checkbox" className="w-4 h-4 text-green-600 rounded" />
              <span>Hostel {hostel}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default GuestFeedbackQRCode;