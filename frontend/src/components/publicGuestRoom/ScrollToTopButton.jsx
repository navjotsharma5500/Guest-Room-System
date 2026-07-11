import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-40 grid h-12 w-12 place-items-center rounded-full border border-[#e4cfb6] bg-[#fffaf2]/95 text-[var(--guest-red)] shadow-[0_18px_45px_rgba(47,42,37,0.18)] backdrop-blur transition hover:-translate-y-0.5 hover:border-[var(--guest-red)] hover:bg-white"
      aria-label="Go to top"
    >
      <ArrowUp size={18} />
    </button>
  );
}
