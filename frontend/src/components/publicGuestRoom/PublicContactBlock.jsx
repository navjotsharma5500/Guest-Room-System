import React from "react";
import { Mail, Phone } from "lucide-react";

export default function PublicContactBlock({ contact = {} }) {
  const emails = (contact.emails || []).filter(Boolean);
  const phones = (contact.phones || []).filter(Boolean);
  const hasHours = Boolean(String(contact.hours || "").trim() || phones.length || String(contact.assistanceText || "").trim());

  if (!emails.length && !hasHours) return null;

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {!!emails.length && (
        <div className="guest-card rounded-[2rem] p-6">
          <Mail className="mb-4 text-[var(--guest-red)]" />
          <h3 className="guest-heading text-2xl font-semibold text-[var(--guest-blue)]">Email</h3>
          <div className="mt-3 grid gap-2">
            {emails.map((email) => <a key={email} href={`mailto:${email}`} className="text-sm text-stone-700 hover:text-[var(--guest-red)]">{email}</a>)}
          </div>
        </div>
      )}
      {hasHours && (
        <div className="guest-card rounded-[2rem] p-6">
          <Phone className="mb-4 text-[var(--guest-red)]" />
          <h3 className="guest-heading text-2xl font-semibold text-[var(--guest-blue)]">Working Hours</h3>
          {contact.hours && <p className="mt-3 text-sm leading-6 text-[var(--guest-muted)]">{contact.hours}</p>}
          {contact.assistanceText && <p className="mt-3 text-sm leading-6 text-stone-700">{contact.assistanceText}</p>}
          {phones.map((phone) => <p key={phone} className="mt-2 text-sm text-stone-700">{phone}</p>)}
        </div>
      )}
    </div>
  );
}
