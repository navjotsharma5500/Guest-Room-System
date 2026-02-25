// frontend/src/pages/Scan.jsx
//
// MODE A — Keyboard / Physical Barcode Scanner (always available)
//   Physical scanner fires keystrokes → input field → Enter → processScan()
//
// MODE B — Camera Barcode Scan (html5-qrcode npm package)
//   getUserMedia → live camera feed → decodes barcode from Thapar ID card
//   Extracted roll number → same processScan() → same backend POST /api/night/scan
//   Backend is IDENTICAL for both modes.
//
// The Thapar ID card barcode encodes the roll number (e.g. "102303851")
// html5-qrcode supports Code 128, Code 39, EAN-13, ITF — covers standard ID card barcodes

import { useState, useRef, useEffect, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { processScan, fetchScanLogs } from '../utils/nightApi';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../hooks/useNightSocket';

// ── Phase display config ─────────────────────────────────────────────────────
const PHASES = {
  NOT_STARTED:         { label: 'Not Started',    color: '#475569' },
  GOING_TO_VENUE:      { label: 'Going to Venue', color: '#f59e0b' },
  AT_VENUE:            { label: 'At Venue',        color: '#4ade80' },
  RETURNING_TO_HOSTEL: { label: 'Returning',       color: '#a78bfa' },
  COMPLETED:           { label: 'Completed',       color: '#4ade80' },
  DEFAULTER:           { label: 'DEFAULTER',       color: '#f87171' },
};

// ── Result display card ──────────────────────────────────────────────────────
const ResultModal = ({ result, onClose }) => {
  if (!result) return null;
  const isValid     = result.result === 'VALID';
  const isDefaulter = result.result === 'DEFAULTER';
  const color = isValid ? '#10b981' : isDefaulter ? '#ef4444' : '#f59e0b';
  const phase = result.session?.currentPhase;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999,
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff', width: '100%', maxWidth: 440,
        borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        animation: isDefaulter ? 'shake 0.4s ease' : 'slideUp 0.3s ease-out',
        position: 'relative'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header Status Bar */}
        <div style={{
          background: color, padding: '16px 20px', color: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>{isValid ? '✅' : isDefaulter ? '🚫' : '⚠️'}</span>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.05em' }}>{result.result}</span>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', color: '#ffffff',
            width: 32, height: 32, borderRadius: '50%', cursor: 'pointer',
            fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>×</button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Student Identity Card Section */}
          <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
            {/* Student Photo */}
            <div style={{
              width: 120, height: 140, borderRadius: 12, background: '#f1f5f9',
              overflow: 'hidden', flexShrink: 0, border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {result.student?.profileImageUrl ? (
                <img
                  src={result.student.profileImageUrl}
                  alt={result.student.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={e => { 
                    e.target.style.display = 'none'; 
                    e.target.parentNode.innerHTML = '<div style="font-size:48px">👤</div>'; 
                  }}
                />
              ) : <div style={{ fontSize: 48 }}>👤</div>}
            </div>

            {/* Student Info */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', lineHeight: 1.2 }}>
                {result.student?.name || 'Unknown Student'}
              </div>
              <div style={{ fontSize: 14, color: '#64748b', fontFamily: 'monospace', marginTop: 4, fontWeight: 600 }}>
                {result.student?.rollNo}
              </div>
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hostel & Room</div>
                <div style={{ fontSize: 14, color: '#475569', fontWeight: 500 }}>
                  {result.student?.hostel || 'N/A'} · {result.student?.roomNo || 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Phase & Reason Section */}
          <div style={{ 
            background: '#f8fafc', borderRadius: 12, padding: 16, border: '1px solid #f1f5f9'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Current Phase</div>
                <div style={{
                  display: 'inline-block', padding: '4px 12px', borderRadius: 6,
                  fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                  color: PHASES[phase]?.color || '#64748b',
                  background: `${PHASES[phase]?.color || '#64748b'}15`,
                }}>{PHASES[phase]?.label || phase || 'N/A'}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Scan Time</div>
                <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                  {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Status Message</div>
              <div style={{ fontSize: 14, color: isValid ? '#10b981' : '#ef4444', fontWeight: 600, lineHeight: 1.4 }}>
                {result.reason || result.message}
              </div>
            </div>
          </div>

          {/* Deadline Warning */}
          {(result.session?.deadlineToVenue || result.session?.deadlineToHostel) && (
            <div style={{ 
              marginTop: 16, padding: '12px 16px', borderRadius: 10, 
              background: isValid ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              display: 'flex', alignItems: 'center', gap: 10
            }}>
              <span style={{ fontSize: 20 }}>⏰</span>
              <div style={{ fontSize: 13, fontWeight: 600, color: isValid ? '#059669' : '#dc2626' }}>
                {result.session.deadlineToVenue 
                  ? `Reach venue by ${new Date(result.session.deadlineToVenue).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                  : `Return to hostel by ${new Date(result.session.deadlineToHostel).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                }
              </div>
            </div>
          )}

          {/* Close Action */}
          <button 
            onClick={onClose}
            style={{
              width: '100%', marginTop: 24, padding: '14px', borderRadius: 12,
              background: color, color: '#ffffff', border: 'none',
              fontWeight: 800, fontSize: 15, cursor: 'pointer',
              boxShadow: `0 10px 15px -3px ${color}44`
            }}
          >
            DISMISS
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Camera viewfinder overlay ─────────────────────────────────────────────────
const ScanOverlay = () => (
  <div style={{
    position: 'absolute', inset: 0, pointerEvents: 'none',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }}>
    {/* Dimmed edges */}
    <div style={{
      position: 'absolute', inset: 0,
      background: 'linear-gradient(to bottom, rgba(10,13,20,0.7) 0%, transparent 20%, transparent 80%, rgba(10,13,20,0.7) 100%)',
    }} />
    {/* Scan window */}
    <div style={{
      position: 'relative', width: '75%', height: 100,
      border: '2px solid #2dd4bf',
      borderRadius: 8, boxShadow: '0 0 0 9999px rgba(10,13,20,0.55)',
    }}>
      {/* Corner markers */}
      {[['0%','0%','top','left'],['0%','100%','top','right'],
        ['100%','0%','bottom','left'],['100%','100%','bottom','right']].map(([t,l,vEdge,hEdge],i) => (
        <div key={i} style={{
          position: 'absolute', top: t, left: l,
          width: 20, height: 20,
          borderTop:    vEdge === 'top'    ? '3px solid #2dd4bf' : 'none',
          borderBottom: vEdge === 'bottom' ? '3px solid #2dd4bf' : 'none',
          borderLeft:   hEdge === 'left'   ? '3px solid #2dd4bf' : 'none',
          borderRight:  hEdge === 'right'  ? '3px solid #2dd4bf' : 'none',
          transform: `translate(${hEdge === 'right' ? '50%' : '-50%'}, ${vEdge === 'bottom' ? '50%' : '-50%'})`,
        }} />
      ))}
      {/* Scan line animation */}
      <div style={{
        position: 'absolute', left: 4, right: 4, height: 2,
        background: 'linear-gradient(90deg, transparent, #2dd4bf, transparent)',
        animation: 'scanLine 2s ease-in-out infinite',
      }} />
    </div>
    {/* Guide text */}
    <div style={{
      position: 'absolute', bottom: '18%', left: 0, right: 0,
      textAlign: 'center', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace',
    }}>
      Point camera at barcode on ID card
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════
// MAIN SCAN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function Scan() {
  const { user } = useAuth();
  
  // ✅ Role-based location enforcement
  const role = (user?.role || '').toLowerCase();
  const isCaretaker = role === 'caretaker';
  const isGuard     = role === 'guard';
  // const isPrivileged = ['admin', 'adosa'].includes(role); // (Used in JSX logic below)

  const [scanLocation, setScanLocation] = useState(
    isGuard ? 'VENUE' : 'HOSTEL'
  );

  // If role changes, force correct location
  useEffect(() => {
    if (isGuard) setScanLocation('VENUE');
    else if (isCaretaker) setScanLocation('HOSTEL');
  }, [isGuard, isCaretaker]);

  // ✅ RESTORED ORIGINAL STATE VARIABLES
  const [scanMode,     setScanMode]       = useState('A');  // 'A' = keyboard, 'B' = camera
  const [rollNo,       setRollNo]         = useState('');
  const [result,       setResult]         = useState(null);
  const [loading,      setLoading]        = useState(false);
  const [logs,         setLogs]           = useState([]);

  // Camera state
  const [cameraActive, setCameraActive]   = useState(false);
  const [cameraError,  setCameraError]    = useState('');
  const [libLoaded,    setLibLoaded]      = useState(false);
  const [cameras,      setCameras]        = useState([]);
  const [selectedCam,  setSelectedCam]    = useState('');
  const [lastScanned,  setLastScanned]    = useState('');
  const [lastScanTime, setLastScanTime]   = useState(0);

  const inputRef      = useRef(null);
  const scannerRef    = useRef(null);   // html5-qrcode instance
  const VIEWFINDER_ID = 'night-cam-scanner';

  // Fetch recent logs
  const loadLogs = useCallback(async () => {
    try {
      const res = await fetchScanLogs({ limit: 10 });
      setLogs(res.data.logs || []);
    } catch (_) {}
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  // Handle new logs via socket
  useSocket({
    'np:scan-log': (newLog) => setLogs(prev => [newLog, ...prev].slice(0, 10))
  });

  // ── core scan function (shared by both modes) ──────────────────────────────
  const executeScan = useCallback(async (rollNoValue) => {
    const rn = (rollNoValue || '').trim();
    if (!rn || loading) return;

    // Additional debounce for API calls (5 seconds)
    const now = Date.now();
    if (rn === lastScanned && (now - lastScanTime) < 5000) {
      console.log('Skipping duplicate scan within cooldown period:', rn);
      return;
    }

    setLoading(true);
    setLastScanned(rn);
    setLastScanTime(now);
    setResult(null);
    setRollNo('');

    try {
      const res = await processScan({ rollNo: rn, scanLocation });
      setResult(res.data);
      loadLogs();
    } catch (err) {
      setResult({
        result: 'INVALID',
        reason: err.response?.data?.message || err.response?.data?.reason || 'Scan failed. Check connection.',
      });
    } finally {
      setLoading(false);
      if (scanMode === 'A') setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [scanLocation, loading, scanMode, lastScanned, lastScanTime]);

  // ── Mode A: keyboard form submit ───────────────────────────────────────────
  const handleKeyboardScan = (e) => {
    e.preventDefault();
    executeScan(rollNo);
  };

  // ── Mode B: load library + get cameras ────────────────────────────────────
  const initCameraMode = async () => {
    if (libLoaded) return;
    try {
      // Library is already available via npm import — just enumerate cameras
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError('No cameras found on this device.');
        return;
      }
      setCameras(devices);
      // Prefer back camera for mobile
      const back = devices.find(d => /back|rear|environment/i.test(d.label));
      setSelectedCam((back || devices[devices.length - 1]).id);
      setLibLoaded(true);
    } catch (err) {
      setCameraError('Could not access cameras. Please check permissions.');
    }
  };

  const switchToCamera = async () => {
    setScanMode('B');
    setCameraError('');
    await initCameraMode();
  };

  const switchToKeyboard = () => {
    setScanMode('A');
    stopCamera();
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  // ── Start camera scanning ─────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    if (!selectedCam) return;
    if (scannerRef.current) await stopCamera();

    setCameraError('');
    setCameraActive(true);
    setLastScanned('');

    try {
      const scanner = new Html5Qrcode(VIEWFINDER_ID);
      scannerRef.current = scanner;

      await scanner.start(
        selectedCam,
        {
          fps: 10,
          qrbox: { width: 280, height: 80 },  // wide for linear barcodes on ID cards
          aspectRatio: 1.7778,
          disableFlip: false,
          // Prioritize 1D barcode formats used on ID cards
          formatsToSupport: [
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.ITF,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        },
        (decodedText) => {
          // Extract roll number — barcode may encode just the number or a URL with it
          const rollNoMatch = decodedText.match(/\b(\d{8,12})\b/);
          const extracted   = rollNoMatch ? rollNoMatch[1] : decodedText.trim();

          // Flash feedback
          const viewfinder = document.getElementById(VIEWFINDER_ID);
          if (viewfinder) {
            viewfinder.style.outline = '4px solid #10b981';
            setTimeout(() => { if (viewfinder) viewfinder.style.outline = 'none'; }, 400);
          }

          // Execute the scan (debounce is handled inside executeScan)
          executeScan(extracted);
        },
        (err) => {
          // Scan errors are normal when no barcode in frame — suppress them
        }
      );
    } catch (err) {
      setCameraError(
        err.message?.includes('Permission')
          ? 'Camera permission denied. Please allow camera access in browser settings.'
          : `Camera error: ${err.message}`
      );
      setCameraActive(false);
      scannerRef.current = null;
    }
  }, [selectedCam, lastScanned, executeScan]);

  // ── Stop camera ───────────────────────────────────────────────────────────
  const stopCamera = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch (_) {}
      try { scannerRef.current.clear(); } catch (_) {}
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Auto-start camera when library loaded + camera selected
  useEffect(() => {
    if (scanMode === 'B' && libLoaded && selectedCam && !cameraActive) {
      startCamera();
    }
  }, [scanMode, libLoaded, selectedCam]);

  // Cleanup on unmount
  useEffect(() => () => { stopCamera(); }, []);

  const canChangeLocation = ['adosa', 'admin'].includes(role);

  return (
    <div className="night-pass-container" style={{ padding: 24 }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#202124' }}>
            Scan Terminal
          </h1>
          <p style={{ margin: '4px 0 0', color: '#5f6368', fontSize: 14 }}>
            {role === 'caretaker' ? '🏠 Hostel scan mode (Caretaker)' :
             role === 'guard'     ? '🏢 Venue scan mode (Guard)' :
                                    '🔑 Admin scan — select location below'}
          </p>
        </div>

        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button
            onClick={switchToKeyboard}
            className="night-btn-pill"
            style={{
              flex: 1, background: scanMode === 'A' ? '#1a73e8' : '#ffffff',
              color: scanMode === 'A' ? '#ffffff' : '#5f6368',
              border: scanMode === 'A' ? 'none' : '1px solid #dadce0',
              justifyContent: 'center'
            }}>
            ⌨ Mode A — Keyboard Scanner
          </button>
          <button
            onClick={switchToCamera}
            className="night-btn-pill"
            style={{
              flex: 1, background: scanMode === 'B' ? '#34a853' : '#ffffff',
              color: scanMode === 'B' ? '#ffffff' : '#5f6368',
              border: scanMode === 'B' ? 'none' : '1px solid #dadce0',
              justifyContent: 'center'
            }}>
            📷 Mode B — Camera Scan
          </button>
        </div>

        {/* Main Card */}
        <div className="night-card" style={{ marginBottom: 32 }}>
          <div style={{ marginBottom: 16, fontSize: 12, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
            Scan Location
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
            {['HOSTEL', 'VENUE'].map(loc => (
              <button key={loc}
                disabled={!canChangeLocation && loc !== scanLocation}
                onClick={() => canChangeLocation && setScanLocation(loc)}
                className="night-btn-pill"
                style={{
                  flex: 1, 
                  background: scanLocation === loc
                    ? (loc === 'HOSTEL' ? '#f59e0b' : '#34a853')
                    : '#ffffff',
                  color:  scanLocation === loc ? '#ffffff' : '#5f6368',
                  border: scanLocation === loc ? 'none' : '1px solid #dadce0',
                  opacity: !canChangeLocation && loc !== scanLocation ? 0.35 : 1,
                  justifyContent: 'center'
                }}>
                {loc === 'HOSTEL' ? '🏠 HOSTEL' : '🏢 VENUE'}
              </button>
            ))}
          </div>

          {/* ── MODE A: Keyboard / Barcode Gun ── */}
          {scanMode === 'A' && (
            <form onSubmit={handleKeyboardScan}>
              <label className="night-label">
                Roll Number / Barcode
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <input
                  ref={inputRef}
                  value={rollNo}
                  onChange={e => setRollNo(e.target.value)}
                  placeholder="Scan barcode or type roll number..."
                  className="night-input"
                  autoComplete="off"
                  style={{ flex: 1, fontSize: 16, fontFamily: 'monospace' }}
                />
                <button type="submit" disabled={loading || !rollNo.trim()} className="night-btn-pill">
                  {loading ? '…' : 'Scan →'}
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#5f6368', marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14 }}>ⓘ</span>
                Press Enter · Physical scanner fires Enter automatically
              </div>
            </form>
          )}

          {/* ── MODE B: Camera ── */}
          {scanMode === 'B' && (
            <div>
              {/* Camera selector (if multiple cameras) */}
              {cameras.length > 1 && (
                <div style={{ marginBottom: 16 }}>
                  <label className="night-label">Camera</label>
                  <select
                    className="night-input"
                    value={selectedCam}
                    onChange={async e => {
                      setSelectedCam(e.target.value);
                      await stopCamera();
                    }}
                  >
                    {cameras.map(cam => (
                      <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id.slice(0,8)}`}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Error message */}
              {cameraError && (
                <div style={{
                  padding: '16px', background: '#fef2f2',
                  border: '1px solid #fee2e2', borderRadius: 12,
                  color: '#ef4444', fontSize: 14, marginBottom: 16,
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <span style={{ fontSize: 20 }}>❌</span> {cameraError}
                </div>
              )}

              {/* Camera viewfinder */}
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', minHeight: 280, border: '1px solid #dadce0' }}>
                <div id={VIEWFINDER_ID} style={{ width: '100%' }} />
                {cameraActive && <ScanOverlay />}
                {!cameraActive && !cameraError && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, color: '#ffffff' }}>
                    <div className="spin" style={{ width: 40, height: 40, border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#34a853', borderRadius: '50%' }} />
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{libLoaded ? 'Starting camera...' : 'Detecting cameras...'}</span>
                  </div>
                )}
              </div>

              {/* Camera controls */}
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                {!cameraActive ? (
                  <button onClick={startCamera} disabled={!selectedCam || !!cameraError} className="night-btn-pill" style={{ flex: 1, background: '#34a853', justifyContent: 'center' }}>
                    ▶ Start Camera
                  </button>
                ) : (
                  <button onClick={stopCamera} className="night-btn-pill" style={{ flex: 1, background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', justifyContent: 'center' }}>
                    ⏹ Stop Camera
                  </button>
                )}
              </div>

              {/* How it works */}
              <div style={{ marginTop: 24, padding: '16px', background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: '#0284c7', fontWeight: 800, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>How it works</div>
                <div style={{ fontSize: 13, color: '#0369a1', lineHeight: 1.6 }}>
                  Hold the ID card barcode inside the green frame. The camera reads the number and automatically processes the scan. No manual confirmation required.
                </div>
              </div>

              {loading && (
                <div style={{
                  marginTop: 16, padding: '12px 16px',
                  background: '#e6f4ea', border: '1px solid #ceead6',
                  borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div className="spin" style={{ width: 20, height: 20, border: '3px solid rgba(0,0,0,0.05)', borderTopColor: '#34a853', borderRadius: '50%' }} />
                  <span style={{ fontSize: 14, color: '#137333', fontWeight: 600 }}>Processing scan...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent scan logs */}
        <div className="night-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#202124' }}>🕐 Recent Scans</span>
            <button onClick={loadLogs} style={{ background: 'none', border: 'none', color: '#1a73e8', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              Refresh
            </button>
          </div>
          {logs.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#5f6368', fontSize: 14 }}>
              No scans recorded in this session
            </div>
          ) : (
            <div>
              {logs.slice(0, 12).map((log, i) => (
                <div key={log._id || i} style={{ padding: '12px 20px', borderBottom: '1px solid #f1f3f4', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                    background: log.result === 'VALID' ? '#10b981' : log.result === 'DEFAULTER' ? '#ef4444' : '#f59e0b',
                  }} />
                  <span style={{ fontFamily: 'monospace', fontSize: 13, color: '#202124', fontWeight: 700, minWidth: 100 }}>
                    {log.rollNo}
                  </span>
                  <span style={{ fontSize: 13, color: '#5f6368', flex: 1 }}>
                    {log.scanType?.replace(/_/g, ' ')} · {log.scanLocation}
                  </span>
                  <span className="night-badge" style={{
                    color: log.result === 'VALID' ? '#10b981' : log.result === 'DEFAULTER' ? '#ef4444' : '#f59e0b',
                    background: `${log.result === 'VALID' ? '#10b981' : log.result === 'DEFAULTER' ? '#ef4444' : '#f59e0b'}15`,
                  }}>{log.result}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>
                    {new Date(log.scanTime || log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scan Result Modal */}
      {result && (
        <ResultModal result={result} onClose={() => setResult(null)} />
      )}

      {/* Styles */}
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-10px); }
          40%      { transform: translateX(10px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
        @keyframes scanLine {
          0%   { top: 4px; opacity: 1; }
          50%  { top: calc(100% - 6px); opacity: 0.6; }
          100% { top: 4px; opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        #${VIEWFINDER_ID} video { border-radius: 12px; }
        #${VIEWFINDER_ID} img { display: none !important; }
      `}</style>
    </div>
  );
}