// frontend/src/nightPermissions/components/NightLayout.jsx
import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Sidebar from './NightSidebar';
import { useAuth } from '../../context/AuthContext';
import NightProfileModal from './NightProfileModal';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [profileOpen, setProfileOpen]     = useState(false);

  const nightRole = (user?.night?.role || '').toLowerCase();
  const isStudent = nightRole === 'student';
  const canSwitch = ['admin', 'adosa', 'assistant'].includes((user?.role || '').toLowerCase());

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const initial    = (user?.name || '?')[0].toUpperCase();
  const firstName  = user?.name?.split(' ')[0] || 'User';

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#F8FAFD', color: '#202124',
      fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    }}>

      {/* ── Desktop Sidebar ── */}
      {!isStudent && (
        <div style={{ display: 'none' }} className="desktop-sidebar">
          <Sidebar />
        </div>
      )}

      {/* ── Mobile overlay ── */}
      {sidebarOpen && !isStudent && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 40, display: 'none' }} className="mobile-overlay" />
      )}

      {/* ── Mobile sidebar drawer ── */}
      {!isStudent && (
        <div style={{ position: 'fixed', top: 0, left: sidebarOpen ? 0 : -260, width: 240, height: '100vh', zIndex: 50, transition: 'left 0.25s cubic-bezier(0.4,0,0.2,1)', display: 'none' }} className="mobile-sidebar">
          <Sidebar onClose={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* ── Main column ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ════════════════════════════════════════════
            TOP HEADER — matches Guest Room style
            ════════════════════════════════════════════ */}
        <header style={{
          height: 64, background: '#ffffff',
          borderBottom: '1px solid #DADCE0',
          display: 'flex', alignItems: 'center',
          padding: '0 20px', gap: 12,
          position: 'sticky', top: 0, zIndex: 30,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>

          {/* Left: hamburger (mobile) */}
          {!isStudent && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="mobile-menu-btn"
              style={{
                display: 'none',
                background: 'none', border: '1px solid #DADCE0',
                borderRadius: 8, color: '#5F6368', cursor: 'pointer',
                padding: '6px 10px', fontSize: 18,
                alignItems: 'center', justifyContent: 'center',
              }}
            >☰</button>
          )}

          {/* Spacer pushes controls to the right */}
          <div style={{ flex: 1 }} />

          {/* ── Switch Dashboard ── */}
          {canSwitch && (
            <button
              onClick={() => navigate('/admin/dashboard-selector')}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 8,
                border: '1.5px solid #DADCE0', background: '#fff',
                color: '#5F6368', cursor: 'pointer', fontSize: 13,
                fontWeight: 600, transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A73E8'; e.currentTarget.style.color = '#1A73E8'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#DADCE0'; e.currentTarget.style.color = '#5F6368'; }}
            >
              ← Switch Dashboard
            </button>
          )}

          {/* ── Profile button (N  Name) ── */}
          <button
            onClick={() => setProfileOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 14px 6px 8px',
              border: '1.5px solid #DADCE0', borderRadius: 8,
              background: '#fff', cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A73E8'; e.currentTarget.style.background = '#F8FAFD'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#DADCE0'; e.currentTarget.style.background = '#fff'; }}
          >
            {/* Avatar circle */}
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e8f0fe' }} />
            ) : (
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1A73E8, #0d5bcc)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0,
                border: '2px solid #e8f0fe',
              }}>
                {initial}
              </div>
            )}
            <span style={{ fontSize: 13.5, fontWeight: 600, color: '#202124' }}>{firstName}</span>
          </button>

          {/* ── Logout button ── */}
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 18px', borderRadius: 8, border: 'none',
              background: '#1A73E8', color: '#fff', cursor: 'pointer',
              fontSize: 13, fontWeight: 700, transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1558D6'}
            onMouseLeave={e => e.currentTarget.style.background = '#1A73E8'}
          >
            Logout
          </button>
        </header>

        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>

      {/* ── Profile Modal ── */}
      {profileOpen && (
        <NightProfileModal
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          currentUser={user}
        />
      )}

      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: block !important; }
          .mobile-sidebar  { display: none  !important; }
          .mobile-overlay  { display: none  !important; }
          .mobile-menu-btn { display: none  !important; }
        }
        @media (max-width: 767px) {
          .desktop-sidebar { display: none  !important; }
          .mobile-sidebar  { display: block !important; }
          .mobile-overlay  { display: block !important; }
          .mobile-menu-btn { display: flex  !important; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #F8FAFD; }
        ::-webkit-scrollbar-thumb { background: #DADCE0; border-radius: 3px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}