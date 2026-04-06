// components/community/CommentSection.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ThumbsUp, Trash2, CornerDownRight, ChevronDown, ChevronUp } from "lucide-react";

const BACKEND = "";

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

function Avatar({ name, size = 30 }) {
  const initials = (name || "?").split(" ").slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const colors   = ["#c62828","#2e7d32","#1a56db","#6d28d9","#b45309"];
  const bg       = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width:size, height:size, borderRadius:"50%", background:bg, flexShrink:0,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  fontSize:size*0.38, fontWeight:700, color:"#fff" }}>
      {initials}
    </div>
  );
}

/* ── Single comment ── */
function Comment({ comment, user, token, isAdmin, depth = 0, onLoginRequired, onToast, onRefresh }) {
  const [replyOpen,  setReplyOpen]  = useState(false);
  const [replyText,  setReplyText]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [liking,     setLiking]     = useState(false);
  const [collapsed,  setCollapsed]  = useState(false);

  const liked = user && comment.likedBy?.includes(user._id);

  async function submitReply() {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${BACKEND}/api/community/comments`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body:JSON.stringify({ postId:comment.postId, message:replyText.trim(), parentCommentId:comment._id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      setReplyText("");
      setReplyOpen(false);
      onRefresh();
    } catch (err) {
      onToast(err.message || "Failed to reply");
    } finally { setSubmitting(false); }
  }

  async function likeComment() {
    if (!user) { onLoginRequired(); return; }
    if (liking) return;
    setLiking(true);
    try {
      const res = await fetch(`${BACKEND}/api/community/comments/${comment._id}/like`, {
        method:"POST",
        headers:{ Authorization:`Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch { onToast("Failed to like comment"); }
    finally { setLiking(false); }
  }

  async function deleteComment() {
    if (!window.confirm("Delete this comment?")) return;
    try {
      const res = await fetch(`${BACKEND}/api/community/comments/${comment._id}`, {
        method:"DELETE",
        headers:{ Authorization:`Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch { onToast("Failed to delete comment"); }
  }

  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
      style={{ marginLeft:depth > 0 ? 36 : 0 }}>
      <div style={{ display:"flex", gap:10 }}>
        <Avatar name={comment.name} size={depth > 0 ? 26 : 30}/>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ background:"#f9fafb", borderRadius:12, padding:"10px 14px" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
              <span style={{ fontWeight:600, fontSize:13, color:"#111" }}>{comment.name}</span>
              <span style={{ fontSize:11, color:"#9ca3af" }}>{timeAgo(comment.createdAt)}</span>
              {depth > 0 && (
                <span style={{ display:"flex", alignItems:"center", gap:3,
                               fontSize:11, color:"#6b7280" }}>
                  <CornerDownRight size={10}/> reply
                </span>
              )}
            </div>
            <p style={{ fontSize:13.5, color:"#374151", lineHeight:1.6, margin:0 }}>
              {comment.message}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginTop:6, paddingLeft:4 }}>
            <button onClick={likeComment}
              style={{ display:"flex", alignItems:"center", gap:4, fontSize:12, fontWeight:liked?600:400,
                       color:liked?"#166534":"#9ca3af", background:"none", border:"none",
                       cursor:"pointer", fontFamily:"inherit", padding:"2px 0" }}>
              <ThumbsUp size={12} fill={liked?"#166534":"none"}/> {comment.likes || 0}
            </button>
            {depth === 0 && (
              <button onClick={() => { if(!user){onLoginRequired();return;} setReplyOpen(v=>!v); }}
                style={{ fontSize:12, color:"#6b7280", background:"none", border:"none",
                         cursor:"pointer", fontFamily:"inherit", fontWeight:500 }}>
                Reply
              </button>
            )}
            {(isAdmin || user?._id === comment.authorId) && (
              <button onClick={deleteComment}
                style={{ display:"flex", alignItems:"center", gap:3, fontSize:12, color:"#dc2626",
                         background:"none", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                <Trash2 size={11}/> Delete
              </button>
            )}
            {/* collapse replies */}
            {depth === 0 && comment.replies?.length > 0 && (
              <button onClick={() => setCollapsed(v=>!v)}
                style={{ display:"flex", alignItems:"center", gap:3, fontSize:12, color:"#6b7280",
                         background:"none", border:"none", cursor:"pointer", fontFamily:"inherit",
                         marginLeft:"auto" }}>
                {collapsed ? <ChevronDown size={12}/> : <ChevronUp size={12}/>}
                {comment.replies.length} {comment.replies.length === 1 ? "reply" : "replies"}
              </button>
            )}
          </div>

          {/* Reply Input */}
          <AnimatePresence>
            {replyOpen && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:"auto" }}
                exit={{ opacity:0, height:0 }} style={{ marginTop:8 }}>
                <div style={{ display:"flex", gap:8 }}>
                  {user && <Avatar name={user.name} size={24}/>}
                  <div style={{ flex:1, display:"flex", gap:6 }}>
                    <input value={replyText} onChange={e => setReplyText(e.target.value)}
                      onKeyDown={e => e.key==="Enter" && !e.shiftKey && submitReply()}
                      placeholder="Write a reply…"
                      style={{ flex:1, padding:"7px 12px", border:"1.5px solid #e5e7eb",
                               borderRadius:8, fontSize:13, fontFamily:"inherit", outline:"none",
                               background:"#fff" }}
                      onFocus={e => e.target.style.borderColor="#4ade80"}
                      onBlur={e  => e.target.style.borderColor="#e5e7eb"}
                    />
                    <button onClick={submitReply} disabled={submitting || !replyText.trim()}
                      style={{ padding:"7px 12px", background:"#2e7d32", color:"#fff",
                               border:"none", borderRadius:8, cursor:"pointer", lineHeight:1 }}>
                      <Send size={13}/>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Nested replies */}
          <AnimatePresence>
            {!collapsed && comment.replies?.length > 0 && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                style={{ marginTop:10, display:"flex", flexDirection:"column", gap:10 }}>
                {comment.replies.map(reply => (
                  <Comment key={reply._id} comment={reply} user={user} token={token}
                    isAdmin={isAdmin} depth={1}
                    onLoginRequired={onLoginRequired} onToast={onToast} onRefresh={onRefresh}/>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

/* ── Section ── */
export default function CommentSection({ postId, user, token, isAdmin, onLoginRequired, onToast }) {
  const [comments,  setComments]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [text,      setText]      = useState("");
  const [posting,   setPosting]   = useState(false);
  const debounceRef = useRef(null);

  const fetchComments = useCallback(async () => {
    try {
      const res  = await fetch(`${BACKEND}/api/community/posts/${postId}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch {
      /* silent */
    } finally { setLoading(false); }
  }, [postId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  async function postComment() {
    if (!text.trim() || posting) return;
    if (!user) { onLoginRequired(); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPosting(true);
      try {
        const res = await fetch(`${BACKEND}/api/community/comments`, {
          method:"POST",
          headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
          body:JSON.stringify({ postId, message:text.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        setText("");
        fetchComments();
      } catch (err) {
        onToast(err.message || "Failed to comment");
      } finally { setPosting(false); }
    }, 300);
  }

  return (
    <div style={{ padding:"16px 20px 20px", background:"#fcfcfc" }}>
      {/* Input */}
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        {user && <Avatar name={user.name} size={32}/>}
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", gap:8 }}>
            <input value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => e.key==="Enter" && !e.shiftKey && postComment()}
              placeholder={user ? "Add a comment…" : "Sign in to comment"}
              disabled={!user}
              style={{ flex:1, padding:"9px 14px", border:"1.5px solid #e5e7eb",
                       borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none",
                       background: user?"#fff":"#f9fafb",
                       color: user?"#111":"#9ca3af", cursor:user?"text":"default" }}
              onFocus={e => user && (e.target.style.borderColor="#4ade80")}
              onBlur={e  => (e.target.style.borderColor="#e5e7eb")}
            />
            <button onClick={postComment}
              disabled={posting || !text.trim() || !user}
              style={{ padding:"9px 16px", background: posting||!text.trim()||!user?"#d1d5db":"#2e7d32",
                       color:"#fff", border:"none", borderRadius:10, cursor:posting?"not-allowed":"pointer",
                       display:"flex", alignItems:"center", gap:6, fontSize:13.5, fontWeight:600,
                       fontFamily:"inherit", transition:"background .15s" }}>
              <Send size={14}/> {posting ? "…" : "Post"}
            </button>
          </div>
        </div>
      </div>

      {/* Comments list */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"16px 0", color:"#9ca3af", fontSize:13 }}>
          Loading comments…
        </div>
      ) : comments.length === 0 ? (
        <p style={{ fontSize:13, color:"#9ca3af", textAlign:"center", padding:"12px 0" }}>
          No comments yet. Be the first!
        </p>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          {comments.map(c => (
            <Comment key={c._id} comment={c} user={user} token={token}
              isAdmin={isAdmin} depth={0}
              onLoginRequired={onLoginRequired} onToast={onToast}
              onRefresh={fetchComments}/>
          ))}
        </div>
      )}
    </div>
  );
}