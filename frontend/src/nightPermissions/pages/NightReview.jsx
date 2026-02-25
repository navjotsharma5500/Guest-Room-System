// frontend/src/pages/Review.jsx
import { useState, useEffect } from 'react';
import { Calendar, Clock, X } from 'lucide-react';
import { fetchListsForReview, fetchListById, approveStudents, rejectStudents, sendListForward } from '../utils/nightApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../components/NightToast';
import Toast from '../components/NightToast';

const Modal = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    backdropFilter: 'blur(4px)'
  }}>
    <div onClick={e => e.stopPropagation()} className="night-card" style={{
      width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto', padding: 0
    }}>{children}</div>
  </div>
);

export default function Review() {
  const { user, isAdosa, isPresident } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canSelect = isAdosa() || isPresident();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchListsForReview();
      setLists(res.data.lists || []);
    } catch (err) {
      addToast('Failed to load lists for review', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openList = async (list) => {
    try {
      const res = await fetchListById(list._id);
      setSelected(res.data);
      // Pre-select pending students
      const pending = res.data.students.filter(s => s.status === 'PENDING' || s.status === 'APPROVED').map(s => s.rollNo);
      setSelectedStudents(new Set(pending));
      setRemarks('');
    } catch (err) {
      addToast('Failed to load list detail', 'error');
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await approveStudents(selected._id, {
        approvedRollNos: [...selectedStudents],
        adosaRemarks: remarks,
      });
      addToast(`Approved ${selectedStudents.size} student(s)!`);
      setSelected(null);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Approval failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleForwardToAdosa = async () => {
    if (!selected) return;
    if (selectedStudents.size === 0) { addToast('Select at least one student', 'error'); return; }
    
    setSubmitting(true);
    try {
      await sendListForward(selected._id, {
        selectedRollNos: [...selectedStudents],
        remarks
      });
      addToast(`Forwarded ${selectedStudents.size} student(s) to ADOSA!`);
      setSelected(null);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Forward failed', 'error');
    } finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!selected) return;
    if (!remarks.trim()) { addToast('Rejection reason required', 'error'); return; }
    setSubmitting(true);
    try {
      await rejectStudents(selected._id, { reason: remarks });
      addToast('List rejected');
      setSelected(null);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Rejection failed', 'error');
    } finally { setSubmitting(false); }
  };

  const toggleStudent = (rollNo) => {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(rollNo)) next.delete(rollNo); else next.add(rollNo);
      return next;
    });
  };

  const role = (user?.role || '').toLowerCase();
  const stageLabel = role === 'president' ? 'Pending President Review' : role === 'adosa' || role === 'admin' ? 'Pending ADOSA Approval' : 'Pending Review';

  return (
    <div className="night-pass-container" style={{ padding: 24 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#202124' }}>🔍 Review & Approve</h1>
          <p style={{ margin: '4px 0 0', color: '#5f6368', fontSize: 14 }}>{stageLabel}</p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: '#5f6368' }}>Loading lists...</div>
        ) : lists.length === 0 ? (
          <div className="night-card" style={{
            textAlign: 'center', padding: 80,
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#202124' }}>No lists pending your review</div>
            <p style={{ margin: '8px 0 0', color: '#5f6368' }}>Everything is up to date</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {lists.map(list => (
              <div key={list._id} className="night-card" style={{
                borderLeft: '4px solid #f59e0b', padding: 20,
                cursor: 'pointer', transition: 'transform 0.2s'
              }} onClick={() => openList(list)}
                 onMouseEnter={e => e.currentTarget.style.transform = 'translateX(4px)'}
                 onMouseLeave={e => e.currentTarget.style.transform = 'translateX(0)'}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: '#202124' }}>{list.societyName}</div>
                    <div style={{ color: '#5f6368', fontSize: 14, marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Calendar size={14} style={{ color: '#1a73e8' }} />
                      {list.eventName} · {list.venueName}
                    </div>
                    <div style={{ color: '#5f6368', fontSize: 13, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Clock size={14} style={{ color: '#1a73e8' }} />
                      {new Date(list.startDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontSize: 14, color: '#5f6368', fontWeight: 600 }}>👥 {list.students?.length} students</span>
                    <button className="night-btn-pill" style={{ background: '#e8f0fe', color: '#1a73e8' }}>Review →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, color: '#202124', fontWeight: 700 }}>{selected.societyName}</h2>
              <div style={{ fontSize: 13, color: '#5f6368', marginTop: 4 }}>{selected.eventName} · {selected.venueName}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer' }}><X size={24} /></button>
          </div>

          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#202124', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Students ({selectedStudents.size} selected of {selected.students?.length})
              </span>
              {canSelect && (
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={() => setSelectedStudents(new Set(selected.students.map(s => s.rollNo)))} style={{
                    fontSize: 12, color: '#1a73e8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700
                  }}>Select All</button>
                  <button onClick={() => setSelectedStudents(new Set())} style={{
                    fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700
                  }}>Deselect All</button>
                </div>
              )}
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, background: '#f8f9fa', borderRadius: 12, padding: 12 }}>
              {selected.students?.map(s => (
                <div key={s.rollNo} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', background: '#ffffff', borderRadius: 10,
                  border: selectedStudents.has(s.rollNo) ? '2px solid #1a73e8' : '1px solid #dadce0',
                  cursor: canSelect ? 'pointer' : 'default',
                  transition: 'all 0.2s'
                }} onClick={() => canSelect && toggleStudent(s.rollNo)}>
                  {canSelect && (
                    <div style={{
                      width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                      background: selectedStudents.has(s.rollNo) ? '#1a73e8' : 'transparent',
                      border: `2px solid ${selectedStudents.has(s.rollNo) ? '#1a73e8' : '#dadce0'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: 12
                    }}>
                      {selectedStudents.has(s.rollNo) && '✓'}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: '#202124', fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: '#5f6368', fontFamily: 'monospace', marginTop: 2 }}>{s.rollNo} · {s.hostel || 'Hostel N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {(isAdosa() || isPresident()) && (
            <div style={{ padding: 24, borderTop: '1px solid #dadce0' }}>
              <label className="night-label">
                Remarks {selected.status === 'PENDING_ADOSA' && '(required for rejection)'}
              </label>
              <textarea
                value={remarks} onChange={e => setRemarks(e.target.value)}
                className="night-input"
                style={{ height: 100, resize: 'none' }}
                placeholder="Optional remarks..." />

              <div style={{ display: 'flex', gap: 12, marginTop: 20, justifyContent: 'flex-end' }}>
                <button onClick={handleReject} disabled={submitting} className="night-btn-pill" style={{ background: '#fef2f2', color: '#ef4444' }}>Reject All</button>
                
                {isAdosa() ? (
                   <button onClick={handleApprove} disabled={submitting || selectedStudents.size === 0} className="night-btn-pill">Approve {selectedStudents.size} Selected</button>
                ) : (
                   <button onClick={handleForwardToAdosa} disabled={submitting || selectedStudents.size === 0} className="night-btn-pill" style={{ background: '#8b5cf6' }}>Forward to ADOSA ({selectedStudents.size})</button>
                )}
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
