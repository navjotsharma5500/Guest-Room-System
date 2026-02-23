// frontend/src/pages/Dashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchLists, fetchDefaulters, fetchStudents } from '../utils/nightApi';
import { useSocket } from '../hooks/useNightSocket';
import { useAuth } from '../../context/AuthContext';

const Card = ({ title, value, sub, color = '#f59e0b', icon }) => (
  <div style={{
    background: '#0f1117', border: '1px solid #1e2532', borderRadius: 12, padding: 20,
    borderTop: `3px solid ${color}`,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: 11, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 28, opacity: 0.6 }}>{icon}</span>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    DRAFT:             { color: '#475569', bg: '#1e2532', label: 'Draft' },
    PENDING_PRESIDENT: { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)', label: 'Pending President' },
    PENDING_ADOSA:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Pending ADOSA' },
    APPROVED:          { color: '#4ade80', bg: 'rgba(74,222,128,0.1)', label: 'Approved' },
    REJECTED:          { color: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Rejected' },
    CANCELLED:         { color: '#64748b', bg: '#1e2532', label: 'Cancelled' },
  };
  const s = map[status] || { color: '#94a3b8', bg: '#1e2532', label: status };
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
      color: s.color, background: s.bg, fontFamily: 'monospace',
    }}>{s.label}</span>
  );
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, students: 0, defaulters: 0 });
  const [recentLists, setRecentLists] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [listsRes, defRes] = await Promise.all([
        fetchLists({ limit: 5 }),
        fetchDefaulters(),
      ]);

      const lists = listsRes.data.lists || [];
      const total = listsRes.data.total || 0;

      setRecentLists(lists);
      setStats({
        total,
        approved: lists.filter(l => l.status === 'APPROVED').length,
        pending: lists.filter(l => ['PENDING_PRESIDENT', 'PENDING_ADOSA', 'DRAFT'].includes(l.status)).length,
        defaulters: defRes.data.length,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useSocket({
    'np:list-created': loadData,
    'np:list-approved': loadData,
    'np:list-forwarded': loadData,
    'np:student-defaulter': loadData,
  });

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div className="spin" style={{ width: 32, height: 32, border: '3px solid #1e2532', borderTopColor: '#f59e0b', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#f1f5f9', margin: 0, lineHeight: 1.2 }}>
          🌙 Night Permissions
        </h1>
        <p style={{ color: '#475569', fontSize: 14, margin: '6px 0 0' }}>
          Thapar Institute — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 16, marginBottom: 28,
      }}>
        <Card title="Total Lists" value={stats.total} icon="📋" color="#f59e0b" />
        <Card title="Approved" value={stats.approved} icon="✅" color="#4ade80" />
        <Card title="Pending" value={stats.pending} icon="⏳" color="#a78bfa" />
        <Card title="Defaulters" value={stats.defaulters} icon="🚫" color="#f87171" />
      </div>

      {/* Recent Lists */}
      <div style={{ background: '#0f1117', border: '1px solid #1e2532', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #1e2532',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#e2e8f0' }}>Recent Permission Lists</h2>
          <Link to="/night/lists" style={{ fontSize: 12, color: '#f59e0b', textDecoration: 'none' }}>View all →</Link>
        </div>

        {recentLists.length === 0 ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 14 }}>
            No permission lists yet
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e2532' }}>
                  {['Society', 'Event', 'Venue', 'Date', 'Students', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentLists.map(list => (
                  <tr key={list._id} style={{ borderBottom: '1px solid #0d1117' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#131820'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#e2e8f0', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.societyName}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{list.eventName}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8' }}>{list.venueName}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                      {new Date(list.startDateTime).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: '#94a3b8', textAlign: 'center' }}>
                      {list.students?.length || 0}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={list.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div style={{ marginTop: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Link to="/night/lists" style={{
          padding: '10px 20px', background: 'rgba(245,158,11,0.1)',
          border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8,
          color: '#f59e0b', textDecoration: 'none', fontSize: 13, fontWeight: 600,
        }}>➕ Create List</Link>
        <Link to="/night/scan" style={{
          padding: '10px 20px', background: 'rgba(20,184,166,0.1)',
          border: '1px solid rgba(20,184,166,0.3)', borderRadius: 8,
          color: '#2dd4bf', textDecoration: 'none', fontSize: 13, fontWeight: 600,
        }}>📷 Scan Terminal</Link>
        <Link to="/night/review" style={{
          padding: '10px 20px', background: 'rgba(167,139,250,0.1)',
          border: '1px solid rgba(167,139,250,0.3)', borderRadius: 8,
          color: '#a78bfa', textDecoration: 'none', fontSize: 13, fontWeight: 600,
        }}>🔍 Review Lists</Link>
      </div>
    </div>
  );
}
