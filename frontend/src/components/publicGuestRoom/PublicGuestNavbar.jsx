import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

const navItems = [
  ["Home", "/guest-room"],
  ["About", "/guest-room/about"],
  ["Rooms", "/guest-room/rooms"],
  ["Tariff", "/guest-room/tariff"],
  ["Dining", "/guest-room/dining"],
  ["Facilities", "/guest-room/facilities"],
  ["Gallery", "/guest-room/gallery"],
  ["Contact", "/guest-room/contact"],
];

export default function PublicGuestNavbar() {
  const [open, setOpen] = useState(false);
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const linkClass = ({ isActive }) =>
    `text-sm font-semibold transition ${
      isActive ? "text-[var(--guest-red)]" : "text-stone-700 hover:text-[var(--guest-red)]"
    }`;

  return (
    <header className={`sticky top-0 z-50 border-b transition ${solid ? "border-[var(--guest-border)] bg-[rgba(255,253,248,.94)] shadow-lg backdrop-blur" : "border-transparent bg-[rgba(255,253,248,.78)] backdrop-blur-xl"}`}>
      <div className="guest-shell flex items-center justify-between gap-4 py-3">
        <Link to="/guest-room" className="flex min-w-0 items-center gap-3">
          <img src="https://ik.imagekit.io/7khjnlfow/email-assets/thapar_logo.png?updatedAt=1776888126772" alt="Thapar" className="h-14 w-auto shrink-0 object-contain md:h-16" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold leading-tight text-[var(--guest-blue)] md:text-base">
              Thapar Institute of Engineering & Technology
            </p>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--guest-red)]">
              Hostel Guest Rooms
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 xl:flex">
          {navItems.map(([label, to]) => (
            <NavLink key={to} to={to} end={to === "/guest-room"} className={linkClass}>
              {label}
            </NavLink>
          ))}
          <Link to="/guest-room/booking" className="guest-button-primary rounded-full px-5 py-2.5 text-sm font-semibold transition">
            Book Now
          </Link>
        </nav>

        <button onClick={() => setOpen(true)} className="rounded-full border border-[var(--guest-border)] bg-white/70 p-2 text-[var(--guest-blue)] xl:hidden">
          <Menu />
        </button>
      </div>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-stone-950/55 backdrop-blur-sm xl:hidden"
            onClick={() => setOpen(false)}
          >
            <aside
              className="ml-auto flex h-full w-80 max-w-[88vw] flex-col overflow-hidden border-l border-[#eadcc8] bg-[#fffaf2] shadow-[-24px_0_80px_rgba(47,42,37,0.24)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="border-b border-[#eadcc8] bg-[#fffdf8] px-5 py-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--guest-red)]">
                      Guest Room
                    </p>
                    <p className="guest-heading mt-1 text-2xl font-semibold text-[var(--guest-blue)]">
                      Menu
                    </p>
                  </div>
                  <button
                    onClick={() => setOpen(false)}
                    className="grid h-11 w-11 place-items-center rounded-full border border-[#e2cfb6] bg-[#fff7ed] text-[var(--guest-red)] shadow-sm"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-5">
                <div className="grid gap-2">
                  {navItems.map(([label, to]) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={to === "/guest-room"}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        `rounded-2xl border px-4 py-3 text-base font-semibold transition ${
                          isActive
                            ? "border-[var(--guest-red)] bg-[#fff2f0] text-[var(--guest-red)] shadow-sm"
                            : "border-transparent bg-white/75 text-stone-700 hover:border-[#eadcc8] hover:bg-white hover:text-[var(--guest-red)]"
                        }`
                      }
                    >
                      {label}
                    </NavLink>
                  ))}
                  <Link
                    to="/guest-room/booking"
                    onClick={() => setOpen(false)}
                    className="mt-4 rounded-2xl border border-[#8f1f2b] bg-[#a8323e] px-4 py-3 text-center text-base font-bold text-white shadow-[0_14px_30px_rgba(168,50,62,0.22)] transition hover:bg-[#731b26]"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
            </aside>
          </div>,
          document.body
        )}
    </header>
  );
}
