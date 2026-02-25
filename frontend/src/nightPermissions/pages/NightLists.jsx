import { useState, useEffect, useMemo } from 'react';
import { fetchLists, fetchStudents, createList, sendListForward, cancelList, searchStudents, fetchEvents, fetchSocieties } from '../utils/nightApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../components/NightToast';
import Toast from '../components/NightToast';
import { useSocket } from '../hooks/useNightSocket';
import { getEnabledVenueFormOptions } from '../../config/venueRoomsConfig';
import { Search, Plus, Calendar, Clock, MapPin, Users, Send, CheckCircle, XCircle, Trash2, X, ChevronDown, Filter } from 'lucide-react';

const TABS = ['ALL', 'DRAFT', 'PENDING_PRESIDENT', 'PENDING_ADOSA', 'APPROVED', 'REJECTED'];

const STATUS_LABELS = {
  ALL: 'All', DRAFT: 'Draft', PENDING_PRESIDENT: 'Pres. Review',
  PENDING_ADOSA: 'ADOSA Review', APPROVED: 'Approved', REJECTED: 'Rejected',
};

const STATUS_COLORS = {
  DRAFT: '#64748b', PENDING_PRESIDENT: '#8b5cf6', PENDING_ADOSA: '#f59e0b',
  APPROVED: '#10b981', REJECTED: '#ef4444', CANCELLED: '#64748b',
};

const StatusBadge = ({ status }) => (
  <span className="night-badge" style={{
    color: STATUS_COLORS[status] || '#64748b',
    background: `${STATUS_COLORS[status] || '#64748b'}15`,
  }}>{STATUS_LABELS[status] || status}</span>
);

const Modal = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    backdropFilter: 'blur(4px)'
  }}>
    <div onClick={e => e.stopPropagation()} className="night-card" style={{
      width: '100%', maxWidth: 640, maxHeight: '92vh', overflow: 'auto', padding: 0
    }}>
      {children}
    </div>
  </div>
);

export default function Lists() {
  const { isGenSec, isAdosa, user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const role = (user?.role || '').toLowerCase();
  const societies = user?.societies || [];

  const [lists, setLists] = useState([]);
  const [total, setTotal] = useState(0);
  const [activeTab, setActiveTab] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Suggestions state
  const [allSocieties, setAllSocieties] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [eventSuggestions, setEventSuggestions] = useState([]);

  // Venue Options
  const venueOptions = useMemo(() => getEnabledVenueFormOptions(), []);

  // Create form state
  const [form, setForm] = useState({
    societyName: '', eventName: '', venueName: '', venueHall: '',
    startDateTime: '', endDateTime: '', description: '', studentRollNos: [],
  });

  // Roll No input state
  const [rollInput, setRollInput] = useState('');
  const [rollSuggestions, setRollSuggestions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

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

  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const [socRes, evRes] = await Promise.all([fetchSocieties(), fetchEvents()]);
        setAllSocieties(socRes.data.societies || []);
        setAllEvents(evRes.data.events || []);
      } catch (_) {}
    };
    loadSuggestions();
  }, []);

  // Filter event suggestions as user types
  useEffect(() => {
    if (form.eventName.trim().length > 1) {
      const filtered = allEvents.filter(e => 
        e.name.toLowerCase().includes(form.eventName.toLowerCase())
      ).slice(0, 5);
      setEventSuggestions(filtered);
    } else {
      setEventSuggestions([]);
    }
  }, [form.eventName, allEvents]);

  // Student Search
  useEffect(() => {
    if (rollInput.length < 3) {
      setRollSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await searchStudents(rollInput);
        setRollSuggestions(res.data || []);
      } catch (_) {}
    }, 300);
    return () => clearTimeout(timer);
  }, [rollInput]);

  const addStudentToList = (student) => {
    if (selectedStudents.find(s => s.rollNo === student.rollNo)) {
      addToast('Student already added', 'warning');
      return;
    }
    setSelectedStudents([...selectedStudents, student]);
    setRollInput('');
    setRollSuggestions([]);
  };

  const removeStudentFromList = (rollNo) => {
    setSelectedStudents(selectedStudents.filter(s => s.rollNo !== rollNo));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (selectedStudents.length === 0) {
      addToast('Please add at least one student', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        studentRollNos: selectedStudents.map(s => s.rollNo)
      };
      await createList(payload);
      addToast('Permission list created!');
      setShowCreate(false);
      resetForm();
      loadLists();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create list', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({ societyName: '', eventName: '', venueName: '', venueHall: '', startDateTime: '', endDateTime: '', description: '', studentRollNos: [] });
    setSelectedStudents([]);
    setRollInput('');
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

  return (
    <div className="night-pass-container" style={{ padding: 24 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#202124' }}>Permission Lists</h1>
            <p style={{ margin: '4px 0 0', color: '#5f6368', fontSize: 14 }}>{total} total lists found</p>
          </div>
          {isGenSec() && (
            <button onClick={() => setShowCreate(true)} className="night-btn-pill">
              <Plus size={18} /> Create List
            </button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap', background: '#ffffff', padding: '6px', borderRadius: 12, border: '1px solid #dadce0', width: 'fit-content' }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 16px', borderRadius: 8, border: 'none',
              background: activeTab === tab ? '#1a73e8' : 'transparent',
              color: activeTab === tab ? '#ffffff' : '#5f6368', 
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s'
            }}>{STATUS_LABELS[tab]}</button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 100, color: '#5f6368' }}>Loading lists...</div>
        ) : lists.length === 0 ? (
          <div className="night-card" style={{ textAlign: 'center', padding: 80 }}>
            <Search size={48} style={{ margin: '0 auto 16px', color: '#dadce0' }} />
            <div style={{ fontSize: 18, fontWeight: 700, color: '#202124' }}>No lists found</div>
            <p style={{ margin: '8px 0 0', fontSize: 14, color: '#5f6368' }}>{activeTab !== 'ALL' ? `Try switching from "${STATUS_LABELS[activeTab]}" to "All"` : 'Create a new list to get started'}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {lists.map(list => (
              <div key={list._id} className="night-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ flex: 1, minWidth: 280 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                      <span style={{ fontWeight: 800, color: '#202124', fontSize: 18 }}>{list.societyName}</span>
                      <StatusBadge status={list.status} />
                    </div>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#202124', fontSize: 14 }}>
                        <Calendar size={16} style={{ color: '#1a73e8' }} />
                        <span style={{ fontWeight: 600 }}>{list.eventName}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5f6368', fontSize: 14 }}>
                        <MapPin size={16} style={{ color: '#1a73e8' }} />
                        <span>{list.venueName} {list.venueHall ? `· ${list.venueHall}` : ''}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5f6368', fontSize: 13 }}>
                        <Clock size={16} style={{ color: '#1a73e8' }} />
                        <span>
                          {new Date(list.startDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          {' → '}
                          {new Date(list.endDateTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5f6368', fontSize: 13 }}>
                        <Users size={16} style={{ color: '#1a73e8' }} />
                        <span>{list.students?.length || 0} students · {list.students?.filter(s => s.status === 'APPROVED').length || 0} approved</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignSelf: 'center' }}>
                    {list.status === 'DRAFT' && user?._id === list.createdBy?._id && (
                      <button onClick={() => handleForward(list._id, list.status)} className="night-btn-pill" style={{ background: '#ede9fe', color: '#7c3aed' }}>
                        <Send size={16} /> Forward
                      </button>
                    )}
                    {list.status === 'PENDING_PRESIDENT' && role === 'president' && (
                      <button onClick={() => handleForward(list._id, list.status)} className="night-btn-pill" style={{ background: '#fff7ed', color: '#f59e0b' }}>
                        <CheckCircle size={16} /> To ADOSA
                      </button>
                    )}
                    {isAdosa() && !['CANCELLED', 'REJECTED', 'APPROVED'].includes(list.status) && (
                      <button onClick={() => handleCancel(list._id)} className="night-btn-pill" style={{ background: '#fef2f2', color: '#ef4444' }}>
                        <XCircle size={16} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <div style={{ padding: '24px 28px', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, color: '#202124', fontWeight: 800 }}>Create Permission List</h2>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#5f6368' }}>Submit students for night event permission</p>
            </div>
            <button onClick={() => setShowCreate(false)} style={{ background: '#f1f5f9', border: 'none', color: '#5f6368', cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
          </div>
          
          <form onSubmit={handleCreate} style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label className="night-label">Society Name *</label>
                {societies.length > 0 && !isAdosa() ? (
                  <select required className="night-input" value={form.societyName} onChange={e => setForm(f => ({ ...f, societyName: e.target.value }))}>
                    <option value="">Select society...</option>
                    {societies.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input required className="night-input" value={form.societyName} onChange={e => setForm(f => ({ ...f, societyName: e.target.value }))} placeholder="e.g. Creative Computing Society" />
                )}
              </div>
              
              <div style={{ position: 'relative' }}>
                <label className="night-label">Event Name *</label>
                <input 
                  required 
                  className="night-input" 
                  value={form.eventName} 
                  onChange={e => setForm(f => ({ ...f, eventName: e.target.value }))} 
                  placeholder="e.g. Hackathon 2025"
                  autoComplete="off"
                />
                {eventSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                    background: '#ffffff', border: '1px solid #dadce0', borderRadius: 10,
                    marginTop: 4, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', overflow: 'hidden'
                  }}>
                    {eventSuggestions.map(ev => (
                      <div 
                        key={ev._id}
                        onClick={() => { setForm(f => ({ ...f, eventName: ev.name })); setEventSuggestions([]); }}
                        style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 14 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafd'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {ev.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="night-label">Venue *</label>
              <select required className="night-input" value={`${form.venueHall}||${form.venueName}`} onChange={e => {
                const [hall, room] = e.target.value.split('||');
                setForm(f => ({ ...f, venueHall: hall, venueName: room }));
              }}>
                <option value="">Select venue...</option>
                {venueOptions.map(group => (
                  <optgroup key={group.groupId} label={group.groupLabel}>
                    {group.rooms.map(room => (
                      <option key={`${group.hall}||${room}`} value={`${group.hall}||${room}`}>{room}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <label className="night-label">Start Date & Time *</label>
                <input type="datetime-local" required className="night-input" value={form.startDateTime} onChange={e => setForm(f => ({ ...f, startDateTime: e.target.value }))} />
              </div>
              <div>
                <label className="night-label">End Date & Time *</label>
                <input type="datetime-local" required className="night-input" value={form.endDateTime} onChange={e => setForm(f => ({ ...f, endDateTime: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="night-label">Description</label>
              <textarea className="night-input" style={{ height: 80, resize: 'none' }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Briefly describe the event purpose..." />
            </div>

            <div style={{ borderTop: '1px solid #dadce0', paddingTop: 24 }}>
              <label className="night-label">Add Students *</label>
              
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input 
                    className="night-input" 
                    style={{ paddingLeft: 36 }} 
                    placeholder="Search student by Roll No or Name..." 
                    value={rollInput}
                    onChange={e => setRollInput(e.target.value)}
                  />
                </div>
                
                {rollSuggestions.length > 0 && (
                  <div style={{ 
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                    background: '#ffffff', border: '1px solid #dadce0', borderRadius: 8,
                    marginTop: 4, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    maxHeight: 200, overflowY: 'auto'
                  }}>
                    {rollSuggestions.map(s => (
                      <div 
                        key={s.rollNo}
                        onClick={() => addStudentToList(s)}
                        style={{ 
                          padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#202124' }}>{s.name}</div>
                          <div style={{ fontSize: 11, color: '#5f6368', fontFamily: 'monospace' }}>{s.rollNo} · {s.hostel}</div>
                        </div>
                        <Plus size={14} style={{ color: '#1a73e8' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Students Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 120, overflowY: 'auto', padding: 4 }}>
                {selectedStudents.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#5f6368', fontStyle: 'italic', padding: '8px 0' }}>No students added yet. Use search above.</div>
                ) : (
                  selectedStudents.map(s => (
                    <div key={s.rollNo} style={{ 
                      display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                      background: '#f1f5f9', border: '1px solid #dadce0', borderRadius: 20,
                      fontSize: 12, color: '#202124'
                    }}>
                      <span style={{ fontWeight: 700 }}>{s.rollNo}</span>
                      <span style={{ color: '#5f6368' }}>{s.name}</span>
                      <button 
                        type="button"
                        onClick={() => removeStudentFromList(s.rollNo)}
                        style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer', display: 'flex', padding: 0 }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div style={{ fontSize: 11, color: '#5f6368', marginTop: 12, fontWeight: 700, textTransform: 'uppercase' }}>
                {selectedStudents.length} students selected
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12, borderTop: '1px solid #dadce0', paddingTop: 24 }}>
              <button type="button" onClick={() => setShowCreate(false)} style={{
                padding: '12px 24px', background: 'none', border: '1px solid #dadce0',
                borderRadius: 10, color: '#5f6368', cursor: 'pointer', fontSize: 14, fontWeight: 600
              }}>Cancel</button>
              <button type="submit" disabled={submitting} className="night-btn-pill" style={{ padding: '12px 28px' }}>
                {submitting ? 'Creating...' : <><Plus size={18} /> Create List</>}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
