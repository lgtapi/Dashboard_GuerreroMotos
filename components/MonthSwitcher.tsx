"use client";

import { mesLabel } from "@/lib/types";
import type { Vista } from "@/lib/periodos";

const VISTAS: { id: Vista; label: string }[] = [
  { id: "mensual", label: "Mensual" },
  { id: "trimestral", label: "Trimestral" },
  { id: "anual", label: "Anual" },
];

export function MonthSwitcher({
  months,
  mesA,
  mesB,
  onChangeA,
  onChangeB,
  vista,
  onChangeVista,
  notas = {},
}: {
  months: string[];
  mesA: string;
  mesB: string;
  onChangeA: (v: string) => void;
  onChangeB: (v: string) => void;
  vista: Vista;
  onChangeVista: (v: Vista) => void;
  notas?: Record<string, string>;
}) {
  const opcion = (periodo: string) => mesLabel(periodo) + (notas[periodo] ? ` · ${notas[periodo]}` : "");
  const parcial = notas[mesA] || notas[mesB];

  return (
    <div className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-line bg-asphalt-800 px-5 py-4 print:hidden">
      <div className="pointer-events-none absolute inset-0 bg-brand-radial" />

      <span className="relative font-display text-xs uppercase tracking-wide text-paper/55">
        Comparar
      </span>

      <div role="group" aria-label="Tipo de reporte" className="relative flex rounded-full border border-line bg-asphalt-900 p-1">
        {VISTAS.map((opcionVista) => (
          <button
            key={opcionVista.id}
            type="button"
            aria-pressed={vista === opcionVista.id}
            onClick={() => onChangeVista(opcionVista.id)}
            className={`rounded-full px-3.5 py-1.5 font-display text-sm font-semibold transition-colors ${
              vista === opcionVista.id ? "bg-brand text-asphalt-900" : "text-paper/55 hover:text-paper"
            }`}
          >
            {opcionVista.label}
          </button>
        ))}
      </div>

      <div className="relative flex items-center gap-3 rounded-full border border-line bg-asphalt-900 p-1.5">
        <select
          value={mesA}
          onChange={(e) => onChangeA(e.target.value)}
          className="rounded-full bg-transparent px-3 py-1.5 font-display text-sm font-semibold text-paper outline-none"
        >
          {months.map((m) => (
            <option key={m} value={m} className="bg-asphalt-900">
              {opcion(m)}
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
              {opcion(m)}
            </option>
          ))}
        </select>
      </div>
      {vista !== "mensual" && (
        <p className="relative basis-full text-xs text-paper/45">
          Alcance, usuarios y tasas se promedian entre los meses; el resto de métricas se suma.
          {parcial ? " Ojo: uno de los periodos elegidos no tiene todos sus meses cargados." : ""}
        </p>
      )}
    </div>
  );
}
