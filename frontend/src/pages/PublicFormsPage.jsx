import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Download, ExternalLink, FileText, Search, X } from "lucide-react";
import { PublicHeader, PublicQuickLinks } from "./CampusConnect";
import PublicPageWidgets from "../components/PublicPageWidgets";
import usePublicForms from "../hooks/usePublicForms";
import { getPublicFormDownloadUrl, incrementPublicFormView, isFormFileUrl } from "../utils/publicFormsApi";
import { DEFAULT_PUBLIC_UI_CONFIG, fetchPublicUiConfig, normalizePublicUiConfig } from "../utils/publicUiConfig";
import "../styles/CampusPublicChrome.css";
import "../styles/PublicForms.css";

export default function PublicFormsPage() {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const { forms, loading, error, reload } = usePublicForms();
  const [config, setConfig] = useState(() => normalizePublicUiConfig(DEFAULT_PUBLIC_UI_CONFIG));
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  useEffect(() => {
    let active = true;
    fetchPublicUiConfig().then((value) => { if (active) setConfig(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  const categories = [...new Set(forms.map((form) => form.category).filter(Boolean))];
  const activeCategory = categories.includes(category) ? category : "";
  const query = search.trim().toLowerCase();
  const matches = forms.filter((form) => (!activeCategory || form.category === activeCategory)
    && [form.title, form.code, form.description, form.category, ...(form.keywords || [])].some((value) => String(value || "").toLowerCase().includes(query)));
  const openItem = (item) => {
    const destination = item.destination || item.href;
    if (destination?.startsWith("/")) navigate(destination);
    else if (/^https?:\/\//i.test(destination || "")) window.open(destination, "_blank", "noopener,noreferrer");
    else if (item.action === "home" || item.action === "about") navigate("/");
  };
  const clear = () => { setSearch(""); setCategory(""); };
  return <div className="pf-page">
    <PublicHeader config={config} onOpen={openItem} applications={config.selector?.cards || []} />
    <main className="pf-library">
      <motion.div className="pf-top" initial={reducedMotion ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .35, ease: "easeOut" }}>
        <div className="pf-heading"><span className="pf-eyebrow">Student Resources</span><h1>Public Forms &amp; Downloads</h1><p>Access official forms and documents for student societies, events, sponsorships, travel grants and related campus activities.</p><small>Forms are maintained by the DoSA Office.</small></div>
        <label className="pf-search"><Search size={20} aria-hidden="true" /><span className="pf-sr-only">Search forms</span><input type="search" placeholder="Search forms by name, code or purpose..." value={search} onChange={(event) => setSearch(event.target.value)} />{search && <button type="button" className="pf-search-clear" aria-label="Clear search" onClick={() => setSearch("")}><X size={14} /></button>}</label>
        <div className="pf-filters" role="group" aria-label="Form categories"><button type="button" aria-pressed={!activeCategory} onClick={() => setCategory("")}>All</button>{categories.map((item) => <button type="button" key={item} aria-pressed={activeCategory === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </motion.div>
      {loading ? <div className="pf-grid" role="status" aria-label="Loading forms">{[0, 1, 2, 3, 4, 5].map((item) => <div className="pf-skeleton" key={item} aria-hidden="true"><span /><span /><span /></div>)}</div>
        : error ? <div className="pf-empty" role="alert"><FileText size={30} /><p>We couldn't load the forms right now.</p><button type="button" onClick={reload}>Retry</button></div>
          : !forms.length ? <div className="pf-empty"><FileText size={30} /><p>No public forms are currently available.</p></div>
            : !matches.length ? <div className="pf-empty"><Search size={30} /><p>No matching forms found.</p><button type="button" onClick={clear}>Clear Search &amp; Filters</button></div>
              : <motion.div key={`${activeCategory}|${query}`} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .2 }}><p className="pf-count" aria-live="polite">{matches.length} {matches.length === 1 ? "resource" : "resources"}</p><div className="pf-grid">{matches.map((form, index) => <motion.article className="pf-card" key={form._id} aria-label={form.title} initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .25, delay: Math.min(index * .035, .25) }}>
                <div className="pf-card-top"><span className="pf-document"><FileText size={24} aria-hidden="true" /></span><span className="pf-badge">{form.fileType || "PDF"}</span>{form.featured && <span className="pf-featured">Featured</span>}</div>
                <p className="pf-category">{form.category}</p><h2>{form.title} {form.code && <span className="pf-code">{form.code}</span>}</h2><p className="pf-description">{form.description}</p>
                <div className="pf-card-actions"><a href={isFormFileUrl(form.fileUrl) ? form.fileUrl : undefined} target="_blank" rel="noopener noreferrer" onClick={() => { if (isFormFileUrl(form.fileUrl)) incrementPublicFormView(form._id); }}><ExternalLink size={15} aria-hidden="true" />View Form</a><a href={getPublicFormDownloadUrl(form)}><Download size={15} aria-hidden="true" />Download</a></div>
              </motion.article>)}</div></motion.div>}
    </main>
    <PublicQuickLinks config={config} onOpen={openItem} /><PublicPageWidgets hideFooter />
  </div>;
}
