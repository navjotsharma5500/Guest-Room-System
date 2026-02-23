// frontend/src/pages/Lists.jsx
import { useState, useEffect } from 'react';
import { fetchLists, fetchStudents, createList, sendListForward, cancelList } from '../utils/nightApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../components/NightToast';
import Toast from '../components/NightToast';
import { useSocket } from '../hooks/useNightSocket';

const TABS = ['ALL', 'DRAFT', 'PENDING_PRESIDENT', 'PENDING_ADOSA', 'APPROVED', 'REJECTED'];

const STATUS_LABELS = {
  ALL: 'All', DRAFT: 'Draft', PENDING_PRESIDENT: 'Pres. Review',
  PENDING_ADOSA: 'ADOSA Review', APPROVED: 'Approved', REJECTED: 'Rejected',
};

const STATUS_COLORS = {
  DRAFT: '#475569', PENDING_PRESIDENT: '#a78bfa', PENDING_ADOSA: '#f59e0b',
  APPROVED: '#4ade80', REJECTED: '#f87171', CANCELLED: '#64748b',
};

const StatusBadge = ({ status }) => (
  <span style={{
    padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
    color: STATUS_COLORS[status] || '#94a3b8',
    background: `${STATUS_COLORS[status] || '#94a3b8'}18`,
    fontFamily: 'monospace',
  }}>{STATUS_LABELS[status] || status}</span>
);

const Modal = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: '#0f1117', border: '1px solid #1e2532', borderRadius: 14,
      width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto',
    }}>
      {children}
    </div>
  </div>
);

const venues = [
  'Senate Hall', 'LHC Auditorium', 'OAT', 'TIET Ground', 'Room 101-A', 'Seminar Hall', 'TAN Auditorium',
];

export default function Lists() {
  const { isGenSec, isAdosa, user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  const [lists, setLists] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Create form state
  const [form, setForm] = useState({
    societyName: '', eventName: '', venueName: '', venueHall: '',
    startDateTime: '', endDateTime: '', description: '', studentRollNos: '',
  });

  const loadLists = async () => {
    setLoading(true);
    try {
      const params = activeTab !== 'ALL' ? { status: activeTab } : {};
      const res = await fetchLists({ ...params, limit: 50 });
      setLists(res.data.lists || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      addToast('Failed to load lists', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLists(); }, [activeTab]);
  useSocket({ 'np:list-created': loadLists, 'np:list-approved': loadLists, 'np:list-forwarded': loadLists });

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const rollNos = form.studentRollNos.split(/[\n,\s]+/).map(s => s.trim()).filter(Boolean);
      if (rollNos.length === 0) { addToast('Add at least one roll number', 'error'); return; }

      await createList({ ...form, studentRollNos: rollNos });
      addToast('Permission list created!');
      setShowCreate(false);
      setForm({ societyName: '', eventName: '', venueName: '', venueHall: '', startDateTime: '', endDateTime: '', description: '', studentRollNos: '' });
      loadLists();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create list', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForward = async (listId, listStatus) => {
    try {
      await sendListForward(listId, {});
      addToast('List forwarded!');
      loadLists();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to forward', 'error');
    }
  };

  const handleCancel = async (listId) => {
    if (!window.confirm('Cancel this permission list?')) return;
    try {
      await cancelList(listId, { reason: 'Cancelled by user' });
      addToast('List cancelled');
      loadLists();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to cancel', 'error');
    }
  };

  const inp = {
    width: '100%', background: '#0a0d14', border: '1px solid #1e2532', borderRadius: 8,
    color: '#e2e8f0', padding: '10px 12px', fontSize: 13, outline: 'none',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ padding: 24 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Permission Lists</h1>
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>{total} total lists</p>
        </div>
        {isGenSec() && (
          <button onClick={() => setShowCreate(true)} style={{
            padding: '10px 20px', background: '#f59e0b', border: 'none', borderRadius: 8,
            color: '#0a0d14', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>+ Create List</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '6px 14px', borderRadius: 6, border: `1px solid ${activeTab === tab ? '#f59e0b' : '#1e2532'}`,
            background: activeTab === tab ? 'rgba(245,158,11,0.1)' : 'transparent',
            color: activeTab === tab ? '#f59e0b' : '#64748b', fontSize: 12, cursor: 'pointer',
          }}>{STATUS_LABELS[tab]}</button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading...</div>
      ) : lists.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569', background: '#0f1117', borderRadius: 12, border: '1px solid #1e2532' }}>
          No lists found{activeTab !== 'ALL' ? ` with status "${activeTab}"` : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {lists.map(list => (
            <div key={list._id} style={{
              background: '#0f1117', border: '1px solid #1e2532', borderRadius: 12, padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 15 }}>{list.societyName}</span>
                    <StatusBadge status={list.status} />
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                    {list.eventName} · {list.venueName}
                  </div>
                  <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>
                    {new Date(list.startDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' → '}
                    {new Date(list.endDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <div style={{ color: '#475569', fontSize: 12, marginTop: 2 }}>
                    👥 {list.students?.length || 0} students ·
                    ✅ {list.students?.filter(s => s.status === 'APPROVED').length || 0} approved ·
                    ❌ {list.students?.filter(s => s.status === 'REJECTED').length || 0} rejected
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {/* Gen Sec can forward DRAFT lists */}
                  {list.status === 'DRAFT' && user?._id === list.createdBy?._id && (
                    <button onClick={() => handleForward(list._id, list.status)} style={{
                      padding: '6px 14px', background: 'rgba(167,139,250,0.1)',
                      border: '1px solid rgba(167,139,250,0.3)', borderRadius: 6,
                      color: '#a78bfa', fontSize: 12, cursor: 'pointer',
                    }}>Forward →</button>
                  )}
                  {/* President can forward PENDING_PRESIDENT */}
                  {list.status === 'PENDING_PRESIDENT' && user?.role?.toLowerCase() === 'president' && (
                    <button onClick={() => handleForward(list._id, list.status)} style={{
                      padding: '6px 14px', background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6,
                      color: '#f59e0b', fontSize: 12, cursor: 'pointer',
                    }}>→ ADOSA</button>
                  )}
                  {isAdosa() && !['CANCELLED', 'REJECTED', 'APPROVED'].includes(list.status) && (
                    <button onClick={() => handleCancel(list._id)} style={{
                      padding: '6px 14px', background: 'rgba(248,113,113,0.1)',
                      border: '1px solid rgba(248,113,113,0.3)', borderRadius: 6,
                      color: '#f87171', fontSize: 12, cursor: 'pointer',
                    }}>Cancel</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e2532', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0, fontSize: 17, color: '#f1f5f9' }}>Create Permission List</h2>
            <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>
          <form onSubmit={handleCreate} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Society Name *</label>
                <input required style={inp} value={form.societyName} onChange={e => setForm(f => ({ ...f, societyName: e.target.value }))} placeholder="Creative Computing Society" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Event Name *</label>
                <input required style={inp} value={form.eventName} onChange={e => setForm(f => ({ ...f, eventName: e.target.value }))} placeholder="Hackathon 2025" />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Venue *</label>
              <select required style={inp} value={form.venueName} onChange={e => setForm(f => ({ ...f, venueName: e.target.value }))}>
                <option value="">Select venue...</option>
                {venues.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date & Time *</label>
                <input type="datetime-local" required style={inp} value={form.startDateTime} onChange={e => setForm(f => ({ ...f, startDateTime: e.target.value }))} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Date & Time *</label>
                <input type="datetime-local" required style={inp} value={form.endDateTime} onChange={e => setForm(f => ({ ...f, endDateTime: e.target.value }))} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</label>
              <textarea style={{ ...inp, height: 80, resize: 'vertical' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Event description..." />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Roll Numbers * (comma/newline separated)</label>
              <textarea required style={{ ...inp, height: 100, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
                value={form.studentRollNos} onChange={e => setForm(f => ({ ...f, studentRollNos: e.target.value }))}
                placeholder={"102316127\n102316128\n102316129"} />
              <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                {form.studentRollNos.split(/[\n,\s]+/).filter(Boolean).length} roll numbers entered
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
              <button type="button" onClick={() => setShowCreate(false)} style={{
                padding: '10px 20px', background: 'transparent', border: '1px solid #1e2532',
                borderRadius: 8, color: '#64748b', cursor: 'pointer', fontSize: 13,
              }}>Cancel</button>
              <button type="submit" disabled={submitting} style={{
                padding: '10px 24px', background: submitting ? '#475569' : '#f59e0b',
                border: 'none', borderRadius: 8, color: '#0a0d14', fontWeight: 700,
                fontSize: 13, cursor: submitting ? 'not-allowed' : 'pointer',
              }}>{submitting ? 'Creating...' : 'Create List'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
