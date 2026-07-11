import { useEffect, useState } from "react";
import { BACKEND_URL } from "../../utils/apiConfig";
import { defaultGuestRoomContent, mergeGuestRoomContent } from "./defaultGuestRoomContent";

export default function useGuestRoomContent() {
  const [content, setContent] = useState(defaultGuestRoomContent);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
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
    window.addEventListener("websiteContentPublished", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      mounted = false;
      window.removeEventListener("websiteContentPublished", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return { content, loading };
}
