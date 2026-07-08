import React, { useRef, useState } from "react";
import { Check, Copy, ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  IMAGEKIT_AUTH_ENDPOINT,
  IMAGEKIT_PUBLIC_KEY,
} from "../../utils/apiConfig";

const uploadToImageKit = async (file, folder) => {
  const authRes = await fetch(IMAGEKIT_AUTH_ENDPOINT, {
    method: "GET",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!authRes.ok) throw new Error("ImageKit authentication failed");
  const auth = await authRes.json();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("fileName", file.name);
  formData.append("folder", folder);
  formData.append("publicKey", auth.publicKey || IMAGEKIT_PUBLIC_KEY);
  formData.append("signature", auth.signature);
  formData.append("expire", auth.expire);
  formData.append("token", auth.token);
  formData.append("useUniqueFileName", "true");

  const uploadRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
    method: "POST",
    body: formData,
  });
  const data = await uploadRes.json();
  if (!uploadRes.ok) throw new Error(data.message || "Image upload failed");
  return data.url;
};

export default function CmsImageUploader({ label = "Image", value = "", folder = "/public-guest-room/misc", onChange }) {
  const inputRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const onFile = async (file) => {
    if (!file) return;
    try {
      setLoading(true);
      setError("");
      const url = await uploadToImageKit(file, folder);
      onChange(url);
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {value && (
          <button type="button" onClick={() => onChange("")} className="rounded-lg p-2 text-red-600 hover:bg-red-50">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      {value && <img src={value} alt={label} className="mb-3 h-36 w-full rounded-xl object-cover" />}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Paste ImageKit / public image URL"
          className="min-w-0 flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-red-300"
        />
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <button type="button" onClick={() => inputRef.current?.click()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={16} /> : <ImagePlus size={16} />} Upload
        </button>
        <button type="button" onClick={copy} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
          {copied ? <Check size={16} /> : <Copy size={16} />} Copy
        </button>
      </div>
      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
