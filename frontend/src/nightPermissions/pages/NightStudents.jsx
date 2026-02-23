// frontend/src/pages/Students.jsx
import { useState, useEffect, useRef } from 'react';
import { fetchStudents, uploadStudentsExcel } from '../utils/nightApi';
import { useToast } from '../components/NightToast';
import Toast from '../components/NightToast';

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
      const params = { page, limit: LIMIT };
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

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={{ padding: 24 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>👤 Student Registry</h1>
          <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>{total.toLocaleString()} students</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleUpload} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current.click()} disabled={uploading} style={{
            padding: '10px 18px', background: 'rgba(245,158,11,0.1)',
            border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8,
            color: '#f59e0b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>{uploading ? '⏳ Uploading...' : '📂 Upload Excel'}</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, roll no, email..."
          style={{
            flex: '1 1 240px', background: '#0f1117', border: '1px solid #1e2532', borderRadius: 8,
            color: '#e2e8f0', padding: '10px 14px', fontSize: 13, outline: 'none',
          }}
        />
        <input
          value={hostelFilter} onChange={e => { setHostelFilter(e.target.value); setPage(1); }}
          placeholder="Filter by hostel..."
          style={{
            flex: '1 1 180px', background: '#0f1117', border: '1px solid #1e2532', borderRadius: 8,
            color: '#e2e8f0', padding: '10px 14px', fontSize: 13, outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      <div style={{ background: '#0f1117', border: '1px solid #1e2532', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>Loading...</div>
        ) : students.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#475569' }}>
            {total === 0 ? 'No students in registry. Upload the Excel file to populate.' : 'No students match your search.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e2532' }}>
                  {['Roll No', 'Name', 'Hostel', 'Room', 'Branch', 'Status'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#475569', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s._id} style={{ borderBottom: '1px solid #0d1117' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#131820'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontSize: 12, color: '#f59e0b' }}>{s.rollNo}</td>
                    <td style={{ padding: '10px 16px', fontSize: 13, color: '#e2e8f0' }}>
                      <div>{s.name}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{s.email}</div>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{s.hostel || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8', fontFamily: 'monospace' }}>{s.roomNo || '—'}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{s.branch || '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      {s.defaulterBlocked ? (
                        <span style={{ fontSize: 11, color: '#f87171', background: 'rgba(248,113,113,0.1)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>BLOCKED</span>
                      ) : s.isDefaulter ? (
                        <span style={{ fontSize: 11, color: '#fb923c', background: 'rgba(251,146,60,0.1)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>DEFAULTER ×{s.defaulterCount}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: '#4ade80', background: 'rgba(74,222,128,0.1)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>ACTIVE</span>
                      )}
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{
            padding: '8px 16px', background: '#0f1117', border: '1px solid #1e2532',
            borderRadius: 6, color: '#94a3b8', cursor: 'pointer', fontSize: 13,
          }}>← Prev</button>
          <span style={{ padding: '8px 16px', color: '#64748b', fontSize: 13 }}>
            {page} / {totalPages}
          </span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{
            padding: '8px 16px', background: '#0f1117', border: '1px solid #1e2532',
            borderRadius: 6, color: '#94a3b8', cursor: 'pointer', fontSize: 13,
          }}>Next →</button>
        </div>
      )}
    </div>
  );
}
