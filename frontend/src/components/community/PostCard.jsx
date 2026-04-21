// components/community/PostCard.jsx
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ThumbsUp, ThumbsDown, MessageSquare, Share2,
  Trash2, MoreHorizontal, Calendar, Tag,
  Link as LinkIcon, Flag, X, AlertTriangle,
} from "lucide-react";
import CommentSection from "./CommentSection";
import AttachmentPreview from "./AttachmentPreview";

const BACKEND = "";
const ADMIN_EMAIL = "admin_dev@thapar.edu";

const TAG_COLORS = {
  Suggestion: { bg:"#e0f2fe", color:"#0369a1", border:"#bae6fd" },
  Feedback:   { bg:"#f0fdf4", color:"#166534", border:"#bbf7d0" },
  Issue:      { bg:"#fef2f2", color:"#991b1b", border:"#fecaca" },
  Question:   { bg:"#fdf4ff", color:"#7e22ce", border:"#e9d5ff" },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24)return `${hours}h ago`;
  return `${days}d ago`;
}

function Avatar({ name, picture, size = 38 }) {
  const initials = (name || "?").split(" ").slice(0,2).map(w => w[0]).join("").toUpperCase();
  const colors   = ["#c62828","#2e7d32","#1a56db","#6d28d9","#b45309"];
  const bg       = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return picture ? (
    <img src={picture} alt={name}
      style={{ width:size, height:size, borderRadius:"50%", objectFit:"cover", flexShrink:0 }}/>
  ) : (
    <div style={{ width:size, height:size, borderRadius:"50%", background:bg, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:size*0.38, fontWeight:700, color:"#fff" }}>
      {initials}
    </div>
  );
}

/* ─────────────────────────────────────────
   Share Modal — bottom sheet style
───────────────────────────────────────── */
function ShareModal({ post, onClose, onToast }) {
  const shareUrl = `${window.location.origin}/community-feedback#${post._id}`;

  const items = [
    {
      label: "Copy Link",
      bg: "#f0fdf4",
      icon: <LinkIcon size={22} color="#166534"/>,
      onClick() {
        navigator.clipboard?.writeText(shareUrl);
        onToast("Link copied to clipboard ✓");
        onClose();
      },
    },
    {
      label: "WhatsApp",
      bg: "#dcfce7",
      icon: <WhatsAppIcon size={22}/>,
      onClick() {
        const t = encodeURIComponent(`${post.title} — Thapar Community Forum`);
        const u = encodeURIComponent(shareUrl);
        window.open(`https://wa.me/?text=${t}%20${u}`, "_blank");
        onClose();
      },
    },
    {
      label: "LinkedIn",
      bg: "#dbeafe",
      icon: <LinkedInIcon size={22}/>,
      onClick() {
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, "_blank");
        onClose();
      },
    },
  ];

  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
               zIndex:800, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <motion.div
        initial={{ y:140, opacity:0 }}
        animate={{ y:0,   opacity:1 }}
        exit={{ y:140, opacity:0 }}
        transition={{ type:"spring", damping:28, stiffness:320 }}
        onClick={e => e.stopPropagation()}
        style={{ background:"#fff", borderRadius:"20px 20px 0 0",
                 width:"100%", maxWidth:540,
                 paddingBottom:32,
                 boxShadow:"0 -8px 48px rgba(0,0,0,.12)" }}>

        {/* Drag handle */}
        <div style={{ width:40, height:4, background:"#d1d5db", borderRadius:2,
                      margin:"12px auto 0" }}/>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"16px 20px 14px", borderBottom:"1px solid #f3f4f6" }}>
          <div style={{ flex:1, minWidth:0 }}>
            <p style={{ fontWeight:700, fontSize:14.5, color:"#111", margin:0,
                        overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {post.title}
            </p>
            <p style={{ fontSize:12, color:"#9ca3af", margin:"3px 0 0" }}>Share this post</p>
          </div>
          <button onClick={onClose}
            style={{ marginLeft:12, flexShrink:0, width:32, height:32, borderRadius:"50%",
                     background:"#f3f4f6", border:"none", cursor:"pointer",
                     display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={15} color="#6b7280"/>
          </button>
        </div>

        {/* Icons */}
        <div style={{ display:"flex", justifyContent:"center", gap:36, padding:"28px 24px 4px" }}>
          {items.map(({ label, bg, icon, onClick }) => (
            <button key={label} onClick={onClick}
              style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:10,
                       background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
              <motion.div
                whileHover={{ scale:1.1 }} whileTap={{ scale:.94 }}
                style={{ width:64, height:64, borderRadius:"50%", background:bg,
                         display:"flex", alignItems:"center", justifyContent:"center",
                         boxShadow:"0 2px 10px rgba(0,0,0,.08)" }}>
                {icon}
              </motion.div>
              <span style={{ fontSize:12.5, color:"#374151", fontWeight:500 }}>{label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   Report Confirm Modal
───────────────────────────────────────── */
function ReportModal({ onConfirm, onClose, reporting }) {
  return (
    <motion.div
      initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)",
               zIndex:800, display:"flex", alignItems:"center",
               justifyContent:"center", padding:16 }}>
      <motion.div
        initial={{ scale:.93, opacity:0 }} animate={{ scale:1, opacity:1 }}
        exit={{ scale:.93, opacity:0 }} transition={{ type:"spring", damping:22 }}
        onClick={e => e.stopPropagation()}
        style={{ background:"#fff", borderRadius:18, padding:28,
                 maxWidth:340, width:"100%",
                 boxShadow:"0 16px 48px rgba(0,0,0,.18)" }}>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                      gap:14, textAlign:"center" }}>
          <div style={{ width:54, height:54, borderRadius:14, background:"#fef2f2",
                        display:"flex", alignItems:"center", justifyContent:"center" }}>
            <AlertTriangle size={26} color="#dc2626"/>
          </div>
          <div>
            <p style={{ fontWeight:700, fontSize:16, color:"#111", margin:"0 0 8px" }}>
              Report this post?
            </p>
            <p style={{ fontSize:13, color:"#6b7280", lineHeight:1.65, margin:0 }}>
              Posts that receive <strong>5 reports</strong> are automatically
              removed. Only report posts that violate community guidelines.
            </p>
          </div>
          <div style={{ display:"flex", gap:10, width:"100%", marginTop:4 }}>
            <button onClick={onClose}
              style={{ flex:1, padding:"10px 0", border:"1.5px solid #d1d5db",
                       borderRadius:10, background:"none", color:"#374151",
                       fontSize:14, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
              Cancel
            </button>
            <button onClick={onConfirm} disabled={reporting}
              style={{ flex:1, padding:"10px 0", border:"none", borderRadius:10,
                       background: reporting ? "#fca5a5" : "#dc2626",
                       color:"#fff", fontSize:14, fontWeight:600,
                       cursor: reporting ? "not-allowed" : "pointer", fontFamily:"inherit" }}>
              {reporting ? "Reporting…" : "Report"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────
   Main PostCard
───────────────────────────────────────── */
export default function PostCard({ post: initialPost, user, token, onVote, onDelete, onLoginRequired, onToast }) {
  const [post,         setPost]         = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [showMenu,     setShowMenu]     = useState(false);
  const [showShare,    setShowShare]    = useState(false);
  const [showReport,   setShowReport]   = useState(false);
  const [voteLoading,  setVoteLoading]  = useState(false);
  const [reporting,    setReporting]    = useState(false);
  const menuRef = useRef(null);

  const tagStyle    = TAG_COLORS[post.category] || TAG_COLORS.Feedback;
  const isAdmin     = user?.email === ADMIN_EMAIL;
  const userId      = user?.sub || user?._id;
  const hasReported = userId && (post.reportedBy || []).includes(userId);
  const myVote      = userId
    ? (post.likedBy?.includes(userId) ? "like"
     : post.dislikedBy?.includes(userId) ? "dislike" : null)
    : null;

  /* close menu on outside click */
  useEffect(() => {
    if (!showMenu) return;
    const handle = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [showMenu]);

  async function handleVote(type) {
    if (!user) { onLoginRequired(); return; }
    if (voteLoading) return;
    setVoteLoading(true);
    try {
      const res  = await fetch(`${BACKEND}/api/community/posts/${post._id}/vote`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      onVote(post._id, data.post);
      setPost(data.post);
    } catch {
      onToast("Failed to vote. Try again.");
    } finally {
      setVoteLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this post permanently?")) return;
    try {
      const res = await fetch(`${BACKEND}/api/community/posts/${post._id}`, {
        method:"DELETE",
        headers:{ Authorization:`Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      onDelete(post._id);
    } catch {
      onToast("Failed to delete post.");
    }
  }

  async function handleReport() {
    setReporting(true);
    try {
      const res = await fetch(`${BACKEND}/api/community/posts/${post._id}/report`, {
        method:"POST",
        headers:{ Authorization:`Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      if (data.deleted) {
        onToast("Post removed after too many reports.");
        onDelete(post._id);
      } else {
        setPost(p => ({
          ...p,
          reportCount: data.reportCount,
          reportedBy: [...(p.reportedBy || []), userId],
        }));
        onToast("Post reported. Thanks for keeping the community safe ✓");
      }
    } catch (err) {
      onToast(err.message || "Failed to report post.");
    } finally {
      setReporting(false);
      setShowReport(false);
    }
  }

  return (
    <>
      <motion.div id={post._id}
        whileHover={{ boxShadow:"0 8px 32px rgba(0,0,0,.08)" }}
        style={{ background:"#fff", borderRadius:16, border:"1.5px solid #e5e7eb",
                 overflow:"hidden", transition:"border-color .2s",
                 boxShadow:"0 2px 8px rgba(0,0,0,.04)" }}>

        <div style={{ padding:"20px 20px 16px" }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"flex-start", gap:12, marginBottom:14 }}>
            <Avatar name={post.name} picture={post.authorPicture}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                <span style={{ fontWeight:700, fontSize:14.5, color:"#111" }}>{post.name}</span>
                <span style={{ fontSize:11.5, background:"#f0fdf4", color:"#166534",
                               border:"1px solid #bbf7d0", borderRadius:20, padding:"2px 8px", fontWeight:500 }}>
                  {post.email}
                </span>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:3 }}>
                <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, color:"#9ca3af" }}>
                  <Calendar size={11}/> {timeAgo(post.createdAt)}
                </span>
                <span style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:600,
                               padding:"2px 10px", borderRadius:20, border:"1px solid",
                               background:tagStyle.bg, color:tagStyle.color, borderColor:tagStyle.border }}>
                  <Tag size={10}/> {post.category}
                </span>
              </div>
            </div>

            {/* ⋯ menu */}
            <div ref={menuRef} style={{ position:"relative" }}>
              <button onClick={() => setShowMenu(v => !v)}
                style={{ background:"none", border:"none", cursor:"pointer",
                         padding:6, borderRadius:8, lineHeight:1, display:"flex" }}>
                <MoreHorizontal size={16} color="#9ca3af"/>
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity:0, scale:.92, y:4 }}
                    animate={{ opacity:1, scale:1, y:0 }}
                    exit={{ opacity:0, scale:.92, y:4 }}
                    transition={{ duration:.12 }}
                    style={{ position:"absolute", right:0, top:"calc(100% + 4px)", background:"#fff",
                             borderRadius:12, boxShadow:"0 8px 32px rgba(0,0,0,.14)",
                             border:"1px solid #e5e7eb", padding:"6px 0", minWidth:175, zIndex:100 }}>

                    {/* Report — visible to logged-in non-admin users */}
                    {user && !isAdmin && (
                      <button
                        onClick={() => { setShowMenu(false); setShowReport(true); }}
                        disabled={hasReported}
                        style={{ ...menuItemStyle,
                                 color: hasReported ? "#9ca3af" : "#dc2626",
                                 cursor: hasReported ? "default" : "pointer" }}>
                        <Flag size={13}/>
                        {hasReported ? "Already Reported" : "Report Post"}
                      </button>
                    )}

                    {/* Admin delete */}
                    {isAdmin && (
                      <button onClick={() => { handleDelete(); setShowMenu(false); }}
                        style={{ ...menuItemStyle, color:"#dc2626" }}>
                        <Trash2 size={13}/> Delete Post
                      </button>
                    )}

                    {/* Fallback if no options (not logged in) */}
                    {!user && !isAdmin && (
                      <div style={{ padding:"9px 16px", fontSize:13, color:"#9ca3af" }}>
                        Sign in to report
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Title + Description */}
          <h2 style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize:20, fontWeight:700,
                       color:"#111", marginBottom:8, lineHeight:1.3 }}>
            {post.title}
          </h2>
          {post.description && (
            <p style={{ fontSize:14, color:"#374151", lineHeight:1.65, marginBottom:12 }}>
              {post.description}
            </p>
          )}

          {/* Attachment */}
          {post.attachmentUrl && (
            <div style={{ marginBottom:14 }}>
              <AttachmentPreview url={post.attachmentUrl} type={post.attachmentType}/>
            </div>
          )}

          {/* Action Bar */}
          <div style={{ display:"flex", alignItems:"center", gap:6, paddingTop:12,
                        borderTop:"1px solid #f3f4f6", flexWrap:"wrap" }}>
            <VoteButton
              icon={ThumbsUp} count={post.likes || 0}
              active={myVote === "like"} activeColor="#166534" activeBg="#f0fdf4"
              onClick={() => handleVote("like")} disabled={voteLoading}
            />
            <VoteButton
              icon={ThumbsDown} count={post.dislikes || 0}
              active={myVote === "dislike"} activeColor="#dc2626" activeBg="#fef2f2"
              onClick={() => handleVote("dislike")} disabled={voteLoading}
            />
            <ActionBtn
              icon={MessageSquare}
              label={`${post.commentCount || 0} Comment${post.commentCount !== 1 ? "s" : ""}`}
              onClick={() => setShowComments(v => !v)}
              active={showComments}
            />
            <ActionBtn icon={Share2} label="Share" onClick={() => setShowShare(true)}/>
          </div>
        </div>

        {/* Comments */}
        <AnimatePresence>
          {showComments && (
            <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
              exit={{ opacity:0, height:0 }} transition={{ duration:.25 }}
              style={{ borderTop:"1px solid #f3f4f6" }}>
              <CommentSection
                postId={post._id} user={user} token={token}
                isAdmin={isAdmin}
                onLoginRequired={onLoginRequired} onToast={onToast}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Share bottom-sheet */}
      <AnimatePresence>
        {showShare && (
          <ShareModal post={post} onClose={() => setShowShare(false)} onToast={onToast}/>
        )}
      </AnimatePresence>

      {/* Report confirm */}
      <AnimatePresence>
        {showReport && (
          <ReportModal
            onConfirm={handleReport}
            onClose={() => setShowReport(false)}
            reporting={reporting}
          />
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Sub-components ── */
const menuItemStyle = {
  display:"flex", alignItems:"center", gap:8, width:"100%",
  padding:"9px 16px", background:"none", border:"none", cursor:"pointer",
  fontSize:13, color:"#374151", textAlign:"left", fontFamily:"inherit",
};

function VoteButton({ icon:Icon, count, active, activeColor, activeBg, onClick, disabled }) {
  const [bounce, setBounce] = useState(false);
  function handleClick() {
    if (disabled) return;
    setBounce(true);
    setTimeout(() => setBounce(false), 300);
    onClick();
  }
  return (
    <motion.button
      animate={bounce ? { scale:[1,1.35,1] } : {}}
      transition={{ duration:.3 }}
      onClick={handleClick}
      style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px",
               border:"1.5px solid", borderColor:active?activeColor:"#e5e7eb",
               borderRadius:8, background:active?activeBg:"none",
               color:active?activeColor:"#6b7280", fontSize:13, fontWeight:active?600:400,
               cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit",
               transition:"all .15s" }}>
      <Icon size={14}/> {count}
    </motion.button>
  );
}

function ActionBtn({ icon:Icon, label, onClick, active }) {
  return (
    <button onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:5, padding:"6px 12px",
               border:`1.5px solid ${active?"#d1d5db":"#e5e7eb"}`,
               borderRadius:8, background:active?"#f9fafb":"none",
               color:active?"#374151":"#6b7280", fontSize:13,
               cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
      <Icon size={14}/> {label}
    </button>
  );
}

function WhatsAppIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#16a34a">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
    </svg>
  );
}

function LinkedInIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0a66c2">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}