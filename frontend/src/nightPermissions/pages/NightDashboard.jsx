import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchLists, fetchDefaulters, createList, createStudentRequest, fetchSocieties, fetchEvents } from '../utils/nightApi';
import { useSocket } from '../hooks/useNightSocket';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../components/NightToast';
import Toast from '../components/NightToast';
import BookingDetailModal from '../components/BookingDetailModal';
import { Plus, History, Clock, CheckCircle, XCircle, Calendar, Send } from 'lucide-react';

const Card = ({ title, value, sub, color = '#1a73e8', icon }) => (
  <div className="night-card" style={{ borderTop: `4px solid ${color}`, padding: 20 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div className="night-label" style={{ marginBottom: 8 }}>{title}</div>
        <div style={{ fontSize: 32, fontWeight: 800, color: '#202124', lineHeight: 1 }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: '#5f6368', marginTop: 6 }}>{sub}</div>}
      </div>
      <span style={{ fontSize: 28, opacity: 0.8 }}>{icon}</span>
    </div>
  </div>
);

const StatusBadge = ({ status }) => {
  const map = {
    STUDENT_REQUEST:   { color: '#1a73e8', bg: 'rgba(26,115,232,0.1)', label: 'Requested' },
    DRAFT:             { color: '#5f6368', bg: '#f1f3f4', label: 'Draft' },
    PENDING_PRESIDENT: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Pres. Review' },
    PENDING_ADOSA:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'ADOSA Review' },
    APPROVED:          { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Approved' },
    REJECTED:          { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Rejected' },
    CANCELLED:         { color: '#5f6368', bg: '#f1f3f4', label: 'Cancelled' },
  };
  const s = map[status] || { color: '#5f6368', bg: '#f1f3f4', label: status };
  return (
    <span className="night-badge" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  );
};

const Modal = ({ children, onClose, title }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    backdropFilter: 'blur(4px)'
  }}>
    <div onClick={e => e.stopPropagation()} className="night-card" style={{
      width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto', padding: 0
    }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#202124' }}>{title}</h2>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer' }}><XCircle size={24} /></button>
      </div>
      {children}
    </div>
  </div>
);

// ── STUDENT DASHBOARD ────────────────────────────────────────────────────────

const StudentDashboard = ({ user, addToast }) => {
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showPastRequests, setShowPastRequests] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [requests, setRequests] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    societyName: '', eventName: '', startDateTime: '', endDateTime: '', description: '', venueName: 'TIET Campus'
  });

  const [eventSuggestions, setEventSuggestions] = useState([]);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLists({ limit: 20 });
      setRequests(res.data.lists || []);
    } catch (_) {} finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadRequests();
    const loadSuggestions = async () => {
      try {
        const [socRes, evRes] = await Promise.all([fetchSocieties(), fetchEvents()]);
        setSocieties(socRes.data.societies || []);
        setEvents(evRes.data.events || []);
      } catch (_) {}
    };
    loadSuggestions();
  }, [loadRequests]);

  useEffect(() => {
    if (form.eventName.trim().length > 1) {
      const filtered = events.filter(e => 
        e.name.toLowerCase().includes(form.eventName.toLowerCase())
      ).slice(0, 5);
      setEventSuggestions(filtered);
    } else {
      setEventSuggestions([]);
    }
  }, [form.eventName, events]);

  const handleRequest = async (e) => {
    e.preventDefault();
    if (!form.description) { addToast('Description is mandatory', 'error'); return; }
    setSubmitting(true);
    try {
      await createStudentRequest(form);
      addToast('Night pass request submitted!');
      setShowRequestModal(false);
      setForm({ societyName: '', eventName: '', startDateTime: '', endDateTime: '', description: '', venueName: 'TIET Campus' });
      loadRequests();
    } catch (err) {
      addToast(err.response?.data?.message || 'Request failed', 'error');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="night-pass-container" style={{ padding: 32 }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#202124', marginBottom: 12 }}>
            Welcome, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#5f6368', fontSize: 16 }}>Manage your night permissions and track approval status</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          <button 
            onClick={() => setShowRequestModal(true)}
            className="night-card"
            style={{ textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#1a73e8'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#dadce0'; }}
          >
            <div style={{ width: 64, height: 64, background: '#e8f0fe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <Plus size={32} style={{ color: '#1a73e8' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#202124', margin: '0 0 8px' }}>Add Night Pass</h2>
            <p style={{ color: '#5f6368', fontSize: 14, margin: 0 }}>Submit a new request for a night event</p>
          </button>

          <button 
            onClick={() => setShowPastRequests(true)}
            className="night-card"
            style={{ textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.borderColor = '#34a853'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#dadce0'; }}
          >
            <div style={{ width: 64, height: 64, background: '#e6f4ea', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <History size={32} style={{ color: '#34a853' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#202124', margin: '0 0 8px' }}>Past Requests</h2>
            <p style={{ color: '#5f6368', fontSize: 14, margin: 0 }}>Check the status of your previous requests</p>
          </button>
        </div>

        {showRequestModal && (
          <Modal onClose={() => setShowRequestModal(false)} title="New Night Pass Request">
            <form onSubmit={handleRequest} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="night-label">Society *</label>
                <select required className="night-input" value={form.societyName} onChange={e => setForm(f => ({ ...f, societyName: e.target.value }))}>
                  <option value="">Select society...</option>
                  {societies.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              
              <div style={{ position: 'relative' }}>
                <label className="night-label">Event Name *</label>
                <input required className="night-input" value={form.eventName} onChange={e => setForm(f => ({ ...f, eventName: e.target.value }))} placeholder="e.g. Annual Fest" autoComplete="off" />
                {eventSuggestions.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#ffffff', border: '1px solid #dadce0', borderRadius: 10, marginTop: 4, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    {eventSuggestions.map(ev => (
                      <div key={ev._id} onClick={() => { setForm(f => ({ ...f, eventName: ev.name })); setEventSuggestions([]); }} style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 14 }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafd'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {ev.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="night-label">Start Time *</label>
                  <input type="datetime-local" required className="night-input" value={form.startDateTime} onChange={e => setForm(f => ({ ...f, startDateTime: e.target.value }))} />
                </div>
                <div>
                  <label className="night-label">End Time *</label>
                  <input type="datetime-local" required className="night-input" value={form.endDateTime} onChange={e => setForm(f => ({ ...f, endDateTime: e.target.value }))} />
                </div>
              </div>
              
              <div>
                <label className="night-label">Description *</label>
                <textarea required className="night-input" style={{ height: 100, resize: 'none' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Explain why you need this pass..." />
              </div>

              <button type="submit" disabled={submitting} className="night-btn-pill" style={{ width: '100%', justifyContent: 'center', padding: '14px', marginTop: 8 }}>
                {submitting ? 'Submitting...' : <><Send size={18} /> Submit Request</>}
              </button>
            </form>
          </Modal>
        )}

        {showPastRequests && (
          <div style={{ marginTop: 48, animation: 'slideUp 0.3s ease-out' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#202124' }}>Recent Requests</h2>
              <button onClick={() => setShowPastRequests(false)} style={{ background: 'none', border: 'none', color: '#1a73e8', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>Close History</button>
            </div>
            
            {loading ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#5f6368' }}>Loading your history...</div>
            ) : requests.length === 0 ? (
              <div className="night-card" style={{ padding: 48, textAlign: 'center', color: '#5f6368' }}>
                <History size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                <div style={{ fontSize: 16, fontWeight: 600 }}>No requests found</div>
                <p style={{ margin: '4px 0 0' }}>Your submitted requests will appear here</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {requests.map(req => (
                  <div key={req._id} onClick={() => setSelectedBooking(req)} className="night-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, padding: 20, cursor: 'pointer', transition: 'transform 0.2s' }} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17, color: '#202124' }}>{req.societyName} — {req.eventName}</div>
                      <div style={{ fontSize: 14, color: '#5f6368', marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={16} /> {new Date(req.startDateTime).toLocaleDateString('en-IN')}
                        <Clock size={16} style={{ marginLeft: 8 }} /> {new Date(req.startDateTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <StatusBadge status={req.status} />
                      {req.status === 'APPROVED' && (
                        <div style={{ fontSize: 12, color: '#10b981', marginTop: 8, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <CheckCircle size={14} /> READY TO SCAN
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedBooking && <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
      </div>
    </div>
  );
};

// ── STAFF DASHBOARD ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const role = (user?.night?.role || '').toLowerCase();
  const isStudent = role === 'student';

  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, students: 0, defaulters: 0 });
  const [recentLists, setRecentLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const canCreateList = ['gen_sec', 'adosa', 'admin'].includes(role);
  const canScan       = ['caretaker', 'guard', 'adosa', 'admin'].includes(role);
  const canReview     = ['president', 'adosa', 'admin'].includes(role);

  const loadData = useCallback(async () => {
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
        pending: lists.filter(l => ['PENDING_PRESIDENT', 'PENDING_ADOSA', 'DRAFT', 'STUDENT_REQUEST'].includes(l.status)).length,
        defaulters: defRes.data.length,
      });
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    if (!isStudent) loadData(); 
  }, [isStudent, loadData]);

  const socketHandlers = useMemo(() => ({
    'np:list-created': loadData,
    'np:list-approved': loadData,
    'np:list-forwarded': loadData,
    'np:student-defaulter': loadData,
  }), [loadData]);

  useSocket(socketHandlers);

  if (isStudent) return (
    <div className="night-pass-container">
      <Toast toasts={toasts} removeToast={removeToast} />
      <StudentDashboard user={user} addToast={addToast} />
    </div>
  );

  if (loading) return (
    <div className="night-pass-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="spin" style={{ width: 40, height: 40, border: '4px solid #dadce0', borderTopColor: '#1a73e8', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div className="night-pass-container" style={{ padding: 32 }}>
      <Toast toasts={toasts} removeToast={removeToast} />
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#202124', margin: 0, lineHeight: 1.2 }}>
            🌙 Night Permissions
          </h1>
          <p style={{ color: '#5f6368', fontSize: 14, margin: '8px 0 0' }}>
            Thapar Institute — {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, marginBottom: 32 }}>
          <Card title="Total Lists" value={stats.total} icon="📋" color="#1a73e8" />
          <Card title="Approved" value={stats.approved} icon="✅" color="#10b981" />
          <Card title="Pending" value={stats.pending} icon="⏳" color="#f59e0b" />
          <Card title="Defaulters" value={stats.defaulters} icon="🚫" color="#ef4444" />
        </div>

        <div className="night-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 32 }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa' }}>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#202124' }}>Recent Permission Lists</h2>
            <Link to="/night-pass/lists" style={{ fontSize: 13, color: '#1a73e8', textDecoration: 'none', fontWeight: 600 }}>View all →</Link>
          </div>

          {recentLists.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#5f6368', fontSize: 14 }}>
              No permission lists found
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #dadce0', background: '#f8f9fa' }}>
                    {['Society', 'Event', 'Venue', 'Date', 'Students', 'Status'].map(h => (
                      <th key={h} style={{ padding: '12px 24px', textAlign: 'left', fontSize: 12, color: '#5f6368', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentLists.map(list => (
                    <tr key={list._id} onClick={() => setSelectedBooking(list)} style={{ borderBottom: '1px solid #f1f3f4', cursor: 'pointer' }} onMouseEnter={e => e.currentTarget.style.background = '#f8fafd'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px 24px', fontSize: 14, color: '#202124', fontWeight: 600 }}>{list.societyName}</td>
                      <td style={{ padding: '16px 24px', fontSize: 14, color: '#5f6368' }}>{list.eventName}</td>
                      <td style={{ padding: '16px 24px', fontSize: 14, color: '#5f6368' }}>{list.venueName}</td>
                      <td style={{ padding: '16px 24px', fontSize: 13, color: '#5f6368' }}>{new Date(list.startDateTime).toLocaleDateString('en-IN')}</td>
                      <td style={{ padding: '16px 24px', fontSize: 14, color: '#202124', textAlign: 'center' }}>{list.students?.length || 0}</td>
                      <td style={{ padding: '16px 24px' }}><StatusBadge status={list.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {canCreateList && <Link to="/night-pass/lists" className="night-btn-pill">➕ Create List</Link>}
          {canScan && <Link to="/night-pass/scan" className="night-btn-pill" style={{ background: '#34a853' }}>📷 Scan Terminal</Link>}
          {canReview && <Link to="/night-pass/review" className="night-btn-pill" style={{ background: '#8b5cf6' }}>🔍 Review Lists</Link>}
        </div>

        {selectedBooking && <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />}
      </div>
    </div>
  );
}
