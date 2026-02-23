// frontend/src/components/Sidebar.jsx
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_ITEMS = [
  { path: '/night',            label: 'Dashboard',    icon: '🌙', roles: ['all'] },
  { path: '/night/lists',      label: 'Lists',        icon: '📋', roles: ['gen_sec','president','adosa','admin'] },
  { path: '/night/review',     label: 'Review',       icon: '🔍', roles: ['president','adosa','admin'] },
  { path: '/night/scan',       label: 'Scan',         icon: '📷', roles: ['caretaker','guard','adosa','admin'] },
  { path: '/night/students',   label: 'Students',     icon: '👤', roles: ['adosa','admin'] },
  { path: '/night/defaulters', label: 'Defaulters',   icon: '🚫', roles: ['adosa','admin'] },
  { path: '/night/calendar',   label: 'Calendar',     icon: '📅', roles: ['all'] },
  { path: '/night/settings',   label: 'Settings',     icon: '⚙️',  roles: ['adosa','admin'] },
];

const hasAccess = (roles, userRole) => {
  if (roles.includes('all')) return true;
  return roles.includes((userRole || '').toLowerCase());
};

export default function Sidebar({ onClose }) {
  const { user } = useAuth();
  const role = (user?.role || '').toLowerCase();

  const filteredNav = NAV_ITEMS.filter(item => hasAccess(item.roles, role));

  const linkStyle = ({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 16px', borderRadius: 8, textDecoration: 'none',
    fontSize: 14, fontWeight: isActive ? 600 : 400, cursor: 'pointer',
    transition: 'all 0.15s',
    background: isActive ? 'rgba(245,158,11,0.15)' : 'transparent',
    color: isActive ? '#f59e0b' : '#94a3b8',
    borderLeft: isActive ? '3px solid #f59e0b' : '3px solid transparent',
  });

  return (
    <div style={{
      width: 220, background: '#0f1117', borderRight: '1px solid #1e2532',
      display: 'flex', flexDirection: 'column', height: '100vh',
      position: 'sticky', top: 0, flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid #1e2532' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f59e0b', letterSpacing: '-0.02em' }}>
              🌙 THAPAR
            </div>
            <div style={{ fontSize: 11, color: '#475569', fontFamily: 'monospace', marginTop: 2 }}>
              NIGHT PERMISSIONS
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: '#475569',
              cursor: 'pointer', fontSize: 20, padding: 4,
            }}>×</button>
          )}
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {filteredNav.map(item => (
          <NavLink key={item.path} to={item.path} end={item.path === '/night'} style={linkStyle}
            onClick={onClose}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User badge */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1e2532' }}>
        <div style={{ fontSize: 12, color: '#64748b' }}>Logged in as</div>
        <div style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600, marginTop: 2, wordBreak: 'break-all' }}>
          {user?.name || user?.email || 'Unknown'}
        </div>
        <div style={{
          display: 'inline-block', marginTop: 4, padding: '2px 8px',
          background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 4, fontSize: 10, color: '#f59e0b', fontFamily: 'monospace',
          textTransform: 'uppercase',
        }}>
          {role || 'unknown'}
        </div>
      </div>
    </div>
  );
}
