// src/nightPermissions/pages/NightBudgets.jsx
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  fetchAllBudgets, fetchSocietyBudget, allocateBudget,
  addSocietyExpense, fetchSocieties,
} from '../utils/nightApi';
import Toast, { useToast } from '../components/NightToast';

// ─────────────────────────────────────────────────────────────────────────────
// Role gate — only these roles may see this page
// ─────────────────────────────────────────────────────────────────────────────
const BUDGET_ACCESS = ['admin', 'adosa', 'assistant'];
const BUDGET_ADMIN  = ['admin', 'adosa'];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;

const balanceColor = (balance, total) => {
  if (!total) return '#5F6368';
  const pct = balance / total;
  if (pct > 0.5) return '#1e8e3e';
  if (pct > 0.2) return '#f29900';
  return '#d93025';
};

const balanceBg = (balance, total) => {
  if (!total) return '#f8f9fa';
  const pct = balance / total;
  if (pct > 0.5) return '#e6f4ea';
  if (pct > 0.2) return '#fef7e0';
  return '#fce8e6';
};

// ─────────────────────────────────────────────────────────────────────────────
// Progress bar
// ─────────────────────────────────────────────────────────────────────────────
const ProgressBar = ({ spent, total }) => {
  const pct = total ? Math.min((spent / total) * 100, 100) : 0;
  const color = pct > 80 ? '#d93025' : pct > 50 ? '#f29900' : '#1A73E8';
  return (
    <div style={{ height: 6, background: '#F1F3F4', borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
      <div style={{
        height: '100%', width: `${pct}%`, background: color, borderRadius: 3,
        transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
      }} />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Society Budget Card
// ─────────────────────────────────────────────────────────────────────────────
const BudgetCard = ({ budget, onClick, index }) => {
  const balance = budget.totalAllocated - budget.totalSpent;
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onClick(budget)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff',
        border: `1px solid ${hovered ? '#1A73E8' : '#DADCE0'}`,
        borderRadius: 16,
        padding: 20,
        cursor: 'pointer',
        transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? '0 6px 20px rgba(26,115,232,0.12)' : 'none',
        animation: `cardIn 0.4s ease both`,
        animationDelay: `${index * 60}ms`,
      }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #EAF2FF, #D2E3FC)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>
          🏛️
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#202124',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {budget.societyName}
          </div>
          <div style={{ fontSize: 11.5, color: '#5F6368', marginTop: 3 }}>
            {budget.societyId}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, color: '#5F6368', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Total Budget</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#202124', marginTop: 2 }}>{fmt(budget.totalAllocated)}</div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: '#5F6368', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Spent</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#d93025', marginTop: 2 }}>{fmt(budget.totalSpent)}</div>
        </div>
      </div>

      <ProgressBar spent={budget.totalSpent} total={budget.totalAllocated} />

      {/* Balance badge */}
      <div style={{
        marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 20,
        background: balanceBg(balance, budget.totalAllocated),
        color: balanceColor(balance, budget.totalAllocated),
        fontSize: 12.5, fontWeight: 700,
      }}>
        <span>●</span> Balance: {fmt(balance)}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Expense Timeline Item
// ─────────────────────────────────────────────────────────────────────────────
const ExpenseItem = ({ expense, onView, index }) => (
  <div
    onClick={() => onView(expense)}
    style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '14px 0', borderBottom: '1px solid #F1F3F4',
      cursor: 'pointer', transition: 'background 0.15s',
      animation: `fadeSlideRight 0.35s ease both`,
      animationDelay: `${index * 50}ms`,
      borderRadius: 8,
    }}
    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFD'}
    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
  >
    <div style={{
      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
      background: '#fce8e6', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 18,
    }}>💸</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: '#202124', marginBottom: 3 }}>
        {expense.description}
      </div>
      <div style={{ fontSize: 11.5, color: '#5F6368', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span>📎 {expense.attachments?.length || 0} attachment(s)</span>
        <span>👤 {expense.spentByName || 'Unknown'}</span>
        <span>🕐 {new Date(expense.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
      </div>
    </div>
    <div style={{ fontSize: 16, fontWeight: 800, color: '#d93025', flexShrink: 0 }}>
      {fmt(expense.amount)}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Modal wrapper
// ─────────────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children, maxWidth = 520 }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 16, backdropFilter: 'blur(4px)',
      animation: 'overlayIn 0.2s ease',
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth,
        maxHeight: '92vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '18px 24px', borderBottom: '1px solid #F1F3F4',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        position: 'sticky', top: 0, background: '#fff', zIndex: 1,
      }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#202124' }}>{title}</h2>
        <button
          onClick={onClose}
          style={{ background: '#F1F3F4', border: 'none', width: 32, height: 32, borderRadius: '50%', cursor: 'pointer', fontSize: 16, color: '#5F6368', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >×</button>
      </div>
      {children}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Field component
// ─────────────────────────────────────────────────────────────────────────────
const Field = ({ label, children }) => (
  <div style={{ marginBottom: 18 }}>
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#5F6368', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
      {label}
    </label>
    {children}
  </div>
);

const Input = (props) => (
  <input
    {...props}
    style={{
      width: '100%', background: '#fff',
      border: '1.5px solid #DADCE0', borderRadius: 10,
      color: '#202124', padding: '10px 14px', fontSize: 14,
      outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
      ...props.style,
    }}
    onFocus={e => e.target.style.borderColor = '#1A73E8'}
    onBlur={e => e.target.style.borderColor = '#DADCE0'}
  />
);

// ─────────────────────────────────────────────────────────────────────────────
// Add Budget Modal
// ─────────────────────────────────────────────────────────────────────────────
const AddBudgetModal = ({ society, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return; }
    setLoading(true);
    setError('');
    try {
      await allocateBudget(society.societyId, { amount: Number(amount), remark, societyName: society.societyName });
      onSuccess(`₹${amount} allocated to ${society.societyName}`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to allocate budget');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Add Budget — ${society.societyName}`} onClose={onClose}>
      <div style={{ padding: 24 }}>
        <Field label="Amount (₹) *">
          <Input type="number" placeholder="e.g. 50000" value={amount} onChange={e => setAmount(e.target.value)} min="1" />
        </Field>
        <Field label="Remark (optional)">
          <Input type="text" placeholder="e.g. Q2 Allocation" value={remark} onChange={e => setRemark(e.target.value)} />
        </Field>
        {error && <div style={{ padding: '10px 14px', background: '#fce8e6', color: '#d93025', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 20, border: '1.5px solid #DADCE0', background: '#fff', color: '#5F6368', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '10px 24px', borderRadius: 20, border: 'none',
              background: loading ? '#DADCE0' : '#1A73E8',
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700, transition: 'background 0.2s',
            }}
          >
            {loading ? 'Allocating...' : 'Add Budget'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Add Expense Modal — with simulated file upload (URL input for ImageKit)
// ─────────────────────────────────────────────────────────────────────────────
const AddExpenseModal = ({ society, balance, onClose, onSuccess }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [attachments, setAttachments] = useState([{ url: '', type: 'image' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addAttachment = () => {
    if (attachments.length >= 5) return;
    setAttachments(prev => [...prev, { url: '', type: 'image' }]);
  };

  const updateAttachment = (i, field, value) => {
    setAttachments(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  };

  const removeAttachment = (i) => {
    if (attachments.length === 1) return;
    setAttachments(prev => prev.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!description.trim()) { setError('Description is required'); return; }
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return; }
    if (Number(amount) > balance) { setError(`Amount exceeds balance (${fmt(balance)})`); return; }
    const validAttachments = attachments.filter(a => a.url.trim());
    if (validAttachments.length === 0) { setError('At least one attachment URL is required'); return; }

    setLoading(true);
    setError('');
    try {
      await addSocietyExpense(society.societyId, {
        description, amount: Number(amount),
        attachments: validAttachments,
        societyName: society.societyName,
      });
      onSuccess('Expense recorded successfully');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Add Spend — ${society.societyName}`} onClose={onClose} maxWidth={560}>
      <div style={{ padding: 24 }}>
        {/* Available balance banner */}
        <div style={{
          padding: '12px 16px', borderRadius: 12, marginBottom: 20,
          background: balanceBg(balance, balance + 1),
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, color: '#5F6368', fontWeight: 600 }}>Available Balance</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: balanceColor(balance, balance + 1) }}>{fmt(balance)}</span>
        </div>

        <Field label="Description *">
          <textarea
            placeholder="What was the expense for?"
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            style={{
              width: '100%', border: '1.5px solid #DADCE0', borderRadius: 10,
              padding: '10px 14px', fontSize: 14, outline: 'none',
              resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = '#1A73E8'}
            onBlur={e => e.target.style.borderColor = '#DADCE0'}
          />
        </Field>

        <Field label="Amount (₹) *">
          <Input type="number" placeholder="e.g. 5000" value={amount} onChange={e => setAmount(e.target.value)} min="1" max={balance} />
        </Field>

        {/* Attachments */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#5F6368', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Attachments * (1–5)
            </label>
            {attachments.length < 5 && (
              <button onClick={addAttachment} style={{ fontSize: 11, color: '#1A73E8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                + Add More
              </button>
            )}
          </div>
          {attachments.map((att, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <Input
                type="url"
                placeholder="https://ik.imagekit.io/..."
                value={att.url}
                onChange={e => updateAttachment(i, 'url', e.target.value)}
                style={{ flex: 1 }}
              />
              <select
                value={att.type}
                onChange={e => updateAttachment(i, 'type', e.target.value)}
                style={{
                  border: '1.5px solid #DADCE0', borderRadius: 8,
                  padding: '10px 8px', fontSize: 13, background: '#fff',
                  color: '#202124', outline: 'none', cursor: 'pointer',
                }}
              >
                <option value="image">Image</option>
                <option value="pdf">PDF</option>
              </select>
              {attachments.length > 1 && (
                <button onClick={() => removeAttachment(i)} style={{ background: '#fce8e6', border: 'none', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', color: '#d93025', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              )}
            </div>
          ))}
          <p style={{ fontSize: 11, color: '#9AA0A6', margin: '6px 0 0' }}>
            Upload files to ImageKit and paste the URL here. PDF and image files only.
          </p>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: '#fce8e6', color: '#d93025', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 20, border: '1.5px solid #DADCE0', background: '#fff', color: '#5F6368', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: '10px 24px', borderRadius: 20, border: 'none',
              background: loading ? '#DADCE0' : '#d93025',
              color: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 13, fontWeight: 700,
            }}
          >
            {loading ? 'Recording...' : 'Submit Spend'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Expense Detail Modal
// ─────────────────────────────────────────────────────────────────────────────
const ExpenseDetailModal = ({ expense, onClose }) => (
  <Modal title="Expense Detail" onClose={onClose} maxWidth={480}>
    <div style={{ padding: 24 }}>
      <div style={{ display: 'grid', gap: 16 }}>
        <div style={{ padding: '16px', background: '#fce8e6', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 13, color: '#d93025', fontWeight: 600 }}>Amount Spent</span>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#d93025' }}>{fmt(expense.amount)}</span>
        </div>

        <div>
          <div style={{ fontSize: 11, color: '#5F6368', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Description</div>
          <div style={{ fontSize: 14, color: '#202124', lineHeight: 1.5 }}>{expense.description}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#5F6368', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Recorded By</div>
            <div style={{ fontSize: 13, color: '#202124', fontWeight: 600 }}>{expense.spentByName || '—'}</div>
            <div style={{ fontSize: 11, color: '#5F6368' }}>{expense.spentByRole}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#5F6368', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Date</div>
            <div style={{ fontSize: 13, color: '#202124', fontWeight: 600 }}>
              {new Date(expense.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {expense.attachments?.length > 0 && (
          <div>
            <div style={{ fontSize: 11, color: '#5F6368', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Attachments ({expense.attachments.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {expense.attachments.map((att, i) => (
                <a
                  key={i}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', background: '#F8FAFD',
                    border: '1px solid #DADCE0', borderRadius: 10,
                    textDecoration: 'none', color: '#1A73E8',
                    fontSize: 13, fontWeight: 600, transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EAF2FF'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F8FAFD'}
                >
                  <span>{att.type === 'pdf' ? '📄' : '🖼️'}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Attachment {i + 1} ({att.type})
                  </span>
                  <span style={{ fontSize: 12 }}>↗</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  </Modal>
);

// ─────────────────────────────────────────────────────────────────────────────
// Society Detail View (right panel / full page)
// ─────────────────────────────────────────────────────────────────────────────
const SocietyDetailView = ({ budget, expenses, loading, canAdmin, canSpend, onBack, onRefresh, addToast }) => {
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const balance = (budget?.totalAllocated || 0) - (budget?.totalSpent || 0);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
      <div className="spin" style={{ width: 36, height: 36, border: '3px solid #DADCE0', borderTopColor: '#1A73E8', borderRadius: '50%' }} />
    </div>
  );

  return (
    <div style={{ animation: 'fadeSlideRight 0.3s ease' }}>
      {/* Back nav */}
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1A73E8', fontSize: 14, fontWeight: 600, padding: '0 0 20px', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← Back to All Societies
      </button>

      {/* Society header card */}
      <div style={{
        background: '#fff', border: '1px solid #DADCE0', borderRadius: 20,
        padding: '24px 28px', marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <div style={{ fontSize: 28 }}>🏛️</div>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#202124' }}>
                {budget?.societyName}
              </h2>
            </div>
            <div style={{ fontSize: 12, color: '#5F6368' }}>ID: {budget?.societyId}</div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {canSpend && (
              <button
                onClick={() => setShowAddExpense(true)}
                style={{
                  padding: '10px 22px', borderRadius: 20, border: 'none',
                  background: '#fce8e6', color: '#d93025', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#d93025'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fce8e6'; e.currentTarget.style.color = '#d93025'; }}
              >
                💸 Add Spend
              </button>
            )}
            {canAdmin && (
              <button
                onClick={() => setShowAddBudget(true)}
                style={{
                  padding: '10px 22px', borderRadius: 20, border: 'none',
                  background: '#1A73E8', color: '#fff', cursor: 'pointer',
                  fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#1558D6'}
                onMouseLeave={e => e.currentTarget.style.background = '#1A73E8'}
              >
                ➕ Add Budget
              </button>
            )}
          </div>
        </div>

        {/* Budget stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 16, marginTop: 24 }}>
          {[
            { label: 'Total Budget', value: fmt(budget?.totalAllocated), color: '#1A73E8', bg: '#EAF2FF', icon: '📦' },
            { label: 'Total Spent',  value: fmt(budget?.totalSpent),     color: '#d93025', bg: '#fce8e6', icon: '💸' },
            { label: 'Balance',      value: fmt(balance),                color: balanceColor(balance, budget?.totalAllocated), bg: balanceBg(balance, budget?.totalAllocated), icon: '💰' },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: '14px 16px', borderRadius: 14, background: stat.bg,
              animation: 'cardIn 0.4s ease both',
            }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{stat.icon}</div>
              <div style={{ fontSize: 10.5, color: '#5F6368', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: stat.color, marginTop: 4 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <ProgressBar spent={budget?.totalSpent || 0} total={budget?.totalAllocated || 1} />
        <div style={{ fontSize: 11, color: '#9AA0A6', marginTop: 6, textAlign: 'right' }}>
          {budget?.totalAllocated ? `${Math.round((budget.totalSpent / budget.totalAllocated) * 100)}% utilized` : '0% utilized'}
        </div>
      </div>

      {/* Expense list */}
      <div style={{ background: '#fff', border: '1px solid #DADCE0', borderRadius: 16, padding: '0 24px', overflow: 'hidden' }}>
        <div style={{
          padding: '18px 0', borderBottom: '1px solid #F1F3F4',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: '#202124' }}>
            Expense History <span style={{ color: '#5F6368', fontWeight: 400, fontSize: 13 }}>({expenses.length})</span>
          </h3>
        </div>

        {expenses.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#9AA0A6', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
            No expenses recorded yet
          </div>
        ) : (
          expenses.map((exp, i) => (
            <ExpenseItem key={exp._id} expense={exp} onView={setSelectedExpense} index={i} />
          ))
        )}
      </div>

      {showAddBudget && (
        <AddBudgetModal
          society={budget}
          onClose={() => setShowAddBudget(false)}
          onSuccess={(msg) => { addToast(msg, 'success'); onRefresh(); }}
        />
      )}

      {showAddExpense && (
        <AddExpenseModal
          society={budget}
          balance={balance}
          onClose={() => setShowAddExpense(false)}
          onSuccess={(msg) => { addToast(msg, 'success'); onRefresh(); }}
        />
      )}

      {selectedExpense && (
        <ExpenseDetailModal expense={selectedExpense} onClose={() => setSelectedExpense(null)} />
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// New Society Modal
// ─────────────────────────────────────────────────────────────────────────────
const NewSocietyModal = ({ societies, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const filtered = societies.filter(s => s.name?.toLowerCase().includes(query.toLowerCase()));

  return (
    <Modal title="Select Society" onClose={onClose} maxWidth={420}>
      <div style={{ padding: 20 }}>
        <Input type="text" placeholder="Search society..." value={query} onChange={e => setQuery(e.target.value)} />
        <div style={{ marginTop: 14, maxHeight: 320, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(s => (
            <button
              key={s._id || s.name}
              onClick={() => onSelect(s)}
              style={{
                padding: '12px 16px', borderRadius: 12, border: '1.5px solid #DADCE0',
                background: '#fff', cursor: 'pointer', textAlign: 'left', fontSize: 14,
                fontWeight: 600, color: '#202124', transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 10,
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#1A73E8'; e.currentTarget.style.background = '#EAF2FF'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#DADCE0'; e.currentTarget.style.background = '#fff'; }}
            >
              🏛️ {s.name}
            </button>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9AA0A6', fontSize: 13, padding: 24 }}>No societies found</div>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function NightBudgets() {
  const { user } = useAuth();
  const { toasts, addToast, removeToast } = useToast();
  const role = (user?.role || '').toLowerCase();

  const canAccess = BUDGET_ACCESS.includes(role);
  const canAdmin  = BUDGET_ADMIN.includes(role);
  const canSpend  = BUDGET_ACCESS.includes(role);

  const [budgets, setBudgets]               = useState([]);
  const [loading, setLoading]               = useState(true);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [selectedExpenses, setExpenses]     = useState([]);
  const [detailLoading, setDetailLoading]   = useState(false);
  const [societies, setSocieties]           = useState([]);
  const [showNewSociety, setShowNewSociety] = useState(false);
  const [search, setSearch]                 = useState('');

  const loadBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAllBudgets();
      setBudgets(res.data.budgets || []);
    } catch {
      addToast('Failed to load budgets', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSocieties = useCallback(async () => {
    try {
      const res = await fetchSocieties();
      setSocieties(res.data.societies || []);
    } catch {}
  }, []);

  useEffect(() => {
    if (canAccess) { loadBudgets(); loadSocieties(); }
  }, [canAccess, loadBudgets, loadSocieties]);

  const openSociety = useCallback(async (budget) => {
    setSelectedBudget(budget);
    setDetailLoading(true);
    try {
      const res = await fetchSocietyBudget(budget.societyId, budget.societyName);
      setSelectedBudget(res.data.budget);
      setExpenses(res.data.expenses || []);
    } catch {
      addToast('Failed to load society details', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleNewSocietySelect = async (society) => {
    setShowNewSociety(false);
    const pseudo = { societyId: society._id || society.name, societyName: society.name, totalAllocated: 0, totalSpent: 0 };
    openSociety(pseudo);
  };

  const refreshDetail = () => {
    if (selectedBudget) {
      openSociety(selectedBudget);
      loadBudgets();
    }
  };

  const filteredBudgets = budgets.filter(b =>
    b.societyName?.toLowerCase().includes(search.toLowerCase())
  );

  // Total summary
  const totalAllocated = budgets.reduce((s, b) => s + (b.totalAllocated || 0), 0);
  const totalSpent     = budgets.reduce((s, b) => s + (b.totalSpent    || 0), 0);
  const totalBalance   = totalAllocated - totalSpent;

  if (!canAccess) {
    return (
      <div className="night-pass-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ color: '#202124' }}>Access Denied</h2>
          <p style={{ color: '#5F6368' }}>Only Admin, ADOSA and Assistant can view budgets.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="night-pass-container" style={{ padding: 32 }}>
      <Toast toasts={toasts} removeToast={removeToast} />
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {selectedBudget ? (
          <SocietyDetailView
            budget={selectedBudget}
            expenses={selectedExpenses}
            loading={detailLoading}
            canAdmin={canAdmin}
            canSpend={canSpend}
            onBack={() => { setSelectedBudget(null); setExpenses([]); }}
            onRefresh={refreshDetail}
            addToast={addToast}
          />
        ) : (
          <>
            {/* Page header */}
            <div style={{ marginBottom: 28 }}>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: '#202124', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10 }}>
                💰 Society Budgets
              </h1>
              <p style={{ color: '#5F6368', fontSize: 14, margin: 0 }}>
                Manage and track budget allocations and expenses across all societies
              </p>
            </div>

            {/* Summary cards */}
            {!loading && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
                {[
                  { label: 'Total Allocated', value: fmt(totalAllocated), color: '#1A73E8', bg: '#EAF2FF', icon: '📦' },
                  { label: 'Total Spent',     value: fmt(totalSpent),     color: '#d93025', bg: '#fce8e6', icon: '💸' },
                  { label: 'Total Balance',   value: fmt(totalBalance),   color: balanceColor(totalBalance, totalAllocated), bg: balanceBg(totalBalance, totalAllocated), icon: '💰' },
                  { label: 'Societies',       value: budgets.length,      color: '#1e8e3e', bg: '#e6f4ea', icon: '🏛️' },
                ].map((s, i) => (
                  <div key={s.label} style={{
                    background: '#fff', border: '1px solid #DADCE0', borderRadius: 16,
                    padding: '18px 20px', animation: `cardIn 0.4s ease both`, animationDelay: `${i * 70}ms`,
                  }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontSize: 11, color: '#5F6368', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{s.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.color, marginTop: 4 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, color: '#9AA0A6' }}>🔍</span>
                <input
                  type="text"
                  placeholder="Search societies..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px 10px 40px',
                    border: '1.5px solid #DADCE0', borderRadius: 20,
                    fontSize: 13.5, outline: 'none', background: '#fff',
                    boxSizing: 'border-box', color: '#202124',
                  }}
                  onFocus={e => e.target.style.borderColor = '#1A73E8'}
                  onBlur={e => e.target.style.borderColor = '#DADCE0'}
                />
              </div>
              {canAdmin && (
                <button
                  onClick={() => setShowNewSociety(true)}
                  style={{
                    padding: '10px 22px', borderRadius: 20, border: 'none',
                    background: '#1A73E8', color: '#fff', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'background 0.2s', whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1558D6'}
                  onMouseLeave={e => e.currentTarget.style.background = '#1A73E8'}
                >
                  ➕ New Society
                </button>
              )}
            </div>

            {/* Budget grid */}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
                <div className="spin" style={{ width: 40, height: 40, border: '4px solid #DADCE0', borderTopColor: '#1A73E8', borderRadius: '50%' }} />
              </div>
            ) : filteredBudgets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#9AA0A6' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No societies found</div>
                <div style={{ fontSize: 13 }}>
                  {canAdmin ? 'Click "New Society" to get started.' : 'No budget data available yet.'}
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
                {filteredBudgets.map((b, i) => (
                  <BudgetCard key={b._id || b.societyId} budget={b} onClick={openSociety} index={i} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showNewSociety && (
        <NewSocietyModal
          societies={societies}
          onClose={() => setShowNewSociety(false)}
          onSelect={handleNewSocietySelect}
        />
      )}

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes overlayIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.92) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}