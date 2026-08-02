import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Download, ExternalLink, Eye, FileImage, FileText, Share2, X, ZoomIn, ZoomOut } from "lucide-react";
import { PublicHeader, PublicQuickLinks } from "./CampusConnect";
import PublicPageWidgets from "../components/PublicPageWidgets";
import { DEFAULT_PUBLIC_UI_CONFIG, fetchPublicUiConfig, normalizePublicUiConfig } from "../utils/publicUiConfig";
import "../styles/CampusPublicChrome.css";

const NEW_NOTICE_DAYS = 7;
const VIEW_COOLDOWN_MS = 30 * 60 * 1000;

const orderedAttachments = (notice) => [...(notice?.attachments || [])].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || Number(a.order || 0) - Number(b.order || 0));
const formatDate = (value) => value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }) : "";
const isNewNotice = (notice) => notice.publishedAt && Date.now() - new Date(notice.publishedAt).getTime() <= NEW_NOTICE_DAYS * 86400000;

function AttachmentPreview({ attachment, title, compact = false, onFullscreen, onViewFull }) {
  if (!attachment) return <div className="notice-no-attachment"><FileText size={30} /><span>Text notice</span></div>;
  if (attachment.fileType === "pdf") {
    return (
      <div className={`notice-pdf-preview ${compact ? "compact" : ""}`}>
        <iframe src={`${attachment.url}#page=1&view=FitH`} title={`${title} PDF preview`} loading="lazy" />
        {!compact && <div className="notice-preview-actions">
          <a href={attachment.url} target="_blank" rel="noopener noreferrer" onClick={onViewFull}><ExternalLink size={15} />View Full Notice</a>
          <a href={attachment.url} download={attachment.fileName} onClick={onViewFull}><Download size={15} />Download PDF</a>
        </div>}
      </div>
    );
  }
  return <button type="button" className="notice-image-preview" onClick={onFullscreen} aria-label={`Open ${attachment.fileName} fullscreen`}><img src={attachment.url} alt={attachment.fileName || title} loading="lazy" /><span><ZoomIn size={16} />Open fullscreen</span></button>;
}

function NoticeDetailModal({ notice, onClose, onViewed }) {
  const attachments = orderedAttachments(notice);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const selected = attachments[selectedIndex];

  useEffect(() => { onViewed(notice); }, [notice, onViewed]);
  useEffect(() => { setZoom(1); }, [selectedIndex]);

  return (
    <>
      <motion.div className="notice-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
        <motion.article className="notice-detail-modal" initial={{ opacity: 0, y: 24, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 15, scale: .98 }} onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="notice-detail-title">
          <button className="notice-close" type="button" onClick={onClose} aria-label="Close notice"><X size={20} /></button>
          <div className="notice-detail-heading">
            <div className="notice-meta"><span>{notice.tagId?.name}</span><span><CalendarDays size={14} />{formatDate(notice.noticeDate)}</span><span><Eye size={14} />{notice.viewCount || 0} views</span></div>
            <h2 id="notice-detail-title">{notice.title}</h2>
          </div>
          {selected && <AttachmentPreview attachment={selected} title={notice.title} onFullscreen={() => setFullscreen(true)} onViewFull={() => onViewed(notice)} />}
          {attachments.length > 1 && <div className="notice-thumbnails">{attachments.map((attachment, index) => <button type="button" key={attachment._id || attachment.url} className={index === selectedIndex ? "active" : ""} onClick={() => setSelectedIndex(index)}>{attachment.fileType === "image" ? <img src={attachment.url} alt={attachment.fileName} /> : <FileText size={24} />}<span>{index + 1}</span></button>)}</div>}
          <div className="notice-detail-copy"><p className="notice-description">{notice.description}</p>{notice.content && <p>{notice.content}</p>}<small>Published {formatDate(notice.publishedAt)}</small></div>
        </motion.article>
      </motion.div>
      <AnimatePresence>
        {fullscreen && selected?.fileType === "image" && <motion.div className="notice-fullscreen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFullscreen(false)}><div className="notice-fullscreen-toolbar"><button onClick={(event) => { event.stopPropagation(); setZoom((value) => Math.max(.5, value - .25)); }}><ZoomOut /></button><button onClick={(event) => { event.stopPropagation(); setZoom((value) => Math.min(4, value + .25)); }}><ZoomIn /></button><a onClick={(event) => event.stopPropagation()} href={selected.url} download={selected.fileName}><Download /></a><button onClick={() => setFullscreen(false)}><X /></button></div><img onClick={(event) => event.stopPropagation()} src={selected.url} alt={selected.fileName} style={{ transform: `scale(${zoom})` }} /></motion.div>}
      </AnimatePresence>
    </>
  );
}

export default function StudentNoticesPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(() => normalizePublicUiConfig(DEFAULT_PUBLIC_UI_CONFIG));
  const [tags, setTags] = useState([]);
  const [notices, setNotices] = useState([]);
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedNotice, setSelectedNotice] = useState(null);

  useEffect(() => { fetchPublicUiConfig().then(setConfig).catch(() => {}); }, []);
  useEffect(() => { fetch("/api/student-notices/tags").then((response) => response.json()).then((data) => setTags(data.tags || [])).catch(() => setTags([])); }, []);
  useEffect(() => {
    let active = true; setLoading(true);
    const params = new URLSearchParams({ page, limit: 9, sort }); if (tag) params.set("tag", tag);
    fetch(`/api/student-notices?${params}`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.message); return data; }).then((data) => { if (active) { setNotices(data.notices || []); setPagination(data.pagination || { page: 1, pages: 1, total: 0 }); } }).catch(() => { if (active) setNotices([]); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tag, page, sort]);
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("notice");
    if (slug) openNotice({ slug });
    // The shared link is resolved once on page entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applications = useMemo(() => {
    const map = new Map((config.selector?.cards || []).map((card) => [card.id, card]));
    return (config.selector?.cardOrder || []).map((id) => map.get(id)).filter(Boolean);
  }, [config]);

  const openItem = (item) => { const destination = item?.destination || item?.href; if (destination?.startsWith("/")) navigate(destination); else if (/^https?:\/\//i.test(destination || "")) window.open(destination, "_blank", "noopener,noreferrer"); else if (item?.action === "home" || item?.action === "about") navigate("/"); };
  const openNotice = async (summary) => { try { const response = await fetch(`/api/student-notices/${summary.slug}`); const data = await response.json(); if (response.ok) setSelectedNotice(data.notice); } catch {} };
  const recordView = async (notice) => {
    const key = `student_notice_view_${notice.slug}`; const lastViewed = Number(localStorage.getItem(key) || 0); if (Date.now() - lastViewed < VIEW_COOLDOWN_MS) return;
    localStorage.setItem(key, String(Date.now()));
    try { const response = await fetch(`/api/student-notices/${notice.slug}/view`, { method: "POST" }); const data = await response.json(); if (response.ok) setSelectedNotice((current) => current?.slug === notice.slug ? { ...current, viewCount: data.viewCount } : current); } catch { localStorage.removeItem(key); }
  };
  const copyLink = async (notice) => { const url = `${window.location.origin}/student-notices?notice=${notice.slug}`; try { await navigator.clipboard.writeText(url); } catch { window.prompt("Copy notice link", url); } };

  return (
    <div className="student-notices-page">
      <style>{`
        .student-notices-page{min-height:100vh;background:radial-gradient(circle at 25% 22%,rgba(198,40,40,.045),transparent 30%),#f7f9fc;color:#172033;font-family:'DM Sans',sans-serif}.notice-layout{display:grid;grid-template-columns:minmax(0,680px) 260px;justify-content:space-between;gap:32px;max-width:1060px;margin:0 auto;padding:50px 24px 90px}.notice-toolbar{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-bottom:18px}.notice-toolbar h2,.notice-detail-heading h2{font-family:'EB Garamond',Georgia,serif}.notice-toolbar h2{margin:0;color:#c62828;font-size:30px;line-height:1}.notice-toolbar select{min-width:138px;padding:10px 12px;border:1px solid #dbe2ea;border-radius:11px;background:#fff;color:#263248;font:inherit;font-size:13px;font-weight:600;box-shadow:0 8px 22px rgba(15,23,42,.04)}.notice-grid{display:grid;grid-template-columns:1fr;gap:18px}.notice-card{overflow:hidden;border:1px solid #e1e7ef;border-radius:16px;background:rgba(255,255,255,.96);box-shadow:0 10px 28px rgba(32,51,79,.065);transition:box-shadow .22s ease}.notice-card:hover{box-shadow:0 16px 38px rgba(32,51,79,.1)}.notice-card-copy{padding:20px 21px 15px;cursor:default}.notice-card-head{display:flex;justify-content:space-between;gap:15px}.notice-card-head>div:first-child{min-width:0}.notice-card h3{max-width:510px;margin:5px 0 0;color:#d12626;font-size:18px;line-height:1.3}.notice-tag{margin:0;color:#dc2626;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.045em}.notice-date{display:flex;align-items:center;gap:5px;flex-wrap:wrap;margin-top:7px;color:#7b8ba5;font-size:10px}.notice-date svg{color:#ef4444}.notice-card-copy>p{margin:13px 0 0;padding-top:11px;border-top:1px solid #e8edf3;color:#66758e;font-size:12px;line-height:1.55}.notice-badges{display:flex;flex-direction:column;align-items:center;gap:6px;flex:0 0 auto}.notice-badges span{display:grid;place-items:center;min-width:37px;min-height:27px;padding:3px 7px;border-radius:999px;background:#eef2f7;color:#475569;font-size:8px;font-weight:800}.notice-badges .new{background:#d8f8e4;color:#159253}.notice-document{max-height:0;margin:0 21px;border:0 solid #dce3eb;border-radius:11px;overflow:hidden;opacity:0;background:#e9edf2;transform:translateY(-6px);transition:max-height .34s ease,opacity .22s ease,transform .3s ease,border-width .1s ease}.notice-card-copy:hover + .notice-document,.notice-document:hover{max-height:340px;border-width:1px;opacity:1;transform:translateY(0)}.notice-image-preview{position:relative;width:100%;padding:0;border:0;background:#eef2f7;cursor:zoom-in;overflow:hidden}.notice-image-preview img{display:block;width:100%;height:auto;max-height:300px;object-fit:contain;margin:auto}.notice-image-preview span{position:absolute;right:12px;bottom:12px;display:flex;align-items:center;gap:5px;padding:7px 9px;border-radius:9px;background:rgba(15,23,42,.75);color:#fff;font-size:10px}.notice-pdf-preview iframe{display:block;width:100%;height:300px;border:0;background:#e2e8f0}.notice-pdf-preview.compact iframe{height:300px}.notice-preview-actions{display:flex;gap:8px;padding:10px;background:#f8fafc}.notice-preview-actions a{display:flex;align-items:center;justify-content:center;gap:6px;flex:1;padding:8px;border:1px solid #dbe2ea;border-radius:9px;background:#fff;color:#334155;font-size:11px;font-weight:700;text-decoration:none}.notice-no-attachment{display:grid;place-items:center;gap:8px;min-height:130px;background:#f1f5f9;color:#94a3b8}.notice-card-actions{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr) 40px;gap:9px;padding:13px 21px 17px}.notice-card-actions a,.notice-card-actions button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:38px;padding:7px 10px;border:1px solid #d9e1ea;border-radius:9px;background:#fff;color:#263248;font:inherit;font-size:11px;font-weight:750;text-decoration:none;cursor:pointer}.notice-card-actions svg{color:#ef3333}.notice-card-actions .share{padding:0}.notice-sidebar{position:sticky;top:118px;align-self:start;padding:20px 18px;border:1px solid #e1e7ef;border-radius:16px;background:rgba(255,255,255,.96);box-shadow:0 12px 34px rgba(32,51,79,.065)}.notice-sidebar h3{margin:0 0 12px;color:#dc2626;font-size:15px}.notice-sidebar button{display:block;width:100%;padding:10px 11px;border:0;border-radius:9px;background:transparent;text-align:left;color:#697991;font:inherit;font-size:13px;cursor:pointer}.notice-sidebar button.active{background:#fce7e7;color:#d12626;font-weight:750}.notice-skeleton{height:210px;border-radius:16px;background:linear-gradient(90deg,#edf0f4,#fafbfc,#edf0f4);background-size:200% 100%;animation:noticeShimmer 1.3s infinite}.notice-empty{padding:60px 22px;text-align:center;border:1px dashed #cbd5e1;border-radius:18px;color:#64748b}.notice-pagination{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:30px}.notice-pagination button{display:grid;place-items:center;width:36px;height:36px;border:1px solid #dbe2ea;border-radius:50%;background:#fff}.notice-modal-backdrop{position:fixed;inset:0;z-index:1200;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.66);backdrop-filter:blur(10px)}.notice-detail-modal{position:relative;width:min(1120px,96vw);max-height:94vh;overflow:auto;padding:32px;border-radius:26px;background:#fff;box-shadow:0 30px 100px rgba(0,0,0,.3)}.notice-close{position:absolute;right:18px;top:18px;z-index:2;display:grid;place-items:center;width:40px;height:40px;border:1px solid #e2e8f0;border-radius:50%;background:#fff}.notice-detail-heading{padding-right:50px;margin-bottom:24px}.notice-detail-heading h2{font-size:clamp(2rem,4vw,3.2rem);line-height:1.08}.notice-meta{display:flex;gap:14px;flex-wrap:wrap;margin-bottom:10px;color:#64748b;font-size:12px}.notice-meta span{display:flex;align-items:center;gap:5px}.notice-thumbnails{display:flex;gap:10px;overflow-x:auto;padding:14px 0}.notice-thumbnails button{position:relative;display:grid;place-items:center;flex:0 0 88px;height:74px;border:2px solid transparent;border-radius:11px;background:#f1f5f9;overflow:hidden}.notice-thumbnails button.active{border-color:#c62828}.notice-thumbnails img{width:100%;height:100%;object-fit:cover}.notice-thumbnails span{position:absolute;right:4px;bottom:4px;padding:2px 5px;border-radius:5px;background:#111827;color:#fff;font-size:9px}.notice-detail-copy{padding:22px 0 5px;color:#475569;line-height:1.8;white-space:pre-wrap}.notice-description{font-weight:650;color:#1e293b}.notice-detail-copy small{display:block;margin-top:20px;color:#94a3b8}.notice-fullscreen{position:fixed;inset:0;z-index:1400;display:grid;place-items:center;overflow:auto;background:rgba(2,6,23,.95)}.notice-fullscreen img{max-width:92vw;max-height:86vh;transition:transform .2s}.notice-fullscreen-toolbar{position:fixed;right:20px;top:20px;z-index:2;display:flex;gap:8px}.notice-fullscreen-toolbar button,.notice-fullscreen-toolbar a{display:grid;place-items:center;width:42px;height:42px;border:1px solid rgba(255,255,255,.2);border-radius:50%;background:rgba(255,255,255,.12);color:#fff}.notice-fullscreen-toolbar svg{width:18px}.notice-mobile-tags{display:none}@keyframes noticeShimmer{to{background-position:-200% 0}}@media(max-width:900px){.notice-layout{grid-template-columns:1fr;padding-top:36px}.notice-sidebar{display:none}.notice-mobile-tags{display:flex;gap:8px;overflow-x:auto;padding:20px 18px 0}.notice-mobile-tags button{flex:0 0 auto;padding:8px 12px;border:1px solid #dbe2ea;border-radius:999px;background:#fff}.notice-mobile-tags button.active{background:#c62828;color:#fff}}@media(max-width:650px){.notice-layout{padding:25px 12px 60px}.notice-toolbar{align-items:flex-end}.notice-toolbar h2{font-size:27px}.notice-toolbar select{min-width:122px;padding:9px}.notice-card-copy{padding:18px 16px 13px}.notice-card h3{font-size:17px}.notice-document{display:none}.notice-card-actions{grid-template-columns:1fr 40px;padding:12px 12px 16px}.notice-card-actions .download{display:none}.notice-detail-modal{padding:20px;border-radius:19px}.notice-preview-actions{flex-direction:column}}
      `}</style>
      <PublicHeader config={config} onOpen={openItem} applications={applications} />
      <div className="notice-mobile-tags"><button className={!tag ? "active" : ""} onClick={() => { setTag(""); setPage(1); }}>All</button>{tags.map((item) => <button key={item.slug} className={tag === item.slug ? "active" : ""} onClick={() => { setTag(item.slug); setPage(1); }}>{item.name}</button>)}</div>
      <main className="notice-layout"><div><div className="notice-toolbar"><h2>{tag ? tags.find((item) => item.slug === tag)?.name : "Latest Notices"}</h2><select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></div><div className="notice-grid">{loading ? [1,2].map((item) => <div key={item} className="notice-skeleton" />) : notices.length ? notices.map((notice, index) => { const attachments = orderedAttachments(notice); const primary = attachments[0]; return <motion.article className="notice-card" key={notice.slug} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }}><div className="notice-card-copy"><div className="notice-card-head"><div><p className="notice-tag">{notice.tagId?.name}</p><h3>{notice.title}</h3><span className="notice-date"><CalendarDays size={13} />{formatDate(notice.noticeDate)} · <Eye size={13} />{notice.viewCount || 0} views</span></div><div className="notice-badges">{isNewNotice(notice) && <span className="new">New</span>}<span>{primary?.fileType === "pdf" ? "PDF" : primary?.fileType === "image" ? "Image" : "Text"}</span></div></div><p>{notice.description}</p></div><div className="notice-document">{primary ? <AttachmentPreview attachment={primary} title={notice.title} compact onFullscreen={() => openNotice(notice)} onViewFull={() => recordView(notice)} /> : <div className="notice-no-attachment"><FileText /><span>Text notice</span></div>}</div><div className="notice-card-actions"><button onClick={() => openNotice(notice)}><ExternalLink size={16} />View Notice</button>{primary && <a className="download" href={primary.url} download={primary.fileName} onClick={() => recordView(notice)}><Download size={16} />Download {primary.fileType === "pdf" ? "PDF" : "File"}</a>}<button className="share" aria-label="Copy notice link" onClick={() => copyLink(notice)}><Share2 size={17} /></button></div></motion.article>; }) : <div className="notice-empty"><FileImage size={34} /><h3>No notices found</h3><p>Try another department.</p></div>}</div>{pagination.pages > 1 && <div className="notice-pagination"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft /></button><span>Page {page} of {pagination.pages}</span><button disabled={page >= pagination.pages} onClick={() => setPage((value) => value + 1)}><ChevronRight /></button></div>}</div><aside className="notice-sidebar"><h3>Departments / Tags</h3><button className={!tag ? "active" : ""} onClick={() => { setTag(""); setPage(1); }}>All Notices</button>{tags.map((item) => <button key={item.slug} className={tag === item.slug ? "active" : ""} onClick={() => { setTag(item.slug); setPage(1); }}>{item.name}</button>)}</aside></main>
      <AnimatePresence>{selectedNotice && <NoticeDetailModal notice={selectedNotice} onClose={() => setSelectedNotice(null)} onViewed={recordView} />}</AnimatePresence>
      <PublicQuickLinks config={config} onOpen={openItem} /><PublicPageWidgets hideFooter />
    </div>
  );
}
