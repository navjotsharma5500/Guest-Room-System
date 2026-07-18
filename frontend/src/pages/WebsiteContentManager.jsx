import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, History, Monitor, Plus, RefreshCw, RotateCcw, Save, Send, Smartphone, Trash2 } from "lucide-react";
import { BACKEND_URL } from "../utils/apiConfig";
import CmsImageUploader from "../components/publicGuestRoom/CmsImageUploader";
import { defaultGuestRoomContent, WEBSITE_SECTION_TABS } from "./publicGuestRoom/defaultGuestRoomContent";

const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";
const headers = () => ({ "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` });
const clone = (value) => JSON.parse(JSON.stringify(value ?? {}));
const CMS_PREVIEW_KEY = "guestRoomCmsPreview";

const folderFor = (section) => `/public-guest-room/${["home", "about", "booking"].includes(section) ? "hero" : section}`;

const slugify = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const Field = ({ label, value, onChange, textarea = false, type = "text" }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.14em] text-gray-500">{label}</span>
    {textarea ? (
      <textarea value={value || ""} onChange={(e) => onChange(e.target.value)} className="min-h-24 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-300" />
    ) : (
      <input type={type} value={value || ""} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-300" />
    )}
  </label>
);

const ToggleField = ({ label, checked, onChange, description }) => (
  <label className="flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
    <span>
      <span className="block text-sm font-bold text-gray-800">{label}</span>
      {description && <span className="mt-1 block text-xs text-gray-500">{description}</span>}
    </span>
    <input type="checkbox" checked={checked !== false} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-red-600" />
  </label>
);

const Panel = ({ title, children }) => (
  <details open className="rounded-2xl border border-gray-200 bg-white">
    <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-900">{title}</summary>
    <div className="border-t border-gray-100 p-4">{children}</div>
  </details>
);

const ArrayEditor = ({ title, items = [], onChange, newItem, renderItem }) => (
  <Panel title={title}>
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={index} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-700">Item {index + 1}</p>
            <div className="flex items-center gap-1">
              <button type="button" disabled={index === 0} onClick={() => {
                const next = [...items];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                onChange(next);
              }} className="rounded-lg p-2 text-gray-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30">
                <ArrowUp size={16} />
              </button>
              <button type="button" disabled={index === items.length - 1} onClick={() => {
                const next = [...items];
                [next[index], next[index + 1]] = [next[index + 1], next[index]];
                onChange(next);
              }} className="rounded-lg p-2 text-gray-600 hover:bg-white disabled:cursor-not-allowed disabled:opacity-30">
                <ArrowDown size={16} />
              </button>
              <button type="button" onClick={() => onChange(items.filter((_, i) => i !== index))} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {renderItem(item, (patch) => onChange(items.map((old, i) => (i === index ? { ...old, ...patch } : old))), index)}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, clone(newItem)])} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
        <Plus size={16} /> Add
      </button>
    </div>
  </Panel>
);

export default function WebsiteContentManager({ showToast = () => {} }) {
  const [records, setRecords] = useState({});
  const [active, setActive] = useState("home");
  const [draft, setDraft] = useState(clone(defaultGuestRoomContent.home));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState("");
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonValue, setJsonValue] = useState("");
  const [versions, setVersions] = useState([]);
  const [previewMode, setPreviewMode] = useState("desktop");

  const activeLabel = useMemo(() => WEBSITE_SECTION_TABS.find(([key]) => key === active)?.[1] || active, [active]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/website-content/admin`, { headers: headers(), credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to load website content");
      const next = {};
      WEBSITE_SECTION_TABS.forEach(([section]) => {
        next[section] = { section, data: clone(defaultGuestRoomContent[section] || {}), isPublished: true };
      });
      (data.docs || []).forEach((doc) => {
        next[doc.section] = doc;
      });
      setRecords(next);
      setDraft(clone(next[active]?.data || defaultGuestRoomContent[active] || {}));
    } catch (err) {
      showToast(err.message || "Failed to load website content", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setJsonValue(JSON.stringify(draft, null, 2));
  }, [draft]);

  useEffect(() => {
    const preview = {};
    WEBSITE_SECTION_TABS.forEach(([section]) => {
      preview[section] = clone(records[section]?.data || defaultGuestRoomContent[section] || {});
    });
    preview[active] = clone(draft);
    localStorage.setItem(CMS_PREVIEW_KEY, JSON.stringify(preview));
  }, [active, draft, records]);

  const switchTab = (section) => {
    setActive(section);
    setDraft(clone(records[section]?.data || defaultGuestRoomContent[section] || {}));
    setJsonOpen(false);
  };

  const fetchVersions = async (section = active) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/website-content/${section}/versions`, { headers: headers(), credentials: "include" });
      const data = await res.json();
      if (res.ok && data.success) setVersions(data.versions || []);
    } catch {
      setVersions([]);
    }
  };

  useEffect(() => {
    fetchVersions(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const setPath = (path, value) => {
    setDraft((prev) => {
      const next = clone(prev);
      let cursor = next;
      path.slice(0, -1).forEach((key) => {
        if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
        cursor = cursor[key];
      });
      cursor[path[path.length - 1]] = value;
      return next;
    });
  };

  const save = async (publish = false) => {
    try {
      setSaving(publish ? "publish" : "save");
      const res = await fetch(`${BACKEND_URL}/api/website-content/${active}`, {
        method: "PUT",
        headers: headers(),
        credentials: "include",
        body: JSON.stringify({ data: draft, isPublished: records[active]?.isPublished !== false }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Save failed");
      let doc = data.doc;
      if (publish) {
        const pubRes = await fetch(`${BACKEND_URL}/api/website-content/${active}/publish`, { method: "POST", headers: headers(), credentials: "include" });
        const pubData = await pubRes.json();
        if (!pubRes.ok || !pubData.success) throw new Error(pubData.message || "Publish failed");
        doc = pubData.doc || { ...doc, isPublished: true };
      }
      setRecords((prev) => ({ ...prev, [active]: doc || { section: active, data: draft, isPublished: true } }));
      if (publish) {
        window.dispatchEvent(new CustomEvent("websiteContentPublished", { detail: { section: active, doc } }));
      }
      showToast(publish ? "Section published" : "Draft saved", "success");
    } catch (err) {
      showToast(err.message || "Save failed", "error");
    } finally {
      setSaving("");
    }
  };

  const seedDefaults = async () => {
    try {
      setSaving("seed");
      const res = await fetch(`${BACKEND_URL}/api/website-content/seed-defaults`, { method: "POST", headers: headers(), credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Seed failed");
      showToast("Default content ensured", "success");
      await fetchContent();
    } catch (err) {
      showToast(err.message || "Seed failed", "error");
    } finally {
      setSaving("");
    }
  };

  const reset = async () => {
    if (!window.confirm(`Reset ${activeLabel} content to default?`)) return;
    try {
      setSaving("reset");
      const res = await fetch(`${BACKEND_URL}/api/website-content/${active}/reset`, { method: "POST", headers: headers(), credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Reset failed");
      const doc = data.doc || { section: active, data: data.data, isPublished: true };
      setRecords((prev) => ({ ...prev, [active]: doc }));
      setDraft(clone(doc.data));
      showToast("Section reset", "success");
    } catch (err) {
      showToast(err.message || "Reset failed", "error");
    } finally {
      setSaving("");
    }
  };

  const restoreVersion = async (versionId) => {
    if (!window.confirm("Restore this published version? Current content will be saved into version history first.")) return;
    try {
      setSaving("restore");
      const res = await fetch(`${BACKEND_URL}/api/website-content/${active}/versions/${versionId}/restore`, { method: "POST", headers: headers(), credentials: "include" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Restore failed");
      const doc = data.doc || { section: active, data: data.data, isPublished: true };
      setRecords((prev) => ({ ...prev, [active]: doc }));
      setDraft(clone(doc.data));
      await fetchVersions(active);
      showToast("Version restored and published", "success");
    } catch (err) {
      showToast(err.message || "Restore failed", "error");
    } finally {
      setSaving("");
    }
  };

  const applyJson = () => {
    try {
      setDraft(JSON.parse(jsonValue));
      showToast("Advanced JSON applied", "success");
    } catch (err) {
      showToast(`Invalid JSON: ${err.message}`, "error");
    }
  };

  const renderHero = () => (
    <Panel title="Hero">
      <div className="grid gap-4 md:grid-cols-2">
        <ToggleField label="Show Hero" checked={draft.hero?.enabled !== false} onChange={(v) => setPath(["hero", "enabled"], v)} />
        <Field label="Badge" value={draft.hero?.badge} onChange={(v) => setPath(["hero", "badge"], v)} />
        <Field label="Hero Title" value={draft.hero?.title} onChange={(v) => setPath(["hero", "title"], v)} />
        <Field label="Hero Subtitle" value={draft.hero?.subtitle} onChange={(v) => setPath(["hero", "subtitle"], v)} textarea />
        <Field label="Primary Button Text" value={draft.hero?.primaryButton} onChange={(v) => setPath(["hero", "primaryButton"], v)} />
        <Field label="Primary Button Link" value={draft.hero?.primaryButtonLink} onChange={(v) => setPath(["hero", "primaryButtonLink"], v)} />
        <Field label="Secondary Button Text" value={draft.hero?.secondaryButton} onChange={(v) => setPath(["hero", "secondaryButton"], v)} />
        <Field label="Secondary Button Link" value={draft.hero?.secondaryButtonLink} onChange={(v) => setPath(["hero", "secondaryButtonLink"], v)} />
        <CmsImageUploader label="Hero Image" folder={folderFor(active)} value={draft.hero?.image || ""} onChange={(v) => setPath(["hero", "image"], v)} />
        <CmsImageUploader label="Mobile Hero Image" folder={folderFor(active)} value={draft.hero?.mobileImage || ""} onChange={(v) => setPath(["hero", "mobileImage"], v)} />
        <CmsImageUploader label="Desktop Hero Image" folder={folderFor(active)} value={draft.hero?.desktopImage || ""} onChange={(v) => setPath(["hero", "desktopImage"], v)} />
      </div>
    </Panel>
  );

  const renderHome = () => (
    <>
      {renderHero()}
      <SectionSettingsEditor sections={draft.sections || {}} onChange={(v) => setPath(["sections"], v)} />
      <Panel title="Welcome">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Heading" value={draft.intro?.title} onChange={(v) => setPath(["intro", "title"], v)} />
          <Field label="Description" value={draft.intro?.text} onChange={(v) => setPath(["intro", "text"], v)} textarea />
          <CmsImageUploader label="Welcome Image" folder="/public-guest-room/misc" value={draft.intro?.image || ""} onChange={(v) => setPath(["intro", "image"], v)} />
        </div>
      </Panel>
      <ArrayEditor title="Hero Slides" items={draft.hero?.slides || []} onChange={(v) => setPath(["hero", "slides"], v)} newItem={{ title: "", subtitle: "", image: "" }} renderItem={(item, patch) => <div className="grid gap-3 md:grid-cols-2"><Field label="Title" value={item.title} onChange={(v) => patch({ title: v })} /><Field label="Subtitle" value={item.subtitle} onChange={(v) => patch({ subtitle: v })} /><CmsImageUploader label="Slide Image" folder="/public-guest-room/hero" value={item.image || ""} onChange={(v) => patch({ image: v })} /></div>} />
      <ArrayEditor title="Stats" items={draft.stats || []} onChange={(v) => setPath(["stats"], v)} newItem={{ label: "", value: "", icon: "" }} renderItem={(item, patch) => <div className="grid gap-3 md:grid-cols-3"><Field label="Value" value={item.value} onChange={(v) => patch({ value: v })} /><Field label="Label" value={item.label} onChange={(v) => patch({ label: v })} /><Field label="Icon" value={item.icon} onChange={(v) => patch({ icon: v })} /></div>} />
      <RoomCardsEditor title="Featured Rooms" items={draft.roomCards || []} onChange={(v) => setPath(["roomCards"], v)} />
      <TextListEditor title="Facilities Preview" items={draft.facilities || []} onChange={(v) => setPath(["facilities"], v)} />
      <ArrayEditor title="Stay Journey" items={draft.journey || []} onChange={(v) => setPath(["journey"], v)} newItem={{ title: "", description: "", icon: "", image: "", enabled: true, backgroundColor: "", cardWidth: "", cardHeight: "", buttonText: "", buttonUrl: "" }} renderItem={(item, patch) => <div className="grid gap-3 md:grid-cols-2"><ToggleField label="Enabled" checked={item.enabled !== false} onChange={(v) => patch({ enabled: v })} /><Field label="Order" type="number" value={item.order} onChange={(v) => patch({ order: Number(v) || "" })} /><Field label="Title" value={item.title} onChange={(v) => patch({ title: v })} /><Field label="Icon" value={item.icon} onChange={(v) => patch({ icon: v })} /><Field label="Description" value={item.description} onChange={(v) => patch({ description: v })} textarea /><Field label="Background Color" value={item.backgroundColor} onChange={(v) => patch({ backgroundColor: v })} /><Field label="Card Width" value={item.cardWidth} onChange={(v) => patch({ cardWidth: v })} /><Field label="Card Height" value={item.cardHeight} onChange={(v) => patch({ cardHeight: v })} /><Field label="Button Text" value={item.buttonText} onChange={(v) => patch({ buttonText: v })} /><Field label="Button URL" value={item.buttonUrl} onChange={(v) => patch({ buttonUrl: v })} /><CmsImageUploader label="Step Image" folder="/public-guest-room/misc" value={item.image || ""} onChange={(v) => patch({ image: v })} /></div>} />
      <ArrayEditor title="Camera Roll Images" items={draft.cameraRoll?.images || []} onChange={(v) => setPath(["cameraRoll", "images"], v)} newItem={{ image: "", caption: "" }} renderItem={(item, patch) => <div className="grid gap-3 md:grid-cols-2"><Field label="Caption" value={item.caption} onChange={(v) => patch({ caption: v })} /><CmsImageUploader label="Roll Image" folder="/public-guest-room/gallery" value={item.image || ""} onChange={(v) => patch({ image: v })} /></div>} />
      <Panel title="CTA">
        <div className="grid gap-4 md:grid-cols-2"><Field label="Heading" value={draft.cta?.heading} onChange={(v) => setPath(["cta", "heading"], v)} /><Field label="Text" value={draft.cta?.text} onChange={(v) => setPath(["cta", "text"], v)} textarea /><Field label="Button Label" value={draft.cta?.buttonLabel} onChange={(v) => setPath(["cta", "buttonLabel"], v)} /><Field label="Button Link" value={draft.cta?.buttonLink} onChange={(v) => setPath(["cta", "buttonLink"], v)} /></div>
      </Panel>
    </>
  );

  const renderGeneric = () => (
    <>
      {draft.hero && renderHero()}
      {Array.isArray(draft.sections) && <ArrayEditor title="Sections" items={draft.sections} onChange={(v) => setPath(["sections"], v)} newItem={{ title: "", text: "", image: "" }} renderItem={(item, patch) => <div className="grid gap-3 md:grid-cols-2"><Field label="Title" value={item.title} onChange={(v) => patch({ title: v })} /><Field label="Text" value={item.text} onChange={(v) => patch({ text: v })} textarea /><CmsImageUploader label="Image" folder={folderFor(active)} value={item.image || ""} onChange={(v) => patch({ image: v })} /></div>} />}
      {Array.isArray(draft.cards) && (typeof draft.cards[0] === "string" ? <TextListEditor title="Cards" items={draft.cards} onChange={(v) => setPath(["cards"], v)} /> : <RoomCardsEditor title="Cards" items={draft.cards} onChange={(v) => setPath(["cards"], v)} />)}
      {Array.isArray(draft.facilities) && <TextListEditor title="Facilities" items={draft.facilities} onChange={(v) => setPath(["facilities"], v)} />}
      {Array.isArray(draft.notes) && <TextListEditor title="Notes" items={draft.notes} onChange={(v) => setPath(["notes"], v)} />}
      {Array.isArray(draft.terms) && <TextListEditor title="Terms" items={draft.terms} onChange={(v) => setPath(["terms"], v)} />}
    </>
  );

  const renderAbout = () => (
    <>
      {renderGeneric()}
      <Panel title="Mission">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Mission Label" value={draft.missionEyebrow} onChange={(v) => setPath(["missionEyebrow"], v)} />
          <Field label="Mission Heading" value={draft.mission} onChange={(v) => setPath(["mission"], v)} textarea />
          <Field label="Mission Description / Vision" value={draft.vision} onChange={(v) => setPath(["vision"], v)} textarea />
        </div>
      </Panel>
      <TextListEditor title="Mission Timeline" items={draft.timeline || []} onChange={(v) => setPath(["timeline"], v)} />
    </>
  );

  const renderDining = () => (
    <>
      {renderHero()}
      <Panel title="Dining Intro">
        <Field label="Dining Text" value={draft.text} onChange={(v) => setPath(["text"], v)} textarea />
      </Panel>
      <ArrayEditor
        title="Dining Cards"
        items={draft.cards || []}
        onChange={(v) => setPath(["cards"], v)}
        newItem={{ title: "", timing: "", price: "", description: "", image: "" }}
        renderItem={(item, patch) => (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Title" value={item.title} onChange={(v) => patch({ title: v })} />
            <Field label="Timing" value={item.timing} onChange={(v) => patch({ timing: v })} />
            <Field label="Price" value={item.price} onChange={(v) => patch({ price: v })} />
            <Field label="Description" value={item.description} onChange={(v) => patch({ description: v })} textarea />
            <CmsImageUploader label="Dining Image" folder="/public-guest-room/dining" value={item.image || ""} onChange={(v) => patch({ image: v })} />
          </div>
        )}
      />
      <TextListEditor title="Rules" items={draft.rules || []} onChange={(v) => setPath(["rules"], v)} />
      <TextListEditor title="Options" items={draft.options || []} onChange={(v) => setPath(["options"], v)} />
    </>
  );

  const renderFacilities = () => (
    <>
      {renderHero()}
      <TextListEditor title="Guest Room Facilities" items={draft.facilities || []} onChange={(v) => setPath(["facilities"], v)} />
      <TextListEditor title="Digital Services" items={draft.digitalServices || []} onChange={(v) => setPath(["digitalServices"], v)} />
      <TextListEditor title="Safety" items={draft.safetyCards || []} onChange={(v) => setPath(["safetyCards"], v)} />
    </>
  );

  const renderEditor = () => {
    if (active === "home") return renderHome();
    if (active === "about") return renderAbout();
    if (active === "rooms") return <><>{renderHero()}</><SectionSettingsEditor sections={draft.sections || {}} onChange={(v) => setPath(["sections"], v)} /><RoomHierarchyEditor categories={draft.categories || []} onChange={(v) => setPath(["categories"], v)} showToast={showToast} /><RoomCardsEditor title="Legacy Room Cards" items={draft.cards || []} onChange={(v) => setPath(["cards"], v)} /><TextListEditor title="Room Notes" items={draft.notes || []} onChange={(v) => setPath(["notes"], v)} /></>;
    if (active === "gallery") return <><>{renderHero()}</><SectionSettingsEditor sections={draft.sections || {}} onChange={(v) => setPath(["sections"], v)} /><GalleryEditor allCategoryLabel={draft.allCategoryLabel || ""} onAllCategoryLabel={(v) => setPath(["allCategoryLabel"], v)} images={draft.images || []} categories={draft.categories || []} onImages={(v) => setPath(["images"], v)} onCategories={(v) => setPath(["categories"], v)} /></>;
    if (active === "dining") return renderDining();
    if (active === "facilities") return <><SectionSettingsEditor sections={draft.sections || {}} onChange={(v) => setPath(["sections"], v)} />{renderFacilities()}</>;
    if (active === "tariff") return <><>{renderHero()}</><TariffEditor rows={draft.rows || []} onChange={(v) => setPath(["rows"], v)} /><TextListEditor title="General Terms" items={draft.terms || []} onChange={(v) => setPath(["terms"], v)} /><Panel title="Policies"><div className="grid gap-4 md:grid-cols-2"><Field label="No Cash Policy" value={draft.noCashPolicy} onChange={(v) => setPath(["noCashPolicy"], v)} textarea /><Field label="Refund Policy" value={draft.refundPolicy} onChange={(v) => setPath(["refundPolicy"], v)} textarea /><Field label="Cancellation Policy" value={draft.cancellationPolicy} onChange={(v) => setPath(["cancellationPolicy"], v)} textarea /><Field label="Payment Instructions" value={draft.paymentInstructions} onChange={(v) => setPath(["paymentInstructions"], v)} textarea /></div></Panel></>;
    if (active === "booking") return <><>{renderHero()}</><Panel title="Booking Form Visibility"><div className="grid gap-4 md:grid-cols-2"><ToggleField label="Enable Parent / Student Booking Form" checked={draft.enableParentStudentForm} onChange={(v) => setPath(["enableParentStudentForm"], v)} description="OFF hides this form card from the public selector." /><ToggleField label="Enable Faculty / Staff Booking Form" checked={draft.enableFacultyStaffForm} onChange={(v) => setPath(["enableFacultyStaffForm"], v)} description="OFF hides this form card from the public selector." /><ToggleField label="Lock Parent / Student Booking Form" checked={draft.lockParentStudentForm === true} onChange={(v) => setPath(["lockParentStudentForm"], v)} description="ON keeps the card visible but opens only a popup message." /><ToggleField label="Lock Faculty / Staff Booking Form" checked={draft.lockFacultyStaffForm === true} onChange={(v) => setPath(["lockFacultyStaffForm"], v)} description="ON keeps the card visible but opens only a popup message." /><Field label="Parent / Student Popup Message" value={draft.parentStudentLockMessage} onChange={(v) => setPath(["parentStudentLockMessage"], v)} textarea /><Field label="Faculty / Staff Popup Message" value={draft.facultyStaffLockMessage} onChange={(v) => setPath(["facultyStaffLockMessage"], v)} textarea /></div></Panel><Panel title="Booking Cards & Messages"><div className="grid gap-4 md:grid-cols-2"><Field label="Parents / Students Title" value={draft.studentCard?.title} onChange={(v) => setPath(["studentCard", "title"], v)} /><Field label="Parents / Students Text" value={draft.studentCard?.text} onChange={(v) => setPath(["studentCard", "text"], v)} textarea /><Field label="Faculty / Staff Title" value={draft.staffCard?.title} onChange={(v) => setPath(["staffCard", "title"], v)} /><Field label="Faculty / Staff Text" value={draft.staffCard?.text} onChange={(v) => setPath(["staffCard", "text"], v)} textarea /><Field label="Terms Checkbox Text" value={draft.termsText} onChange={(v) => setPath(["termsText"], v)} textarea /><Field label="Success Message" value={draft.successMessage} onChange={(v) => setPath(["successMessage"], v)} textarea /></div></Panel><TextListEditor title="Policies" items={draft.policies || []} onChange={(v) => setPath(["policies"], v)} /></>;
    if (active === "contact") return <><>{renderHero()}</><Panel title="Contact Details"><div className="grid gap-4 md:grid-cols-2"><Field label="Institute Address" value={draft.location} onChange={(v) => setPath(["location"], v)} textarea /><Field label="DoSA Office" value={draft.office} onChange={(v) => setPath(["office"], v)} /><Field label="DoSA Office Address" value={draft.dosaOfficeAddress} onChange={(v) => setPath(["dosaOfficeAddress"], v)} /><Field label="Working Hours" value={draft.hours} onChange={(v) => setPath(["hours"], v)} /><Field label="Map URL / Google Maps Share Link" value={draft.mapUrl} onChange={(v) => setPath(["mapUrl"], v)} /><Field label="Feedback Link" value={draft.feedbackLink} onChange={(v) => setPath(["feedbackLink"], v)} /></div></Panel><TextListEditor title="Emails" items={draft.emails || []} onChange={(v) => setPath(["emails"], v)} /><TextListEditor title="Phone Numbers" items={draft.phones || []} onChange={(v) => setPath(["phones"], v)} /></>;
    if (active === "footer") return <FooterEditor draft={draft} setPath={setPath} />;
    if (active === "quicklinks") return <LinksEditor title="Quick Links" items={draft.links || []} onChange={(v) => setPath(["links"], v)} />;
    if (active === "bankdetails") return <BankEditor draft={draft} setPath={setPath} />;
    if (active === "theme") return <ThemeEditor draft={draft} setPath={setPath} />;
    return renderGeneric();
  };

  return (
    <div className="flex h-full min-h-[72vh] flex-col bg-white">
      <div className="border-b border-gray-200 px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-red-700">Website Content Manager</h2>
            <p className="text-sm text-gray-500">Visual editor for the public hostel guest room website.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={seedDefaults} disabled={!!saving} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700"><RefreshCw size={16} /> Seed Defaults</button>
            <a href="/guest-room" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700"><Eye size={16} /> Open Website</a>
            <button onClick={reset} disabled={!!saving} className="inline-flex items-center gap-2 rounded-lg border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700"><RotateCcw size={16} /> Reset</button>
            <button onClick={() => save(false)} disabled={!!saving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"><Save size={16} /> Save Draft</button>
            <button onClick={() => save(true)} disabled={!!saving} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white"><Send size={16} /> Publish</button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[250px_1fr]">
        <aside className="border-b border-gray-200 bg-gray-50 p-4 lg:border-b-0 lg:border-r">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
            {WEBSITE_SECTION_TABS.map(([section, label]) => (
              <button key={section} onClick={() => switchTab(section)} className={`rounded-xl border px-3 py-2 text-left text-sm font-semibold ${section === active ? "border-red-300 bg-red-600 text-white" : "border-gray-200 bg-white text-gray-700 hover:bg-red-50"}`}>
                {label}
              </button>
            ))}
          </div>
        </aside>
        <main className="overflow-y-auto p-4">
          {loading ? <div className="grid h-96 place-items-center text-gray-500">Loading content...</div> : <div className="mx-auto max-w-5xl space-y-4">{renderEditor()}<PreviewPanel previewMode={previewMode} setPreviewMode={setPreviewMode} active={active} /><VersionHistoryPanel versions={versions} onRestore={restoreVersion} /><Panel title="Advanced JSON"><button onClick={() => setJsonOpen(!jsonOpen)} className="mb-3 rounded-lg border px-3 py-2 text-sm font-semibold">{jsonOpen ? "Hide JSON" : "Show JSON"}</button>{jsonOpen && <><textarea value={jsonValue} onChange={(e) => setJsonValue(e.target.value)} className="min-h-96 w-full rounded-xl bg-slate-950 p-4 font-mono text-sm text-white" /><button onClick={applyJson} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Apply JSON</button></>}</Panel></div>}
        </main>
      </div>
    </div>
  );
}

function TextListEditor({ title, items = [], onChange }) {
  return <ArrayEditor title={title} items={items.map((text) => ({ text }))} onChange={(next) => onChange(next.map((item) => item.text))} newItem={{ text: "" }} renderItem={(item, patch) => <Field label="Text" value={item.text} onChange={(v) => patch({ text: v })} textarea />} />;
}

function SectionSettingsEditor({ sections = {}, onChange }) {
  const keys = Object.keys(sections || {});
  if (!keys.length) return null;

  const update = (key, patch) => {
    onChange({
      ...sections,
      [key]: { ...(sections[key] || {}), ...patch },
    });
  };

  return (
    <Panel title="Section Settings">
      <div className="grid gap-4 md:grid-cols-2">
        {keys.map((key) => {
          const section = sections[key] || {};
          const label = key.replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
          return (
            <div key={key} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-gray-800">{label}</p>
                <input type="checkbox" checked={section.enabled !== false} onChange={(e) => update(key, { enabled: e.target.checked })} className="h-5 w-5 accent-red-600" />
              </div>
              <div className="grid gap-3">
                <Field label="Eyebrow" value={section.eyebrow} onChange={(v) => update(key, { eyebrow: v })} />
                <Field label="Heading" value={section.heading} onChange={(v) => update(key, { heading: v })} />
                <Field label="Description" value={section.description} onChange={(v) => update(key, { description: v })} textarea />
                <Field label="Display Order" type="number" value={section.order} onChange={(v) => update(key, { order: Number(v) || "" })} />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function RoomCardsEditor({ title, items = [], onChange }) {
  return <ArrayEditor title={title} items={items} onChange={onChange} newItem={{ title: "", hostel: "", category: "", capacity: "", description: "", amenities: [], image: "", enabled: true }} renderItem={(item, patch) => <div className="grid gap-3 md:grid-cols-2"><Field label="Title" value={item.title} onChange={(v) => patch({ title: v })} /><Field label="Hostel / Category" value={item.hostel || item.category} onChange={(v) => patch({ hostel: v, category: v })} /><Field label="Capacity" value={item.capacity} onChange={(v) => patch({ capacity: v })} /><Field label="Description" value={item.description} onChange={(v) => patch({ description: v })} textarea /><Field label="Amenities (comma separated)" value={(item.amenities || []).join(", ")} onChange={(v) => patch({ amenities: v.split(",").map((x) => x.trim()).filter(Boolean) })} /><CmsImageUploader label="Room Image" folder="/public-guest-room/rooms" value={item.image || ""} onChange={(v) => patch({ image: v })} /></div>} />;
}

function RoomHierarchyEditor({ categories = [], onChange, showToast = () => {} }) {
  const [syncingHostels, setSyncingHostels] = useState(false);
  const newRoom = {
    id: "",
    name: "",
    subtitle: "",
    description: "",
    coverImage: "",
    amenities: [],
    details: [],
    buttonText: "",
    buttonUrl: "",
    enabled: true,
    order: "",
  };

  const syncFromHostels = async () => {
    try {
      setSyncingHostels(true);
      const res = await fetch(`${BACKEND_URL}/api/hostels/all`, {
        headers: headers(),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Failed to load hostels");

      const activeHostels = (data.hostels || []).filter((hostel) => hostel.active !== false);
      const byIdOrTitle = new Map();
      categories.forEach((category) => {
        const key = String(category.id || category._id || category.title || category.name || "").trim();
        if (key) byIdOrTitle.set(key, category);
      });

      const nextCategories = activeHostels.map((hostel, hostelIndex) => {
        const hostelId = String(hostel._id || slugify(hostel.name));
        const existingCategory =
          byIdOrTitle.get(hostelId) ||
          byIdOrTitle.get(hostel.name) ||
          categories.find((category) => String(category.title || category.name || "").trim() === hostel.name);

        const existingRooms = existingCategory?.rooms || [];
        const roomLookup = new Map();
        existingRooms.forEach((room) => {
          [room.id, room._id, room.name, room.title, room.roomNo].filter(Boolean).forEach((key) => {
            roomLookup.set(String(key), room);
          });
        });

        const rooms = (hostel.rooms || []).map((room, roomIndex) => {
          const roomId = String(room._id || `${hostelId}-${slugify(room.roomNo || room.name || `room-${roomIndex + 1}`)}`);
          const roomName = room.roomNo || room.name || room.title || `Guest Room ${roomIndex + 1}`;
          const existingRoom = roomLookup.get(roomId) || roomLookup.get(roomName);
          return {
            id: roomId,
            name: roomName,
            title: roomName,
            subtitle: existingRoom?.subtitle || room.roomType || "Guest Room",
            description: existingRoom?.description || "",
            coverImage: existingRoom?.coverImage || existingRoom?.image || "",
            amenities: existingRoom?.amenities || [],
            details: existingRoom?.details?.length
              ? existingRoom.details
              : [
                  { label: "Capacity", value: room.guestCapacity ? `${room.guestCapacity} Guest(s)` : "", enabled: Boolean(room.guestCapacity), order: 1 },
                  { label: "Type", value: room.roomType || "", enabled: Boolean(room.roomType), order: 2 },
                ].filter((detail) => detail.value),
            buttonText: existingRoom?.buttonText || "Book Now",
            buttonUrl: existingRoom?.buttonUrl || "/guest-room/booking",
            enabled: existingRoom?.enabled ?? room.guestRoom !== false,
            order: existingRoom?.order || roomIndex + 1,
          };
        });

        return {
          id: hostelId,
          title: hostel.name,
          name: hostel.name,
          subtitle: existingCategory?.subtitle || "Hostel Guest Rooms",
          description: existingCategory?.description || "",
          coverImage: existingCategory?.coverImage || existingCategory?.image || "",
          images: existingCategory?.images || existingCategory?.gallery || [],
          enabled: existingCategory?.enabled ?? true,
          order: existingCategory?.order || hostelIndex + 1,
          rooms,
        };
      });

      const activeIds = new Set(nextCategories.map((category) => String(category.id)));
      const customCategories = categories.filter((category) => {
        const key = String(category.id || "").trim();
        const title = String(category.title || category.name || "").trim();
        return (!key || !activeIds.has(key)) && !activeHostels.some((hostel) => hostel.name === title);
      });

      onChange([...nextCategories, ...customCategories]);
      showToast(`Synced ${nextCategories.length} hostel category item(s) from Manage Hostels`, "success");
    } catch (err) {
      showToast(err.message || "Failed to sync hostels", "error");
    } finally {
      setSyncingHostels(false);
    }
  };

  return (
    <Panel title="Room Categories / Hostels">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3">
        <div>
          <p className="text-sm font-bold text-blue-900">Create hostel categories from Manage Hostels</p>
          <p className="text-xs text-blue-700">This adds one CMS item per active hostel and includes that hostel&apos;s guest rooms. Existing images, descriptions, gallery and details are preserved.</p>
        </div>
        <button
          type="button"
          onClick={syncFromHostels}
          disabled={syncingHostels}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={syncingHostels ? "animate-spin" : ""} />
          {syncingHostels ? "Syncing..." : "Sync from Manage Hostels"}
        </button>
      </div>
      <ArrayEditor
        title="Hostel / Category Items"
        items={categories}
        onChange={onChange}
        newItem={{ id: "", title: "", subtitle: "", description: "", coverImage: "", images: [], enabled: true, order: "", rooms: [] }}
        renderItem={(category, patch) => (
          <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <ToggleField label="Enabled" checked={category.enabled !== false} onChange={(v) => patch({ enabled: v })} />
              <Field label="Display Order" type="number" value={category.order} onChange={(v) => patch({ order: Number(v) || "" })} />
              <Field label="Category ID" value={category.id} onChange={(v) => patch({ id: v })} />
              <Field label="Category / Hostel Name" value={category.title || category.name} onChange={(v) => patch({ title: v, name: v })} />
              <Field label="Subtitle" value={category.subtitle} onChange={(v) => patch({ subtitle: v })} />
              <Field label="Description" value={category.description} onChange={(v) => patch({ description: v })} textarea />
              <CmsImageUploader label="Cover Image" folder="/public-guest-room/rooms" value={category.coverImage || ""} onChange={(v) => patch({ coverImage: v })} />
            </div>
            <ArrayEditor
              title="Hostel Gallery Pictures"
              items={category.images || category.gallery || []}
              onChange={(images) => patch({ images, gallery: images })}
              newItem={{ image: "", caption: "", enabled: true, order: "" }}
              renderItem={(image, imagePatch) => (
                <div className="grid gap-3 md:grid-cols-2">
                  <ToggleField label="Enabled" checked={image.enabled !== false} onChange={(v) => imagePatch({ enabled: v })} />
                  <Field label="Display Order" type="number" value={image.order} onChange={(v) => imagePatch({ order: Number(v) || "" })} />
                  <Field label="Caption" value={image.caption || image.title} onChange={(v) => imagePatch({ caption: v, title: v })} />
                  <CmsImageUploader label="Gallery Image" folder="/public-guest-room/rooms" value={image.image || ""} onChange={(v) => imagePatch({ image: v })} />
                </div>
              )}
            />
            <RoomListEditor rooms={category.rooms || []} onChange={(rooms) => patch({ rooms })} newRoom={newRoom} />
          </div>
        )}
      />
    </Panel>
  );
}

function RoomListEditor({ rooms = [], onChange, newRoom }) {
  return (
    <ArrayEditor
      title="Guest Rooms"
      items={rooms}
      onChange={onChange}
      newItem={newRoom}
      renderItem={(room, patch) => (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <ToggleField label="Enabled" checked={room.enabled !== false} onChange={(v) => patch({ enabled: v })} />
            <Field label="Display Order" type="number" value={room.order} onChange={(v) => patch({ order: Number(v) || "" })} />
            <Field label="Room ID" value={room.id} onChange={(v) => patch({ id: v })} />
            <Field label="Room Name" value={room.name || room.title} onChange={(v) => patch({ name: v, title: v })} />
            <Field label="Subtitle" value={room.subtitle} onChange={(v) => patch({ subtitle: v })} />
            <Field label="Description" value={room.description} onChange={(v) => patch({ description: v })} textarea />
            <Field label="Amenities (comma separated)" value={(room.amenities || []).join(", ")} onChange={(v) => patch({ amenities: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
            <Field label="Button Text" value={room.buttonText} onChange={(v) => patch({ buttonText: v })} />
            <Field label="Button URL" value={room.buttonUrl} onChange={(v) => patch({ buttonUrl: v })} />
            <CmsImageUploader label="Cover Image" folder="/public-guest-room/rooms" value={room.coverImage || ""} onChange={(v) => patch({ coverImage: v })} />
          </div>
          <ArrayEditor
            title="Room Details"
            items={room.details || []}
            onChange={(details) => patch({ details })}
            newItem={{ label: "", value: "", enabled: true, order: "" }}
            renderItem={(detail, detailPatch) => (
              <div className="grid gap-3 md:grid-cols-2">
                <ToggleField label="Enabled" checked={detail.enabled !== false} onChange={(v) => detailPatch({ enabled: v })} />
                <Field label="Display Order" type="number" value={detail.order} onChange={(v) => detailPatch({ order: Number(v) || "" })} />
                <Field label="Label" value={detail.label} onChange={(v) => detailPatch({ label: v })} />
                <Field label="Value" value={detail.value} onChange={(v) => detailPatch({ value: v })} />
              </div>
            )}
          />
        </div>
      )}
    />
  );
}

function TariffEditor({ rows = [], onChange }) {
  return <ArrayEditor title="Tariff Rows" items={rows.map((row) => ({ category: row[0], tariff: row[1] }))} onChange={(next) => onChange(next.map((item) => [item.category, item.tariff]))} newItem={{ category: "", tariff: "" }} renderItem={(item, patch) => <div className="grid gap-3 md:grid-cols-2"><Field label="Category" value={item.category} onChange={(v) => patch({ category: v })} /><Field label="Tariff" value={item.tariff} onChange={(v) => patch({ tariff: v })} /></div>} />;
}

function GalleryEditor({ allCategoryLabel, onAllCategoryLabel, images, categories, onImages, onCategories }) {
  return <><Panel title="Gallery Filters"><Field label="All Category Label" value={allCategoryLabel} onChange={onAllCategoryLabel} /></Panel><TextListEditor title="Categories" items={categories} onChange={onCategories} /><ArrayEditor title="Gallery Images" items={images} onChange={onImages} newItem={{ title: "", category: "", description: "", image: "" }} renderItem={(item, patch) => <div className="grid gap-3 md:grid-cols-2"><Field label="Title" value={item.title} onChange={(v) => patch({ title: v })} /><Field label="Category" value={item.category} onChange={(v) => patch({ category: v })} /><Field label="Description" value={item.description} onChange={(v) => patch({ description: v })} textarea /><CmsImageUploader label="Gallery Image" folder="/public-guest-room/gallery" value={item.image || ""} onChange={(v) => patch({ image: v })} /></div>} /></>;
}

function LinksEditor({ title, items, onChange }) {
  return <ArrayEditor title={title} items={items} onChange={onChange} newItem={{ label: "", href: "" }} renderItem={(item, patch) => <div className="grid gap-3 md:grid-cols-2"><Field label="Label" value={item.label} onChange={(v) => patch({ label: v })} /><Field label="Link" value={item.href} onChange={(v) => patch({ href: v })} /></div>} />;
}

function FooterEditor({ draft, setPath }) {
  return <><Panel title="Footer"><div className="grid gap-4 md:grid-cols-2"><CmsImageUploader label="Footer Logo" folder="/public-guest-room/footer" value={draft.logo || ""} onChange={(v) => setPath(["logo"], v)} /><Field label="Description" value={draft.description} onChange={(v) => setPath(["description"], v)} textarea /><Field label="Map URL / Google Maps Share Link" value={draft.mapUrl} onChange={(v) => setPath(["mapUrl"], v)} /><Field label="Quick Contact" value={draft.quickContact} onChange={(v) => setPath(["quickContact"], v)} /><Field label="Copyright Text" value={draft.copyrightText} onChange={(v) => setPath(["copyrightText"], v)} /></div></Panel><LinksEditor title="Footer Quick Links" items={draft.quickLinks || []} onChange={(v) => setPath(["quickLinks"], v)} /><Panel title="Social Links"><div className="grid gap-4 md:grid-cols-2">{["instagram", "snapchat", "twitter", "facebook", "youtube"].map((key) => <Field key={key} label={key} value={draft.socialLinks?.[key]} onChange={(v) => setPath(["socialLinks", key], v)} />)}</div></Panel></>;
}

function BankEditor({ draft, setPath }) {
  return <Panel title="Bank Details"><div className="grid gap-4 md:grid-cols-2">{["accountName", "accountNumber", "ifsc", "bankName", "branch"].map((key) => <Field key={key} label={key} value={draft[key]} onChange={(v) => setPath([key], v)} />)}<Field label="Instructions" value={draft.instructions} onChange={(v) => setPath(["instructions"], v)} textarea /></div></Panel>;
}

function ThemeEditor({ draft, setPath }) {
  return <Panel title="Public Website Theme"><div className="grid gap-4 md:grid-cols-2"><Field label="Background Style" value={draft.backgroundStyle} onChange={(v) => setPath(["backgroundStyle"], v)} /><Field label="Primary Color" type="color" value={draft.primaryColor || "#a8323e"} onChange={(v) => setPath(["primaryColor"], v)} /><Field label="Accent Color" type="color" value={draft.accentColor || "#14385f"} onChange={(v) => setPath(["accentColor"], v)} /><Field label="Heading Font Style" value={draft.headingFontStyle} onChange={(v) => setPath(["headingFontStyle"], v)} /><Field label="Body Font Style" value={draft.bodyFontStyle} onChange={(v) => setPath(["bodyFontStyle"], v)} /><Field label="Button Roundness" value={draft.buttonRoundness} onChange={(v) => setPath(["buttonRoundness"], v)} /></div></Panel>;
}

function PreviewPanel({ previewMode, setPreviewMode, active }) {
  const paths = {
    home: "/guest-room",
    about: "/guest-room/about",
    rooms: "/guest-room/rooms",
    tariff: "/guest-room/tariff",
    dining: "/guest-room/dining",
    facilities: "/guest-room/facilities",
    gallery: "/guest-room/gallery",
    booking: "/guest-room/booking",
    contact: "/guest-room/contact",
  };
  const sizes = { desktop: "100%", tablet: "768px", mobile: "390px" };

  return (
    <Panel title="Live Preview">
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["desktop", Monitor, "Desktop"],
          ["tablet", Monitor, "Tablet"],
          ["mobile", Smartphone, "Mobile"],
        ].map(([key, Icon, label]) => (
          <button key={key} type="button" onClick={() => setPreviewMode(key)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold ${previewMode === key ? "border-red-300 bg-red-50 text-red-700" : "border-gray-200 text-gray-700"}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      <div className="overflow-auto rounded-2xl border border-gray-200 bg-gray-100 p-3">
        <iframe title="Website preview" src={`${paths[active] || "/guest-room"}?cmsPreview=1`} className="mx-auto h-[520px] rounded-xl bg-white shadow" style={{ width: sizes[previewMode] || "100%", maxWidth: "100%" }} />
      </div>
      <p className="mt-2 text-xs text-gray-500">Preview reads the current draft from this browser. Publish changes to update the live website.</p>
    </Panel>
  );
}

function VersionHistoryPanel({ versions = [], onRestore }) {
  return (
    <Panel title="Version History">
      {versions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">No published versions saved yet.</div>
      ) : (
        <div className="space-y-3">
          {versions.map((version) => (
            <div key={version._id} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 text-sm font-bold text-gray-800"><History size={16} /> {new Date(version.createdAt).toLocaleString()}</p>
                <p className="mt-1 text-xs text-gray-500">Saved before publish or restore.</p>
              </div>
              <button type="button" onClick={() => onRestore(version._id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">
                Restore
              </button>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
