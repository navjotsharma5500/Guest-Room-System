// pages/CommunityFeedbackPage.jsx
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Plus, Search, Filter, Flame,
  Clock, TrendingUp, Users, MessageSquare,
  LogIn, LogOut, X, Bell, ChevronDown,
} from "lucide-react";
import PostCard from "../components/community/PostCard";
import CreatePostModal from "../components/community/CreatePostModal";

/* ─── helpers ─── */
const BACKEND = "";            // same-domain proxy
const COMMUNITY_TOKEN_KEY = "community_jwt";
const COMMUNITY_USER_KEY  = "community_user";

function getToken() { return localStorage.getItem(COMMUNITY_TOKEN_KEY); }
function getUser()  {
  try { return JSON.parse(localStorage.getItem(COMMUNITY_USER_KEY)); }
  catch { return null; }
}

/* ─── Tag filter options ─── */
const TAGS = ["All","Suggestion","Feedback","Issue","Question"];
const SORT_OPTIONS = [
  { value:"latest",   label:"Latest",    Icon:Clock      },
  { value:"popular",  label:"Popular",   Icon:Flame      },
  { value:"trending", label:"Trending",  Icon:TrendingUp },
];

/* ─── Toast ─── */
function Toast({ msg, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div initial={{ opacity:0, y:40 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:40 }}
      style={{ position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)",
               background:"#1f2937", color:"#fff", padding:"10px 22px", borderRadius:100,
               fontSize:13, fontWeight:500, whiteSpace:"nowrap", zIndex:700,
               boxShadow:"0 4px 20px rgba(0,0,0,.3)", display:"flex", alignItems:"center", gap:8 }}>
      <Bell size={14}/> {msg}
    </motion.div>
  );
}

/* ─── Google Sign-In Button ─── */
function GoogleSignInButton({ onSuccess }) {
  const btnRef = useRef(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    /* Load GSI script once */
    if (window.google?.accounts?.id) { renderBtn(); return; }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = renderBtn;
    document.head.appendChild(s);

    function renderBtn() {
      if (!btnRef.current) return;
      window.google.accounts.id.initialize({
        client_id: process.env.REACT_APP_GOOGLE_CLIENT_ID,
        callback: handleCredential,
        auto_select: false,
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: "outline", size: "large", text: "signin_with",
        shape: "rectangular", logo_alignment: "left",
        width: 260,
      });
    }
  }, []);

  async function handleCredential({ credential }) {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/community/auth/google`, {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Auth failed");
      localStorage.setItem(COMMUNITY_TOKEN_KEY, data.token);
      localStorage.setItem(COMMUNITY_USER_KEY, JSON.stringify(data.user));
      onSuccess(data.user);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:16 }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ width:52, height:52, borderRadius:14, background:"#e8f5e9",
                      display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 12px" }}>
          <Users size={24} color="#2e7d32"/>
        </div>
        <p style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize:22, fontWeight:600,
                    color:"#111", margin:"0 0 6px" }}>Sign in to participate</p>
        <p style={{ fontSize:13, color:"#6b7280", margin:0 }}>
          Only <strong>@thapar.edu</strong> accounts are allowed
        </p>
      </div>
      {loading ? (
        <div style={{ padding:"12px 32px", background:"#f3f4f6", borderRadius:8,
                      fontSize:13, color:"#6b7280" }}>Verifying…</div>
      ) : (
        <div ref={btnRef}/>
      )}
    </div>
  );
}

/* ─── Auth Banner ─── */
function AuthBanner({ onLogin }) {
  return (
    <motion.div initial={{ opacity:0, y:-10 }} animate={{ opacity:1, y:0 }}
      style={{ background:"linear-gradient(135deg,#e8f5e9,#f0fdf4)",
               border:"1px solid #bbf7d0", borderRadius:14, padding:"20px 24px",
               display:"flex", alignItems:"center", justifyContent:"space-between",
               gap:16, flexWrap:"wrap", marginBottom:24 }}>
      <div>
        <p style={{ fontWeight:700, color:"#166534", fontSize:15, margin:"0 0 3px" }}>
          Join the Conversation
        </p>
        <p style={{ fontSize:13, color:"#4b5563", margin:0 }}>
          Sign in with your Thapar Google account to post, like & comment.
        </p>
      </div>
      <button onClick={onLogin}
        style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 20px",
                 background:"#166534", color:"#fff", border:"none", borderRadius:10,
                 fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                 flexShrink:0 }}>
        <LogIn size={15}/> Sign In with Google
      </button>
    </motion.div>
  );
}

/* ─── Login Modal ─── */
function LoginModal({ onClose, onSuccess }) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:600,
               display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <motion.div initial={{ scale:.93, opacity:0 }} animate={{ scale:1, opacity:1 }}
        exit={{ scale:.93, opacity:0 }} transition={{ type:"spring", damping:22 }}
        onClick={e => e.stopPropagation()}
        style={{ background:"#fff", borderRadius:20, padding:40, maxWidth:360, width:"100%",
                 boxShadow:"0 24px 60px rgba(0,0,0,.2)", position:"relative" }}>
        <button onClick={onClose}
          style={{ position:"absolute", top:14, right:14, background:"none", border:"none",
                   cursor:"pointer", padding:6, borderRadius:8, lineHeight:1 }}>
          <X size={18} color="#6b7280"/>
        </button>
        <GoogleSignInButton onSuccess={u => { onSuccess(u); onClose(); }}/>
      </motion.div>
    </motion.div>
  );
}

/* ─── MAIN PAGE ─── */
export default function CommunityFeedbackPage() {
  const navigate = useNavigate();
  const loaderRef = useRef(null);

  const [user,     setUser]     = useState(getUser);
  const [posts,    setPosts]    = useState([]);
  const [page,     setPage]     = useState(1);
  const [hasMore,  setHasMore]  = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [search,   setSearch]   = useState("");
  const [tag,      setTag]      = useState("All");
  const [sort,     setSort]     = useState("latest");
  const [showCreate, setShowCreate] = useState(false);
  const [showLogin,  setShowLogin]  = useState(false);
  const [toast,    setToast]    = useState(null);

  /* ── fetch posts ── */
  const fetchPosts = useCallback(async (pageNum, reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pageNum, limit: 10, sort,
        ...(tag !== "All" && { category: tag }),
        ...(search.trim() && { search: search.trim() }),
      });
      const res  = await fetch(`${BACKEND}/api/community/posts?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      const incoming = data.posts || [];
      setPosts(prev => reset ? incoming : [...prev, ...incoming]);
      setHasMore(incoming.length === 10);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sort, tag, search, loading]);

  /* reset on filter change */
  useEffect(() => {
    setPage(1);
    setPosts([]);
    setHasMore(true);
    fetchPosts(1, true);
  // eslint-disable-next-line
  }, [sort, tag, search]);

  /* load next page */
  useEffect(() => {
    if (page === 1) return;
    fetchPosts(page);
  // eslint-disable-next-line
  }, [page]);

  /* infinite scroll observer */
  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        setPage(p => p + 1);
      }
    }, { rootMargin:"200px" });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading]);

  function handleLogout() {
    localStorage.removeItem(COMMUNITY_TOKEN_KEY);
    localStorage.removeItem(COMMUNITY_USER_KEY);
    setUser(null);
    setToast("Signed out successfully");
  }

  function handlePostCreated(newPost) {
    setPosts(prev => [newPost, ...prev]);
    setShowCreate(false);
    setToast("Post published successfully ✓");
  }

  function handleVote(postId, updatedPost) {
    setPosts(prev => prev.map(p => p._id === postId ? updatedPost : p));
  }

  function handleDelete(postId) {
    setPosts(prev => prev.filter(p => p._id !== postId));
    setToast("Post deleted");
  }

  /* debounced search */
  const searchTimeout = useRef(null);
  function handleSearchChange(val) {
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setSearch(val), 400);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{font-family:'Inter',sans-serif;-webkit-font-smoothing:antialiased}
        ::-webkit-scrollbar{width:6px}
        ::-webkit-scrollbar-track{background:#f1f5f9}
        ::-webkit-scrollbar-thumb{background:#d1d5db;border-radius:3px}
        .cf-tag-btn:hover{background:#f0fdf4!important;color:#166534!important;border-color:#86efac!important}
        .cf-sort-btn:hover{background:#f3f4f6!important}
        .cf-post-btn:hover{background:#166534!important;transform:translateY(-1px);box-shadow:0 4px 14px rgba(22,101,52,.35)!important}
      `}</style>

      <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#f0fdf4,#f9fafb)",
                    fontFamily:"'Inter',sans-serif" }}>

        {/* ── Navbar ── */}
        <div style={{ background:"rgba(255,255,255,.92)", backdropFilter:"blur(10px)",
                      borderBottom:"1px solid #e5e7eb", position:"sticky", top:0, zIndex:300,
                      padding:"0 24px" }}>
          <div style={{ maxWidth:860, margin:"0 auto", height:60,
                        display:"flex", alignItems:"center", justifyContent:"space-between", gap:16 }}>
            <button onClick={() => navigate(-1)}
              style={{ display:"flex", alignItems:"center", gap:8, background:"none", border:"none",
                       cursor:"pointer", fontSize:14, color:"#374151", fontFamily:"inherit", padding:"4px 0" }}>
              <ArrowLeft size={16} color="#6b7280"/>
              <span style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize:18, fontWeight:600, color:"#111" }}>
                Community &amp; Feedback
              </span>
            </button>

            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              {user ? (
                <>
                  <div style={{ display:"flex", alignItems:"center", gap:8,
                                background:"#f0fdf4", border:"1px solid #bbf7d0",
                                borderRadius:10, padding:"6px 12px" }}>
                    {user.picture && (
                      <img src={user.picture} alt={user.name}
                        style={{ width:26, height:26, borderRadius:"50%", objectFit:"cover" }}/>
                    )}
                    <span style={{ fontSize:13, fontWeight:600, color:"#166534" }}>
                      {user.name?.split(" ")[0]}
                    </span>
                  </div>
                  <button onClick={handleLogout}
                    style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 12px",
                             background:"none", border:"1px solid #d1d5db", borderRadius:8,
                             fontSize:13, color:"#6b7280", cursor:"pointer", fontFamily:"inherit" }}>
                    <LogOut size={13}/> Sign Out
                  </button>
                </>
              ) : (
                <button onClick={() => setShowLogin(true)}
                  style={{ display:"flex", alignItems:"center", gap:7, padding:"8px 16px",
                           background:"#166534", color:"#fff", border:"none", borderRadius:10,
                           fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                  <LogIn size={14}/> Sign In
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Page Body ── */}
        <div style={{ maxWidth:860, margin:"0 auto", padding:"32px 24px 80px" }}>

          {/* Hero */}
          <motion.div initial={{ opacity:0, y:24 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:.55, ease:[.22,1,.36,1] }}
            style={{ marginBottom:32 }}>
            <h1 style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize:36, fontWeight:700,
                         color:"#111", marginBottom:8, lineHeight:1.15 }}>
              Campus Community Forum
            </h1>
            <p style={{ fontSize:15, color:"#4b5563", lineHeight:1.6, maxWidth:560 }}>
              Share suggestions, report issues, ask questions and engage with the Thapar community.
            </p>
          </motion.div>

          {/* Auth banner */}
          {!user && <AuthBanner onLogin={() => setShowLogin(true)}/>}

          {/* Controls Row */}
          <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
            transition={{ duration:.5, delay:.1 }}
            style={{ display:"flex", gap:12, flexWrap:"wrap", marginBottom:24, alignItems:"center" }}>

            {/* Search */}
            <div style={{ flex:1, minWidth:200, position:"relative" }}>
              <Search size={15} color="#9ca3af"
                style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)" }}/>
              <input
                placeholder="Search posts…"
                onChange={e => handleSearchChange(e.target.value)}
                style={{ width:"100%", paddingLeft:36, paddingRight:14, paddingTop:10, paddingBottom:10,
                         border:"1.5px solid #e5e7eb", borderRadius:10, fontSize:14,
                         background:"#fff", fontFamily:"inherit", outline:"none",
                         transition:"border-color .2s" }}
                onFocus={e => e.target.style.borderColor="#4ade80"}
                onBlur={e  => e.target.style.borderColor="#e5e7eb"}
              />
            </div>

            {/* Sort */}
            <div style={{ display:"flex", gap:6 }}>
              {SORT_OPTIONS.map(({ value, label, Icon: Ic }) => (
                <button key={value} className="cf-sort-btn"
                  onClick={() => setSort(value)}
                  style={{ display:"flex", alignItems:"center", gap:5, padding:"8px 14px",
                           border:`1.5px solid ${sort===value?"#4ade80":"#e5e7eb"}`,
                           borderRadius:9, background:sort===value?"#f0fdf4":"#fff",
                           color:sort===value?"#166534":"#4b5563", fontSize:13, fontWeight:sort===value?600:400,
                           cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
                  <Ic size={13}/> {label}
                </button>
              ))}
            </div>

            {/* New Post btn */}
            {user && (
              <button className="cf-post-btn"
                onClick={() => setShowCreate(true)}
                style={{ display:"flex", alignItems:"center", gap:7, padding:"9px 18px",
                         background:"#2e7d32", color:"#fff", border:"none", borderRadius:10,
                         fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                         transition:"all .2s", boxShadow:"0 2px 8px rgba(22,101,52,.2)", flexShrink:0 }}>
                <Plus size={15}/> New Post
              </button>
            )}
          </motion.div>

          {/* Tag Filters */}
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:.15 }}
            style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:28 }}>
            {TAGS.map(t => (
              <button key={t} className="cf-tag-btn"
                onClick={() => setTag(t)}
                style={{ padding:"5px 14px", borderRadius:20, border:"1.5px solid",
                         borderColor:tag===t?"#4ade80":"#d1d5db",
                         background:tag===t?"#f0fdf4":"#fff",
                         color:tag===t?"#166534":"#4b5563",
                         fontSize:13, fontWeight:tag===t?600:400,
                         cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
                {t}
              </button>
            ))}
          </motion.div>

          {/* Posts Feed */}
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <AnimatePresence initial={false}>
              {posts.map((post, idx) => (
                <motion.div key={post._id}
                  initial={{ opacity:0, y:20 }}
                  animate={{ opacity:1, y:0 }}
                  exit={{ opacity:0, scale:.97 }}
                  transition={{ duration:.35, delay: idx < 5 ? idx * .05 : 0 }}>
                  <PostCard
                    post={post}
                    user={user}
                    token={getToken()}
                    onVote={handleVote}
                    onDelete={handleDelete}
                    onLoginRequired={() => setShowLogin(true)}
                    onToast={setToast}
                  />
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty state */}
            {!loading && posts.length === 0 && (
              <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
                style={{ textAlign:"center", padding:"64px 0" }}>
                <div style={{ width:64, height:64, borderRadius:16, background:"#e8f5e9",
                              display:"flex", alignItems:"center", justifyContent:"center",
                              margin:"0 auto 16px" }}>
                  <MessageSquare size={28} color="#4ade80"/>
                </div>
                <p style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize:22,
                            fontWeight:600, color:"#111", marginBottom:8 }}>
                  No posts yet
                </p>
                <p style={{ fontSize:14, color:"#6b7280" }}>
                  {user ? "Be the first to start a conversation!" : "Sign in to create the first post."}
                </p>
              </motion.div>
            )}

            {/* Loader sentinel */}
            <div ref={loaderRef} style={{ height:1 }}/>
            {loading && (
              <div style={{ display:"flex", justifyContent:"center", padding:"24px 0" }}>
                <motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:1, ease:"linear" }}
                  style={{ width:28, height:28, border:"3px solid #e5e7eb",
                           borderTop:"3px solid #2e7d32", borderRadius:"50%" }}/>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showLogin && (
          <LoginModal
            onClose={() => setShowLogin(false)}
            onSuccess={u => { setUser(u); setToast(`Welcome, ${u.name?.split(" ")[0]}! 👋`); }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && user && (
          <CreatePostModal
            user={user}
            token={getToken()}
            onClose={() => setShowCreate(false)}
            onCreated={handlePostCreated}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast msg={toast} onClose={() => setToast(null)}/>}
      </AnimatePresence>
    </>
  );
}