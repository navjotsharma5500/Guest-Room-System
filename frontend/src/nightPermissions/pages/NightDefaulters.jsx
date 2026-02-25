// frontend/src/pages/Defaulters.jsx
import { useState, useEffect } from 'react';
import { fetchDefaulters, rollbackDefaulter } from '../utils/nightApi';
import { useToast } from '../components/NightToast';
import Toast from '../components/NightToast';
import { useSocket } from '../hooks/useNightSocket';

export default function Defaulters() {
  const { toasts, addToast, removeToast } = useToast();
  const [defaulters, setDefaulters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rollbackId, setRollbackId] = useState(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchDefaulters();
      setDefaulters(res.data || []);
    } catch (err) {
      addToast('Failed to load defaulters', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  useSocket({ 'np:student-defaulter': load, 'np:defaulter-rollback': load });

  const handleRollback = async () => {
    if (!reason.trim()) { addToast('Reason required', 'error'); return; }
    setSubmitting(true);
    try {
      await rollbackDefaulter(rollbackId, { reason });
      addToast('Defaulter status rolled back');
      setRollbackId(null);
      setReason('');
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Rollback failed', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="night-pass-container" style={{ padding: 24 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#202124' }}>🚫 Defaulters</h1>
          <p style={{ margin: '4px 0 0', color: '#5f6368', fontSize: 14 }}>
            Students with missed scan deadlines · {defaulters.length} total records
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: '#5f6368' }}>Loading defaulters...</div>
        ) : defaulters.length === 0 ? (
          <div className="night-card" style={{ textAlign: 'center', padding: 80 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#202124' }}>No defaulters</div>
            <p style={{ margin: '8px 0 0', color: '#5f6368' }}>The system is clear</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {defaulters.map(s => (
              <div key={s._id} className="night-card" style={{
                borderLeft: `4px solid ${s.defaulterBlocked ? '#ef4444' : '#f59e0b'}`,
                padding: 20,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
              }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 12, background: '#f1f3f4',
                    overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '1px solid #dadce0'
                  }}>
                    {s.profileImageUrl ? (
                      <img src={s.profileImageUrl} alt={s.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none'; e.target.parentNode.innerHTML = '<span style="font-size:24px">👤</span>'; }}
                      />
                    ) : <span style={{ fontSize: 24 }}>👤</span>}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#202124', fontSize: 17 }}>{s.name}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#1a73e8', fontWeight: 700 }}>{s.rollNo}</div>
                    <div style={{ fontSize: 13, color: '#5f6368', marginTop: 4 }}>{s.hostel} · {s.roomNo}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center', padding: '0 16px', borderRight: '1px solid #dadce0' }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: s.defaulterCount >= 3 ? '#ef4444' : '#f59e0b', lineHeight: 1 }}>
                      {s.defaulterCount}
                    </div>
                    <div style={{ fontSize: 10, color: '#5f6368', textTransform: 'uppercase', fontWeight: 700, marginTop: 4 }}>Strikes</div>
                  </div>

                  {s.defaulterBlocked && (
                    <span className="night-badge" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2' }}>
                      BLOCKED
                    </span>
                  )}

                  {rollbackId === s._id ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        autoFocus
                        value={reason} onChange={e => setReason(e.target.value)}
                        placeholder="Reason for rollback..."
                        className="night-input"
                        style={{ width: 220, padding: '8px 12px' }}
                      />
                      <button onClick={handleRollback} disabled={submitting} className="night-btn-pill" style={{ background: '#10b981', padding: '8px 16px' }}>Confirm</button>
                      <button onClick={() => { setRollbackId(null); setReason(''); }} style={{ background: 'none', border: 'none', color: '#5f6368', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setRollbackId(s._id)} className="night-btn-pill" style={{ background: '#e8f0fe', color: '#1a73e8' }}>
                      Rollback Status
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
