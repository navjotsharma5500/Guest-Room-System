import React from "react";
import { Building2, ClipboardList, CreditCard, Landmark } from "lucide-react";

const bankRows = [
  ["Account Name", "accountName"],
  ["Account Number", "accountNumber"],
  ["IFSC", "ifsc"],
  ["Bank Name", "bankName"],
  ["Branch", "branch"],
];

export default function PublicBankDetailsCard({ bank = {} }) {
  const hasBankDetails = bankRows.some(([, key]) => String(bank?.[key] || "").trim()) || String(bank?.instructions || "").trim();

  if (!hasBankDetails) return null;

  return (
    <div className="mt-10 overflow-hidden rounded-[2rem] border border-[var(--guest-border)] bg-white shadow-[0_24px_70px_rgba(20,56,95,0.10)]">
      <div className="flex flex-col gap-4 border-b border-[var(--guest-border)] bg-[#fbf4ea] px-6 py-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-[var(--guest-red)] shadow-sm">
            <Landmark size={24} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--guest-red)]">Official Payment Account</p>
            <h3 className="guest-heading mt-1 text-2xl font-semibold text-[var(--guest-blue)]">Bank Details</h3>
          </div>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[var(--guest-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--guest-blue)]">
          <CreditCard size={16} />
          Pay only after approval
        </div>
      </div>

      <div className="grid gap-4 p-6 md:grid-cols-2">
        {bankRows.map(([label, key]) => {
          const value = String(bank?.[key] || "").trim();
          if (!value) return null;

          return (
            <div key={key} className="rounded-2xl border border-[var(--guest-border)] bg-[#f8fafc] p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[var(--guest-muted)]">
                <Building2 size={14} className="text-[var(--guest-red)]" />
                {label}
              </div>
              <p className="break-words text-base font-semibold text-[var(--guest-blue)]">{value}</p>
            </div>
          );
        })}
      </div>

      {bank?.instructions && (
        <div className="border-t border-[var(--guest-border)] bg-[#fff7ed] px-6 py-5">
          <div className="flex gap-3">
            <ClipboardList className="mt-1 shrink-0 text-[var(--guest-red)]" size={20} />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--guest-red)]">Instructions</p>
              <p className="mt-2 text-sm leading-7 text-stone-700">{bank.instructions}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
