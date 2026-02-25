// src/nightPermissions/pages/NightMessenger.jsx
// Contextual Messenger — Society Channels, Approval Threads, Role DMs
// Roles: admin, adosa, assistant, president, gen_sec only

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../hooks/useNightSocket';
import {
  fetchChatRooms, getOrCreateSocietyRoom, getOrCreateRoleRoom,
  fetchMessages, sendChatMessage, lockChatRoom, fetchSocieties,
} from '../utils/nightApi';

// ─── Constants ────────────────────────────────────────────────────────────────
const CHAT_ROLES  = ['admin', 'adosa', 'assistant', 'president', 'gen_sec'];
const ROLE_COLORS = {
  admin:     { bg: '#fce8e6', color: '#d93025', label: 'Admin'     },
  adosa:     { bg: '#e8f0fe', color: '#1A73E8', label: 'ADOSA'     },
  assistant: { bg: '#e6f4ea', color: '#1e8e3e', label: 'Assistant' },
  president: { bg: '#fef7e0', color: '#f29900', label: 'President' },
  gen_sec:   { bg: '#f3e8fd', color: '#9334e6', label: 'Gen Sec'   },
};

const ROOM_TYPE_LABELS = {
  SOCIETY:  { icon: '🏛️', label: 'Society' },
  APPROVAL: { icon: '📋', label: 'Approval' },
  ROLE:     { icon: '🔑', label: 'Direct'  },
};

const VALID_ROLE_TARGETS = {
  president: ['adosa'],
  gen_sec:   ['president'],
  adosa:     ['president', 'assistant'],
  assistant: ['adosa'],
  admin:     ['adosa', 'president', 'assistant'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (date) => {
  const d = new Date(date);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const fmtFull = (date) =>
  new Date(date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const getRoleStyle = (role) => ROLE_COLORS[(role || '').toLowerCase()] || { bg: '#f1f3f4', color: '#5F6368', label: role };

// ─── Sub-components ───────────────────────────────────────────────────────────

// Role badge pill
const RoleBadge = ({ role, small }) => {
  const s = getRoleStyle(role);
  return (
    <span style={{
      display: 'inline-block', padding: small ? '1px 7px' : '2px 10px',
      borderRadius: 20, background: s.bg, color: s.color,
      fontSize: small ? 9.5 : 11, fontWeight: 700,
      textTransform: 'uppercase', letterSpacing: '0.04em',
      fontFamily: 'monospace',
    }}>
      {s.label}
    </span>
  );
};

// Single message bubble
const MessageBubble = ({ msg, isMine }) => {
  const isSystem = msg.isSystemMessage || msg.messageType === 'SYSTEM';

  if (isSystem) {
    return (
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <span style={{
          display: 'inline-block', padding: '4px 14px', borderRadius: 20,
          background: '#f1f3f4', color: '#5F6368', fontSize: 11.5,
        }}>
          {msg.content}
        </span>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row',
      gap: 8, marginBottom: 14, alignItems: 'flex-end',
      animation: 'msgIn 0.2s ease',
    }}>
      {/* Avatar */}
      {!isMine && (
        <div style={{
          width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
          background: getRoleStyle(msg.senderRole).bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: getRoleStyle(msg.senderRole).color,
          border: `1.5px solid ${getRoleStyle(msg.senderRole).color}20`,
        }}>
          {(msg.senderName || '?')[0].toUpperCase()}
        </div>
      )}

      <div style={{ maxWidth: '72%', minWidth: 60 }}>
        {/* Sender info (only for others) */}
        {!isMine && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#202124' }}>{msg.senderName}</span>
            <RoleBadge role={msg.senderRole} small />
          </div>
        )}

        {/* Bubble */}
        <div style={{
          background: isMine ? '#1A73E8' : '#fff',
          color: isMine ? '#fff' : '#202124',
          border: isMine ? 'none' : '1px solid #DADCE0',
          borderRadius: isMine ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
          padding: '10px 14px',
          fontSize: 13.5, lineHeight: 1.5,
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        }}>
          {msg.content && <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</div>}

          {/* Attachments */}
          {msg.attachments?.length > 0 && (
            <div style={{ marginTop: msg.content ? 8 : 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {msg.attachments.map((att, i) => (
                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 10px', borderRadius: 8,
                  background: isMine ? 'rgba(255,255,255,0.15)' : '#F8FAFD',
                  border: isMine ? '1px solid rgba(255,255,255,0.2)' : '1px solid #DADCE0',
                  color: isMine ? '#fff' : '#1A73E8',
                  textDecoration: 'none', fontSize: 12, fontWeight: 600,
                }}>
                  <span>{att.type === 'pdf' ? '📄' : '🖼️'}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {att.filename || `Attachment ${i + 1}`}
                  </span>
                  <span style={{ opacity: 0.7, fontSize: 10 }}>↗</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div style={{
          fontSize: 10.5, color: '#9AA0A6', marginTop: 4,
          textAlign: isMine ? 'right' : 'left',
        }}>
          {fmtFull(msg.createdAt)}
        </div>
      </div>
    </div>
  );
};

// Room list item
const RoomItem = ({ room, active, onClick, myId }) => {
  const { icon } = ROOM_TYPE_LABELS[room.type] || { icon: '💬' };
  const unread = room.myUnread || 0;
  const hasUnread = unread > 0;

  const name = room.type === 'SOCIETY'
    ? room.societyName
    : room.type === 'APPROVAL'
    ? room.referenceName
    : room.roleChannel?.replace('-', ' ↔ ').replace(/_/g, ' ');

  return (
    <div
      onClick={() => onClick(room)}
      style={{
        padding: '12px 16px', cursor: 'pointer',
        background: active ? '#EAF2FF' : 'transparent',
        borderLeft: `3px solid ${active ? '#1A73E8' : 'transparent'}`,
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F8FAFD'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: active ? '#D2E3FC' : '#F1F3F4',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>
        {icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
          <div style={{
            fontSize: 13, fontWeight: hasUnread ? 800 : 600,
            color: active ? '#1A73E8' : '#202124',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            textTransform: 'capitalize',
          }}>
            {name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
            {room.lastMessage?.sentAt && (
              <span style={{ fontSize: 10.5, color: '#9AA0A6' }}>{fmt(room.lastMessage.sentAt)}</span>
            )}
            {hasUnread && (
              <span style={{
                background: '#1A73E8', color: '#fff',
                borderRadius: 20, padding: '1px 6px',
                fontSize: 10, fontWeight: 800,
                minWidth: 18, textAlign: 'center',
              }}>
                {unread > 99 ? '99+' : unread}
              </span>
            )}
          </div>
        </div>
        {room.lastMessage?.content && (
          <div style={{
            fontSize: 11.5, color: '#5F6368', marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontWeight: hasUnread ? 600 : 400,
          }}>
            {room.lastMessage.senderName && `${room.lastMessage.senderName}: `}
            {room.lastMessage.content}
          </div>
        )}
        {room.isLocked && (
          <span style={{ fontSize: 10, color: '#d93025', fontWeight: 700 }}>🔒 Locked</span>
        )}
      </div>
    </div>
  );
};

// New room modal
const NewRoomModal = ({ role, societies, onClose, onCreate }) => {
  const [tab, setTab]             = useState('society');
  const [selectedSociety, setSoc] = useState(null);
  const [targetRole, setTarget]   = useState('');
  const [query, setQuery]         = useState('');
  const [loading, setLoading]     = useState(false);

  const validTargets = VALID_ROLE_TARGETS[role] || [];
  const filteredSocs = societies.filter(s => s.name?.toLowerCase().includes(query.toLowerCase()));

  const handleCreate = async () => {
    setLoading(true);
    try {
      if (tab === 'society' && selectedSociety) {
        const res = await getOrCreateSocietyRoom({
          societyId: selectedSociety._id || selectedSociety.name,
          societyName: selectedSociety.name,
        });
        onCreate(res.data.room);
      } else if (tab === 'role' && targetRole) {
        const res = await getOrCreateRoleRoom({ targetRole });
        onCreate(res.data.room);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        flex: 1, padding: '8px 0', border: 'none',
        borderBottom: tab === id ? '2.5px solid #1A73E8' : '2.5px solid transparent',
        background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === id ? 700 : 500,
        color: tab === id ? '#1A73E8' : '#5F6368', transition: 'all 0.15s',
      }}
    >{label}</button>
  );

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)', animation: 'overlayIn 0.2s ease',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 420,
        maxHeight: '80vh', overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        animation: 'modalIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #F1F3F4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#202124' }}>New Conversation</h3>
          <button onClick={onClose} style={{ background: '#F1F3F4', border: 'none', width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', fontSize: 16, color: '#5F6368' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #F1F3F4' }}>
          <TabBtn id="society" label="🏛️ Society" />
          {validTargets.length > 0 && <TabBtn id="role" label="🔑 Direct" />}
        </div>

        <div style={{ padding: 16 }}>
          {tab === 'society' && (
            <>
              <input
                type="text" placeholder="Search societies..."
                value={query} onChange={e => setQuery(e.target.value)}
                style={{ width: '100%', padding: '9px 14px', border: '1.5px solid #DADCE0', borderRadius: 10, fontSize: 13, outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
                onFocus={e => e.target.style.borderColor = '#1A73E8'}
                onBlur={e => e.target.style.borderColor = '#DADCE0'}
              />
              <div style={{ maxHeight: 240, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {filteredSocs.map(s => (
                  <div
                    key={s._id || s.name}
                    onClick={() => setSoc(s)}
                    style={{
                      padding: '10px 14px', borderRadius: 10,
                      border: `1.5px solid ${selectedSociety?.name === s.name ? '#1A73E8' : '#DADCE0'}`,
                      background: selectedSociety?.name === s.name ? '#EAF2FF' : '#fff',
                      cursor: 'pointer', fontSize: 13, fontWeight: 600,
                      display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
                    }}
                  >
                    🏛️ {s.name}
                    {selectedSociety?.name === s.name && <span style={{ marginLeft: 'auto', color: '#1A73E8' }}>✓</span>}
                  </div>
                ))}
                {filteredSocs.length === 0 && <div style={{ textAlign: 'center', color: '#9AA0A6', fontSize: 13, padding: 20 }}>No societies found</div>}
              </div>
            </>
          )}

          {tab === 'role' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ fontSize: 12, color: '#5F6368', margin: '0 0 8px' }}>Start a direct channel with:</p>
              {validTargets.map(t => (
                <div
                  key={t}
                  onClick={() => setTarget(t)}
                  style={{
                    padding: '12px 16px', borderRadius: 12,
                    border: `1.5px solid ${targetRole === t ? '#1A73E8' : '#DADCE0'}`,
                    background: targetRole === t ? '#EAF2FF' : '#fff',
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.15s',
                    textTransform: 'capitalize',
                  }}
                >
                  <RoleBadge role={t} />
                  {t.replace('_', ' ')}
                  {targetRole === t && <span style={{ marginLeft: 'auto', color: '#1A73E8' }}>✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: '1px solid #F1F3F4', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 20, border: '1.5px solid #DADCE0', background: '#fff', color: '#5F6368', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Cancel</button>
          <button
            onClick={handleCreate}
            disabled={loading || (tab === 'society' ? !selectedSociety : !targetRole)}
            style={{
              padding: '9px 22px', borderRadius: 20, border: 'none',
              background: (tab === 'society' ? !selectedSociety : !targetRole) ? '#DADCE0' : '#1A73E8',
              color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700,
            }}
          >
            {loading ? 'Opening...' : 'Open Chat'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function NightMessenger() {
  const { user } = useAuth();
  const role = (user?.night?.role || user?.role || '').toLowerCase();

  const [rooms, setRooms]               = useState([]);
  const [activeRoom, setActiveRoom]     = useState(null);
  const [messages, setMessages]         = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [input, setInput]               = useState('');
  const [sending, setSending]           = useState(false);
  const [showNewRoom, setShowNewRoom]   = useState(false);
  const [societies, setSocieties]       = useState([]);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [attachments, setAttachments]   = useState([]);

  const msgEndRef = useRef(null);
  const inputRef  = useRef(null);

  // ── Access gate ──────────────────────────────────────────────────────────────
  const canAccess = CHAT_ROLES.includes(role);

  // ── Load rooms ───────────────────────────────────────────────────────────────
  const loadRooms = useCallback(async () => {
    try {
      const res = await fetchChatRooms();
      setRooms(res.data.rooms || []);
    } catch {}
    setLoadingRooms(false);
  }, []);

  // ── Load messages for active room ────────────────────────────────────────────
  const loadMessages = useCallback(async (roomId) => {
    setLoadingMsgs(true);
    try {
      const res = await fetchMessages(roomId);
      setMessages(res.data.messages || []);
    } catch {}
    setLoadingMsgs(false);
  }, []);

  useEffect(() => {
    if (canAccess) {
      loadRooms();
      fetchSocieties().then(r => setSocieties(r.data.societies || [])).catch(() => {});
    }
  }, [canAccess, loadRooms]);

  useEffect(() => {
    if (activeRoom) loadMessages(activeRoom._id);
  }, [activeRoom, loadMessages]);

  // ── Scroll to bottom on new messages ────────────────────────────────────────
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Socket: receive new messages ──────────────────────────────────────────────
  const socketHandlers = {
    'chat:message-new': ({ roomId, message }) => {
      if (activeRoom && String(roomId) === String(activeRoom._id)) {
        setMessages(prev => [...prev, message]);
      }
      // Update room list preview
      setRooms(prev => prev.map(r =>
        String(r._id) === String(roomId)
          ? { ...r, lastMessage: { content: message.content, senderName: message.senderName, sentAt: message.createdAt }, myUnread: String(roomId) === String(activeRoom?._id) ? 0 : (r.myUnread || 0) + 1 }
          : r
      ));
    },
    'chat:unread-update': loadRooms,
  };
  useSocket(socketHandlers);

  // ── Select room ───────────────────────────────────────────────────────────────
  const handleSelectRoom = (room) => {
    setActiveRoom(room);
    // Reset unread badge locally
    setRooms(prev => prev.map(r => String(r._id) === String(room._id) ? { ...r, myUnread: 0 } : r));
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  // ── Send message ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const text = input.trim();
    if ((!text && attachments.length === 0) || !activeRoom || sending) return;

    setSending(true);
    const optimistic = {
      _id: `opt-${Date.now()}`,
      roomId: activeRoom._id,
      senderId: user._id,
      senderName: user.name,
      senderRole: user.role,
      content: text,
      attachments,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);
    setInput('');
    setAttachments([]);

    try {
      await sendChatMessage(activeRoom._id, {
        content: text,
        attachments,
        messageType: attachments.length > 0 && !text ? 'ATTACHMENT' : 'TEXT',
      });
      loadRooms();
    } catch {
      setMessages(prev => prev.filter(m => m._id !== optimistic._id));
      setInput(text);
    }
    setSending(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewRoomCreated = (room) => {
    setShowNewRoom(false);
    loadRooms();
    setActiveRoom(room);
  };

  // ── Lock thread ───────────────────────────────────────────────────────────────
  const handleLock = async () => {
    if (!activeRoom || !['admin', 'adosa'].includes(role)) return;
    await lockChatRoom(activeRoom._id);
    setActiveRoom(prev => ({ ...prev, isLocked: true }));
    loadMessages(activeRoom._id);
  };

  if (!canAccess) {
    return (
      <div className="night-pass-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💬</div>
          <h2 style={{ color: '#202124' }}>Messenger Access Restricted</h2>
          <p style={{ color: '#5F6368' }}>Only Gen Sec, President, ADOSA, Assistant and Admin can use the messenger.</p>
        </div>
      </div>
    );
  }

  const activeRoomName = activeRoom
    ? activeRoom.type === 'SOCIETY'
      ? activeRoom.societyName
      : activeRoom.type === 'APPROVAL'
      ? activeRoom.referenceName
      : activeRoom.roleChannel?.replace('-', ' ↔ ').replace(/_/g, ' ')
    : null;

  return (
    <div className="night-pass-container" style={{ height: 'calc(100vh - 0px)', display: 'flex', overflow: 'hidden', background: '#F8FAFD' }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div style={{
        width: sidebarOpen ? 300 : 0,
        minWidth: sidebarOpen ? 300 : 0,
        background: '#fff',
        borderRight: '1px solid #E0E3E7',
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden', flexShrink: 0,
      }}>
        {/* Sidebar header */}
        <div style={{
          padding: '16px 16px 12px',
          borderBottom: '1px solid #F1F3F4',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#202124' }}>💬 Messages</h2>
            <div style={{ fontSize: 11, color: '#5F6368', marginTop: 2 }}>{rooms.length} conversation{rooms.length !== 1 ? 's' : ''}</div>
          </div>
          <button
            onClick={() => setShowNewRoom(true)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: '#1A73E8', border: 'none', color: '#fff',
              cursor: 'pointer', fontSize: 20, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(26,115,232,0.3)',
              transition: 'transform 0.15s',
            }}
            title="New conversation"
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            +
          </button>
        </div>

        {/* Room list */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {loadingRooms ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
              <div className="spin" style={{ width: 28, height: 28, border: '3px solid #DADCE0', borderTopColor: '#1A73E8', borderRadius: '50%' }} />
            </div>
          ) : rooms.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#9AA0A6' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>💬</div>
              <div style={{ fontSize: 13 }}>No conversations yet.</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>Click + to start one.</div>
            </div>
          ) : (
            rooms.map(room => (
              <RoomItem
                key={room._id}
                room={room}
                active={activeRoom?._id === room._id}
                onClick={handleSelectRoom}
                myId={user._id}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Chat area ───────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Chat header */}
        <div style={{
          height: 60, background: '#fff', borderBottom: '1px solid #E0E3E7',
          display: 'flex', alignItems: 'center', padding: '0 20px', gap: 12,
          flexShrink: 0,
        }}>
          {/* Toggle sidebar btn */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5F6368', fontSize: 20, padding: 4, borderRadius: 6, transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#F1F3F4'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            ☰
          </button>

          {activeRoom ? (
            <>
              <div style={{ fontSize: 18 }}>{ROOM_TYPE_LABELS[activeRoom.type]?.icon || '💬'}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'capitalize' }}>
                  {activeRoomName}
                </div>
                <div style={{ fontSize: 11, color: '#5F6368' }}>
                  {ROOM_TYPE_LABELS[activeRoom.type]?.label} Channel
                  {activeRoom.isLocked && ' · 🔒 Locked'}
                </div>
              </div>

              {/* Lock button for admin/adosa */}
              {['admin', 'adosa'].includes(role) && !activeRoom.isLocked && (
                <button
                  onClick={handleLock}
                  style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #DADCE0', background: '#fff', color: '#d93025', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}
                  title="Lock this thread"
                >
                  🔒 Lock
                </button>
              )}
            </>
          ) : (
            <div style={{ fontSize: 14, color: '#9AA0A6' }}>
              {sidebarOpen ? 'Select a conversation' : 'Click ☰ to see conversations'}
            </div>
          )}
        </div>

        {/* Messages area */}
        {activeRoom ? (
          <>
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 24px' }}>
              {loadingMsgs ? (
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
                  <div className="spin" style={{ width: 32, height: 32, border: '3px solid #DADCE0', borderTopColor: '#1A73E8', borderRadius: '50%' }} />
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: 60, color: '#9AA0A6' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>💬</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No messages yet</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Be the first to send a message.</div>
                </div>
              ) : (
                <>
                  {messages.map(msg => (
                    <MessageBubble
                      key={msg._id}
                      msg={msg}
                      isMine={String(msg.senderId) === String(user._id)}
                    />
                  ))}
                  <div ref={msgEndRef} />
                </>
              )}
            </div>

            {/* Input area */}
            {!activeRoom.isLocked ? (
              <div style={{
                padding: '12px 20px', borderTop: '1px solid #E0E3E7',
                background: '#fff', flexShrink: 0,
              }}>
                {/* Attachment preview */}
                {attachments.length > 0 && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    {attachments.map((a, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 20,
                        background: '#F1F3F4', fontSize: 12, color: '#202124',
                      }}>
                        {a.type === 'pdf' ? '📄' : '🖼️'} {a.filename || `file ${i + 1}`}
                        <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: '#d93025', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
                    rows={1}
                    style={{
                      flex: 1, border: '1.5px solid #DADCE0', borderRadius: 20,
                      padding: '10px 16px', fontSize: 13.5, outline: 'none',
                      resize: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                      maxHeight: 120, overflow: 'auto',
                      transition: 'border-color 0.2s',
                    }}
                    onFocus={e => e.target.style.borderColor = '#1A73E8'}
                    onBlur={e => e.target.style.borderColor = '#DADCE0'}
                    onInput={e => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                    }}
                  />

                  {/* Attach URL button */}
                  {attachments.length < 5 && (
                    <button
                      onClick={() => {
                        const url = prompt('Paste attachment URL (ImageKit):');
                        if (!url?.trim()) return;
                        const type = url.match(/\.(pdf)$/i) ? 'pdf' : 'image';
                        const filename = url.split('/').pop() || 'file';
                        setAttachments(prev => [...prev, { url: url.trim(), type, filename }]);
                      }}
                      style={{ width: 40, height: 40, borderRadius: '50%', border: '1.5px solid #DADCE0', background: '#fff', cursor: 'pointer', fontSize: 18, color: '#5F6368', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      title="Attach file"
                    >
                      📎
                    </button>
                  )}

                  <button
                    onClick={handleSend}
                    disabled={(!input.trim() && attachments.length === 0) || sending}
                    style={{
                      width: 40, height: 40, borderRadius: '50%', border: 'none',
                      background: (!input.trim() && attachments.length === 0) || sending ? '#DADCE0' : '#1A73E8',
                      color: '#fff', cursor: 'pointer', fontSize: 18,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, transition: 'background 0.2s',
                    }}
                  >
                    {sending ? '•' : '↑'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '14px 20px', background: '#fef7e0', borderTop: '1px solid #E0E3E7', textAlign: 'center', fontSize: 13, color: '#f29900', fontWeight: 600 }}>
                🔒 This thread has been locked. No new messages can be sent.
              </div>
            )}
          </>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#9AA0A6', gap: 16 }}>
            <div style={{ fontSize: 64 }}>💬</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#5F6368' }}>Night Pass Messenger</div>
            <div style={{ fontSize: 13, maxWidth: 300, textAlign: 'center', lineHeight: 1.6 }}>
              Select a conversation from the sidebar, or start a new one with the <strong>+</strong> button.
            </div>
            <button
              onClick={() => setShowNewRoom(true)}
              style={{
                marginTop: 8, padding: '10px 24px', borderRadius: 20,
                background: '#1A73E8', color: '#fff', border: 'none',
                cursor: 'pointer', fontSize: 13, fontWeight: 700,
              }}
            >
              + New Conversation
            </button>
          </div>
        )}
      </div>

      {/* New Room Modal */}
      {showNewRoom && (
        <NewRoomModal
          role={role}
          societies={societies}
          onClose={() => setShowNewRoom(false)}
          onCreate={handleNewRoomCreated}
        />
      )}

      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
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