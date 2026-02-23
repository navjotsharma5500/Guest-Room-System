// src/nightPermissions/components/NightToast.jsx
import { useState, useCallback } from 'react';

export default function Toast({ toasts, removeToast }) {
  return (
    <div style={{
      position: 'fixed', top: 16, right: 16, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360,
    }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? '#450a0a' : t.type === 'warn' ? '#451a03' : '#052e16',
          border: `1px solid ${t.type === 'error' ? '#b91c1c' : t.type === 'warn' ? '#b45309' : '#15803d'}`,
          borderRadius: 8, padding: '12px 16px', color: '#f1f5f9',
          fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', animation: 'slideIn 0.2s ease',
        }}>
          <span style={{ fontSize: 16 }}>
            {t.type === 'error' ? '❌' : t.type === 'warn' ? '⚠️' : '✅'}
          </span>
          <span style={{ flex: 1, lineHeight: 1.5 }}>{t.message}</span>
          <button onClick={() => removeToast(t.id)} style={{
            background: 'none', border: 'none', color: '#94a3b8',
            cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1,
          }}>×</button>
        </div>
      ))}
    </div>
  );
}

// Hook for toast management
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  return { toasts, addToast, removeToast };
};