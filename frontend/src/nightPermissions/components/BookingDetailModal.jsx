import React from 'react';
import { X, Calendar, Clock, MapPin, User, CheckCircle, XCircle, AlertCircle, ArrowRight } from 'lucide-react';

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

export default function BookingDetailModal({ booking, onClose }) {
  if (!booking) return null;

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      backdropFilter: 'blur(4px)'
    }}>
      <div onClick={e => e.stopPropagation()} className="night-card" style={{
        width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto', padding: 0,
        animation: 'scaleIn 0.2s ease-out'
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#202124' }}>{booking.eventName}</h2>
            <div style={{ fontSize: 14, color: '#5f6368', marginTop: 4 }}>{booking.societyName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer' }}><X size={24} /></button>
        </div>

        <div style={{ padding: 24 }}>
          {/* Status & Timing */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="night-label">Status</div>
              <StatusBadge status={booking.status} />
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="night-label">Timing</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#202124' }}>
                  <Calendar size={16} style={{ color: '#1a73e8' }} />
                  {formatDate(booking.startDateTime)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#202124' }}>
                  <Clock size={16} style={{ color: '#1a73e8' }} />
                  {formatTime(booking.startDateTime)} — {formatTime(booking.endDateTime)}
                </div>
              </div>
            </div>
          </div>

          {/* Venue */}
          <div style={{ marginBottom: 24 }}>
            <div className="night-label">Venue</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15, color: '#202124', fontWeight: 600 }}>
              <MapPin size={18} style={{ color: '#ea4335' }} />
              {booking.venueName} {booking.venueHall ? `(${booking.venueHall})` : ''}
            </div>
          </div>

          {/* Description */}
          {booking.description && (
            <div style={{ marginBottom: 24 }}>
              <div className="night-label">Description</div>
              <div style={{ fontSize: 14, color: '#3c4043', lineHeight: 1.5, background: '#f8f9fa', padding: 12, borderRadius: 8 }}>
                {booking.description}
              </div>
            </div>
          )}

          {/* Approval Chain */}
          <div style={{ marginBottom: 24 }}>
            <div className="night-label">Approval Chain</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: '#5f6368' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#1a73e8' }} />
                Student
              </div>
              <ArrowRight size={14} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: booking.presidentReviewedBy ? '#1a73e8' : '#dadce0' }} />
                President
              </div>
              <ArrowRight size={14} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: booking.adosaReviewedBy ? '#1a73e8' : '#dadce0' }} />
                ADOSA
              </div>
            </div>
            {(booking.presidentRemarks || booking.adosaRemarks) && (
              <div style={{ marginTop: 12, fontSize: 13, color: '#d93025' }}>
                {booking.presidentRemarks && <div><strong>President Remarks:</strong> {booking.presidentRemarks}</div>}
                {booking.adosaRemarks && <div><strong>ADOSA Remarks:</strong> {booking.adosaRemarks}</div>}
              </div>
            )}
          </div>

          {/* Students List */}
          <div>
            <div className="night-label">Students ({booking.students?.length || 0})</div>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #dadce0', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#5f6368' }}>Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#5f6368' }}>Roll No</th>
                    <th style={{ padding: '8px 12px', textAlign: 'left', color: '#5f6368' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {booking.students?.map(s => (
                    <tr key={s.rollNo} style={{ borderBottom: '1px solid #f1f3f4' }}>
                      <td style={{ padding: '8px 12px', color: '#202124' }}>{s.name}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#5f6368' }}>{s.rollNo}</td>
                      <td style={{ padding: '8px 12px' }}>
                        {s.status === 'APPROVED' ? (
                          <span style={{ color: '#10b981', fontWeight: 700, fontSize: 11 }}>APPROVED</span>
                        ) : s.status === 'REJECTED' ? (
                          <span style={{ color: '#ef4444', fontWeight: 700, fontSize: 11 }}>REJECTED</span>
                        ) : (
                          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 11 }}>PENDING</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
