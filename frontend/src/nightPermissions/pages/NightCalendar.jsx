// frontend/src/pages/Calendar.jsx
import { useState, useEffect } from 'react';
import { fetchCalendar, downloadReport } from '../utils/nightApi';

const STATUS_COLORS = {
  APPROVED: '#4ade80', PENDING_ADOSA: '#f59e0b',
  PENDING_PRESIDENT: '#a78bfa', DRAFT: '#475569',
};

export default function Calendar() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (from) params.from = from;
      if (to)   params.to   = to;
      const res = await fetchCalendar(params);
      setEvents(res.data || []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [from, to]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await downloadReport({ fromDate: from, toDate: to });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a   = document.createElement('a');
      a.href    = url;
      a.download = `night-permissions-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (_) {} finally { setDownloading(false); }
  };

  const inp = {
    background: '#0f1117', border: '1px solid #1e2532', borderRadius: 8,
    color: '#e2e8f0', padding: '8px 12px', fontSize: 13, outline: 'none',
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>📅 Calendar</h1>
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>{events.length} permissions</p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input type="date" style={inp} value={from} onChange={e => setFrom(e.target.value)} />
          <span style={{ color: '#475569', fontSize: 13 }}>to</span>
          <input type="date" style={inp} value={to} onChange={e => setTo(e.target.value)} />
          <button onClick={handleDownload} disabled={downloading} style={{
            padding: '8px 16px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)',
            borderRadius: 8, color: '#4ade80', fontSize: 12, cursor: 'pointer',
          }}>{downloading ? 'Generating...' : '⬇ Download CSV'}</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading...</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569', background: '#0f1117', borderRadius: 12, border: '1px solid #1e2532' }}>
          No events found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {events.map(e => (
            <div key={e._id} style={{
              background: '#0f1117', border: '1px solid #1e2532',
              borderLeft: `3px solid ${STATUS_COLORS[e.status] || '#475569'}`,
              borderRadius: 12, padding: 16,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10,
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{e.societyName} — {e.eventName}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>📍 {e.venueName}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
                  {new Date(e.startDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  {' → '}
                  {new Date(e.endDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: 11, padding: '2px 10px', borderRadius: 6, fontFamily: 'monospace',
                  color: STATUS_COLORS[e.status] || '#94a3b8',
                  background: `${STATUS_COLORS[e.status] || '#94a3b8'}18`,
                }}>{e.status}</div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>👥 {e.students?.length || 0} students</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
