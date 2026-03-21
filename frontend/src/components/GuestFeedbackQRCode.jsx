// src/components/GuestFeedbackQRCode.jsx
// ============================================================================
// HOSTEL-WISE QR CODE GENERATOR
//
// Download strategy (avoids ALL canvas-taint / CORS issues):
//   • QR pattern  → drawn with `qrcode` npm package directly onto a canvas
//                   (pure JS, no DOM SVG, no external image, never tainted)
//   • Thapar logo → fetched as a Blob, converted to object-URL, drawn on top
//   • toDataURL() → always succeeds because canvas is never tainted
// ============================================================================

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';           // preview only
import QRCode        from 'qrcode';                  // canvas rendering for download
import { Download, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { GUEST_FEEDBACK_URL } from "../utils/apiConfig";

const THAPAR_LOGO =
  "https://ik.imagekit.io/7khjnlfow/email-assets/Thapar_Logo.png?updatedAt=1769371086744";

const HOSTELS = [
  { code: 'A',  name: 'Agira Hall (A)'   },
  { code: 'B',  name: 'Amritam Hall (B)' },
  { code: 'C',  name: 'Prithvi Hall (C)' },
  { code: 'D',  name: 'Neeram Hall (D)'  },
  { code: 'H',  name: 'Vyan Hall (H)'    },
  { code: 'I',  name: 'Ira Hall (I)'     },
  { code: 'J',  name: 'Tejas Hall (J)'   },
  { code: 'K',  name: 'Ambaram Hall (K)' },
  { code: 'L',  name: 'Viyat Hall (L)'   },
  { code: 'M',  name: 'Anantam Hall (M)' },
  { code: 'N',  name: 'Ananta Hall (N)'  },
  { code: 'O',  name: 'Vyom Hall (O)'    },
  { code: 'PG', name: 'Dhriti Hall (PG)' },
  { code: 'Q',  name: 'Vahni Hostel (Q)' },
];

// ─── Fetch logo as blob → HTMLImageElement (never taints canvas) ─────────────
async function fetchLogoImage(url) {
  let blob;
  try {
    const r = await fetch(url, { mode: 'cors' });
    if (!r.ok) throw new Error('cors-fail');
    blob = await r.blob();
  } catch {
    const r = await fetch(url, { mode: 'no-cors' });
    blob = await r.blob();
  }

  const objUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload  = () => { URL.revokeObjectURL(objUrl); resolve(img); };
    img.onerror = () => reject(new Error('Logo image failed to load'));
    img.src = objUrl;
  });
}

// ─── Main download function ──────────────────────────────────────────────────
async function downloadQRCard(hostel, feedbackURL) {
  try {
    const S   = 4;
    const W   = 560 * S;
    const PAD = 36  * S;

    const LOGO_H        = 72  * S;
    const LOGO_GAP      = 24  * S;
    const QR_SZ         = 420 * S;
    const CENTER_R      = 38  * S;
    const CENTER_LOGO_H = 56  * S;
    const QR_GAP        = 28  * S;
    const LABEL1_H      = 28  * S;
    const LABEL_GAP     = 12  * S;
    const LABEL2_H      = 22  * S;
    const BOT_PAD       = 36  * S;

    const H = PAD + LOGO_H + LOGO_GAP + QR_SZ + QR_GAP
              + LABEL1_H + LABEL_GAP + LABEL2_H + BOT_PAD;

    const canvas = document.createElement('canvas');
    canvas.width  = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#FFF7F7';
    ctx.fillRect(0, 0, W, H);

    // Border
    ctx.strokeStyle = '#FECACA';
    ctx.lineWidth   = 3 * S;
    canvasRoundRect(ctx, 8 * S, 8 * S, W - 16 * S, H - 16 * S, 20 * S);
    ctx.stroke();

    // ── 1. Logo ───────────────────────────────────────────────────────────────
    const logoImg = await fetchLogoImage(THAPAR_LOGO);

    const tLogoW = (logoImg.width / logoImg.height) * LOGO_H;
    ctx.drawImage(logoImg, (W - tLogoW) / 2, PAD, tLogoW, LOGO_H);

    // ── 2. QR code via `qrcode` package (pure canvas, never tainted) ──────────
    const qrCanvas = document.createElement('canvas');
    await QRCode.toCanvas(qrCanvas, feedbackURL, {
      width: QR_SZ,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: { dark: '#111111', light: '#FFFFFF' },
    });

    const qrX = (W - QR_SZ) / 2;
    const qrY = PAD + LOGO_H + LOGO_GAP;

    // Shadow behind QR
    ctx.save();
    ctx.shadowColor   = 'rgba(0,0,0,0.14)';
    ctx.shadowBlur    = 18 * S;
    ctx.shadowOffsetY = 4  * S;
    ctx.fillStyle     = '#FFFFFF';
    canvasRoundRect(ctx, qrX - 10 * S, qrY - 10 * S,
                        QR_SZ + 20 * S, QR_SZ + 20 * S, 14 * S);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(qrCanvas, qrX, qrY, QR_SZ, QR_SZ);

    // ── 3. Centre logo on top of QR ───────────────────────────────────────────
    const cx = W / 2;
    const cy = qrY + QR_SZ / 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(cx, cy, CENTER_R, 0, Math.PI * 2);
    ctx.fill();

    const cLogoW = (logoImg.width / logoImg.height) * CENTER_LOGO_H;
    ctx.drawImage(logoImg,
      cx - cLogoW / 2,
      cy - CENTER_LOGO_H / 2,
      cLogoW,
      CENTER_LOGO_H,
    );

    // ── 4. Labels ─────────────────────────────────────────────────────────────
    const labelY = qrY + QR_SZ + QR_GAP;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    ctx.fillStyle = '#B91C1C';
    ctx.font = `bold ${22 * S}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText('Scan to Share Feedback', W / 2, labelY);

    ctx.fillStyle = '#6B7280';
    ctx.font = `${16 * S}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.fillText(`For ${hostel.name} Guests`, W / 2, labelY + LABEL1_H + LABEL_GAP);

    // ── 5. Download ───────────────────────────────────────────────────────────
    const link = document.createElement('a');
    link.download = `hostel-${hostel.code}-feedback-qr.png`;
    link.href     = canvas.toDataURL('image/png');
    link.click();

  } catch (err) {
    console.error('QR download error:', err);
    alert(`Download failed for ${hostel.name}:\n${err?.message ?? String(err)}`);
  }
}

// ─── Canvas utility ───────────────────────────────────────────────────────────
function canvasRoundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Hostel card ──────────────────────────────────────────────────────────────
function HostelQRCard({ hostel }) {
  const [copied,   setCopied]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading,  setLoading]  = useState(false);

  const feedbackURL = `${GUEST_FEEDBACK_URL}?hostel=${encodeURIComponent(hostel.name)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(feedbackURL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    setLoading(true);
    await downloadQRCard(hostel, feedbackURL);
    setLoading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 overflow-hidden transition-all hover:shadow-xl">
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

      {expanded && (
        <div className="p-6">
          <div className="bg-gradient-to-br from-red-50 to-white p-6 rounded-xl border-2 border-red-100 mb-4">
            <div className="flex flex-col items-center">
              <img src={THAPAR_LOGO} alt="Thapar Logo" className="w-20 h-auto mb-3" />
              <div className="bg-white p-4 rounded-xl shadow-md">
                <QRCodeSVG
                  value={feedbackURL}
                  size={260}
                  level="H"
                  includeMargin={true}
                  imageSettings={{
                    src: THAPAR_LOGO,
                    height: 46,
                    width: 46,
                    excavate: true,
                  }}
                />
              </div>
              <div className="mt-4 text-center">
                <p className="text-md font-semibold text-red-700 mb-1">📱 Scan to Share Feedback</p>
                <p className="text-gray-600 text-sm">For {hostel.name} Guests</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <label className="block text-xs font-semibold text-gray-700 mb-2">Feedback URL:</label>
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
                {copied ? <><Check size={16} /> Copied</> : <><Copy size={16} /> Copy</>}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-2 rounded-lg font-semibold hover:from-red-700 hover:to-red-800 transition flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <Download size={18} />
              {loading ? 'Generating…' : 'Download QR'}
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

// ─── Bulk download ────────────────────────────────────────────────────────────
async function handleDownloadAll() {
  for (const hostel of HOSTELS) {
    const feedbackURL = `${GUEST_FEEDBACK_URL}?hostel=${encodeURIComponent(hostel.name)}`;
    await downloadQRCard(hostel, feedbackURL);
    await new Promise(r => setTimeout(r, 500));
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
function GuestFeedbackQRCode() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">📍 Hostel-Wise Feedback QR Codes</h1>
            <p className="text-gray-600">Generate and download unique QR codes for each hostel</p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={handleDownloadAll}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-semibold hover:from-green-700 hover:to-green-800 transition flex items-center gap-2 shadow-lg"
            >
              <Download size={20} />
              Download All QR Codes ({HOSTELS.length})
            </button>
          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {HOSTELS.map(hostel => (
            <HostelQRCard key={hostel.code} hostel={hostel} />
          ))}
        </div>

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