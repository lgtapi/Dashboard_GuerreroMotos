"use client";

import { fmtNumber, fmtPct, pctChange } from "@/lib/types";

export function MetricCard({
  label,
  labelA,
  labelB,
  valueA,
  valueB,
  selected = false,
  onClick,
}: {
  label: string;
  labelA: string;
  labelB: string;
  valueA: number | null;
  valueB: number | null;
  selected?: boolean;
  onClick?: () => void;
}) {
  const change = pctChange(valueA, valueB);
  const interactiveProps = onClick
    ? {
        role: "button" as const,
        tabIndex: 0,
        "aria-pressed": selected,
        "aria-label": `${selected ? "Ocultar" : "Ver"} gráfica de ${label}`,
        onClick,
        onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick();
          }
        },
      }
    : {};

  return (
    <div
      {...interactiveProps}
      className={`group relative overflow-hidden rounded-2xl border border-line bg-asphalt-800 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/10 hover:shadow-brand print:hover:translate-y-0 print:hover:shadow-none ${
        onClick ? "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/60" : ""
      } ${selected ? "ring-2 ring-brand" : ""}`}
    >
      {onClick && (
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={`absolute right-3.5 top-3.5 z-10 h-4 w-4 print:hidden ${selected ? "text-brand" : "text-paper/35 group-hover:text-paper/70"}`}
          fill="currentColor"
        >
          <rect x="1" y="9" width="3" height="6" rx="1" />
          <rect x="6.5" y="4" width="3" height="11" rx="1" />
          <rect x="12" y="1" width="3" height="14" rx="1" />
        </svg>
      )}
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
            {change >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(change)).replace("+", "")}
          </span>
        </div>
      )}
    </div>
  );
}
