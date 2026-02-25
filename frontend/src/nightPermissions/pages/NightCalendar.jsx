// frontend/src/pages/Calendar.jsx
import { useState, useEffect } from 'react';
import { fetchCalendar, downloadReport } from '../utils/nightApi';
import { useAuth } from '../../context/AuthContext';
import { Calendar as CalendarIcon, Download, Clock, MapPin, Users, Search, Filter, X } from 'lucide-react';

const STATUS_COLORS = {
  APPROVED: '#10b981', PENDING_ADOSA: '#f59e0b',
  PENDING_PRESIDENT: '#8b5cf6', DRAFT: '#64748b', CANCELLED: '#ef4444',
};

const TABS = [
  { id: 'ALL', label: 'All Events' },
  { id: 'ACTIVE', label: 'Active' },
  { id: 'UPCOMING', label: 'Upcoming' },
  { id: 'PAST', label: 'Past' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export default function Calendar() {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();
  const canDownload = ['admin', 'adosa', 'assistant'].includes(role);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { tab: activeTab };
      if (from) params.from = from;
      if (to)   params.to   = to;
      const res = await fetchCalendar(params);
      setEvents(res.data || []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [from, to, activeTab]);

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
    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
    color: '#1e293b', padding: '8px 12px', fontSize: 13, outline: 'none',
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#1e293b' }}>📅 Calendar</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>{events.length} permission records found</p>
        </div>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#ffffff', padding: '6px 12px', borderRadius: 10, border: '1px solid #e2e8f0' }}>
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>FROM</span>
            <input type="date" style={{ ...inp, border: 'none', background: 'transparent', padding: '4px' }} value={from} onChange={e => setFrom(e.target.value)} />
            <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>TO</span>
            <input type="date" style={{ ...inp, border: 'none', background: 'transparent', padding: '4px' }} value={to} onChange={e => setTo(e.target.value)} />
            {(from || to) && (
              <button onClick={() => { setFrom(''); setTo(''); }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
            )}
          </div>
          
          {canDownload && (
            <button onClick={handleDownload} disabled={downloading} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px', background: '#10b981', border: 'none',
              borderRadius: 10, color: '#ffffff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)'
            }}>
              {downloading ? 'Generating...' : <><Download size={18} /> Export CSV</>}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', background: '#ffffff', padding: '6px', borderRadius: 12, border: '1px solid #e2e8f0', width: 'fit-content' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '8px 16px', borderRadius: 8, border: 'none',
            background: activeTab === tab.id ? '#f59e0b' : 'transparent',
            color: activeTab === tab.id ? '#ffffff' : '#64748b', 
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            transition: 'all 0.2s'
          }}>{tab.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 100, color: '#64748b' }}>Loading calendar...</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#64748b', background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <CalendarIcon size={40} style={{ margin: '0 auto 16px', color: '#cbd5e1' }} />
          <div style={{ fontSize: 16, fontWeight: 600 }}>No events found</div>
          <p style={{ margin: '4px 0 0', fontSize: 14 }}>Try adjusting your filters or switching tabs</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {events.map(e => (
            <div key={e._id} style={{
              background: '#ffffff', border: '1px solid #e2e8f0',
              borderLeft: `4px solid ${STATUS_COLORS[e.status] || '#64748b'}`,
              borderRadius: 16, padding: 20,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: '#1e293b', marginBottom: 8 }}>{e.societyName} — {e.eventName}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#475569', fontSize: 14 }}>
                    <MapPin size={14} style={{ color: '#94a3b8' }} />
                    <span>{e.venueName} {e.venueHall ? `· ${e.venueHall}` : ''}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: 13 }}>
                    <Clock size={14} style={{ color: '#94a3b8' }} />
                    <span>
                      {new Date(e.startDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      {' → '}
                      {new Date(e.endDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{
                  display: 'inline-block', fontSize: 11, padding: '4px 12px', borderRadius: 6, fontFamily: 'monospace', fontWeight: 700,
                  color: STATUS_COLORS[e.status] || '#64748b',
                  background: `${STATUS_COLORS[e.status] || '#64748b'}15`,
                  textTransform: 'uppercase'
                }}>{e.status}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6, color: '#64748b', fontSize: 13, marginTop: 8, fontWeight: 600 }}>
                  <Users size={14} /> {e.students?.length || 0} students
                </div>
              </div>
            </div>
          ))}
        </div>

      )}
    </div>
  );
}
