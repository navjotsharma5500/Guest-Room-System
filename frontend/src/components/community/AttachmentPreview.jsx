// components/community/AttachmentPreview.jsx
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ZoomIn, X, ExternalLink } from "lucide-react";

export default function AttachmentPreview({ url, type, fileName }) {
  const [lightbox, setLightbox] = useState(false);

  if (!url && type !== "pdf") return null;

  /* ── PDF ── */
  if (type === "pdf") {
    return (
      <div style={{ display:"flex", alignItems:"center", gap:12, background:"#f8fafc",
                    border:"1.5px solid #e2e8f0", borderRadius:12, padding:"14px 16px" }}>
        <div style={{ width:40, height:40, borderRadius:10, background:"#fef2f2",
                      display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <FileText size={20} color="#dc2626"/>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ fontWeight:600, fontSize:13.5, color:"#111", margin:0,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
            {fileName || "Attached PDF"}
          </p>
          <p style={{ fontSize:12, color:"#6b7280", margin:"2px 0 0" }}>PDF Document</p>
        </div>
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            style={{ display:"flex", alignItems:"center", gap:5, padding:"7px 14px",
                     background:"#dc2626", color:"#fff", borderRadius:8, textDecoration:"none",
                     fontSize:13, fontWeight:600, flexShrink:0 }}>
            <ExternalLink size={13}/> Open
          </a>
        )}
      </div>
    );
  }

  /* ── Image ── */
  return (
    <>
      <div style={{ position:"relative", borderRadius:12, overflow:"hidden",
                    cursor:"pointer", maxHeight:400 }}
        onClick={() => setLightbox(true)}>
        <img src={url} alt="Post attachment" loading="lazy"
          style={{ width:"100%", maxHeight:400, objectFit:"cover",
                   display:"block", transition:"transform .3s" }}
          onMouseEnter={e => e.target.style.transform="scale(1.02)"}
          onMouseLeave={e => e.target.style.transform="scale(1)"}/>
        <div style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,.5)",
                      borderRadius:8, padding:"5px 8px", display:"flex", alignItems:"center",
                      gap:4 }}>
          <ZoomIn size={12} color="#fff"/>
          <span style={{ fontSize:11, color:"#fff", fontWeight:500 }}>View</span>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={() => setLightbox(false)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.9)", zIndex:900,
                     display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
            <button onClick={() => setLightbox(false)}
              style={{ position:"fixed", top:16, right:16, background:"rgba(255,255,255,.15)",
                       border:"none", cursor:"pointer", borderRadius:"50%",
                       width:38, height:38, display:"flex", alignItems:"center",
                       justifyContent:"center" }}>
              <X size={18} color="#fff"/>
            </button>
            <motion.img
              initial={{ scale:.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
              exit={{ scale:.9, opacity:0 }}
              src={url} alt="Full view"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth:"90vw", maxHeight:"90vh", objectFit:"contain",
                       borderRadius:12, boxShadow:"0 32px 80px rgba(0,0,0,.5)" }}/>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}