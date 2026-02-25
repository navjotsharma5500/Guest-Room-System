// src/pages/AccessRequired.jsx
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AccessRequired({ code, message }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const isDefaulter = code === 'STUDENT_DEFAULTER';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#F8FAFD',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{
        background: '#fff', border: '1px solid #DADCE0', borderRadius: 24,
        padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center',
        animation: 'fadeUp 0.5s ease',
      }}>
        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: isDefaulter ? '#fef2f2' : '#fef3c7',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, margin: '0 auto 24px',
        }}>
          {isDefaulter ? '🚫' : '🔒'}
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#202124', margin: '0 0 12px' }}>
          {isDefaulter ? 'Account Blocked' : 'Access Required'}
        </h1>

        <p style={{ color: '#5F6368', fontSize: 15, lineHeight: 1.6, margin: '0 0 32px' }}>
          {message || (isDefaulter
            ? 'Your account has been blocked due to a night pass violation. Please contact the ADOSA office.'
            : 'Your account exists, but you are not added to system data. Please contact the administrator.'
          )}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button
            onClick={handleLogout}
            style={{
              background: '#1A73E8', color: '#fff', border: 'none',
              borderRadius: 20, padding: '12px 32px', fontSize: 14, fontWeight: 700,
              cursor: 'pointer', transition: 'background 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1558D6'}
            onMouseLeave={e => e.currentTarget.style.background = '#1A73E8'}
          >
            Logout
          </button>

          <p style={{ fontSize: 12, color: '#5F6368', margin: 0 }}>
            If you believe this is a mistake, contact{' '}
            <a href="mailto:dosa@thapar.edu" style={{ color: '#1A73E8' }}>dosa@thapar.edu</a>
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}