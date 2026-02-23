// frontend/src/components/Layout.jsx
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './NightSidebar';
import { useAuth } from '../../context/AuthContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#0a0d14', color: '#e2e8f0',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
    }}>
      {/* Desktop Sidebar */}
      <div style={{ display: 'none' }} className="desktop-sidebar">
        <Sidebar />
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            zIndex: 40, display: 'none',
          }}
          className="mobile-overlay"
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <div style={{
        position: 'fixed', top: 0, left: sidebarOpen ? 0 : -260,
        width: 240, height: '100vh', zIndex: 50,
        transition: 'left 0.25s ease', display: 'none',
      }} className="mobile-sidebar">
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile topbar */}
        <div style={{
          height: 56, background: '#0f1117', borderBottom: '1px solid #1e2532',
          display: 'none', alignItems: 'center', padding: '0 16px', gap: 12,
          position: 'sticky', top: 0, zIndex: 30,
        }} className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              background: 'none', border: '1px solid #1e2532', borderRadius: 6,
              color: '#94a3b8', cursor: 'pointer', padding: '6px 10px', fontSize: 16,
            }}
          >☰</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#f59e0b' }}>🌙 Night Permissions</span>
        </div>

        <main style={{ flex: 1, overflow: 'auto', padding: 0 }}>
          <Outlet />
        </main>
      </div>

      {/* CSS for responsive */}
      <style>{`
        @media (min-width: 768px) {
          .desktop-sidebar { display: block !important; }
          .mobile-topbar { display: none !important; }
          .mobile-sidebar { display: none !important; }
          .mobile-overlay { display: none !important; }
        }
        @media (max-width: 767px) {
          .desktop-sidebar { display: none !important; }
          .mobile-topbar { display: flex !important; }
          .mobile-sidebar { display: block !important; }
          .mobile-overlay { display: block !important; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0a0d14; }
        ::-webkit-scrollbar-thumb { background: #1e2532; border-radius: 3px; }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .spin { animation: spin 0.8s linear infinite; }
      `}</style>
    </div>
  );
}
