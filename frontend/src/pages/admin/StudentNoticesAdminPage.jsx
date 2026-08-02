import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Copy,
  Edit3,
  Eye,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  Plus,
  Save,
  Settings,
  Tags,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { IMAGEKIT_PUBLIC_KEY } from "../../utils/apiConfig";
import { VENUE_DEPARTMENTS } from "../../config/venueDepartments";

const EMPTY_FORM = {
  tagId: "",
  title: "",
  noticeDate: new Date().toISOString().slice(0, 10),
  description: "",
  content: "",
  searchableKeywords: "",
  attachments: [],
  featured: false,
  status: "draft",
};
const authHeaders = (json = false) => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  ...(localStorage.getItem("token")
    ? { Authorization: `Bearer ${localStorage.getItem("token")}` }
    : {}),
});
const request = async (url, options = {}) => {
  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      ...authHeaders(Boolean(options.body)),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false)
    throw new Error(data.message || "Request failed.");
  return data;
};

const uploadFile = async (file, onProgress) => {
  const auth = await request("/api/student-notices/admin/upload-auth");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", `student_notice_${Date.now()}_${file.name}`);
  formData.append("publicKey", auth.publicKey || IMAGEKIT_PUBLIC_KEY);
  formData.append("signature", auth.signature);
  formData.append("expire", auth.expire);
  formData.append("token", auth.token);
  formData.append("folder", "/student-notices");
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "https://upload.imagekit.io/api/v1/files/upload");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status < 200 || xhr.status >= 300)
        return reject(new Error(data.message || "Upload failed."));
      resolve({
        url: data.url,
        fileId: data.fileId || "",
        fileName: file.name,
        fileType: file.type === "application/pdf" ? "pdf" : "image",
        mimeType: file.type,
        size: file.size,
        isPrimary: false,
      });
    };
    xhr.send(formData);
  });
};

function NoticeForm({ notice, tags, onClose, onSaved }) {
  const [form, setForm] = useState(() =>
    notice
      ? {
          ...notice,
          tagId: notice.tagId?._id || notice.tagId,
          noticeDate: new Date(notice.noticeDate).toISOString().slice(0, 10),
          searchableKeywords: (notice.searchableKeywords || []).join(", "),
          attachments: [...(notice.attachments || [])],
        }
      : { ...EMPTY_FORM }
  );
  const [uploadProgress, setUploadProgress] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const uploadAttachments = async (files) => {
    setError("");
    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    for (const file of files) {
      if (!allowed.includes(file.type)) {
        setError(`${file.name}: unsupported file type.`);
        continue;
      }
      if (file.size > 20 * 1024 * 1024) {
        setError(`${file.name}: maximum file size is 20 MB.`);
        continue;
      }
      const key = `${file.name}-${file.lastModified}`;
      try {
        const attachment = await uploadFile(file, (progress) =>
          setUploadProgress((current) => ({ ...current, [key]: progress }))
        );
        setForm((current) => ({
          ...current,
          attachments: [
            ...current.attachments,
            { ...attachment, isPrimary: current.attachments.length === 0 },
          ],
        }));
      } catch (uploadError) {
        setError(uploadError.message);
      } finally {
        setUploadProgress((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
      }
    }
  };
  const moveAttachment = (index, direction) =>
    setForm((current) => {
      const attachments = [...current.attachments];
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= attachments.length) return current;
      [attachments[index], attachments[nextIndex]] = [
        attachments[nextIndex],
        attachments[index],
      ];
      return { ...current, attachments };
    });
  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    try {
      let tagId = form.tagId;
      if (tagId.startsWith("department:")) {
        const departmentName = tagId.slice("department:".length);
        const created = await request("/api/student-notices/admin/tags", {
          method: "POST",
          body: JSON.stringify({
            name: departmentName,
            description: "",
            icon: "Building2",
            active: true,
            order: tags.length,
          }),
        });
        tagId = created.tag._id;
      }
      const payload = {
        ...form,
        tagId,
        searchableKeywords: form.searchableKeywords
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        attachments: form.attachments.map((item, index) => ({
          ...item,
          order: index,
        })),
      };
      await request(
        notice
          ? `/api/student-notices/admin/notices/${notice._id}`
          : "/api/student-notices/admin/notices",
        { method: notice ? "PUT" : "POST", body: JSON.stringify(payload) }
      );
      onSaved();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };
  const existingDepartmentNames = new Set(tags.map((tag) => tag.name));
  return (
    <motion.div
      className="sn-admin-modal-bg"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.form
        className="sn-notice-form"
        initial={{ y: 25, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
      >
        <button className="sn-close" type="button" onClick={onClose}>
          <X />
        </button>
        <h2>{notice ? "Edit Notice" : "Add Notice"}</h2>
        {notice && (
          <p className="sn-views">
            <Eye size={15} />
            {notice.viewCount || 0} views
          </p>
        )}
        <div className="sn-form-grid">
          <label>
            Department / Tag *
            <select
              required
              value={form.tagId}
              onChange={(event) => set("tagId", event.target.value)}
            >
              <option value="">Select department</option>
              {tags
                .filter((tag) => tag.active || tag._id === form.tagId)
                .map((tag) => (
                  <option value={tag._id} key={tag._id}>
                    {tag.name}
                  </option>
                ))}
              {VENUE_DEPARTMENTS.filter(
                (department) => !existingDepartmentNames.has(department),
              ).map((department) => (
                <option
                  value={`department:${department}`}
                  key={department}
                >
                  {department}
                </option>
              ))}
            </select>
          </label>
          <label>
            Notice Date *
            <input
              required
              type="date"
              value={form.noticeDate}
              onChange={(event) => set("noticeDate", event.target.value)}
            />
          </label>
          <label className="wide">
            Notice Title *
            <input
              required
              maxLength={220}
              value={form.title}
              onChange={(event) => set("title", event.target.value)}
            />
          </label>
          <label className="wide">
            Short Description *
            <textarea
              required
              maxLength={700}
              value={form.description}
              onChange={(event) => set("description", event.target.value)}
            />
          </label>
          <label className="wide">
            Full Written Content
            <textarea
              value={form.content}
              maxLength={12000}
              onChange={(event) => set("content", event.target.value)}
            />
          </label>
          <label className="wide">
            Search Keywords
            <input
              value={form.searchableKeywords}
              onChange={(event) =>
                set("searchableKeywords", event.target.value)
              }
              placeholder="hostel, scholarship, deadline"
            />
          </label>
        </div>
        <section
          className="sn-upload-zone"
          onClick={() => fileRef.current?.click()}
        >
          <UploadCloud size={34} />
          <h3>Upload scanned notices</h3>
          <p>Multiple PDF, JPEG, PNG or WebP files · Maximum 20 MB each</p>
          <input
            ref={fileRef}
            hidden
            multiple
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(event) => uploadAttachments([...event.target.files])}
          />
        </section>
        {Object.entries(uploadProgress).map(([name, progress]) => (
          <div className="sn-progress" key={name}>
            <span>{name}</span>
            <div>
              <i style={{ width: `${progress}%` }} />
            </div>
            <b>{progress}%</b>
          </div>
        ))}
        <div className="sn-attachment-list">
          {form.attachments.map((attachment, index) => (
            <div key={attachment.fileId || attachment.url}>
              <div className="sn-attachment-preview">
                {attachment.fileType === "image" ? (
                  <img src={attachment.url} alt={attachment.fileName} />
                ) : (
                  <FileText size={34} />
                )}
              </div>
              <span>{attachment.fileName}</span>
              <button
                type="button"
                title="Make primary"
                className={attachment.isPrimary ? "primary" : ""}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    attachments: current.attachments.map((item, itemIndex) => ({
                      ...item,
                      isPrimary: itemIndex === index,
                    })),
                  }))
                }
              >
                {attachment.isPrimary ? "Primary" : "Set primary"}
              </button>
              <button
                type="button"
                disabled={index === 0}
                onClick={() => moveAttachment(index, -1)}
              >
                <ArrowUp />
              </button>
              <button
                type="button"
                disabled={index === form.attachments.length - 1}
                onClick={() => moveAttachment(index, 1)}
              >
                <ArrowDown />
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    attachments: current.attachments
                      .filter((_, itemIndex) => itemIndex !== index)
                      .map((item, itemIndex) => ({
                        ...item,
                        isPrimary:
                          item.isPrimary ||
                          (itemIndex === 0 &&
                            current.attachments[index].isPrimary),
                      })),
                  }))
                }
              >
                <Trash2 />
              </button>
            </div>
          ))}
        </div>
        <div className="sn-form-options">
          <label>
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => set("featured", event.target.checked)}
            />{" "}
            Featured / pinned
          </label>
          <label>
            Status
            <select
              value={form.status}
              onChange={(event) => set("status", event.target.value)}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        {error && <p className="sn-error">{error}</p>}
        <button
          className="sn-save"
          disabled={saving || Object.keys(uploadProgress).length > 0}
        >
          <Save size={17} />
          {saving ? "Saving..." : "Save Notice"}
        </button>
      </motion.form>
    </motion.div>
  );
}

export default function StudentNoticesAdminPage() {
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);
  const [section, setSection] = useState("dashboard");
  const [notices, setNotices] = useState([]);
  const [tags, setTags] = useState([]);
  const [stats, setStats] = useState({
    totalViews: 0,
    totalNotices: 0,
    mostViewed: [],
  });
  const [formNotice, setFormNotice] = useState(undefined);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("updated");
  const [error, setError] = useState("");
  const [tagDraft, setTagDraft] = useState({
    name: "",
    description: "",
    icon: "Building2",
    active: true,
    order: 0,
  });
  useEffect(() => {
    request("/api/student-notices/admin/session")
      .then(() => setAuthenticated(true))
      .catch(() => setAuthenticated(false))
      .finally(() => setSessionLoading(false));
  }, []);
  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: 50, sort });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      const [noticeData, tagData, statsData] = await Promise.all([
        request(`/api/student-notices/admin/notices?${params}`),
        request("/api/student-notices/admin/tags"),
        request("/api/student-notices/admin/stats"),
      ]);
      setNotices(noticeData.notices || []);
      setTags(tagData.tags || []);
      setStats(statsData);
    } catch (loadError) {
      setError(loadError.message);
    }
  }, [search, status, sort]);
  useEffect(() => {
    if (authenticated) load();
  }, [authenticated, load]);
  const login = async (event) => {
    event.preventDefault();
    if (loggingIn) return;
    setLoggingIn(true);
    setLoginError("");
    try {
      await request("/api/student-notices/admin/login", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      setPassword("");
      setAuthenticated(true);
    } catch (loginFailure) {
      setLoginError(loginFailure.message);
    } finally {
      setLoggingIn(false);
    }
  };
  const visibleNotices = useMemo(
    () =>
      section === "drafts"
        ? notices.filter((notice) => notice.status === "draft")
        : section === "archived"
        ? notices.filter((notice) => notice.status === "archived")
        : notices,
    [notices, section]
  );
  const mutate = async (url, options) => {
    try {
      await request(url, options);
      await load();
    } catch (mutationError) {
      setError(mutationError.message);
    }
  };
  const saveTag = async () => {
    await mutate("/api/student-notices/admin/tags", {
      method: "POST",
      body: JSON.stringify(tagDraft),
    });
    setTagDraft({
      name: "",
      description: "",
      icon: "Building2",
      active: true,
      order: tags.length,
    });
  };
  const moveTag = async (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= tags.length) return;
    const currentTag = tags[index];
    const nextTag = tags[nextIndex];
    try {
      await Promise.all([
        request(`/api/student-notices/admin/tags/${currentTag._id}`, {
          method: "PUT",
          body: JSON.stringify({ ...currentTag, order: nextIndex }),
        }),
        request(`/api/student-notices/admin/tags/${nextTag._id}`, {
          method: "PUT",
          body: JSON.stringify({ ...nextTag, order: index }),
        }),
      ]);
      await load();
    } catch (moveError) {
      setError(moveError.message);
    }
  };
  if (sessionLoading)
    return (
      <div className="sn-admin-login">
        <div className="sn-login-card">
          <LockKeyhole size={30} />
          <p>Checking secure session...</p>
        </div>
      </div>
    );
  if (!authenticated)
    return (
      <div className="sn-admin-login">
        <form className="sn-login-card" onSubmit={login}>
          <div className="sn-login-icon">
            <LockKeyhole />
          </div>
          <h1>Student Notices Admin</h1>
          <p>Enter the dashboard password to continue.</p>
          <label>
            Password
            <input
              autoFocus
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          {loginError && <p className="sn-login-error">{loginError}</p>}
          <button disabled={loggingIn}>
            {loggingIn ? "Signing in..." : "Open Dashboard"}
          </button>
        </form>
        <style>{`.sn-admin-login{min-height:100vh;display:grid;place-items:center;padding:22px;background:radial-gradient(circle at top,#fff1f2,#f4f6f9 55%);font-family:'DM Sans',sans-serif;color:#172033}.sn-login-card{width:min(420px,100%);padding:38px;border:1px solid rgba(198,40,40,.12);border-radius:24px;background:#fff;box-shadow:0 24px 70px rgba(15,23,42,.12);text-align:center}.sn-login-icon{display:grid;place-items:center;width:58px;height:58px;margin:0 auto 17px;border-radius:18px;background:#fff0f0;color:#c62828}.sn-login-card h1{margin:0;font-family:'EB Garamond',serif;font-size:32px}.sn-login-card p{color:#64748b}.sn-login-card label{display:block;margin-top:25px;text-align:left;font-size:13px;font-weight:700}.sn-login-card input{box-sizing:border-box;width:100%;margin-top:7px;padding:13px;border:1px solid #dbe2ea;border-radius:11px;font:inherit}.sn-login-card button{width:100%;margin-top:18px;padding:13px;border:0;border-radius:11px;background:#c62828;color:#fff;font-weight:750}.sn-login-card button:disabled{opacity:.65}.sn-login-error{color:#b91c1c!important;font-size:13px}`}</style>
      </div>
    );
  return (
    <div className="sn-admin">
      <style>{`
    .sn-admin{min-height:100vh;background:#f3f5f8;color:#172033;font-family:'DM Sans',sans-serif}.sn-admin-shell{display:grid;grid-template-columns:245px 1fr;min-height:100vh}.sn-admin-nav{padding:28px 18px;background:#111827;color:#fff}.sn-admin-nav h1{font-family:'EB Garamond',serif;font-size:24px;margin:0 10px 28px}.sn-admin-nav button{display:flex;align-items:center;gap:10px;width:100%;margin:4px 0;padding:11px 12px;border:0;border-radius:10px;background:transparent;color:#cbd5e1;text-align:left}.sn-admin-nav button.active{background:#c62828;color:#fff}.sn-admin-main{padding:34px;overflow:hidden}.sn-admin-head{display:flex;justify-content:space-between;align-items:center;gap:15px;margin-bottom:28px}.sn-admin-head h2{font-family:'EB Garamond',serif;font-size:34px}.sn-add{display:flex;align-items:center;gap:7px;padding:11px 15px;border:0;border-radius:11px;background:#c62828;color:#fff;font-weight:700}.sn-stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.sn-stat{padding:22px;border:1px solid #e2e8f0;border-radius:17px;background:#fff;box-shadow:0 10px 30px rgba(15,23,42,.05)}.sn-stat b{display:block;margin-top:9px;font-size:28px}.sn-most{margin-top:24px;padding:22px;border:1px solid #e2e8f0;border-radius:17px;background:#fff}.sn-most li{display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #eef2f7}.sn-filters{display:flex;gap:10px;margin-bottom:16px}.sn-filters input,.sn-filters select,.sn-form-grid input,.sn-form-grid textarea,.sn-form-grid select,.sn-form-options select,.sn-tag-form input{width:100%;padding:10px 12px;border:1px solid #dbe2ea;border-radius:10px;background:#fff;font:inherit}.sn-table-wrap{overflow:auto;border:1px solid #e2e8f0;border-radius:16px;background:#fff}.sn-table{width:100%;border-collapse:collapse;min-width:850px}.sn-table th,.sn-table td{padding:13px 15px;border-bottom:1px solid #eef2f7;text-align:left;font-size:12px}.sn-table th{background:#f8fafc;color:#64748b}.sn-table td button{margin-right:5px;padding:7px;border:1px solid #e2e8f0;border-radius:8px;background:#fff}.sn-status{padding:4px 8px;border-radius:999px;background:#eef2ff;font-weight:700}.sn-tags-grid{display:grid;grid-template-columns:330px 1fr;gap:20px}.sn-tag-form,.sn-tag-list{padding:20px;border:1px solid #e2e8f0;border-radius:16px;background:#fff}.sn-tag-form{display:grid;gap:10px}.sn-tag-list>div{display:grid;grid-template-columns:1fr 80px 80px 90px;align-items:center;gap:10px;padding:12px 0;border-bottom:1px solid #eef2f7}.sn-admin-modal-bg{position:fixed;inset:0;z-index:1500;display:grid;place-items:center;padding:18px;background:rgba(15,23,42,.65);backdrop-filter:blur(9px)}.sn-notice-form{position:relative;width:min(900px,96vw);max-height:94vh;overflow:auto;padding:30px;border-radius:23px;background:#fff}.sn-notice-form h2{font-family:'EB Garamond',serif;font-size:30px}.sn-close{position:absolute;right:18px;top:18px;display:grid;place-items:center;width:38px;height:38px;border:1px solid #e2e8f0;border-radius:50%;background:#fff}.sn-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:22px}.sn-form-grid label{font-size:12px;font-weight:700}.sn-form-grid label>*{display:block;margin-top:6px}.sn-form-grid .wide{grid-column:1/-1}.sn-form-grid textarea{min-height:90px;resize:vertical}.sn-upload-zone{margin:22px 0;padding:32px;border:2px dashed #f0a5a5;border-radius:18px;background:#fff8f8;text-align:center;color:#c62828;cursor:pointer}.sn-upload-zone p{margin-top:6px;color:#64748b;font-size:12px}.sn-progress{display:grid;grid-template-columns:1fr 180px 42px;gap:9px;align-items:center;margin:8px 0;font-size:11px}.sn-progress div{height:7px;border-radius:99px;background:#e2e8f0;overflow:hidden}.sn-progress i{display:block;height:100%;background:#c62828}.sn-attachment-list>div{display:grid;grid-template-columns:64px 1fr auto 34px 34px 34px;gap:8px;align-items:center;padding:9px;border-bottom:1px solid #eef2f7;font-size:11px}.sn-attachment-preview{display:grid;place-items:center;width:58px;height:48px;border-radius:7px;background:#f1f5f9;overflow:hidden}.sn-attachment-preview img{width:100%;height:100%;object-fit:cover}.sn-attachment-list button{padding:6px;border:1px solid #e2e8f0;border-radius:7px;background:#fff}.sn-attachment-list .primary{background:#dcfce7;color:#15803d}.sn-form-options{display:flex;justify-content:space-between;align-items:center;margin-top:20px}.sn-save{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;margin-top:18px;padding:13px;border:0;border-radius:11px;background:#c62828;color:#fff;font-weight:750}.sn-error{margin:12px 0;color:#b91c1c}.sn-views{display:flex;align-items:center;gap:6px;color:#64748b}@media(max-width:800px){.sn-admin-shell{grid-template-columns:1fr}.sn-admin-nav{display:flex;overflow-x:auto;padding:12px}.sn-admin-nav h1{display:none}.sn-admin-nav button{width:auto;white-space:nowrap}.sn-admin-main{padding:20px 14px}.sn-stat-grid{grid-template-columns:1fr}.sn-tags-grid{grid-template-columns:1fr}.sn-form-grid{grid-template-columns:1fr}.sn-form-grid .wide{grid-column:auto}.sn-notice-form{padding:22px}.sn-attachment-list>div{grid-template-columns:52px 1fr;}.sn-attachment-list button{grid-row:2}.sn-filters{flex-direction:column}}
`}</style>
      <div className="sn-admin-shell">
        <nav className="sn-admin-nav">
          <h1>Student Notices</h1>
          {[
            ["dashboard", LayoutDashboard, "Dashboard"],
            ["notices", FileText, "Notices"],
            ["tags", Tags, "Departments / Tags"],
            ["drafts", Edit3, "Drafts"],
            ["archived", Archive, "Archived"],
            ["settings", Settings, "Settings"],
          ].map(([id, Icon, label]) => (
            <button
              key={id}
              className={section === id ? "active" : ""}
              onClick={() => {
                setSection(id);
                if (id === "drafts") setStatus("draft");
                else if (id === "archived") setStatus("archived");
                else if (id === "notices") setStatus("");
              }}
            >
              <Icon size={17} />
              {label}
            </button>
          ))}
        </nav>
        <main className="sn-admin-main">
          <div className="sn-admin-head">
            <h2>
              {section === "tags"
                ? "Departments / Tags"
                : section === "dashboard"
                ? "Dashboard"
                : section.charAt(0).toUpperCase() + section.slice(1)}
            </h2>
            {!["dashboard", "tags", "settings"].includes(section) && (
              <button
                className="sn-add"
                onClick={() => {
                  setFormNotice(undefined);
                  setShowForm(true);
                }}
              >
                <Plus size={17} />
                Add Notice
              </button>
            )}
          </div>
          {error && <p className="sn-error">{error}</p>}
          {section === "dashboard" && (
            <>
              <div className="sn-stat-grid">
                <div className="sn-stat">
                  <BarChart3 />
                  <span>Total notice views</span>
                  <b>{stats.totalViews || 0}</b>
                </div>
                <div className="sn-stat">
                  <FileText />
                  <span>Total notices</span>
                  <b>{stats.totalNotices || 0}</b>
                </div>
                <div className="sn-stat">
                  <Eye />
                  <span>Published</span>
                  <b>
                    {
                      notices.filter((notice) => notice.status === "published")
                        .length
                    }
                  </b>
                </div>
              </div>
              <div className="sn-most">
                <h3>Most-viewed notices</h3>
                <ol>
                  {(stats.mostViewed || []).map((notice) => (
                    <li key={notice._id}>
                      <span>{notice.title}</span>
                      <b>{notice.viewCount || 0} views</b>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
          {["notices", "drafts", "archived"].includes(section) && (
            <>
              <div className="sn-filters">
                <input
                  placeholder="Search notices..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                >
                  <option value="">All statuses</option>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="archived">Archived</option>
                </select>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                >
                  <option value="updated">Recently updated</option>
                  <option value="views">Most views</option>
                </select>
              </div>
              <div className="sn-table-wrap">
                <table className="sn-table">
                  <thead>
                    <tr>
                      <th>Notice</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>
                        <button
                          onClick={() =>
                            setSort(sort === "views" ? "updated" : "views")
                          }
                        >
                          Views
                        </button>
                      </th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleNotices.map((notice) => (
                      <tr key={notice._id}>
                        <td>
                          <b>{notice.title}</b>
                        </td>
                        <td>{notice.tagId?.name}</td>
                        <td>
                          <span className="sn-status">{notice.status}</span>
                        </td>
                        <td>{notice.viewCount || 0}</td>
                        <td>
                          {new Date(notice.noticeDate).toLocaleDateString(
                            "en-IN"
                          )}
                        </td>
                        <td>
                          <button
                            title="Edit"
                            onClick={() => {
                              setFormNotice(notice);
                              setShowForm(true);
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            title="Duplicate"
                            onClick={() =>
                              mutate(
                                `/api/student-notices/admin/notices/${notice._id}/duplicate`,
                                { method: "POST" }
                              )
                            }
                          >
                            <Copy size={15} />
                          </button>
                          {notice.status !== "published" && (
                            <button
                              title="Publish"
                              onClick={() =>
                                mutate(
                                  `/api/student-notices/admin/notices/${notice._id}/status`,
                                  {
                                    method: "PATCH",
                                    body: JSON.stringify({
                                      status: "published",
                                    }),
                                  }
                                )
                              }
                            >
                              <Eye size={15} />
                            </button>
                          )}
                          {notice.status === "published" && (
                            <button
                              title="Unpublish to draft"
                              onClick={() =>
                                mutate(
                                  `/api/student-notices/admin/notices/${notice._id}/status`,
                                  {
                                    method: "PATCH",
                                    body: JSON.stringify({ status: "draft" }),
                                  }
                                )
                              }
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                          {notice.status !== "archived" && (
                            <button
                              title="Archive"
                              onClick={() =>
                                mutate(
                                  `/api/student-notices/admin/notices/${notice._id}/status`,
                                  {
                                    method: "PATCH",
                                    body: JSON.stringify({
                                      status: "archived",
                                    }),
                                  }
                                )
                              }
                            >
                              <Archive size={15} />
                            </button>
                          )}
                          <button
                            title="Delete"
                            onClick={() =>
                              window.confirm(
                                "Delete this notice? Attachments will remain in ImageKit."
                              ) &&
                              mutate(
                                `/api/student-notices/admin/notices/${notice._id}`,
                                { method: "DELETE" }
                              )
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {section === "tags" && (
            <div className="sn-tags-grid">
              <div className="sn-tag-form">
                <h3>Add Department / Tag</h3>
                <input
                  placeholder="Name"
                  value={tagDraft.name}
                  onChange={(event) =>
                    setTagDraft({ ...tagDraft, name: event.target.value })
                  }
                />
                <input
                  placeholder="Description"
                  value={tagDraft.description}
                  onChange={(event) =>
                    setTagDraft({
                      ...tagDraft,
                      description: event.target.value,
                    })
                  }
                />
                <input
                  placeholder="Lucide icon key"
                  value={tagDraft.icon}
                  onChange={(event) =>
                    setTagDraft({ ...tagDraft, icon: event.target.value })
                  }
                />
                <button className="sn-add" onClick={saveTag}>
                  <Plus size={15} />
                  Add Tag
                </button>
              </div>
              <div className="sn-tag-list">
                {tags.map((tag, index) => (
                  <div key={tag._id}>
                    <input
                      value={tag.name}
                      onChange={(event) =>
                        setTags((current) =>
                          current.map((item) =>
                            item._id === tag._id
                              ? { ...item, name: event.target.value }
                              : item
                          )
                        )
                      }
                    />
                    <button
                      disabled={index === 0}
                      onClick={() => moveTag(index, -1)}
                    >
                      <ArrowUp />
                    </button>
                    <button
                      disabled={index === tags.length - 1}
                      onClick={() => moveTag(index, 1)}
                    >
                      <ArrowDown />
                    </button>
                    <button
                      onClick={() =>
                        mutate(`/api/student-notices/admin/tags/${tag._id}`, {
                          method: "PUT",
                          body: JSON.stringify({ ...tag, active: !tag.active }),
                        })
                      }
                    >
                      {tag.active ? "Disable" : "Enable"}
                    </button>
                    <button
                      onClick={() =>
                        mutate(`/api/student-notices/admin/tags/${tag._id}`, {
                          method: "DELETE",
                        })
                      }
                    >
                      <Trash2 />
                    </button>
                    <button
                      className="sn-add"
                      onClick={() =>
                        mutate(`/api/student-notices/admin/tags/${tag._id}`, {
                          method: "PUT",
                          body: JSON.stringify(tag),
                        })
                      }
                    >
                      Save
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {section === "settings" && (
            <div className="sn-stat">
              <Settings />
              <h3>Student Notices Settings</h3>
              <p>
                Publishing, authentication and attachment storage use the
                existing secure Campus Connect configuration.
              </p>
            </div>
          )}
        </main>
      </div>
      <AnimatePresence>
        {showForm && (
          <NoticeForm
            notice={formNotice}
            tags={tags}
            onClose={() => setShowForm(false)}
            onSaved={async () => {
              setShowForm(false);
              await load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
