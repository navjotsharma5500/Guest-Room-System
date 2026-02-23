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
const ResultCard = ({ result }) => {
  if (!result) return null;
  const isValid     = result.result === 'VALID';
  const isDefaulter = result.result === 'DEFAULTER';
  const color = isValid ? '#4ade80' : isDefaulter ? '#f87171' : '#f59e0b';
  const phase = result.session?.currentPhase;

  return (
    <div style={{
      background: '#0f1117',
      border: `1px solid ${color}55`,
      borderLeft: `4px solid ${color}`,
      borderRadius: 12, padding: 20,
      animation: isDefaulter ? 'shake 0.4s ease' : 'slideIn 0.2s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 36 }}>
          {isValid ? '✅' : isDefaulter ? '🚫' : '⚠️'}
        </span>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.01em' }}>
            {result.result}
          </div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 3 }}>
            {result.reason || result.message}
          </div>
        </div>
      </div>

      {result.student && (
        <div style={{
          marginTop: 16, padding: 14, background: '#0a0d14', borderRadius: 8,
          display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap',
        }}>
          {/* ImageKit profile photo */}
          <div style={{
            width: 60, height: 60, borderRadius: 8, background: '#1e2532',
            overflow: 'hidden', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `2px solid ${color}44`,
          }}>
            {result.student.profileImageUrl ? (
              <img
                src={result.student.profileImageUrl}
                alt={result.student.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span style="font-size:28px">👤</span>'; }}
              />
            ) : <span style={{ fontSize: 28 }}>👤</span>}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: '#e2e8f0' }}>
              {result.student.name}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontFamily: 'monospace', marginTop: 2 }}>
              {result.student.rollNo}
            </div>
            {result.student.hostel && (
              <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                {result.student.hostel}
              </div>
            )}
          </div>

          {phase && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Phase</div>
              <div style={{
                padding: '4px 12px', borderRadius: 6, marginTop: 4,
                fontFamily: 'monospace', fontSize: 12, fontWeight: 700,
                color: PHASES[phase]?.color || '#94a3b8',
                background: `${PHASES[phase]?.color || '#94a3b8'}18`,
              }}>{PHASES[phase]?.label || phase}</div>
              {result.session?.deadlineToVenue && (
                <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 6 }}>
                  ⏰ Reach venue by {new Date(result.session.deadlineToVenue).toLocaleTimeString('en-IN')}
                </div>
              )}
              {result.session?.deadlineToHostel && (
                <div style={{ fontSize: 11, color: '#a78bfa', marginTop: 6 }}>
                  ⏰ Return by {new Date(result.session.deadlineToHostel).toLocaleTimeString('en-IN')}
                </div>
              )}
            </div>
          )}
        </div>
      )}
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
  const role = (user?.role || '').toLowerCase();

  const defaultLocation = role === 'caretaker' ? 'HOSTEL' : role === 'guard' ? 'VENUE' : 'HOSTEL';
  const [scanLocation, setScanLocation]   = useState(defaultLocation);
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

  const inputRef    = useRef(null);
  const scannerRef  = useRef(null);   // html5-qrcode instance
  const viewfinderRef = useRef(null); // DOM element id for scanner

  const VIEWFINDER_ID = 'night-cam-scanner';

  // ── load logs ──────────────────────────────────────────────────────────────
  const loadLogs = async () => {
    try {
      const res = await fetchScanLogs({ limit: 20 });
      setLogs(res.data || []);
    } catch (_) {}
  };

  useEffect(() => { loadLogs(); inputRef.current?.focus(); }, []);

  // ── socket events ──────────────────────────────────────────────────────────
  useSocket({
    'np:student-defaulter': (data) => {
      setResult({ result: 'DEFAULTER', reason: `CRON TIMEOUT: ${data.reason}`, student: { name: data.rollNo, rollNo: data.rollNo } });
    },
  });

  // ── core scan function (shared by both modes) ──────────────────────────────
  const executeScan = useCallback(async (rollNoValue) => {
    const rn = (rollNoValue || '').trim();
    if (!rn || loading) return;

    setLoading(true);
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
  }, [scanLocation, loading, scanMode]);

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
          // Debounce: ignore same value within 3 seconds
          if (decodedText === lastScanned) return;
          setLastScanned(decodedText);

          // Extract roll number — barcode may encode just the number or a URL with it
          const rollNoMatch = decodedText.match(/\b(\d{8,12})\b/);
          const extracted   = rollNoMatch ? rollNoMatch[1] : decodedText.trim();

          // Flash + beep feedback
          const viewfinder = document.getElementById(VIEWFINDER_ID);
          if (viewfinder) {
            viewfinder.style.outline = '4px solid #4ade80';
            setTimeout(() => { if (viewfinder) viewfinder.style.outline = 'none'; }, 400);
          }

          // Execute the scan
          executeScan(extracted);

          // Reset debounce after 4s (allow same card again)
          setTimeout(() => setLastScanned(''), 4000);
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
    <div style={{ padding: 24, maxWidth: 720 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>
          Scan Terminal
        </h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>
          {role === 'caretaker' ? '🏠 Hostel scan mode (Caretaker)' :
           role === 'guard'     ? '🏢 Venue scan mode (Guard)' :
                                  '🔑 Admin scan — select location below'}
        </p>
      </div>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button
          onClick={switchToKeyboard}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
            background: scanMode === 'A' ? '#f59e0b' : '#131820',
            color:      scanMode === 'A' ? '#0a0d14' : '#475569',
          }}>
          ⌨ Mode A — Keyboard Scanner
        </button>
        <button
          onClick={switchToCamera}
          style={{
            flex: 1, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
            background: scanMode === 'B' ? '#2dd4bf' : '#131820',
            color:      scanMode === 'B' ? '#0a0d14' : '#475569',
          }}>
          📷 Mode B — Camera Scan
        </button>
      </div>

      {/* Location Toggle */}
      <div style={{ background: '#0f1117', border: '1px solid #1e2532', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ marginBottom: 12, fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Scan Location
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {['HOSTEL', 'VENUE'].map(loc => (
            <button key={loc}
              disabled={!canChangeLocation && loc !== scanLocation}
              onClick={() => canChangeLocation && setScanLocation(loc)}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 8, border: 'none',
                cursor: canChangeLocation ? 'pointer' : 'default',
                fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
                background: scanLocation === loc
                  ? (loc === 'HOSTEL' ? '#f59e0b' : '#2dd4bf')
                  : '#0a0d14',
                color:  scanLocation === loc ? '#0a0d14' : '#475569',
                opacity: !canChangeLocation && loc !== scanLocation ? 0.35 : 1,
              }}>
              {loc === 'HOSTEL' ? '🏠 HOSTEL' : '🏢 VENUE'}
            </button>
          ))}
        </div>

        {/* ── MODE A: Keyboard / Barcode Gun ── */}
        {scanMode === 'A' && (
          <form onSubmit={handleKeyboardScan}>
            <label style={{ display: 'block', fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Roll Number / Barcode
            </label>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                ref={inputRef}
                value={rollNo}
                onChange={e => setRollNo(e.target.value)}
                placeholder="Scan barcode or type roll number..."
                autoComplete="off"
                style={{
                  flex: 1, background: '#0a0d14',
                  border: '2px solid #1e2532', borderRadius: 8,
                  color: '#e2e8f0', padding: '12px 16px',
                  fontSize: 16, outline: 'none', fontFamily: 'monospace',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => e.target.style.borderColor = '#f59e0b'}
                onBlur={e  => e.target.style.borderColor = '#1e2532'}
              />
              <button type="submit" disabled={loading || !rollNo.trim()} style={{
                padding: '12px 20px', borderRadius: 8, border: 'none',
                background: loading ? '#1e2532' : '#f59e0b',
                color: loading ? '#475569' : '#0a0d14',
                fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
              }}>
                {loading ? '…' : 'Scan →'}
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#475569', marginTop: 8 }}>
              Press Enter · Physical scanner fires Enter automatically
            </div>
          </form>
        )}

        {/* ── MODE B: Camera ── */}
        {scanMode === 'B' && (
          <div>
            {/* Camera selector (if multiple cameras) */}
            {cameras.length > 1 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                  Camera
                </label>
                <select
                  value={selectedCam}
                  onChange={async e => {
                    setSelectedCam(e.target.value);
                    await stopCamera();
                  }}
                  style={{
                    background: '#0a0d14', border: '1px solid #1e2532', borderRadius: 8,
                    color: '#e2e8f0', padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%',
                  }}>
                  {cameras.map(cam => (
                    <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id.slice(0,8)}`}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Error message */}
            {cameraError && (
              <div style={{
                padding: '12px 16px', background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)', borderRadius: 8,
                color: '#f87171', fontSize: 13, marginBottom: 12,
              }}>
                ⚠️ {cameraError}
              </div>
            )}

            {/* Camera viewfinder */}
            <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000', minHeight: 240 }}>
              {/* html5-qrcode renders into this div */}
              <div id={VIEWFINDER_ID} style={{ width: '100%' }} />

              {/* Custom overlay (only shown when camera is active) */}
              {cameraActive && <ScanOverlay />}

              {/* Loading state */}
              {!cameraActive && !cameraError && libLoaded && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 12, color: '#475569',
                }}>
                  <div className="spin" style={{ width: 32, height: 32, border: '3px solid #1e2532', borderTopColor: '#2dd4bf', borderRadius: '50%' }} />
                  <span style={{ fontSize: 13 }}>Starting camera...</span>
                </div>
              )}

              {/* Initial state (enumerating cameras) */}
              {!libLoaded && !cameraError && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 12, color: '#475569',
                }}>
                  <div className="spin" style={{ width: 32, height: 32, border: '3px solid #1e2532', borderTopColor: '#2dd4bf', borderRadius: '50%' }} />
                  <span style={{ fontSize: 13 }}>Detecting cameras...</span>
                </div>
              )}
            </div>

            {/* Camera controls */}
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              {!cameraActive ? (
                <button onClick={startCamera} disabled={!selectedCam || !!cameraError} style={{
                  flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
                  background: (!selectedCam || !!cameraError) ? '#131820' : '#2dd4bf',
                  color: (!selectedCam || !!cameraError) ? '#475569' : '#0a0d14',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>▶ Start Camera</button>
              ) : (
                <button onClick={stopCamera} style={{
                  flex: 1, padding: '11px 0', borderRadius: 8, border: 'none',
                  background: 'rgba(248,113,113,0.1)', color: '#f87171',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  border: '1px solid rgba(248,113,113,0.3)',
                }}>⏹ Stop Camera</button>
              )}
            </div>

            {/* How it works */}
            <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.15)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#2dd4bf', fontWeight: 600, marginBottom: 4 }}>HOW IT WORKS</div>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                Hold the Thapar ID card barcode inside the green frame.
                The camera reads the barcode number and automatically sends it to the scan API —
                same as typing the roll number manually.
                No manual confirm needed.
              </div>
            </div>

            {/* Loading state for processing */}
            {loading && (
              <div style={{
                marginTop: 12, padding: '12px 16px',
                background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)',
                borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div className="spin" style={{ width: 18, height: 18, border: '2px solid #1e2532', borderTopColor: '#2dd4bf', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: '#2dd4bf' }}>Processing scan...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scan Result */}
      {result && (
        <div style={{ marginBottom: 20 }}>
          <ResultCard result={result} />
        </div>
      )}

      {/* Recent scan logs */}
      <div style={{ background: '#0f1117', border: '1px solid #1e2532', borderRadius: 12 }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid #1e2532',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: '#e2e8f0' }}>🕐 Recent Scans</span>
          <button onClick={loadLogs} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 12 }}>
            Refresh
          </button>
        </div>
        {logs.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 13 }}>
            No scans yet this session
          </div>
        ) : (
          <div>
            {logs.slice(0, 12).map((log, i) => (
              <div key={log._id || i} style={{
                padding: '10px 20px', borderBottom: '1px solid #0d1117',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: log.result === 'VALID' ? '#4ade80' : log.result === 'DEFAULTER' ? '#f87171' : '#f59e0b',
                }} />
                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8', minWidth: 110 }}>
                  {log.rollNo}
                </span>
                <span style={{ fontSize: 12, color: '#64748b', flex: 1 }}>
                  {log.scanType?.replace(/_/g, ' ')} · {log.scanLocation}
                </span>
                <span style={{
                  fontSize: 11, padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace',
                  color: log.result === 'VALID' ? '#4ade80' : log.result === 'DEFAULTER' ? '#f87171' : '#f59e0b',
                  background: `${log.result === 'VALID' ? '#4ade80' : log.result === 'DEFAULTER' ? '#f87171' : '#f59e0b'}18`,
                }}>{log.result}</span>
                <span style={{ fontSize: 10, color: '#334155', fontFamily: 'monospace' }}>
                  {new Date(log.scanTime || log.createdAt).toLocaleTimeString('en-IN')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyframe animations */}
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
        @keyframes slideIn {
          from { transform: translateY(-8px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        #${VIEWFINDER_ID} video {
          border-radius: 8px;
        }
        #${VIEWFINDER_ID} img {
          display: none !important;
        }
      `}</style>
    </div>
  );
}