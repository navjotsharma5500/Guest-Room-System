// src/nightPermissions/components/NightSidebar.jsx
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import thaparLogo from '../../assets/thapar_logo.png';

const NAV_ITEMS = [
  { path: '/night-pass',            label: 'Dashboard',   icon: '🌙', roles: ['gen_sec', 'president', 'adosa', 'admin', 'assistant'] },
  { path: '/night-pass/lists',      label: 'Lists',       icon: '📋', roles: ['gen_sec', 'president', 'adosa', 'admin', 'assistant'] },
  { path: '/night-pass/review',     label: 'Review',      icon: '🔍', roles: ['president', 'adosa', 'admin', 'assistant'] },
  { path: '/night-pass/scan',       label: 'Scan',        icon: '📷', roles: ['caretaker', 'guard', 'adosa', 'admin'] },
  { path: '/night-pass/students',   label: 'Students',    icon: '👤', roles: ['adosa', 'admin', 'assistant'] },
  { path: '/night-pass/defaulters', label: 'Defaulters',  icon: '🚫', roles: ['adosa', 'admin', 'assistant'] },
  { path: '/night-pass/budgets',    label: 'Budgets',     icon: '💰', roles: ['adosa', 'admin', 'assistant'] },
  { path: '/night-pass/calendar',   label: 'Calendar',    icon: '📅', roles: ['gen_sec', 'president', 'adosa', 'admin', 'assistant'] },
  { path: '/night-pass/roles',      label: 'Roles',       icon: '🔑', roles: ['adosa', 'admin'] },
  { path: '/night-pass/reports',    label: 'Reports',     icon: '📊', roles: ['adosa', 'admin', 'assistant'] },
  { path: '/night-pass/settings',   label: 'Settings',    icon: '⚙️',  roles: ['adosa', 'admin', 'assistant'] },
];

const hasAccess = (roles, userRole) =>
  roles.includes('all') || roles.includes((userRole || '').toLowerCase());

export default function NightSidebar({ onClose }) {
  const { user } = useAuth();
  const appRole  = (user?.role || '').toLowerCase();          // e.g. "caretaker"
  const nightRole = (user?.night?.role || '').toLowerCase();  // night-specific role

  // Caretaker: ONLY show QR Scan, nothing else
  const filtered = appRole === 'caretaker'
    ? NAV_ITEMS.filter(i => i.path === '/night-pass/scan')
    : NAV_ITEMS.filter(item => hasAccess(item.roles, nightRole));

  const linkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '9px 14px', borderRadius: 8, textDecoration: 'none',
    fontSize: 13.5, fontWeight: isActive ? 700 : 400,
    cursor: 'pointer', transition: 'all 0.15s',
    background: isActive ? '#EAF2FF' : 'transparent',
    color: isActive ? '#1A73E8' : '#5F6368',
    borderLeft: isActive ? '3px solid #1A73E8' : '3px solid transparent',
    margin: '1px 0',
  });

  return (
    <div style={{
      width: 220, background: '#ffffff',
      borderRight: '1px solid #E0E3E7',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0, flexShrink: 0,
    }}>

      {/* ── Logo only ── */}
      <div style={{
        padding: '0 16px', height: 64,
        borderBottom: '1px solid #E0E3E7',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={thaparLogo} alt="Thapar" style={{ height: 38, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#202124', lineHeight: 1.1 }}>THAPAR</div>
            <div style={{ fontSize: 9.5, color: '#1A73E8', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>Night Pass</div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9AA0A6', cursor: 'pointer', fontSize: 20, padding: 4 }}>×</button>
        )}
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
        {filtered.map(item => (
          <NavLink key={item.path} to={item.path} end={item.path === '/night-pass'} style={linkStyle} onClick={onClose}>
            <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* No profile/logout here — lives in top header */}
    </div>
  );
}
