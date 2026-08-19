const MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID || "G-4H69S8KET4";
const TRACKED_HOSTS = new Set([
  "campusconnect.thapar.edu",
  "studentsocieties.thapar.edu",
]);

let initialized = false;
let lastPageLocation = "";

export function trackPageView() {
  if (typeof window === "undefined" || !TRACKED_HOSTS.has(window.location.hostname)) return;

  if (!initialized) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, { send_page_view: false });

    if (!document.querySelector(`script[data-ga4-id="${MEASUREMENT_ID}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
      script.dataset.ga4Id = MEASUREMENT_ID;
      document.head.appendChild(script);
    }
    initialized = true;
  }

  const pagePath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (lastPageLocation === window.location.href) return;
  lastPageLocation = window.location.href;
  window.gtag("event", "page_view", {
    page_path: pagePath,
    page_location: window.location.href,
    page_title: `${window.location.hostname}${window.location.pathname}`,
  });
}
