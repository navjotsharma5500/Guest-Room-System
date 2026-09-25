import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDown, ArrowLeft, ArrowUp, Eye, ExternalLink, FileText, Plus, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import PublicFormDialog from "../../components/PublicFormDialog";
import { useAuth } from "../../context/AuthContext";
import {
  getAdminPublicForms, createPublicForm, updatePublicForm, setPublicFormStatus,
  deletePublicForm, reorderPublicForms, makeFormSlug, filenameFromUrl, isFormFileUrl,
} from "../../utils/publicFormsApi";
import "../../styles/PublicForms.css";

function FormEditor({ form, categories, nextOrder, onSaved, onClose }) {
  const [values, setValues] = useState(() => ({
    title: form?.title || "", code: form?.code || "", category: form?.category || "",
    description: form?.description || "", fileUrl: form?.fileUrl || "", keywords: form?.keywords || [],
    order: form?.order ?? nextOrder, enabled: form?.enabled ?? true, featured: form?.featured ?? false,
    originalFileName: form?.originalFileName || "", fileType: form?.fileType || "PDF",
  }));
  const [keyword, setKeyword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const filenameOverridden = useRef(false);
  const change = (name, value) => setValues((current) => ({ ...current, [name]: value }));
  const keywordList = () => [...new Set([...values.keywords, ...keyword.split(",").map((word) => word.trim()).filter(Boolean)])];
  const addKeyword = () => {
    const keywords = keywordList();
    if (keywords.length > 50 || keywords.some((word) => word.length > 100)) { setError("Use up to 50 keywords, with no more than 100 characters each."); return; }
    change("keywords", keywords); setKeyword(""); setError("");
  };
  const save = async (event) => {
    event.preventDefault();
    if (saving) return;
    const slug = form?.slug || makeFormSlug(values.title);
    const order = Number(values.order);
    const keywords = keywordList();
    if (!slug) { setError("Please include a letter A–Z or a number in the title."); return; }
    if (!values.title.trim() || !values.category.trim()) { setError("Title and category are required."); return; }
    if (!isFormFileUrl(values.fileUrl)) { setError("Paste a valid public HTTP or HTTPS URL without a username or password."); return; }
    if (values.order === "" || !Number.isSafeInteger(order) || order < 0) { setError("Display Order must be a non-negative whole number."); return; }
    if (keywords.length > 50 || keywords.some((word) => word.length > 100)) { setError("Use up to 50 keywords, with no more than 100 characters each."); return; }
    // Explicit editable fields only; never spread a stored database record.
    const payload = {
      title: values.title.trim(), code: values.code.trim(), category: values.category.trim(),
      description: values.description.trim(), fileUrl: values.fileUrl, keywords, order,
      enabled: values.enabled, featured: values.featured, fileType: values.fileType,
      originalFileName: values.originalFileName || filenameFromUrl(values.fileUrl),
      ...(!form ? { slug } : {}),
    };
    setSaving(true); setError("");
    try {
      if (form) await updatePublicForm(form._id, payload); else await createPublicForm(payload);
      toast.success(form ? "Changes saved" : "Public form added");
      onSaved();
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  };
  return <PublicFormDialog title={form ? "Edit Public Form" : "Add New Form"} onClose={() => { if (!saving) onClose(); }}>
    <form onSubmit={save} className="pf-editor">
      {error && <p className="pf-error" role="alert">{error}</p>}
      <fieldset disabled={saving}>
        <div className="pf-form-section">
          <p className="pf-section-title">Basic Details</p>
          <label>Title *<input required maxLength={240} value={values.title} onChange={(event) => change("title", event.target.value)} /></label>
          <div className="pf-editor-columns"><label>Code<input maxLength={40} value={values.code} onChange={(event) => change("code", event.target.value)} /></label><label>Category *<input required list="public-form-categories" maxLength={160} value={values.category} onChange={(event) => change("category", event.target.value)} /><datalist id="public-form-categories">{categories.map((category) => <option value={category} key={category}>{category}</option>)}</datalist><small>Choose an existing category or type a new one.</small></label></div>
          <label>Description<textarea rows={3} maxLength={4000} value={values.description} onChange={(event) => change("description", event.target.value)} /></label>
        </div>
        <div className="pf-form-section">
          <p className="pf-section-title">Document</p>
          <label>Public File URL *<input type="url" required maxLength={4096} placeholder="https://ik.imagekit.io/..." value={values.fileUrl} onChange={(event) => {
            const fileUrl = event.target.value;
            setValues((current) => ({ ...current, fileUrl, ...(!filenameOverridden.current ? { originalFileName: filenameFromUrl(fileUrl) } : {}) }));
          }} /><small>Paste the public ImageKit/PDF URL.</small></label>
        </div>
        <div className="pf-form-section">
          <p className="pf-section-title">Discovery</p>
          <div className="pf-keywords"><label>Keywords<input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="Type a keyword and press Enter" onKeyDown={(event) => { if (event.key === "Enter" || event.key === ",") { event.preventDefault(); addKeyword(); } }} /></label><button type="button" onClick={addKeyword}>Add keyword</button><div className="pf-tags">{values.keywords.map((word) => <span key={word}>{word}<button type="button" aria-label={`Remove keyword ${word}`} onClick={() => change("keywords", values.keywords.filter((item) => item !== word))}><X size={13} /></button></span>)}</div><small>Up to 50 keywords, 100 characters each.</small></div>
        </div>
        <div className="pf-form-section">
          <p className="pf-section-title">Visibility</p>
          <label>Display Order<input type="number" required min={0} max={Number.MAX_SAFE_INTEGER} step={1} value={values.order} onChange={(event) => change("order", event.target.value)} /></label>
          <div className="pf-checkboxes"><label><input type="checkbox" checked={values.featured} onChange={(event) => change("featured", event.target.checked)} />Featured</label><label><input type="checkbox" checked={values.enabled} onChange={(event) => change("enabled", event.target.checked)} />Enabled</label></div>
        </div>
        <details><summary>Advanced</summary><label>Original file name<input maxLength={240} value={values.originalFileName} onChange={(event) => { filenameOverridden.current = true; change("originalFileName", event.target.value); }} /></label><label>File type<input maxLength={40} value={values.fileType} onChange={(event) => change("fileType", event.target.value)} /></label></details>
      </fieldset>
      <div className="pf-modal-actions"><button type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="pf-primary" type="submit" disabled={saving}>{saving ? "Saving…" : form ? "Save Changes" : "Save Form"}</button></div>
    </form>
  </PublicFormDialog>;
}

export default function PublicFormsAdminPage() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const isAdmin = (currentUser?.role || "").toLowerCase() === "admin";
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setForms(await getAdminPublicForms()); } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const mutate = async (action, message) => {
    if (busy) return;
    setBusy(true); setError("");
    try { await action(); toast.success(message); setDeleting(null); await load(); }
    catch (requestError) { setError(requestError.message); toast.error(requestError.message); }
    finally { setBusy(false); }
  };
  const move = (index, direction) => {
    const arranged = [...forms];
    [arranged[index], arranged[index + direction]] = [arranged[index + direction], arranged[index]];
    mutate(() => reorderPublicForms(arranged.map((form, position) => ({ id: form._id, order: position + 1 }))), "Order updated");
  };
  const categories = [...new Set(forms.map((form) => form.category).filter(Boolean))];
  const totalOpens = forms.reduce((sum, form) => sum + (form.viewCount || 0), 0);
  return <main className="pf-admin"><Toaster position="top-right" /><div className="pf-admin-shell">
    <header className="pf-admin-heading"><button type="button" onClick={() => navigate("/admin/dashboard-selector")} aria-label="Back to Dashboard Selector"><ArrowLeft size={20} /></button><div><h1>Manage Public Forms</h1><p>Manage forms and downloadable resources shown on Campus Connect.</p></div><button className="pf-primary" type="button" disabled={loading || busy} onClick={() => setEditor({ form: null })}><Plus size={17} />Add New Form</button></header>
    {!loading && forms.length > 0 && <div className="pf-admin-stats" aria-hidden="true">
      <div><span>{forms.length}</span><small>Total Forms</small></div>
      <div><span>{forms.filter((form) => form.enabled).length}</span><small>Active</small></div>
      <div><span>{forms.filter((form) => !form.enabled).length}</span><small>Hidden</small></div>
      <div><span>{totalOpens.toLocaleString()}</span><small>Total Form Opens</small></div>
    </div>}
    {error && <div className="pf-error" role="alert">{error}<button type="button" onClick={load} disabled={busy}>Retry</button></div>}
    {loading ? <p role="status" className="pf-empty">Loading public forms…</p> : !forms.length ? <div className="pf-empty"><FileText size={30} /><p>No public forms yet. Add your first form to get started.</p></div>
      : <div className="pf-admin-list">
        <div className="pf-admin-list-head" aria-hidden="true"><span>Order</span><span>Form</span><span>Actions</span></div>
        {forms.map((form, index) => <article key={form._id} className="pf-admin-row" aria-label={form.title}>
        <div className="pf-order"><span aria-label={`Display order ${form.order}`}>{form.order}</span><div><button type="button" aria-label={`Move ${form.title} up`} disabled={busy || index === 0 || forms.length > 500} onClick={() => move(index, -1)}><ArrowUp size={16} /></button><button type="button" aria-label={`Move ${form.title} down`} disabled={busy || index === forms.length - 1 || forms.length > 500} onClick={() => move(index, 1)}><ArrowDown size={16} /></button></div></div>
        <div className="pf-admin-copy"><h2>{form.title} {form.code && <span className="pf-code">{form.code}</span>}</h2><p>{form.category}</p><div className="pf-admin-meta"><span className={form.enabled ? "pf-active" : "pf-hidden"}>{form.enabled ? "Active" : "Hidden"}</span>{form.featured && <span className="pf-featured">Featured</span>}<span className="pf-views" aria-label={`Opened ${(form.viewCount || 0).toLocaleString()} times`}><Eye size={13} />{(form.viewCount || 0).toLocaleString()} views</span><a href={isFormFileUrl(form.fileUrl) ? form.fileUrl : undefined} target="_blank" rel="noopener noreferrer"><ExternalLink size={13} />View file</a></div></div>
        <div className="pf-row-actions"><button type="button" disabled={busy} onClick={() => setEditor({ form })}>Edit</button><button type="button" disabled={busy} onClick={() => mutate(() => setPublicFormStatus(form._id, !form.enabled), form.enabled ? "Form hidden" : "Form enabled")}>{form.enabled ? "Disable" : "Enable"}</button>{isAdmin && <button type="button" className="pf-danger" disabled={busy} onClick={() => { setError(""); setDeleting(form); }}>Delete</button>}</div>
      </article>)}</div>}
    {editor && <FormEditor form={editor.form} categories={categories} nextOrder={Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, ...forms.map((form) => form.order || 0)) + 1)} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
    {deleting && <PublicFormDialog title="Delete this public form?" onClose={() => { if (!busy) setDeleting(null); }}><p className="pf-delete-copy">This removes the form entry from Campus Connect. It does not delete the original ImageKit file.</p><strong>{deleting.title}</strong>{error && <p className="pf-error" role="alert">{error}</p>}<div className="pf-modal-actions"><button type="button" disabled={busy} onClick={() => setDeleting(null)}>Cancel</button><button type="button" className="pf-primary" disabled={busy} onClick={() => mutate(() => deletePublicForm(deleting._id), "Form deleted")}>{busy ? "Deleting…" : "Delete Form"}</button></div></PublicFormDialog>}
  </div></main>;
}
