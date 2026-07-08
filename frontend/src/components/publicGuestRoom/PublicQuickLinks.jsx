import React from "react";
import { Link } from "react-router-dom";

export default function PublicQuickLinks({ links = [] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {links.map((link) => (
        <Link key={`${link.label}-${link.href}`} to={link.href || "#"} className="guest-card rounded-2xl p-4 font-semibold text-[var(--guest-blue)] hover:text-[var(--guest-red)]">
          {link.label}
        </Link>
      ))}
    </div>
  );
}
