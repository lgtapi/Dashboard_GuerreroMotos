"use client";

import { mesLabel } from "@/lib/types";

export function MonthSwitcher({
  months,
  mesA,
  mesB,
  onChangeA,
  onChangeB,
}: {
  months: string[];
  mesA: string;
  mesB: string;
  onChangeA: (v: string) => void;
  onChangeB: (v: string) => void;
}) {
  return (
    <div className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-line bg-asphalt-800 px-5 py-4 print:hidden">
      <div className="pointer-events-none absolute inset-0 bg-brand-radial" />

      <span className="relative font-display text-xs uppercase tracking-wide text-paper/55">
        Comparar
      </span>

      <div className="relative flex items-center gap-3 rounded-full border border-line bg-asphalt-900 p-1.5">
        <select
          value={mesA}
          onChange={(e) => onChangeA(e.target.value)}
          className="rounded-full bg-transparent px-3 py-1.5 font-display text-sm font-semibold text-paper outline-none"
        >
          {months.map((m) => (
            <option key={m} value={m} className="bg-asphalt-900">
              {mesLabel(m)}
            </option>
          ))}
        </select>

        <span className="font-display text-brand">→</span>

        <select
          value={mesB}
          onChange={(e) => onChangeB(e.target.value)}
          className="rounded-full bg-brand/15 px-3 py-1.5 font-display text-sm font-semibold text-brand outline-none"
        >
          {months.map((m) => (
            <option key={m} value={m} className="bg-asphalt-900 text-paper">
              {mesLabel(m)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
