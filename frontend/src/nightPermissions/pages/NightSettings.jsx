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

  const inp = {
    background: '#0a0d14', border: '1px solid #1e2532', borderRadius: 8,
    color: '#e2e8f0', padding: '10px 14px', fontSize: 14, outline: 'none', width: '100%',
    boxSizing: 'border-box',
  };

  const Field = ({ label, description, children }) => (
    <div style={{ padding: '20px 0', borderBottom: '1px solid #1e2532' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 14 }}>{label}</div>
          {description && <div style={{ fontSize: 12, color: '#475569', marginTop: 4, lineHeight: 1.5 }}>{description}</div>}
        </div>
        <div style={{ width: 200, flexShrink: 0 }}>{children}</div>
      </div>
    </div>
  );

  if (!settings) return <div style={{ padding: 60, textAlign: 'center', color: '#475569' }}>Loading...</div>;

  return (
    <div style={{ padding: 24, maxWidth: 720 }}>
      <Toast toasts={toasts} removeToast={removeToast} />

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>⚙️ Settings</h1>
        <p style={{ margin: '4px 0 0', color: '#475569', fontSize: 13 }}>Night Permission System Configuration</p>
      </div>

      <div style={{ background: '#0f1117', border: '1px solid #1e2532', borderRadius: 12, padding: '0 24px' }}>
        <Field label="Hostel → Venue Timer" description="Minutes allowed for student to travel from hostel exit to venue entry before being marked defaulter">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" min={5} max={120} style={{ ...inp, width: 80 }}
              value={form.defaultToVenueTimerMinutes || ''}
              onChange={e => setForm(f => ({ ...f, defaultToVenueTimerMinutes: e.target.value }))} />
            <span style={{ color: '#64748b', fontSize: 13 }}>min</span>
          </div>
        </Field>

        <Field label="Venue → Hostel Timer" description="Minutes allowed for student to travel from venue exit to hostel entry before being marked defaulter">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" min={5} max={120} style={{ ...inp, width: 80 }}
              value={form.defaultToHostelTimerMinutes || ''}
              onChange={e => setForm(f => ({ ...f, defaultToHostelTimerMinutes: e.target.value }))} />
            <span style={{ color: '#64748b', fontSize: 13 }}>min</span>
          </div>
        </Field>

        <Field label="Defaulter Strike Limit" description="Number of strikes before student is permanently blocked from applying for night permissions">
          <input type="number" min={1} max={10} style={{ ...inp, width: 80 }}
            value={form.defaulterStrikeLimit || ''}
            onChange={e => setForm(f => ({ ...f, defaulterStrikeLimit: e.target.value }))} />
        </Field>

        <Field label="Last Apply Cutoff Time" description="Students cannot apply for night permissions after this time on the same day (24h format, e.g. 21:00)">
          <input type="time" style={inp}
            value={form.lastApplyAllowedTime || ''}
            onChange={e => setForm(f => ({ ...f, lastApplyAllowedTime: e.target.value }))} />
        </Field>
      </div>

      {/* System Info */}
      <div style={{ background: '#0f1117', border: '1px solid #1e2532', borderRadius: 12, padding: 20, marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.05em' }}>System Info</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            ['Timeout Cron', 'Runs every 5 minutes automatically'],
            ['Image Storage', 'ImageKit (zero binary in MongoDB)'],
            ['Scan Mode A', 'Keyboard / Physical barcode scanner ✅'],
            ['Scan Mode B', 'Camera scan via getUserMedia (not yet implemented)'],
            ['Auth', 'Uses existing project JWT + cookie auth'],
            ['ADOSA Account', 'adosa3@thapar.edu (already in User model)'],
          ].map(([label, value]) => (
            <div key={label} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 12, color: '#475569', minWidth: 140, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 12, color: '#64748b' }}>{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={handleSave} disabled={saving} style={{
          padding: '12px 28px', background: saving ? '#475569' : '#f59e0b',
          border: 'none', borderRadius: 8, color: '#0a0d14',
          fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer',
        }}>{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>
    </div>
  );
}
