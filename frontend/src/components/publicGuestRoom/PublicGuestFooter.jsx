import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Facebook, Instagram, Mail, MapPin, Play, Youtube } from "lucide-react";
import { normalizeMapUrl } from "./mapUtils";

const socialIcon = {
  instagram: Instagram,
  snapchat: Play,
  twitter: XIcon,
  facebook: Facebook,
  youtube: Youtube,
};

function XIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
      <path d="M4 4l16 16M20 4L4 20" />
    </svg>
  );
}

export default function PublicGuestFooter({ content = {} }) {
  const footer = content.footer || {};
  const contact = content.contact || {};
  const links = footer.quickLinks || [];
  const socialLinks = footer.socialLinks || {};
  const footerMap = normalizeMapUrl(footer.mapUrl);

  return (
    <footer className="border-t border-[var(--guest-border)] bg-[#efe4d5]">
      <div className="guest-shell grid gap-8 py-12 lg:grid-cols-[1.15fr_.75fr_1fr]">
        <div>
          <div className="flex items-center gap-4">
            <img src={footer.logo || "https://ik.imagekit.io/7khjnlfow/email-assets/thapar_logo.png?updatedAt=1776888126772"} alt="Thapar" className="h-16 rounded-2xl bg-white/70 p-2" />
            <div>
              <p className="guest-heading text-xl font-semibold text-[var(--guest-blue)]">Hostel Guest Room Booking System</p>
              <p className="text-sm text-[var(--guest-muted)]">Thapar Institute of Engineering & Technology</p>
            </div>
          </div>
          <p className="mt-5 max-w-md text-sm leading-7 text-[var(--guest-muted)]">{footer.description}</p>
          {footerMap.embedUrl && (
            <iframe
              title="Thapar location"
              src={footerMap.embedUrl}
              className="mt-5 h-36 w-full max-w-md rounded-3xl border border-[var(--guest-border)]"
              loading="lazy"
            />
          )}
          {!footerMap.embedUrl && footerMap.linkUrl && (
            <a
              href={footerMap.linkUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex w-full max-w-md items-center justify-center gap-2 rounded-3xl border border-[var(--guest-border)] bg-white/70 px-4 py-5 text-sm font-semibold text-[var(--guest-blue)] hover:text-[var(--guest-red)]"
            >
              <MapPin size={17} className="text-[var(--guest-red)]" />
              Open Location Map
              <ExternalLink size={15} />
            </a>
          )}
        </div>

        <div>
          <h3 className="guest-heading text-xl font-semibold text-[var(--guest-blue)]">Quick Links</h3>
          <div className="mt-4 grid gap-2">
            {links.map((link) => (
              <Link key={`${link.label}-${link.href}`} to={link.href || "#"} className="text-sm font-medium text-stone-700 hover:text-[var(--guest-red)]">
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="guest-heading text-xl font-semibold text-[var(--guest-blue)]">Contact</h3>
          <div className="mt-4 space-y-3 text-sm text-stone-700">
            <p className="flex gap-2"><MapPin size={16} className="mt-1 shrink-0 text-[var(--guest-red)]" /> {contact.location}</p>
            {(contact.emails || []).map((email) => (
              <a key={email} href={`mailto:${email}`} className="flex gap-2 hover:text-[var(--guest-red)]">
                <Mail size={16} className="mt-1 shrink-0 text-[var(--guest-blue)]" /> {email}
              </a>
            ))}
            <p className="text-[var(--guest-muted)]">{contact.hours}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {Object.entries(socialLinks).map(([key, href]) => {
              if (!href) return null;
              const Icon = socialIcon[key] || Instagram;
              return (
                <a key={key} href={href} target="_blank" rel="noreferrer" className="grid h-10 w-10 place-items-center rounded-full border border-[var(--guest-border)] bg-white/70 text-[var(--guest-blue)] hover:text-[var(--guest-red)]">
                  <Icon size={18} />
                </a>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-[var(--guest-border)] px-4 py-5 text-center text-sm text-[var(--guest-muted)]">
        {footer.copyrightText || "© 2026 TIET"} · Created and Maintained by DoSA Office
      </div>
    </footer>
  );
}
