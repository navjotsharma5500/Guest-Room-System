// frontend/src/pages/Review.jsx
import { useState, useEffect } from 'react';
import { fetchListsForReview, fetchListById, approveStudents, rejectStudents } from '../utils/nightApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../components/NightToast';
import Toast from '../components/NightToast';

const Modal = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  }}>
    <div onClick={e => e.stopPropagation()} style={{
      background: '#0f1117', border: '1px solid #1e2532', borderRadius: 14,
      width: '100%', maxWidth: 680, maxHeight: '92vh', overflow: 'auto',
    }}>{children}</div>
  </div>
);

export default function Review() {
  const { user, isAdosa } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
      setSelectedStudents(new Set(res.data.students.map(s => s.rollNo)));
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
    <div style={{ padding: 24 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>🔍 Review & Approve</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>{stageLabel}</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#475569' }}>Loading...</div>
      ) : lists.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60, color: '#475569',
          background: '#0f1117', borderRadius: 12, border: '1px solid #1e2532',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>No lists pending your review</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {lists.map(list => (
            <div key={list._id} style={{
              background: '#0f1117', border: '1px solid #1e2532',
              borderLeft: '3px solid #f59e0b', borderRadius: 12, padding: 16,
              cursor: 'pointer',
            }} onClick={() => openList(list)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#e2e8f0' }}>{list.societyName}</div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>
                    {list.eventName} · {list.venueName}
                  </div>
                  <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>
                    {new Date(list.startDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 13, color: '#94a3b8' }}>👥 {list.students?.length} students</span>
                  <button style={{
                    padding: '8px 16px', background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8,
                    color: '#f59e0b', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  }}>Review →</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #1e2532', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, color: '#f1f5f9' }}>{selected.societyName}</h2>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{selected.eventName} · {selected.venueName}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: 20 }}>×</button>
          </div>

          <div style={{ padding: '0 24px', paddingTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>
                Students ({selectedStudents.size} selected of {selected.students?.length})
              </span>
              {isAdosa() && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setSelectedStudents(new Set(selected.students.map(s => s.rollNo)))} style={{
                    fontSize: 11, color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer',
                  }}>Select All</button>
                  <button onClick={() => setSelectedStudents(new Set())} style={{
                    fontSize: 11, color: '#f87171', background: 'none', border: 'none', cursor: 'pointer',
                  }}>Deselect All</button>
                </div>
              )}
            </div>

            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selected.students?.map(s => (
                <div key={s.rollNo} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', background: '#0a0d14', borderRadius: 8,
                  border: selectedStudents.has(s.rollNo) ? '1px solid rgba(74,222,128,0.3)' : '1px solid #1e2532',
                  cursor: isAdosa() ? 'pointer' : 'default',
                }} onClick={() => isAdosa() && toggleStudent(s.rollNo)}>
                  {isAdosa() && (
                    <div style={{
                      width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                      background: selectedStudents.has(s.rollNo) ? '#4ade80' : 'transparent',
                      border: `2px solid ${selectedStudents.has(s.rollNo) ? '#4ade80' : '#475569'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11,
                    }}>
                      {selectedStudents.has(s.rollNo) && '✓'}
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace' }}>{s.rollNo} · {s.hostel || 'Hostel N/A'}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isAdosa() && (
            <div style={{ padding: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Remarks {selected.status === 'PENDING_ADOSA' && '(required for rejection)'}
              </label>
              <textarea
                value={remarks} onChange={e => setRemarks(e.target.value)}
                style={{
                  width: '100%', background: '#0a0d14', border: '1px solid #1e2532', borderRadius: 8,
                  color: '#e2e8f0', padding: '10px 12px', fontSize: 13, outline: 'none',
                  height: 80, resize: 'vertical', boxSizing: 'border-box',
                }} placeholder="Optional remarks..." />

              <div style={{ display: 'flex', gap: 10, marginTop: 14, justifyContent: 'flex-end' }}>
                <button onClick={handleReject} disabled={submitting} style={{
                  padding: '10px 20px', background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.4)', borderRadius: 8,
                  color: '#f87171', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>Reject All</button>
                <button onClick={handleApprove} disabled={submitting || selectedStudents.size === 0} style={{
                  padding: '10px 24px', background: submitting ? '#475569' : '#4ade80',
                  border: 'none', borderRadius: 8, color: '#0a0d14',
                  fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}>Approve {selectedStudents.size} Selected</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
