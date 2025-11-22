import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, X } from "lucide-react";

export default function AttachmentGrid({ files = [], theme }) {
  const [resolvedFiles, setResolvedFiles] = useState([]);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    const resolved = files.map((file) => {
      if (!file) return null;

      if (file instanceof File || file instanceof Blob) {
        const objectUrl = URL.createObjectURL(file);
        return {
          name: file.name || "Attachment",
          url: objectUrl,
          type: file.type || "",
        };
      }

      if (
        typeof file === "string" &&
        (file.startsWith("http") ||
          file.startsWith("data:") ||
          file.startsWith("blob:"))
      ) {
        return {
          name: file.split("/").pop(),
          url: file,
          type: "url",
        };
      }

      if (typeof file === "string") {
        const ext = file.split(".").pop().toLowerCase();
        const probablePath = `/attachments/${file}`;
        const storedBase64 = localStorage.getItem(`attachment_${file}`);

        return {
          name: file,
          url: storedBase64 || probablePath,
          type: ext,
        };
      }

      return null;
    });

    setResolvedFiles(resolved.filter(Boolean));
  }, [files]);

  if (!resolvedFiles.length) return null;

  const isImageFile = (fileObj) => {
    if (fileObj.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(fileObj.name)) {
      return true;
    }
    if (
      typeof fileObj.url === "string" &&
      fileObj.url.startsWith("data:image/")
    ) {
      return true;
    }
    if (fileObj.type && fileObj.type.startsWith("image/")) {
      return true;
    }
    return false;
  };

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {resolvedFiles.map((f, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.03 }}
            className={`flex flex-col items-center rounded-xl shadow-md p-3 border hover:shadow-lg transition cursor-pointer group ${
              theme === "dark"
                ? "bg-gray-700 border-gray-600"
                : "bg-white border-gray-200"
            }`}
            onClick={() => {
              if (isImageFile(f)) {
                setLightbox(f.url);
              } else {
                const newTab = window.open();
                if (!newTab) return;

                if (/\.pdf$/i.test(f.name)) {
                  newTab.location.href = f.url;
                } else {
                  newTab.document.write(`
                    <html>
                      <body style="background:#111;margin:0;display:flex;justify-content:center;align-items:center;height:100vh;">
                        <img src="${f.url}" style="max-width:95%;max-height:95%;border-radius:12px"/>
                      </body>
                    </html>
                  `);
                }
              }
            }}
          >
            {isImageFile(f) ? (
              <motion.img
                src={f.url}
                alt=""
                className="w-full h-28 object-contain rounded-md mb-2 bg-white"
                onError={(e) => {
                  e.target.src =
                    "https://cdn-icons-png.flaticon.com/512/337/337946.png";
                }}
              />
            ) : (
              <div
                className={`flex items-center justify-center w-full h-28 rounded-md mb-2 ${
                  theme === "dark"
                    ? "bg-gray-600 text-gray-300"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                <FileText size={28} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="fixed inset-0 bg-black/80 flex justify-center items-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="relative p-4 rounded-2xl shadow-2xl bg-black/60 flex flex-col justify-center items-center"
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
            >
              <button
                className="absolute top-4 right-4 bg-white/90 text-gray-700 rounded-full p-2 hover:bg-white transition"
                onClick={() => setLightbox(null)}
              >
                <X size={22} />
              </button>

              <motion.img
                src={lightbox}
                className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
