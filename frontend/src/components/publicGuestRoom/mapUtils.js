export const normalizeMapUrl = (url = "") => {
  const trimmed = String(url || "").trim();
  if (!trimmed) return { embedUrl: "", linkUrl: "" };

  const isGoogleShareLink =
    /maps\.app\.goo\.gl/i.test(trimmed) ||
    /goo\.gl\/maps/i.test(trimmed) ||
    /google\.[^/]+\/maps\/(place|dir|search|@)/i.test(trimmed);

  const isEmbedUrl = /\/maps\/embed/i.test(trimmed) || /[?&]output=embed/i.test(trimmed);

  if (isEmbedUrl && !isGoogleShareLink) {
    return { embedUrl: trimmed, linkUrl: trimmed };
  }

  if (/google\.[^/]+\/maps/i.test(trimmed) && !/[?&]output=embed/i.test(trimmed)) {
    return { embedUrl: `${trimmed}${trimmed.includes("?") ? "&" : "?"}output=embed`, linkUrl: trimmed };
  }

  return { embedUrl: "", linkUrl: trimmed };
};
