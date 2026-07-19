import React from "react";

export default function PublicTariffTable({ rows = [], tariffLabel = "Tariff for Stay" }) {
  const label = String(tariffLabel || "Tariff for Stay").trim();

  return (
    <div className="guest-card overflow-hidden rounded-[2rem]">
      <table className="w-full border-collapse text-left">
        <thead className="bg-[#efe4d5] text-[var(--guest-blue)]">
          <tr>
            <th className="px-5 py-4 font-semibold">Category</th>
            <th className="px-5 py-4 font-semibold">{label}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row[0]}-${index}`} className="border-t border-[var(--guest-border)]">
              <td className="px-5 py-4 font-medium text-stone-800">{row[0]}</td>
              <td className="px-5 py-4 text-[var(--guest-muted)]">{row[1]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
