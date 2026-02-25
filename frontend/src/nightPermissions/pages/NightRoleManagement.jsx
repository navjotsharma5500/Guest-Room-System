import { useState, useEffect } from 'react';
import { fetchRoles, addRole, deleteRole, fetchSocieties, fetchStudentByRollNo } from '../utils/nightApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../components/NightToast';
import Toast from '../components/NightToast';
import { Search, UserPlus, Trash2, Filter, X, ShieldCheck } from 'lucide-react';

const Modal = ({ children, onClose }) => (
  <div onClick={onClose} style={{
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
    zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    backdropFilter: 'blur(4px)'
  }}>
    <div onClick={e => e.stopPropagation()} className="night-card" style={{
      width: '100%', maxWidth: 500, maxHeight: '90vh', overflow: 'auto', padding: 0
    }}>
      {children}
    </div>
  </div>
);

export default function NightRoleManagement() {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();

  const [roles, setRoles] = useState([]);
  const [societies, setSocieties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [societyFilter, setSocietyFilter] = useState('');

  // Add Role Form
  const [form, setForm] = useState({
    rollNo: '',
    role: 'president',
    societies: [],
    email: '', // read-only from student master
    name: ''   // read-only from student master
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [rolesRes, socRes] = await Promise.all([
        fetchRoles({ search, role: roleFilter, society: societyFilter }),
        fetchSocieties()
      ]);
      setRoles(rolesRes.data.roles || []);
      setSocieties(socRes.data.societies || []);
    } catch (err) {
      addToast('Failed to load role data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, roleFilter, societyFilter]);

  const handleRollNoChange = async (val) => {
    const roll = val.toUpperCase();
    setForm(f => ({ ...f, rollNo: roll }));
    
    if (roll.length >= 6) {
      try {
        const res = await fetchStudentByRollNo(roll);
        if (res.data) {
          setForm(f => ({ 
            ...f, 
            email: res.data.email, 
            name: res.data.name 
          }));
        }
      } catch (err) {
        // Not found is fine while typing
        setForm(f => ({ ...f, email: '', name: '' }));
      }
    } else {
      setForm(f => ({ ...f, email: '', name: '' }));
    }
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!form.email) {
      addToast('Student not found in master list', 'error');
      return;
    }
    if (form.societies.length === 0) {
      addToast('Please select at least one society', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await addRole({
        rollNo: form.rollNo,
        role: form.role,
        societies: form.societies
      });
      addToast('Role assigned successfully');
      setShowAddModal(false);
      setForm({ rollNo: '', role: 'president', societies: [], email: '', name: '' });
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add role', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (userId) => {
    if (!window.confirm('Remove this user from their society role? They will become a regular student.')) return;
    try {
      await deleteRole(userId);
      addToast('Role removed');
      loadData();
    } catch (err) {
      addToast('Failed to remove role', 'error');
    }
  };

  const toggleSocietyInForm = (socName) => {
    setForm(f => {
      const exists = f.societies.includes(socName);
      if (exists) {
        return { ...f, societies: f.societies.filter(s => s !== socName) };
      } else {
        return { ...f, societies: [...f.societies, socName] };
      }
    });
  };

  return (
    <div className="night-pass-container" style={{ padding: 24 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#202124' }}>Role Management</h1>
            <p style={{ margin: '4px 0 0', color: '#5f6368', fontSize: 14 }}>Assign President and Gen Sec roles to students</p>
          </div>
          <button 
            onClick={() => setShowAddModal(true)}
            className="night-btn-pill"
          >
            <UserPlus size={18} /> Add Role
          </button>
        </div>

        {/* Filters */}
        <div className="night-card" style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', padding: 16 }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input 
              placeholder="Search by Roll No, Name, or Email..." 
              className="night-input"
              style={{ paddingLeft: 36 }}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="night-input"
            style={{ width: 'auto', minWidth: 150 }}
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="president">President</option>
            <option value="gen_sec">Gen Sec</option>
          </select>
          <select 
            className="night-input"
            style={{ width: 'auto', minWidth: 200 }}
            value={societyFilter}
            onChange={e => setSocietyFilter(e.target.value)}
          >
            <option value="">All Societies</option>
            {societies.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="night-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #dadce0' }}>
                {['Student', 'Role', 'Societies', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#5f6368', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 60, color: '#5f6368' }}>Loading roles...</td></tr>
              ) : roles.length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: 60, color: '#5f6368' }}>No roles found matching your criteria</td></tr>
              ) : (
                roles.map(r => (
                  <tr key={r._id} style={{ borderBottom: '1px solid #f1f3f4' }}>
                    <td style={{ padding: '16px' }}>
                      <div style={{ fontWeight: 700, color: '#202124' }}>{r.name}</div>
                      <div style={{ fontSize: 12, color: '#5f6368', fontFamily: 'monospace' }}>{r.rollNo} · {r.email}</div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className="night-badge" style={{ 
                        background: r.role === 'president' ? '#ede9fe' : '#e0f2fe',
                        color: r.role === 'president' ? '#7c3aed' : '#0369a1'
                      }}>
                        {r.role === 'gen_sec' ? 'Gen Sec' : 'President'}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {r.societies?.map(s => (
                          <span key={s} style={{ padding: '2px 10px', background: '#f1f3f4', border: '1px solid #dadce0', borderRadius: 6, fontSize: 11, color: '#202124', fontWeight: 600 }}>{s}</span>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <button 
                        onClick={() => handleDeleteRole(r._id)}
                        style={{ 
                          padding: '8px', background: 'none', border: 'none', color: '#5f6368', 
                          cursor: 'pointer', borderRadius: '50%', transition: 'all 0.2s',
                          display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#5f6368'; }}
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Modal */}
        {showAddModal && (
          <Modal onClose={() => setShowAddModal(false)}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: 18, color: '#202124', fontWeight: 700 }}>Add Society Role</h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer' }}><X size={24} /></button>
            </div>
            <form onSubmit={handleAddRole} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label className="night-label">Roll Number *</label>
                <input 
                  required 
                  className="night-input" 
                  value={form.rollNo} 
                  onChange={e => handleRollNoChange(e.target.value)} 
                  placeholder="Search by Roll No (e.g. 102316127)" 
                />
              </div>

              {form.name && (
                <div style={{ background: '#e6f4ea', border: '1px solid #ceead6', padding: 16, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ShieldCheck size={24} style={{ color: '#1e8e3e' }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#137333' }}>{form.name}</div>
                    <div style={{ fontSize: 12, color: '#137333' }}>{form.email}</div>
                  </div>
                </div>
              )}

              <div>
                <label className="night-label">Role *</label>
                <select 
                  required 
                  className="night-input" 
                  value={form.role} 
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="president">President</option>
                  <option value="gen_sec">Gen Sec</option>
                </select>
              </div>

              <div>
                <label className="night-label">Societies * (Select one or more)</label>
                <div style={{ 
                  maxHeight: 180, overflowY: 'auto', border: '1px solid #dadce0', borderRadius: 10, 
                  padding: 8, display: 'flex', flexDirection: 'column', gap: 4, background: '#f8fafd'
                }}>
                  {societies.map(s => (
                    <label key={s._id} style={{ 
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', 
                      borderRadius: 8, cursor: 'pointer', fontSize: 14,
                      background: form.societies.includes(s.name) ? '#e8f0fe' : 'transparent',
                      transition: 'background 0.2s'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={form.societies.includes(s.name)}
                        onChange={() => toggleSocietyInForm(s.name)}
                        style={{ width: 16, height: 16, cursor: 'pointer' }}
                      />
                      <span style={{ color: form.societies.includes(s.name) ? '#1a73e8' : '#202124', fontWeight: form.societies.includes(s.name) ? 600 : 400 }}>{s.name}</span>
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: 12, color: '#5f6368', marginTop: 8, fontWeight: 600 }}>
                  {form.societies.length} societies selected
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  style={{ padding: '10px 24px', background: 'none', border: '1px solid #dadce0', borderRadius: 8, color: '#5f6368', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting || !form.email} 
                  className="night-btn-pill"
                  style={{ padding: '10px 32px' }}
                >
                  {submitting ? 'Saving...' : 'Assign Role'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    </div>
  );
}
