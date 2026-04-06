// components/community/CreatePostModal.jsx
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import AttachmentPreview from "./AttachmentPreview";
import {
  IMAGEKIT_PUBLIC_KEY,
  IMAGEKIT_URL_ENDPOINT,
  IMAGEKIT_AUTH_ENDPOINT,
} from "../../utils/apiConfig";

const BACKEND = "";
const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES  = ["image/png","image/jpeg","image/webp","application/pdf"];
const CATEGORIES     = ["Suggestion","Feedback","Issue","Question"];

function FieldLabel({ children, required }) {
  return (
    <label style={{ fontSize:12.5, fontWeight:600, color:"#374151",
                    textTransform:"uppercase", letterSpacing:".06em",
                    marginBottom:5, display:"block" }}>
      {children}{required && <span style={{ color:"#dc2626" }}> *</span>}
    </label>
  );
}

function Input({ ...props }) {
  return (
    <input {...props}
      style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #e5e7eb",
               borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none",
               background:"#fff", transition:"border-color .2s",
               ...(props.style || {}) }}
      onFocus={e => { e.target.style.borderColor="#4ade80"; props.onFocus?.(e); }}
      onBlur={e  => { e.target.style.borderColor="#e5e7eb"; props.onBlur?.(e);  }}
    />
  );
}

function Textarea({ ...props }) {
  return (
    <textarea {...props}
      style={{ width:"100%", padding:"10px 14px", border:"1.5px solid #e5e7eb",
               borderRadius:10, fontSize:14, fontFamily:"inherit", outline:"none",
               background:"#fff", resize:"vertical", transition:"border-color .2s",
               ...(props.style || {}) }}
      onFocus={e => { e.target.style.borderColor="#4ade80"; props.onFocus?.(e); }}
      onBlur={e  => { e.target.style.borderColor="#e5e7eb"; props.onBlur?.(e);  }}
    />
  );
}

/* ── ImageKit direct upload ── */
async function uploadToImageKit(file) {
  /* 1. Get auth params from backend */
  const authRes  = await fetch(IMAGEKIT_AUTH_ENDPOINT);
  const authData = await authRes.json();
  if (!authData.signature) throw new Error("Auth failed");

  /* 2. Build multipart form */
  const form = new FormData();
  form.append("file", file);
  form.append("fileName", `community_${Date.now()}_${file.name}`);
  form.append("publicKey", IMAGEKIT_PUBLIC_KEY);
  form.append("signature", authData.signature);
  form.append("expire",    authData.expire);
  form.append("token",     authData.token);
  form.append("folder",    "/community");

  /* 3. Upload directly to ImageKit */
  const uploadRes = await fetch(`https://upload.imagekit.io/api/v1/files/upload`, {
    method:"POST", body:form,
  });
  const uploadData = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(uploadData.message || "Upload failed");
  return uploadData.url;
}

export default function CreatePostModal({ user, token, onClose, onCreated }) {
  const [form, setForm] = useState({
    name:    user.name  || "",
    email:   user.email || "",
    contact: "",
    title:   "",
    description: "",
    category: "Suggestion",
  });
  const [file,         setFile]         = useState(null);
  const [preview,      setPreview]      = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const fileRef = useRef(null);

  function set(key, val) { setForm(f => ({ ...f, [key]:val })); }

  function handleFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      setError("Only PNG, JPG, WebP and PDF files are allowed."); return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError("File must be under 10 MB."); return;
    }
    setError("");
    setFile(f);
    if (f.type.startsWith("image/")) {
      setPreview({ url: URL.createObjectURL(f), type:"image" });
    } else {
      setPreview({ url: null, type:"pdf", name: f.name });
    }
  }

  function removeFile() {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit() {
    setError("");
    /* Validate */
    if (!form.title.trim())       { setError("Title is required."); return; }
    if (!form.email.endsWith("@thapar.edu")) {
      setError("Only @thapar.edu emails are allowed."); return;
    }
    if (!form.category)           { setError("Pick a category."); return; }

    setSubmitting(true);
    try {
      let attachmentUrl  = "";
      let attachmentType = "";

      if (file) {
        setUploading(true);
        attachmentUrl  = await uploadToImageKit(file);
        attachmentType = file.type.startsWith("image/") ? "image" : "pdf";
        setUploading(false);
      }

      const res = await fetch(`${BACKEND}/api/community/posts`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({
          name:        form.name.trim(),
          email:       form.email.trim(),
          contact:     form.contact.trim(),
          title:       form.title.trim(),
          description: form.description.trim(),
          category:    form.category,
          attachmentUrl,
          attachmentType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create post");
      onCreated(data.post);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      onClick={onClose}
      style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:600,
               display:"flex", alignItems:"center", justifyContent:"center",
               padding:16, overflowY:"auto" }}>
      <motion.div initial={{ scale:.93, opacity:0 }} animate={{ scale:1, opacity:1 }}
        exit={{ scale:.93, opacity:0 }} transition={{ type:"spring", damping:22 }}
        onClick={e => e.stopPropagation()}
        style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:560,
                 padding:32, position:"relative", boxShadow:"0 24px 60px rgba(0,0,0,.2)",
                 maxHeight:"90vh", overflowY:"auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:24 }}>
          <h2 style={{ fontFamily:"'EB Garamond',Georgia,serif", fontSize:24, fontWeight:700, color:"#111" }}>
            Create Post
          </h2>
          <button onClick={onClose}
            style={{ background:"none", border:"none", cursor:"pointer", padding:6, borderRadius:8 }}>
            <X size={18} color="#6b7280"/>
          </button>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
              style={{ display:"flex", alignItems:"center", gap:8, background:"#fef2f2",
                       border:"1px solid #fecaca", borderRadius:10, padding:"10px 14px", marginBottom:16 }}>
              <AlertCircle size={15} color="#dc2626"/>
              <span style={{ fontSize:13, color:"#dc2626" }}>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Name */}
          <div>
            <FieldLabel>Name</FieldLabel>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Your name"/>
          </div>

          {/* Email (readonly) */}
          <div>
            <FieldLabel required>Email</FieldLabel>
            <Input value={form.email} readOnly
              style={{ background:"#f9fafb", color:"#6b7280", cursor:"default" }}/>
            <p style={{ fontSize:11.5, color:"#9ca3af", marginTop:4 }}>Auto-filled from your Google account</p>
          </div>

          {/* Contact */}
          <div>
            <FieldLabel>Contact Number</FieldLabel>
            <Input value={form.contact} onChange={e => set("contact", e.target.value)}
              placeholder="+91 XXXXX XXXXX" type="tel"/>
          </div>

          {/* Category */}
          <div>
            <FieldLabel required>Category</FieldLabel>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => set("category", c)}
                  style={{ padding:"7px 16px", border:"1.5px solid",
                           borderColor:form.category===c?"#4ade80":"#e5e7eb",
                           background:form.category===c?"#f0fdf4":"#fff",
                           color:form.category===c?"#166534":"#4b5563",
                           borderRadius:20, fontSize:13, fontWeight:form.category===c?600:400,
                           cursor:"pointer", fontFamily:"inherit", transition:"all .15s" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <FieldLabel required>Title</FieldLabel>
            <Input value={form.title} onChange={e => set("title", e.target.value)}
              placeholder="Brief, descriptive title"/>
          </div>

          {/* Description */}
          <div>
            <FieldLabel>Description</FieldLabel>
            <Textarea value={form.description} onChange={e => set("description", e.target.value)}
              placeholder="Provide details…" rows={4}/>
          </div>

          {/* Attachment */}
          <div>
            <FieldLabel>Attachment (Image or PDF)</FieldLabel>
            {preview ? (
              <div style={{ position:"relative" }}>
                <AttachmentPreview
                  url={preview.url}
                  type={preview.type}
                  fileName={preview.name}
                />
                <button onClick={removeFile}
                  style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,.6)",
                           border:"none", cursor:"pointer", borderRadius:"50%",
                           width:26, height:26, display:"flex", alignItems:"center",
                           justifyContent:"center" }}>
                  <X size={13} color="#fff"/>
                </button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                style={{ border:"2px dashed #d1d5db", borderRadius:12, padding:"28px 20px",
                         textAlign:"center", cursor:"pointer", transition:"border-color .2s, background .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor="#4ade80"; e.currentTarget.style.background="#f0fdf4"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor="#d1d5db"; e.currentTarget.style.background="#fff"; }}>
                <Upload size={22} color="#9ca3af" style={{ margin:"0 auto 8px" }}/>
                <p style={{ fontSize:14, color:"#6b7280", margin:0 }}>
                  Click to upload · PNG, JPG, WebP, PDF
                </p>
                <p style={{ fontSize:12, color:"#9ca3af", marginTop:4 }}>Max 10 MB</p>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,application/pdf"
              onChange={handleFile} style={{ display:"none" }}/>
          </div>
        </div>

        {/* Submit */}
        <div style={{ marginTop:24, display:"flex", gap:10, justifyContent:"flex-end" }}>
          <button onClick={onClose}
            style={{ padding:"10px 20px", border:"1.5px solid #d1d5db", borderRadius:10,
                     background:"none", color:"#374151", fontSize:14, fontWeight:500,
                     cursor:"pointer", fontFamily:"inherit" }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={submitting}
            style={{ display:"flex", alignItems:"center", gap:7, padding:"10px 24px",
                     background:submitting?"#9ca3af":"#2e7d32", color:"#fff",
                     border:"none", borderRadius:10, fontSize:14, fontWeight:600,
                     cursor:submitting?"not-allowed":"pointer", fontFamily:"inherit",
                     transition:"background .15s" }}>
            {submitting ? (
              <><motion.div animate={{ rotate:360 }} transition={{ repeat:Infinity, duration:.8, ease:"linear" }}
                style={{ width:14, height:14, border:"2px solid rgba(255,255,255,.4)",
                         borderTop:"2px solid #fff", borderRadius:"50%" }}/>
                {uploading ? "Uploading…" : "Publishing…"}</>
            ) : (
              <><CheckCircle2 size={15}/> Publish Post</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}