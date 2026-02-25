// frontend/src/pages/Settings.jsx
import { useState, useEffect } from 'react';
import { fetchSettings, updateSettings } from '../utils/nightApi';
import { useToast } from '../components/NightToast';
import Toast from '../components/NightToast';

export default function Settings() {
  const { toasts, addToast, removeToast } = useToast();
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings().then(res => {
      setSettings(res.data);
      setForm(res.data);
    }).catch(() => addToast('Failed to load settings', 'error'));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateSettings({
        defaultToVenueTimerMinutes:  Number(form.defaultToVenueTimerMinutes),
        defaultToHostelTimerMinutes: Number(form.defaultToHostelTimerMinutes),
        defaulterStrikeLimit:        Number(form.defaulterStrikeLimit),
        lastApplyAllowedTime:        form.lastApplyAllowedTime,
      });
      setSettings(res.data);
      addToast('Settings saved!');
    } catch (err) {
      addToast(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const Field = ({ label, description, children }) => (
    <div style={{ padding: '24px 0', borderBottom: '1px solid #f1f3f4' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontWeight: 700, color: '#202124', fontSize: 15 }}>{label}</div>
          {description && <div style={{ fontSize: 13, color: '#5f6368', marginTop: 6, lineHeight: 1.6 }}>{description}</div>}
        </div>
        <div style={{ width: 200, flexShrink: 0 }}>{children}</div>
      </div>
    </div>
  );

  if (!settings) return <div className="night-pass-container" style={{ padding: 100, textAlign: 'center', color: '#5f6368' }}>Loading configuration...</div>;

  return (
    <div className="night-pass-container" style={{ padding: 24 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#202124' }}>⚙️ System Settings</h1>
          <p style={{ margin: '4px 0 0', color: '#5f6368', fontSize: 14 }}>Configure night permission global parameters</p>
        </div>

        <div className="night-card" style={{ padding: '0 32px' }}>
          <Field label="Hostel → Venue Timer" description="Minutes allowed for student to travel from hostel exit to venue entry before being marked defaulter">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="number" min={5} max={120} className="night-input" style={{ width: 100 }}
                value={form.defaultToVenueTimerMinutes || ''}
                onChange={e => setForm(f => ({ ...f, defaultToVenueTimerMinutes: e.target.value }))} />
              <span style={{ color: '#5f6368', fontSize: 14, fontWeight: 600 }}>min</span>
            </div>
          </Field>

          <Field label="Venue → Hostel Timer" description="Minutes allowed for student to travel from venue exit to hostel entry before being marked defaulter">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input type="number" min={5} max={120} className="night-input" style={{ width: 100 }}
                value={form.defaultToHostelTimerMinutes || ''}
                onChange={e => setForm(f => ({ ...f, defaultToHostelTimerMinutes: e.target.value }))} />
              <span style={{ color: '#5f6368', fontSize: 14, fontWeight: 600 }}>min</span>
            </div>
          </Field>

          <Field label="Defaulter Strike Limit" description="Number of strikes before student is permanently blocked from applying for night permissions">
            <input type="number" min={1} max={10} className="night-input" style={{ width: 100 }}
              value={form.defaulterStrikeLimit || ''}
              onChange={e => setForm(f => ({ ...f, defaulterStrikeLimit: e.target.value }))} />
          </Field>

          <Field label="Last Apply Cutoff Time" description="Students cannot apply for night permissions after this time on the same day (24h format)">
            <input type="time" className="night-input"
              value={form.lastApplyAllowedTime || ''}
              onChange={e => setForm(f => ({ ...f, lastApplyAllowedTime: e.target.value }))} />
          </Field>
        </div>

        <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={handleSave} disabled={saving} className="night-btn-pill" style={{ padding: '14px 40px' }}>
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* System Info */}
        <div className="night-card" style={{ marginTop: 40, background: '#f8f9fa' }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#202124', marginBottom: 20, textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Diagnostics</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Timeout Cron', 'Active · 5 min interval'],
              ['Image Provider', 'ImageKit.io (Real-time)'],
              ['Auth Backend', 'JWT + Secure Cookie'],
              ['Admin Override', 'Full power enabled'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: '#5f6368', minWidth: 160, fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 13, color: '#202124', fontWeight: 700 }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
