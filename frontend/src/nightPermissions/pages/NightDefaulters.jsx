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
    <div style={{ padding: 24 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>🚫 Defaulters</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>
          Students with missed scan deadlines · {defaulters.length} total
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading...</div>
      ) : defaulters.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#4ade80', background: '#0f1117', borderRadius: 12, border: '1px solid #1e2532' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No defaulters</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {defaulters.map(s => (
            <div key={s._id} style={{
              background: '#0f1117', border: '1px solid #1e2532',
              borderLeft: `3px solid ${s.defaulterBlocked ? '#f87171' : '#fb923c'}`,
              borderRadius: 12, padding: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {/* Profile image from ImageKit */}
                <div style={{
                  width: 44, height: 44, borderRadius: 8, background: '#1e2532',
                  overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {s.profileImageUrl ? (
                    <img src={s.profileImageUrl} alt={s.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={e => { e.target.style.display = 'none'; }}
                    />
                  ) : <span style={{ fontSize: 20 }}>👤</span>}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{s.name}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{s.rollNo}</div>
                  <div style={{ fontSize: 12, color: '#475569' }}>{s.hostel} · {s.roomNo}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.defaulterCount >= 3 ? '#f87171' : '#fb923c' }}>
                    {s.defaulterCount}
                  </div>
                  <div style={{ fontSize: 10, color: '#475569', textTransform: 'uppercase' }}>Strikes</div>
                </div>

                {s.defaulterBlocked && (
                  <span style={{ padding: '4px 10px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6, fontSize: 11, color: '#f87171', fontFamily: 'monospace' }}>
                    BLOCKED
                  </span>
                )}

                {rollbackId === s._id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      autoFocus
                      value={reason} onChange={e => setReason(e.target.value)}
                      placeholder="Reason for rollback..."
                      style={{
                        background: '#0a0d14', border: '1px solid #1e2532', borderRadius: 6,
                        color: '#e2e8f0', padding: '8px 12px', fontSize: 12, outline: 'none',
                        width: 200,
                      }}
                    />
                    <button onClick={handleRollback} disabled={submitting} style={{
                      padding: '8px 14px', background: '#4ade80', border: 'none', borderRadius: 6,
                      color: '#0a0d14', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    }}>Confirm</button>
                    <button onClick={() => { setRollbackId(null); setReason(''); }} style={{
                      padding: '8px 12px', background: 'none', border: '1px solid #1e2532', borderRadius: 6,
                      color: '#64748b', fontSize: 12, cursor: 'pointer',
                    }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setRollbackId(s._id)} style={{
                    padding: '8px 16px', background: 'rgba(74,222,128,0.1)',
                    border: '1px solid rgba(74,222,128,0.3)', borderRadius: 6,
                    color: '#4ade80', fontSize: 12, cursor: 'pointer',
                  }}>Rollback</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
