"use client";

import { fmtNumber, fmtPct, pctChange } from "@/lib/types";

export function MetricCard({
  label,
  labelA,
  labelB,
  valueA,
  valueB,
}: {
  label: string;
  labelA: string;
  labelB: string;
  valueA: number | null;
  valueB: number | null;
}) {
  const change = pctChange(valueA, valueB);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-line bg-asphalt-800 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10 hover:shadow-brand print:hover:translate-y-0 print:hover:shadow-none">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand to-yellow" />
      <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-gradient-to-br from-brand to-yellow opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-20 print:hidden" />

      <h3 className="relative mb-3 font-display text-xs font-semibold uppercase tracking-wide text-paper/55">
        {label}
      </h3>

      <div className="relative flex items-end justify-between gap-2">
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-wide text-paper/45">{labelA}</div>
          <div className="font-display text-2xl font-bold leading-none text-paper">
            {fmtNumber(valueA)}
          </div>
        </div>
        <div className="pb-1 text-lg font-bold text-brand">→</div>
        <div className="flex-1 text-right">
          <div className="text-[11px] uppercase tracking-wide text-paper/45">{labelB}</div>
          <div className="font-display text-2xl font-bold leading-none text-paper">
            {fmtNumber(valueB)}
          </div>
        </div>
      </div>

      {change !== null && (
        <div className="relative mt-3 flex items-center justify-between border-t border-dashed border-line pt-2.5 font-display text-sm">
          <span className="text-[11px] uppercase tracking-wide text-paper/45">
            {labelA.split(" ")[0]} → {labelB.split(" ")[0]}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
              change >= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"
            }`}
          >
            {change >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(change))}
          </span>
        </div>
      )}
    </div>
  );
}
