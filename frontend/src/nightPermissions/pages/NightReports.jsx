import { useState, useEffect } from 'react';
import { downloadReport, fetchSocieties } from '../utils/nightApi';
import { useAuth } from '../../context/AuthContext'; // ✅ Added AuthContext
import { useToast } from '../components/NightToast';
import Toast from '../components/NightToast';
import { FileDown, Calendar, Filter, Download, AlertCircle, BarChart3, Lock } from 'lucide-react';

export default function NightReports() {
  const { user } = useAuth(); // ✅ Get user role
  const { toasts, addToast, removeToast } = useToast();
  const [societies, setSocieties] = useState([]);
  const [downloading, setDownloading] = useState(false);

  // ✅ Permission Check: ADMIN, ADOSA, ASSISTANT only
  const role = (user?.role || '').toLowerCase();
  const canDownload = ['admin', 'adosa', 'assistant'].includes(role);

  // Filters
  const [filters, setForm] = useState({
    fromDate: '',
    toDate: '',
    society: '',
    status: ''
  });

  useEffect(() => {
    const loadSocieties = async () => {
      try {
        const res = await fetchSocieties();
        setSocieties(res.data.societies || []);
      } catch (_) {}
    };
    if (canDownload) {
      loadSocieties();
    }
  }, [canDownload]);

  if (!canDownload) {
    return (
      <div className="night-pass-container" style={{ padding: 48, textAlign: 'center' }}>
        <div style={{ background: '#fef2f2', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Lock size={32} color="#ef4444" />
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#202124', marginBottom: 12 }}>Access Restricted</h2>
        <p style={{ color: '#5f6368' }}>Only Admins, ADOSA, and Assistants can download reports.</p>
      </div>
    );
  }

  const handleDownload = async (e) => {
    e.preventDefault();
    if (!filters.fromDate || !filters.toDate) {
      addToast('Please select a date range', 'error');
      return;
    }

    setDownloading(true);
    try {
      const res = await downloadReport(filters);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `night-report-${filters.fromDate}-to-${filters.toDate}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      addToast('Report generated successfully');
    } catch (err) {
      addToast('Failed to generate report', 'error');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="night-pass-container" style={{ padding: 24 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#202124' }}>📊 Reports & Downloads</h1>
          <p style={{ margin: '4px 0 0', color: '#5f6368', fontSize: 14 }}>Export night permission data to CSV for administration</p>
        </div>

        <div className="night-card" style={{ padding: 32 }}>
          <form onSubmit={handleDownload} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            
            {/* Date Range Section */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: 8, background: '#fff7ed', borderRadius: 8 }}>
                  <Calendar size={20} style={{ color: '#f59e0b' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#202124', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Range *</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="night-label">From Date</label>
                  <input 
                    type="date" 
                    required 
                    className="night-input"
                    value={filters.fromDate} 
                    onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))} 
                  />
                </div>
                <div>
                  <label className="night-label">To Date</label>
                  <input 
                    type="date" 
                    required 
                    className="night-input"
                    value={filters.toDate} 
                    onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))} 
                  />
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f3f4' }} />

            {/* Optional Filters */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: 8, background: '#e8f0fe', borderRadius: 8 }}>
                  <Filter size={20} style={{ color: '#1a73e8' }} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#202124', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Additional Filters</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <label className="night-label">Society</label>
                  <select 
                    className="night-input"
                    value={filters.society} 
                    onChange={e => setForm(f => ({ ...f, society: e.target.value }))}
                  >
                    <option value="">All Societies</option>
                    {societies.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="night-label">Status</label>
                  <select 
                    className="night-input"
                    value={filters.status} 
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="">All Statuses</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="CANCELLED">Cancelled</option>
                    <option value="PENDING_ADOSA">Pending ADOSA</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <div style={{ marginTop: 8 }}>
              <button 
                type="submit" 
                disabled={downloading}
                className="night-btn-pill"
                style={{
                  width: '100%', padding: '16px', fontSize: 16, fontWeight: 800,
                  justifyContent: 'center'
                }}
              >
                {downloading ? 'Preparing Report...' : <><Download size={20} /> Generate CSV Report</>}
              </button>
            </div>

            <div style={{ 
              display: 'flex', gap: 12, padding: '16px 20px', background: '#f8f9fa', 
              border: '1px solid #dadce0', borderRadius: 12, marginTop: 8 
            }}>
              <AlertCircle size={20} style={{ color: '#5f6368', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 13, color: '#5f6368', lineHeight: 1.5 }}>
                The report will include student roll numbers, names, society, venue, timings, and approval status. 
                Only data within the selected date range will be exported.
              </p>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
