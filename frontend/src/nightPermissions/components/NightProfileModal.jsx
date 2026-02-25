// src/nightPermissions/components/NightProfileModal.jsx
// Same functionality as ProfileModal.jsx but in Night Pass (blue) theme
import { useState, useEffect } from 'react';
import { X, Lock, ChevronDown, ChevronUp, Camera, Loader2 } from 'lucide-react';
import axios from 'axios';
import { IKContext, IKUpload } from 'imagekitio-react';
import { API } from '../../utils/api';
import {
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
  IMAGEKIT_AUTH_ENDPOINT,
} from '../../utils/apiConfig';

// ── ImageKit authenticator ────────────────────────────────────────────────────
const authenticator = async () => {
  const r = await fetch(IMAGEKIT_AUTH_ENDPOINT, { method: 'GET' });
  if (!r.ok) throw new Error(`Auth failed ${r.status}`);
  return r.json();
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const isValidUrl = (url) => url && (url.startsWith('http://') || url.startsWith('https://'));

const inputStyle = (disabled) => ({
  width: '100%', padding: '10px 12px',
  border: `1.5px solid ${disabled ? '#F1F3F4' : '#DADCE0'}`,
  borderRadius: 8, fontSize: 13.5,
  background: disabled ? '#F8FAFD' : '#fff',
  color: disabled ? '#5F6368' : '#202124',
  outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.2s',
  cursor: disabled ? 'not-allowed' : 'text',
});

const labelStyle = {
  display: 'block', fontSize: 11.5, fontWeight: 700,
  color: '#5F6368', textTransform: 'uppercase',
  letterSpacing: '0.04em', marginBottom: 5,
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function NightProfileModal({ open, onClose, currentUser, onUpdate }) {
  const [editing, setEditing]           = useState(false);
  const [form, setForm]                 = useState(currentUser || {});
  const [showPasswordBox, setShowPwd]   = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [uploadError, setUploadError]   = useState('');
  const [previewUrl, setPreviewUrl]     = useState(currentUser?.profilePicture || null);
  const [oldPassword, setOldPwd]        = useState('');
  const [newPassword, setNewPwd]        = useState('');
  const [passMessage, setPassMsg]       = useState('');
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    setForm(currentUser || {});
    setPreviewUrl(currentUser?.profilePicture || null);
  }, [currentUser]);

  if (!open) return null;

  // ── Auth config helper ────────────────────────────────────────────────────
  const authConfig = () => {
    const token = localStorage.getItem('token');
    return {
      withCredentials: true,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'Content-Type': 'application/json',
      },
    };
  };

  // ── ImageKit handlers ─────────────────────────────────────────────────────
  const handleIKSuccess = async (response) => {
    setUploading(false);
    if (!response?.url) { setUploadError('No URL returned'); return; }
    if (!isValidUrl(response.url)) { setUploadError('Invalid URL'); return; }
    setUploadError('');
    setPreviewUrl(response.url);
    setForm(f => ({ ...f, profilePicture: response.url }));
    try {
      const res = await axios.put(`${API}/api/auth/profile`, {
        name: currentUser?.name || form.name,
        hostel: currentUser?.hostel || form.hostel,
        profilePicture: response.url,
      }, authConfig());
      onUpdate?.(res.data.user);
    } catch {
      onUpdate?.({ ...currentUser, profilePicture: response.url });
    }
  };

  const handleIKError = (err) => {
    setUploading(false);
    setUploadError(err?.message || 'Upload failed');
  };

  // ── Save profile ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await axios.put(`${API}/api/auth/profile`, {
        name: form.name,
        hostel: form.hostel,
        profilePicture: form.profilePicture,
      }, authConfig());
      onUpdate?.(res.data.user);
      setEditing(false);
    } catch {
      onUpdate?.({ ...currentUser, name: form.name, hostel: form.hostel });
      setEditing(false);
    } finally { setSaving(false); }
  };

  // ── Change password ───────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword) { setPassMsg('Both fields required'); return; }
    if (newPassword.length < 6) { setPassMsg('Min 6 characters'); return; }
    try {
      await axios.put(`${API}/api/auth/change-password`, { oldPassword, newPassword }, authConfig());
      setPassMsg('Password updated successfully!');
      setOldPwd(''); setNewPwd('');
    } catch (err) {
      setPassMsg(err.response?.data?.message || 'Failed to update password');
    }
  };

  const initial = (currentUser?.name || '?')[0].toUpperCase();

  return (
    // Backdrop
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16, backdropFilter: 'blur(4px)',
        animation: 'overlayIn 0.2s ease',
      }}
    >
      {/* Modal card */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 20, width: '100%', maxWidth: 460,
          maxHeight: '90vh', overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >

        {/* ── Header ── */}
        <div style={{
          padding: '18px 24px', borderBottom: '1px solid #F1F3F4',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1A73E8' }}>Profile</h2>
          <button
            onClick={onClose}
            style={{ background: '#F1F3F4', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5F6368' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>

          {/* ── Profile picture ── */}
          <IKContext
            publicKey={IMAGEKIT_PUBLIC_KEY}
            urlEndpoint={IMAGEKIT_URL_ENDPOINT}
            authenticationEndpoint={IMAGEKIT_AUTH_ENDPOINT}
            authenticator={authenticator}
          >
            <div style={{ marginBottom: 24 }}>
              <label style={labelStyle}>Profile Picture</label>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  {previewUrl ? (
                    <img src={previewUrl} alt="Profile" style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', border: '3px solid #e8f0fe', boxShadow: '0 4px 12px rgba(26,115,232,0.2)' }} />
                  ) : (
                    <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(135deg, #1A73E8, #0d5bcc)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: '#fff', border: '3px solid #e8f0fe' }}>
                      {initial}
                    </div>
                  )}

                  {/* Upload overlay */}
                  <div style={{ position: 'absolute', bottom: 2, right: 2 }}>
                    {uploading ? (
                      <div style={{ background: '#1A73E8', color: '#fff', padding: 6, borderRadius: '50%', display: 'flex' }}>
                        <Loader2 size={18} style={{ animation: 'spin 0.8s linear infinite' }} />
                      </div>
                    ) : (
                      <label style={{ background: '#1A73E8', color: '#fff', padding: 6, borderRadius: '50%', cursor: 'pointer', display: 'flex', boxShadow: '0 2px 8px rgba(26,115,232,0.4)' }}>
                        <IKUpload
                          folder="/profile"
                          useUniqueFileName={true}
                          isPrivateFile={false}
                          tags={['profile']}
                          onUploadStart={() => { setUploading(true); setUploadError(''); }}
                          onError={handleIKError}
                          onSuccess={handleIKSuccess}
                          validateFile={(file) => {
                            if (!file.type.startsWith('image/')) return false;
                            if (file.size > 5 * 1024 * 1024) return false;
                            return true;
                          }}
                          className="hidden"
                          style={{ display: 'none' }}
                        />
                        <Camera size={18} style={{ pointerEvents: 'none' }} />
                      </label>
                    )}
                  </div>
                </div>
                <p style={{ fontSize: 11.5, color: '#9AA0A6', marginTop: 8, textAlign: 'center' }}>
                  Click the camera icon to upload · Max 5MB
                </p>
                {uploadError && <p style={{ fontSize: 11.5, color: '#d93025', marginTop: 4 }}>{uploadError}</p>}
              </div>
            </div>
          </IKContext>

          {/* ── Fields ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                style={inputStyle(!editing)}
                disabled={!editing}
                value={form.name || ''}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                onFocus={e => { if (editing) e.target.style.borderColor = '#1A73E8'; }}
                onBlur={e => e.target.style.borderColor = '#DADCE0'}
              />
            </div>

            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle(true)} disabled value={form.email || currentUser?.email || ''} />
            </div>

            <div>
              <label style={labelStyle}>Hostel / Department</label>
              <input
                style={inputStyle(!editing)}
                disabled={!editing}
                value={form.hostel || form.assignedHostel || ''}
                onChange={e => setForm(f => ({ ...f, hostel: e.target.value }))}
                onFocus={e => { if (editing) e.target.style.borderColor = '#1A73E8'; }}
                onBlur={e => e.target.style.borderColor = '#DADCE0'}
              />
            </div>
          </div>

          {/* ── Action buttons ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginBottom: 20 }}>
            <button
              onClick={onClose}
              style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #DADCE0', background: '#fff', color: '#5F6368', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              Close
            </button>
            {editing ? (
              <button
                onClick={handleSave}
                disabled={saving}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: saving ? '#DADCE0' : '#1A73E8', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            ) : (
              <button
                onClick={() => setEditing(true)}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#1A73E8', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
              >
                Edit Profile
              </button>
            )}
          </div>

          {/* ── Change Password ── */}
          <div style={{ borderTop: '1px solid #F1F3F4', paddingTop: 16 }}>
            <button
              onClick={() => setShowPwd(p => !p)}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 10,
                border: '1.5px solid #DADCE0', background: '#fff',
                cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A73E8'; e.currentTarget.style.background = '#F8FAFD'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#DADCE0'; e.currentTarget.style.background = '#fff'; }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 600, color: '#202124' }}>
                <Lock size={16} style={{ color: '#1A73E8' }} />
                Change Password
              </span>
              {showPasswordBox
                ? <ChevronUp size={18} style={{ color: '#1A73E8' }} />
                : <ChevronDown size={18} style={{ color: '#5F6368' }} />
              }
            </button>

            {showPasswordBox && (
              <div style={{ marginTop: 12, padding: '16px', background: '#EAF2FF', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Old Password</label>
                  <input type="password" style={inputStyle(false)} value={oldPassword} onChange={e => setOldPwd(e.target.value)} placeholder="Enter current password"
                    onFocus={e => e.target.style.borderColor = '#1A73E8'} onBlur={e => e.target.style.borderColor = '#DADCE0'} />
                </div>
                <div>
                  <label style={labelStyle}>New Password</label>
                  <input type="password" style={inputStyle(false)} value={newPassword} onChange={e => setNewPwd(e.target.value)} placeholder="Min 6 characters"
                    onFocus={e => e.target.style.borderColor = '#1A73E8'} onBlur={e => e.target.style.borderColor = '#DADCE0'} />
                </div>
                {passMessage && (
                  <p style={{ fontSize: 12.5, fontWeight: 600, color: passMessage.includes('success') ? '#1e8e3e' : '#d93025', margin: 0 }}>
                    {passMessage}
                  </p>
                )}
                <button
                  onClick={handleChangePassword}
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: '#1A73E8', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 700 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1558D6'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1A73E8'}
                >
                  Update Password
                </button>
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes overlayIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .hidden { display: none; }
      `}</style>
    </div>
  );
}