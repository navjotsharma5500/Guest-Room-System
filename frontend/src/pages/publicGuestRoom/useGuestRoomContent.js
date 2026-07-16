import { useEffect, useState } from "react";
import { BACKEND_URL } from "../../utils/apiConfig";
import { defaultGuestRoomContent, mergeGuestRoomContent } from "./defaultGuestRoomContent";

const CMS_PREVIEW_KEY = "guestRoomCmsPreview";

export default function useGuestRoomContent() {
  const [content, setContent] = useState(defaultGuestRoomContent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const isPreview = new URLSearchParams(window.location.search).get("cmsPreview") === "1";

    const loadPreview = () => {
      try {
        const raw = localStorage.getItem(CMS_PREVIEW_KEY);
        if (!raw) return defaultGuestRoomContent;
        return mergeGuestRoomContent(JSON.parse(raw));
      } catch (err) {
        console.warn("Using default guest room website preview content:", err.message);
        return defaultGuestRoomContent;
      }
    };

    const load = async () => {
      if (isPreview) {
        if (mounted) {
          setContent(loadPreview());
          setLoading(false);
        }
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/website-content/public`, {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to load website content");
        if (mounted) setContent(mergeGuestRoomContent(data.content || {}));
      } catch (err) {
        console.warn("Using default guest room website content:", err.message);
        if (mounted) setContent(defaultGuestRoomContent);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const refresh = () => load();
    const refreshPreview = (event) => {
      if (!isPreview || event.key !== CMS_PREVIEW_KEY) return;
      setContent(loadPreview());
    };
    window.addEventListener("websiteContentPublished", refresh);
    window.addEventListener("storage", refreshPreview);
    window.addEventListener("focus", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("websiteContentPublished", refresh);
      window.removeEventListener("storage", refreshPreview);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return { content, loading };
}
