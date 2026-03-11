import { useState, useEffect, useRef } from 'react';
import { fetchStudents, uploadStudentsExcel, deleteStudent, downloadStudentTemplate } from '../utils/nightApi';
import { useToast } from '../components/NightToast';
import Toast from '../components/NightToast';
import { Search, Trash2, FileSpreadsheet, AlertCircle, Download } from 'lucide-react';

export default function Students() {
  const { toasts, addToast, removeToast } = useToast();
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [hostelFilter, setHostelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const LIMIT = 50;

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, isActive: 'true' };
      if (search.trim()) params.search = search.trim();
      if (hostelFilter) params.hostel = hostelFilter;
      const res = await fetchStudents(params);
      setStudents(res.data.students || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      addToast('Failed to load students', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [search, hostelFilter, page]);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadStudentsExcel(file);
      const d = res.data;
      addToast(`Upload complete: ${d.inserted} inserted, ${d.updated} updated, ${d.skipped} skipped`);
      load();
    } catch (err) {
      addToast(err.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Are you sure you want to deactivate this student? They will no longer be able to access Night Pass features.')) return;
    try {
      await deleteStudent(studentId);
      addToast('Student deactivated');
      load();
    } catch (err) {
      addToast('Failed to deactivate student', 'error');
    }
  };

  const handleTemplateDownload = async () => {
    try {
      const res = await downloadStudentTemplate();
      const blob = new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'night-students-template.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      addToast('Template downloaded');
    } catch (err) {
      addToast(err.response?.data?.message || 'Template download failed', 'error');
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="night-pass-container" style={{ padding: 24 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#202124' }}>👤 Student Registry</h1>
            <p style={{ margin: '4px 0 0', color: '#5f6368', fontSize: 14 }}>{total.toLocaleString()} active students in system</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleTemplateDownload} className="night-btn-pill" style={{ background: '#ffffff', color: '#1a73e8', border: '1px solid #dadce0' }}>
              <Download size={18} /> Download Template
            </button>
            <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current.click()} disabled={uploading} className="night-btn-pill">
              {uploading ? '⏳ Uploading...' : <><FileSpreadsheet size={18} /> Upload Excel</>}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="night-card" style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', padding: 16 }}>
          <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, roll no, email..."
              className="night-input"
              style={{ paddingLeft: 36 }}
            />
          </div>
          <input
            value={hostelFilter} onChange={e => { setHostelFilter(e.target.value); setPage(1); }}
            placeholder="Filter by hostel..."
            className="night-input"
            style={{ flex: '0 1 200px' }}
          />
        </div>

        {/* Table */}
        <div className="night-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 100, textAlign: 'center', color: '#5f6368' }}>Loading students...</div>
          ) : students.length === 0 ? (
            <div style={{ padding: 80, textAlign: 'center', color: '#5f6368' }}>
              <AlertCircle size={48} style={{ margin: '0 auto 16px', color: '#dadce0' }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#202124' }}>No students found</div>
              <p style={{ margin: '4px 0 0' }}>{total === 0 ? 'Upload the Excel file to populate the registry.' : 'Try adjusting your search criteria.'}</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #dadce0' }}>
                    {['Roll No', 'Name', 'Hostel', 'Room', 'Branch', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#5f6368', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s._id} style={{ borderBottom: '1px solid #f1f3f4' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafd'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '16px', fontFamily: 'monospace', fontSize: 13, color: '#1a73e8', fontWeight: 700 }}>{s.rollNo}</td>
                      <td style={{ padding: '16px', fontSize: 14, color: '#202124' }}>
                        <div style={{ fontWeight: 700 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: '#5f6368' }}>{s.email}</div>
                      </td>
                      <td style={{ padding: '16px', fontSize: 13, color: '#5f6368' }}>{s.hostel || '—'}</td>
                      <td style={{ padding: '16px', fontSize: 13, color: '#5f6368', fontFamily: 'monospace' }}>{s.roomNo || '—'}</td>
                      <td style={{ padding: '16px', fontSize: 13, color: '#5f6368' }}>{s.branch || '—'}</td>
                      <td style={{ padding: '16px' }}>
                        {s.defaulterBlocked ? (
                          <span className="night-badge" style={{ color: '#ef4444', background: '#fef2f2' }}>BLOCKED</span>
                        ) : s.isDefaulter ? (
                          <span className="night-badge" style={{ color: '#f59e0b', background: '#fff7ed' }}>DEFAULTER ×{s.defaulterCount}</span>
                        ) : (
                          <span className="night-badge" style={{ color: '#10b981', background: '#e6f4ea' }}>ACTIVE</span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button 
                          onClick={() => handleDelete(s._id)}
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="night-btn-pill" style={{ background: '#ffffff', border: '1px solid #dadce0', color: page === 1 ? '#dadce0' : '#5f6368' }}>← Prev</button>
            <span style={{ padding: '8px 16px', color: '#202124', fontSize: 14, fontWeight: 700 }}>
              {page} / {totalPages}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="night-btn-pill" style={{ background: '#ffffff', border: '1px solid #dadce0', color: page === totalPages ? '#dadce0' : '#5f6368' }}>Next →</button>
          </div>
        )}

        {/* ── Excel Template Note ── */}
        <div style={{ marginTop: 48, background: '#ffffff', border: '1px solid #dadce0', borderRadius: 20, padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <div style={{ padding: 10, background: '#e8f0fe', borderRadius: 12 }}>
              <FileSpreadsheet size={24} style={{ color: '#1a73e8' }} />
            </div>
            <span style={{ fontSize: 18, fontWeight: 800, color: '#202124' }}>Excel Upload — Supported Formats</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 32 }}>
            {/* Format A */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Format A — Thapar ResidentsList
              </div>
              <p style={{ fontSize: 14, color: '#5f6368', marginBottom: 16, lineHeight: 1.6 }}>
                Upload the Excel exported directly from the Thapar hostel portal. The system reads column positions automatically.
              </p>
              <div style={{ fontSize: 12, color: '#5f6368', background: '#f8f9fa', padding: 12, borderRadius: 10, border: '1px solid #f1f3f4' }}>
                <div style={{ marginBottom: 4 }}><strong>Col 1:</strong> Roll No</div>
                <div style={{ marginBottom: 4 }}><strong>Col 4:</strong> Name</div>
                <div style={{ marginBottom: 4 }}><strong>Col 11:</strong> Email</div>
                <div>(and others automatically)</div>
              </div>
            </div>

            {/* Format B */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Format B — Custom Excel
              </div>
              <p style={{ fontSize: 14, color: '#5f6368', marginBottom: 16, lineHeight: 1.6 }}>
                Create your own Excel with headers in <strong>Row 1</strong>. Use these names:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {['rollNo*', 'email*', 'name', 'hostel', 'roomNo', 'branch'].map(h => (
                  <span key={h} style={{ padding: '4px 10px', background: '#f1f3f4', borderRadius: 6, fontSize: 11, fontFamily: 'monospace', color: '#202124', fontWeight: 600 }}>{h}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
