import React, { useEffect, useState } from "react";
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

      {open && (
        <div className="fixed inset-0 z-50 bg-stone-950/30 xl:hidden" onClick={() => setOpen(false)}>
          <aside className="ml-auto h-full w-80 max-w-[88vw] bg-[#fffdf8] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <p className="guest-heading text-xl font-semibold text-[var(--guest-blue)]">Menu</p>
              <button onClick={() => setOpen(false)} className="rounded-full border border-[var(--guest-border)] p-2">
                <X size={18} />
              </button>
            </div>
            <div className="grid gap-2">
              {navItems.map(([label, to]) => (
                <NavLink key={to} to={to} end={to === "/guest-room"} onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 font-semibold text-stone-700 hover:bg-[#f7f0e6] hover:text-[var(--guest-red)]">
                  {label}
                </NavLink>
              ))}
              <Link to="/guest-room/booking" onClick={() => setOpen(false)} className="guest-button-primary mt-3 rounded-2xl px-4 py-3 text-center font-semibold">
                Book Now
              </Link>
            </div>
          </aside>
        </div>
      )}
    </header>
  );
}
