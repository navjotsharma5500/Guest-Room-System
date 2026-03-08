//AttachmentGrid.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X, Download, Printer } from "lucide-react";

export default function AttachmentGrid({ files = [], theme }) {
  const [lightbox, setLightbox] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [failedPreviewIds, setFailedPreviewIds] = useState(() => new Set());
  const [mimeHints, setMimeHints] = useState({});
  
  const prevFilesRef = useRef(null);
  const resolvedFilesCache = useRef([]);

  useEffect(() => {
    if (lightbox) {
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;

      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.paddingRight = "";
    };
  }, [lightbox]);

  const resolvedFiles = useMemo(() => {
    const filesChanged = !prevFilesRef.current || 
      prevFilesRef.current.length !== files.length ||
      files.some((f, i) => {
        const prevFile = prevFilesRef.current[i];
        if (f === prevFile) return false;
        if (typeof f === 'string' && typeof prevFile === 'string') {
          return f !== prevFile;
        }
        if ((f instanceof File || f instanceof Blob) && (prevFile instanceof File || prevFile instanceof Blob)) {
          return f.name !== prevFile.name || f.size !== prevFile.size;
        }
        return true;
      });
    
    if (!filesChanged && resolvedFilesCache.current.length > 0) {
      return resolvedFilesCache.current;
    }
    
    prevFilesRef.current = files;
    
    const processed = (files || [])
      .map((file, index) => {
        if (!file) return null;

        if (file instanceof File || file instanceof Blob) {
          return {
            id: `file-${index}-${file.name}-${file.size}`,
            name: file.name || "Attachment",
            url: URL.createObjectURL(file),
            isObjectUrl: true,
            type: file.type || "",
          };
        }

        if (typeof file === "string") {
          const fileName = file.split("/").pop() || `attachment-${index}`;
          return {
            id: `url-${index}-${fileName}-${file.length}`,
            name: fileName,
            url: file,
            isObjectUrl: false,
            type: file,
          };
        }

        if (typeof file === "object") {
          const resolvedUrl =
            file.url ||
            file.filePath ||
            file.path ||
            file.src ||
            "";
          if (!resolvedUrl) return null;
          const fileName =
            file.name ||
            file.fileName ||
            file.originalName ||
            String(resolvedUrl).split("/").pop() ||
            `attachment-${index}`;
          return {
            id: `obj-${index}-${file.fileId || fileName}-${resolvedUrl.length}`,
            name: fileName,
            url: resolvedUrl,
            isObjectUrl: false,
            type: file.type || resolvedUrl,
          };
        }

        return null;
      })
      .filter(Boolean);
    
    resolvedFilesCache.current = processed;
    return processed;
  }, [files]);

  useEffect(() => {
    return () => {
      resolvedFiles.forEach((f) => {
        if (f.isObjectUrl) {
          URL.revokeObjectURL(f.url);
        }
      });
    };
  }, [resolvedFiles]);

  useEffect(() => {
    const onEsc = (e) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  useEffect(() => {
    setFailedPreviewIds(new Set());
  }, [resolvedFiles]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const shouldProbe = (f) => {
      const url = String(f?.url || "").toLowerCase();
      if (!url.startsWith("http://") && !url.startsWith("https://")) return false;
      if (f?.isObjectUrl) return false;
      return true;
    };

    const probeMime = async (url) => {
      try {
        const head = await fetch(url, { method: "HEAD", signal: controller.signal });
        const headType = (head.headers.get("content-type") || "").toLowerCase();
        if (headType) return headType;
      } catch (_) {}

      try {
        const get = await fetch(url, {
          method: "GET",
          headers: { Range: "bytes=0-0" },
          signal: controller.signal,
        });
        return (get.headers.get("content-type") || "").toLowerCase();
      } catch (_) {
        return "";
      }
    };

    const run = async () => {
      const candidates = resolvedFiles.filter((f) => shouldProbe(f) && !mimeHints[f.id]);
      if (!candidates.length) return;

      const results = await Promise.all(
        candidates.map(async (f) => [f.id, await probeMime(f.url)])
      );

      if (cancelled) return;

      setMimeHints((prev) => {
        const next = { ...prev };
        let changed = false;

        for (const [id, mime] of results) {
          if (mime && prev[id] !== mime) {
            next[id] = mime;
            changed = true;
          }
        }

        return changed ? next : prev;
      });
    };

    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [resolvedFiles, mimeHints]);

  if (!resolvedFiles.length) return null;

  // Robust file type detection (supports ImageKit URLs with query params/transforms)
  const getCleanPath = (value = "") => {
    const raw = String(value || "");
    try {
      const u = new URL(raw, window.location.origin);
      return String(u.pathname || "").toLowerCase();
    } catch {
      return raw.split("?")[0].split("#")[0].toLowerCase();
    }
  };

  const getExt = (value = "") => {
    const cleaned = getCleanPath(value);
    const last = cleaned.split("/").pop() || "";
    const dot = last.lastIndexOf(".");
    if (dot < 0) return "";
    return last.slice(dot + 1).toLowerCase();
  };

  const isPDF = (f) => {
    const nameExt = getExt(f.name || "");
    const urlExt = getExt(f.url || "");
    const type = String(f.type || "").toLowerCase();
    const hintedType = String(mimeHints[f.id] || "").toLowerCase();
    const url = String(f.url || "").toLowerCase();

    return (
      hintedType.includes("application/pdf") ||
      type.includes("application/pdf") ||
      nameExt === "pdf" ||
      urlExt === "pdf" ||
      url.includes(".pdf") ||
      url.includes("/pdf/")
    );
  };

  const isImage = (f) => {
    if (isPDF(f)) return false;

    const imageExts = new Set([
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "svg",
      "bmp",
      "ico",
      "heic",
      "heif",
      "avif",
    ]);

    const nameExt = getExt(f.name || "");
    const urlExt = getExt(f.url || "");
    const type = String(f.type || "").toLowerCase();
    const hintedType = String(mimeHints[f.id] || "").toLowerCase();
    const url = String(f.url || "").toLowerCase();

    if (url.startsWith("data:image")) return true;
    if (hintedType.startsWith("image/")) return true;
    if (type.startsWith("image/")) return true;
    if (imageExts.has(nameExt)) return true;
    if (imageExts.has(urlExt)) return true;
    return false;
  };

  const isLikelyImageUrl = (f) => {
    if (isPDF(f) || isImage(f)) return isImage(f);

    const url = String(f.url || "").toLowerCase();
    if (!url || !(url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:image"))) {
      return false;
    }

    const ext = getExt(url);
    const nonImageExts = new Set([
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
      "csv",
      "zip",
      "rar",
      "7z",
    ]);

    if (ext && nonImageExts.has(ext)) return false;
    if (url.includes("ik.imagekit.io")) return true;
    return ext !== "";
  };

  const shouldRenderAsImage = (f) =>
    !failedPreviewIds.has(f.id) && (isImage(f) || isLikelyImageUrl(f));

  const canOpenPreview = (f) => isPDF(f) || shouldRenderAsImage(f);

  const handleDownload = async (file) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      
      const blobUrl = window.URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = blobUrl;
      a.download = file.name || "attachment";
      
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
    } catch (error) {
      console.error("Download failed:", error);
      const a = document.createElement("a");
      a.href = file.url;
      a.download = file.name || "attachment";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handlePrint = (url) => {
    const existingFrame = document.getElementById('print-frame');
    if (existingFrame) {
      existingFrame.remove();
    }

    const iframe = document.createElement('iframe');
    iframe.id = 'print-frame';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            img {
              max-width: 100%;
              max-height: 100vh;
              object-fit: contain;
            }
            @media print {
              @page {
                margin: 0;
              }
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <img src="${url}" />
        </body>
      </html>
    `);
    iframeDoc.close();
    
    iframe.onload = () => {
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        
        setTimeout(() => {
          iframe.remove();
        }, 1000);
      }, 250);
    };
  };

  return (
    <>
      {/* ===== GRID ===== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {resolvedFiles.map((f) => (
          <motion.div
            key={f.id}
            layout="preserve"
            initial={false}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2 }}
            className={`rounded-xl border p-3 shadow-sm cursor-pointer transition ${
              theme === "dark"
                ? "bg-gray-700 border-gray-600 hover:bg-gray-600"
                : "bg-white border-gray-200 hover:bg-gray-50"
            }`}
            onClick={() => canOpenPreview(f) && setLightbox(f)}
          >
            {shouldRenderAsImage(f) ? (
              <img
                src={f.url}
                alt={f.name}
                className="w-full h-28 object-contain rounded bg-white"
                loading="lazy"
                draggable={false}
                onError={() => {
                  setFailedPreviewIds((prev) => {
                    const next = new Set(prev);
                    next.add(f.id);
                    return next;
                  });
                }}
              />
            ) : isPDF(f) ? (
              <div className="w-full h-28 flex flex-col items-center justify-center bg-red-50 rounded">
                <FileText size={30} className="text-red-600 mb-2" />
                <p className="text-xs text-red-700 font-medium">PDF</p>
                <p className="text-xs text-gray-600 text-center truncate w-full px-2 mt-1">
                  {f.name}
                </p>
              </div>
            ) : (
              <div className="w-full h-28 flex flex-col items-center justify-center bg-gray-100 rounded">
                <FileText size={30} className="text-gray-600 mb-2" />
                <p className="text-xs text-gray-600 text-center truncate w-full px-2">
                  {f.name}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* ===== LIGHTBOX ===== */}
      {lightbox && createPortal(
        <AnimatePresence>
          <motion.div
            className="fixed inset-0 bg-black/90 z-[9999] flex items-center justify-center"
            style={{ isolation: 'isolate' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightbox(null)}
          >
            <motion.div
              className="relative bg-black/60 p-4 rounded-2xl max-w-[92vw] max-h-[92vh]"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* CLOSE BUTTON */}
              <button
                onClick={() => setLightbox(null)}
                className="absolute top-3 right-3 bg-white hover:bg-gray-100 rounded-full p-2 shadow-lg transition z-10"
                title="Close (ESC)"
              >
                <X size={20} className="text-gray-700" />
              </button>

              {/* ACTION BUTTONS */}
              <div className="absolute top-3 left-3 flex gap-2 z-10">
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const btn = e.currentTarget;
                    const originalText = btn.innerHTML;
                    
                    btn.innerHTML = '<span class="text-gray-700">Downloading...</span>';
                    btn.disabled = true;
                    
                    await handleDownload(lightbox);
                    
                    btn.innerHTML = '<span class="text-green-600">Ã¢Å“â€œ Downloaded</span>';
                    
                    setTimeout(() => {
                      btn.innerHTML = originalText;
                      btn.disabled = false;
                    }, 2000);
                  }}
                  className="bg-white hover:bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download attachment"
                >
                  <Download size={16} className="text-blue-600" />
                  <span className="text-gray-700">Download</span>
                </button>

                {isImage(lightbox) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const btn = e.currentTarget;
                      const originalText = btn.innerHTML;
                      
                      btn.innerHTML = '<span class="text-gray-700">Opening print...</span>';
                      btn.disabled = true;
                      
                      handlePrint(lightbox.url);
                      
                      setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.disabled = false;
                      }, 1000);
                    }}
                    className="bg-white hover:bg-gray-100 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Print (Opens print dialog)"
                  >
                    <Printer size={16} className="text-green-600" />
                    <span className="text-gray-700">Print</span>
                  </button>
                )}
              </div>

              {/* CONTENT DISPLAY */}
              {isPDF(lightbox) ? (
                <iframe
                  src={lightbox.url}
                  title={lightbox.name}
                  className="max-h-[85vh] max-w-[90vw] rounded-xl bg-white"
                  style={{ width: '90vw', height: '85vh' }}
                />
              ) : (
                <div className="relative">
                  {imageLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                      <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
                    </div>
                  )}
                  <img
                    src={lightbox.url}
                    alt={lightbox.name}
                    className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl"
                    onLoadStart={() => setImageLoading(true)}
                    onLoad={() => setImageLoading(false)}
                    onError={(e) => {
                      setImageLoading(false);
                      console.error("Failed to load lightbox image:", lightbox.url);
                      e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%239ca3af' font-size='18'%3EFailed to load image%3C/text%3E%3C/svg%3E";
                    }}
                  />
                </div>
              )}

              {/* FILE NAME */}
              <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 bg-white/90 px-4 py-2 rounded-lg shadow-lg max-w-[80vw]">
                <p className="text-sm font-medium text-gray-700 text-center truncate">
                  {lightbox.name}
                </p>
              </div>
            </motion.div>

            {/* ESC HINT */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 text-white text-sm opacity-70">
              Press <kbd className="px-2 py-1 bg-white/20 rounded">ESC</kbd> to close
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
