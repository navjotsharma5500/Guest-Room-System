import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Mail, Search, Star, Trash2, X } from "lucide-react";

const STATUSES = ["pending", "approved", "rejected"];

const authHeaders = (json = false) => {
  const token = localStorage.getItem("token");
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const formatDate = (value) =>
  value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function CampusFeedbackAdminPage() {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState([]);
  const [status, setStatus] = useState("pending");
  const [rating, setRating] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [error, setError] = useState("");

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (rating) params.set("rating", rating);
      if (search.trim()) params.set("search", search.trim());
      const response = await fetch(`/api/campus-feedback/admin?${params}`, {
        credentials: "include",
        headers: authHeaders(),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Unable to load feedback.");
      setFeedback(data.feedback || []);
    } catch (requestError) {
      setError(requestError.message);
      setFeedback([]);
    } finally {
      setLoading(false);
    }
  }, [rating, search, status]);

  useEffect(() => {
    const timer = setTimeout(loadFeedback, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadFeedback, search]);

  const mutate = async (item, action) => {
    if (processingId) return;
    if (action === "delete" && !window.confirm("Delete this feedback permanently?")) return;
    setProcessingId(item._id);
    setError("");
    try {
      const response = await fetch(
        action === "delete"
          ? `/api/campus-feedback/${item._id}`
          : `/api/campus-feedback/${item._id}/${action}`,
        {
          method: action === "delete" ? "DELETE" : "PATCH",
          credentials: "include",
          headers: authHeaders(true),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || `Unable to ${action} feedback.`);
      await loadFeedback();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setProcessingId("");
    }
  };

  return (
    <main className="campus-feedback-admin">
      <style>{`
        .campus-feedback-admin{min-height:100vh;padding:34px;background:#f4f6f9;color:#172033;font-family:'DM Sans',sans-serif}.cfa-shell{max-width:1180px;margin:0 auto}.cfa-header{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:27px}.cfa-title{display:flex;align-items:center;gap:14px}.cfa-back{display:grid;place-items:center;width:42px;height:42px;border:1px solid #dbe2ea;border-radius:12px;background:#fff;color:#475569}.cfa-header h1{font-family:'EB Garamond',Georgia,serif;font-size:36px}.cfa-header p{color:#64748b;font-size:13px}.cfa-tabs{display:flex;gap:8px;margin-bottom:17px}.cfa-tabs button{padding:10px 16px;border:1px solid #dbe2ea;border-radius:10px;background:#fff;color:#64748b;text-transform:capitalize}.cfa-tabs button.active{border-color:#c62828;background:#c62828;color:#fff;font-weight:700}.cfa-filters{display:grid;grid-template-columns:1fr 170px;gap:12px;margin-bottom:20px}.cfa-search{position:relative}.cfa-search svg{position:absolute;left:13px;top:50%;transform:translateY(-50%);color:#94a3b8}.cfa-filters input,.cfa-filters select{width:100%;padding:12px 13px;border:1px solid #dbe2ea;border-radius:11px;background:#fff;font:inherit}.cfa-filters input{padding-left:40px}.cfa-grid{display:grid;gap:16px}.cfa-card{display:grid;grid-template-columns:54px minmax(0,1fr) auto;gap:16px;padding:20px;border:1px solid #e1e7ef;border-radius:16px;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.05)}.cfa-avatar{display:grid;place-items:center;width:50px;height:50px;border-radius:50%;overflow:hidden;background:#fee2e2;color:#b91c1c;font-weight:800}.cfa-avatar img{width:100%;height:100%;object-fit:cover}.cfa-person{display:flex;align-items:center;gap:9px;flex-wrap:wrap}.cfa-person h2{font-size:16px}.cfa-status{padding:4px 8px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:9px;font-weight:800;text-transform:uppercase}.cfa-status.approved{background:#dcfce7;color:#166534}.cfa-status.rejected{background:#fee2e2;color:#991b1b}.cfa-email,.cfa-date{display:flex;align-items:center;gap:5px;margin-top:4px;color:#7b8ba5;font-size:11px}.cfa-stars{display:flex;gap:2px;margin:13px 0 8px}.cfa-description{color:#475569;font-size:13px;line-height:1.7;white-space:pre-wrap}.cfa-actions{display:flex;align-items:flex-start;gap:7px}.cfa-actions button{display:grid;place-items:center;width:37px;height:37px;border:1px solid #dbe2ea;border-radius:9px;background:#fff}.cfa-actions .approve{color:#15803d}.cfa-actions .reject,.cfa-actions .delete{color:#b91c1c}.cfa-actions button:disabled{opacity:.45}.cfa-message{padding:50px;text-align:center;border:1px dashed #cbd5e1;border-radius:16px;background:#fff;color:#64748b}.cfa-error{margin-bottom:15px;padding:11px 13px;border-radius:10px;background:#fee2e2;color:#991b1b}@media(max-width:700px){.campus-feedback-admin{padding:22px 13px}.cfa-header h1{font-size:29px}.cfa-tabs{overflow-x:auto}.cfa-filters{grid-template-columns:1fr}.cfa-card{grid-template-columns:45px 1fr}.cfa-avatar{width:42px;height:42px}.cfa-actions{grid-column:1/-1;justify-content:flex-end}}
      `}</style>
      <div className="cfa-shell">
        <header className="cfa-header">
          <div className="cfa-title">
            <button className="cfa-back" onClick={() => navigate("/admin/dashboard-selector")} aria-label="Back"><ArrowLeft size={18} /></button>
            <div><h1>Campus Connect Feedback</h1><p>Review feedback before it appears under Words of Appreciation.</p></div>
          </div>
        </header>

        <nav className="cfa-tabs" aria-label="Feedback status">
          {STATUSES.map((item) => <button key={item} className={status === item ? "active" : ""} onClick={() => setStatus(item)}>{item}</button>)}
        </nav>
        <div className="cfa-filters">
          <label className="cfa-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email or feedback text" /></label>
          <select value={rating} onChange={(event) => setRating(event.target.value)} aria-label="Filter by rating"><option value="">All ratings</option>{[5,4,3,2,1].map((value) => <option key={value} value={value}>{value} stars</option>)}</select>
        </div>

        {error && <p className="cfa-error" role="alert">{error}</p>}
        <section className="cfa-grid">
          {loading ? <div className="cfa-message">Loading feedback…</div> : feedback.length === 0 ? <div className="cfa-message">No {status} feedback found.</div> : feedback.map((item) => (
            <article className="cfa-card" key={item._id}>
              <div className="cfa-avatar">{item.userPhoto ? <img src={item.userPhoto} alt="" referrerPolicy="no-referrer" /> : String(item.userName || "U").charAt(0).toUpperCase()}</div>
              <div>
                <div className="cfa-person"><h2>{item.userName}</h2><span className={`cfa-status ${item.status}`}>{item.status}</span></div>
                <span className="cfa-email"><Mail size={12} />{item.userEmail}</span>
                <span className="cfa-date">Submitted {formatDate(item.submittedAt)}</span>
                <div className="cfa-stars" aria-label={`${item.rating} out of 5 stars`}>{[1,2,3,4,5].map((star) => <Star key={star} size={16} color={star <= item.rating ? "#f59e0b" : "#cbd5e1"} fill={star <= item.rating ? "#f59e0b" : "transparent"} />)}</div>
                <p className="cfa-description">{item.description}</p>
              </div>
              <div className="cfa-actions">
                {item.status !== "approved" && <button className="approve" disabled={processingId === item._id} onClick={() => mutate(item, "approve")} title="Approve"><Check size={17} /></button>}
                {item.status !== "rejected" && <button className="reject" disabled={processingId === item._id} onClick={() => mutate(item, "reject")} title="Reject"><X size={17} /></button>}
                <button className="delete" disabled={processingId === item._id} onClick={() => mutate(item, "delete")} title="Delete"><Trash2 size={16} /></button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}

