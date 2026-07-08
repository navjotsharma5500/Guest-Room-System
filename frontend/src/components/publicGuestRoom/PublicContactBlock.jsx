import React from "react";
import { Mail, MapPin, Phone } from "lucide-react";

export default function PublicContactBlock({ contact = {} }) {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      <div className="guest-card rounded-[2rem] p-6">
        <MapPin className="mb-4 text-[var(--guest-red)]" />
        <h3 className="guest-heading text-2xl font-semibold text-[var(--guest-blue)]">Location</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--guest-muted)]">{contact.location}</p>
        <p className="mt-2 text-sm leading-6 text-[var(--guest-muted)]">{contact.dosaOfficeAddress}</p>
      </div>
      <div className="guest-card rounded-[2rem] p-6">
        <Mail className="mb-4 text-[var(--guest-red)]" />
        <h3 className="guest-heading text-2xl font-semibold text-[var(--guest-blue)]">Email</h3>
        <div className="mt-3 grid gap-2">
          {(contact.emails || []).map((email) => <a key={email} href={`mailto:${email}`} className="text-sm text-stone-700 hover:text-[var(--guest-red)]">{email}</a>)}
        </div>
      </div>
      <div className="guest-card rounded-[2rem] p-6">
        <Phone className="mb-4 text-[var(--guest-red)]" />
        <h3 className="guest-heading text-2xl font-semibold text-[var(--guest-blue)]">Office Hours</h3>
        <p className="mt-3 text-sm leading-6 text-[var(--guest-muted)]">{contact.hours}</p>
        {(contact.phones || []).map((phone) => <p key={phone} className="mt-2 text-sm text-stone-700">{phone}</p>)}
      </div>
    </div>
  );
}
