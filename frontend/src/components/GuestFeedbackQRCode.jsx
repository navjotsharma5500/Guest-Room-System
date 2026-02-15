// src/components/GuestFeedbackQRCode.jsx
// ============================================================================
// HOSTEL-WISE QR CODE GENERATOR
// - Generates unique QR codes for each hostel
// - QR codes include hostel parameter in URL
// - Bulk download all QR codes at once
// - Individual download for each hostel
// ============================================================================

import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { GUEST_FEEDBACK_URL } from "../utils/apiConfig";

// Thapar Institute Hostel List
const HOSTELS = [
  { code: 'A', name: 'Agira Hall (A)' },
  { code: 'B', name: 'Amritam Hall (B)' },
  { code: 'C', name: 'Prithvi Hall (C)' },
  { code: 'D', name: 'Neeram Hall (D)' },
  { code: 'H', name: 'Vyan Hall (H)' },
  { code: 'I', name: 'Ira Hall (I)' },
  { code: 'J', name: 'Tejas Hall (J)' },
  { code: 'K', name: 'Ambaram Hall (K)' },
  { code: 'L', name: 'Viyat Hall (L)' },
  { code: 'M', name: 'Anantam Hall (M)' },
  { code: 'N', name: 'Ananta Hall (N)' },
  { code: 'O', name: 'Vyom Hall (O)' },
  { code: 'PG', name: 'Dhriti Hall (PG)' },
  { code: 'Q', name: 'Vahni Hostel (Q)' },
];

function HostelQRCard({ hostel, onDownload }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  // Generate hostel-specific URL with hostel parameter
  const feedbackURL = `${GUEST_FEEDBACK_URL}?hostel=${encodeURIComponent(hostel.name)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(feedbackURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadSingle = () => {
    const svg = document.getElementById(`qr-code-${hostel.code}`);
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
      downloadLink.download = `hostel-${hostel.code}-feedback-qr.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 overflow-hidden transition-all hover:shadow-xl">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white flex items-center justify-between hover:from-red-700 hover:to-red-800 transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white text-red-600 rounded-full flex items-center justify-center font-bold text-lg">
            {hostel.code}
          </div>
          <div className="text-left">
            <h3 className="font-bold text-lg">{hostel.name}</h3>
            <p className="text-red-100 text-sm">Click to expand</p>
          </div>
        </div>
        {expanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-6">
          {/* QR Code Display */}
          <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-xl border-2 border-red-100 mb-4">
            <div className="flex flex-col items-center">
              {/* Thapar Logo */}
              <img
                src="https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744"
                alt="Thapar Logo"
                className="w-20 h-auto mb-3"
              />
              
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl shadow-md">
                <QRCodeSVG
                  id={`qr-code-${hostel.code}`}
                  value={feedbackURL}
                  size={200}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: "https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744",
                    height: 30,
                    width: 30,
                    excavate: true,
                  }}
                />
              </div>

              {/* Instructions */}
              <div className="mt-4 text-center">
                <p className="text-md font-semibold text-red-700 mb-1">
                  📱 Scan to Share Feedback
                </p>
                <p className="text-gray-600 text-sm">
                  For {hostel.name} Guests
                </p>
              </div>
            </div>
          </div>

          {/* URL Display */}
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2">
              Feedback URL:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={feedbackURL}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 font-mono text-xs"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center gap-2 text-sm"
              >
                {copied ? (
                  <>
                    <Check size={16} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDownloadSingle}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-2 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition flex items-center justify-center gap-2"
            >
              <Download size={18} />
              Download QR
            </button>
            <a
              href={feedbackURL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 bg-white border-2 border-red-600 text-red-600 py-2 rounded-lg font-semibold hover:bg-red-50 transition flex items-center justify-center gap-2"
            >
              Test Link
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function GuestFeedbackQRCode() {
  const [expandAll, setExpandAll] = useState(false);

  const handleDownloadAll = async () => {
    for (const hostel of HOSTELS) {
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay to avoid browser blocking
      const svg = document.getElementById(`qr-code-${hostel.code}`);
      if (!svg) continue;
      
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      await new Promise((resolveImg) => {
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          const pngFile = canvas.toDataURL('image/png');
          
          const downloadLink = document.createElement('a');
          downloadLink.download = `hostel-${hostel.code}-feedback-qr.png`;
          downloadLink.href = pngFile;
          downloadLink.click();
          resolveImg();
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
      });
    }
  };

  const toggleExpandAll = () => {
    setExpandAll(!expandAll);
    // This would require lifting state up or using context
    // For now, it's a visual indicator
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">
              📍 Hostel-Wise Feedback QR Codes
            </h1>
            <p className="text-gray-600">
              Generate and download unique QR codes for each hostel
            </p>
          </div>

          {/* Global Actions */}
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={handleDownloadAll}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition flex items-center gap-2 shadow-lg"
            >
              <Download size={20} />
              Download All QR Codes ({HOSTELS.length})
            </button>
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How It Works:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
              <li>Each hostel has a unique QR code with pre-filled hostel information</li>
              <li>Guests scan the QR code and authenticate with Google</li>
              <li>Form auto-fills: Name, Email, Contact (from Google account)</li>
              <li>Guest only needs to rate and optionally add description</li>
              <li>Profile picture automatically uploaded to ImageKit</li>
              <li>Feedback saved with hostel-specific tracking</li>
            </ul>
          </div>
        </div>

        {/* Hostel QR Code Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {HOSTELS.map(hostel => (
            <HostelQRCard key={hostel.code} hostel={hostel} />
          ))}
        </div>

        {/* Printing Guidelines */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">📋 Printing & Distribution Guidelines</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded">
              <h3 className="font-semibold text-yellow-900 mb-2">🖨️ Printing Best Practices:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-800">
                <li>Print on high-quality A4 or A3 paper</li>
                <li>Use color printing for better visibility</li>
                <li>Laminate for durability in high-traffic areas</li>
                <li>Test scan before distributing</li>
                <li>Include hostel name prominently on poster</li>
              </ol>
            </div>

            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <h3 className="font-semibold text-green-900 mb-2">📍 Recommended Locations:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-green-800">
                <li>Reception desk (main entrance)</li>
                <li>Notice boards in common areas</li>
                <li>Dining hall entrance</li>
                <li>Study rooms</li>
                <li>Laundry area</li>
                <li>Recreation room</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 bg-purple-50 border-l-4 border-purple-500 p-4 rounded">
            <h3 className="font-semibold text-purple-900 mb-2">🔒 Privacy & Security:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-purple-800">
              <li>Google Auth ensures verified guest identity</li>
              <li>Profile pictures stored securely on ImageKit CDN</li>
              <li>Only admins can view submitted feedback</li>
              <li>Hostel-wise access control for caretakers/wardens</li>
              <li>GDPR compliant data handling</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GuestFeedbackQRCode;
