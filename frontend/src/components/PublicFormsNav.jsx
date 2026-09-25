import { useId, useRef, useState } from "react";
import { ChevronDown, ExternalLink, FileText } from "lucide-react";
import usePublicForms from "../hooks/usePublicForms";
import { incrementPublicFormView, isFormFileUrl } from "../utils/publicFormsApi";
import "../styles/PublicForms.css";

export function isPublicFormsNavigation(item) {
  if (item.id === "public-forms" || item.title?.trim().toLowerCase() === "public forms") return true;
  try {
    const url = new URL(item.destination || item.href || "", window.location.origin);
    return [window.location.origin, "https://campusconnect.thapar.edu"].includes(url.origin)
      && url.pathname.replace(/\/$/, "") === "/public-forms";
  } catch { return false; }
}

export default function PublicFormsNav({ title = "Public Forms", onOpen }) {
  const { forms, loading, error, reload } = usePublicForms();
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef(null);
  const menu = useRef(null);
  const toggle = () => { if (!open) reload(); setOpen(!open); };
  const onKeyDown = (event) => {
    if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key) && open) {
      event.preventDefault();
      const links = Array.from(menu.current?.querySelectorAll("a, button") || []);
      const index = links.indexOf(document.activeElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? links.length - 1
        : event.key === "ArrowDown" ? (index + 1) % links.length : index < 0 ? links.length - 1 : (index - 1 + links.length) % links.length;
      links[next]?.focus();
    }
  };
  return <div className="pf-nav" onKeyDown={onKeyDown} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={trigger} type="button" className="pf-nav-trigger" aria-expanded={open} aria-controls={id} onClick={toggle}>{title}<ChevronDown size={14} aria-hidden="true" /></button>
    {open && <div id={id} ref={menu} className="pf-dropdown pf-dropdown-enter" role="region" aria-label="Public Forms dropdown">
      <div className="pf-dropdown-scroll" role="list" aria-label="Available public forms">
        {loading ? <p role="status">Loading forms…</p> : error ? <div role="alert"><p>We couldn't load the forms right now.</p><button type="button" onClick={reload}>Retry</button></div>
          : forms.length ? forms.map((form) => <div role="listitem" key={form._id}><a href={isFormFileUrl(form.fileUrl) ? form.fileUrl : undefined} target="_blank" rel="noopener noreferrer" onClick={() => { if (isFormFileUrl(form.fileUrl)) incrementPublicFormView(form._id); setOpen(false); }}><FileText size={16} aria-hidden="true" /><span>{form.title}{form.code && <small>{form.code}</small>}</span><ExternalLink size={12} aria-hidden="true" /></a></div>)
            : <p>No public forms are currently available.</p>}
      </div>
      <a className="pf-view-all" href="/public-forms" onClick={(event) => {
        if (onOpen && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
          event.preventDefault(); onOpen({ destination: "/public-forms" });
        }
        setOpen(false);
      }}>View All Forms <span aria-hidden="true">→</span></a>
    </div>}
  </div>;
}
