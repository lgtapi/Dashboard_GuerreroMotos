"use client";

import { useState } from "react";
import type { Vista } from "@/lib/periodos";
import { MESES_ES, mesLabel } from "@/lib/types";

const VISTAS: { id: Vista; label: string }[] = [
  { id: "mensual", label: "Mensual" },
  { id: "trimestral", label: "Trimestral" },
  { id: "anual", label: "Anual" },
];

// Selector de periodos tipo calendario: botones Mensual / Trimestral / Anual,
// y una cuadrícula con los periodos del año. El periodo A va en naranja, el B
// en ámbar y los periodos sin datos quedan apagados.
export function PeriodPanel({
  periodos,
  mesA,
  mesB,
  onChangeA,
  onChangeB,
  vista,
  onChangeVista,
  notas = {},
}: {
  periodos: string[];
  mesA: string;
  mesB: string;
  onChangeA: (v: string) => void;
  onChangeB: (v: string) => void;
  vista: Vista;
  onChangeVista: (v: Vista) => void;
  notas?: Record<string, string>;
}) {
  const [objetivo, setObjetivo] = useState<"A" | "B">("B");
  const anios = [...new Set(periodos.map((p) => Number(p.slice(0, 4))).filter(Boolean))].sort();
  const anioDeB = Number(mesB.slice(0, 4)) || anios[anios.length - 1] || new Date().getFullYear();
  const [anioVisto, setAnioVisto] = useState<number | null>(null);
  const anio = anioVisto && anios.includes(anioVisto) ? anioVisto : anioDeB;
  const idx = anios.indexOf(anio);

  // Celdas de la cuadrícula según la vista
  const celdas =
    vista === "anual"
      ? anios.map((a) => ({ clave: String(a), label: String(a) }))
      : vista === "trimestral"
        ? [1, 2, 3, 4].map((t) => ({ clave: `${anio}-T${t}`, label: `T${t}` }))
        : MESES_ES.map((m, i) => ({ clave: `${anio}-${String(i + 1).padStart(2, "0")}-01`, label: m.slice(0, 3) }));

  const elegir = (clave: string) => {
    if (objetivo === "A") {
      onChangeA(clave);
      setObjetivo("B");
    } else {
      onChangeB(clave);
    }
  };
  const parcial = notas[mesA] || notas[mesB];

  return (
    <div className="flex flex-col gap-4 rounded-[22px] border border-white/[0.07] bg-black/35 p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold">{vista === "anual" ? "Años" : `Periodos ${anio}`}</span>
        {vista !== "anual" && (
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label="Año anterior"
              disabled={idx <= 0}
              onClick={() => setAnioVisto(anios[idx - 1])}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-paper transition-colors hover:bg-white/20 disabled:opacity-30"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Año siguiente"
              disabled={idx < 0 || idx >= anios.length - 1}
              onClick={() => setAnioVisto(anios[idx + 1])}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-paper transition-colors hover:bg-white/20 disabled:opacity-30"
            >
              ›
            </button>
          </div>
        )}
      </div>

      <div role="group" aria-label="Tipo de reporte" className="grid grid-cols-3 gap-1 rounded-full bg-white/[0.06] p-1">
        {VISTAS.map((v) => (
          <button
            key={v.id}
            type="button"
            aria-pressed={vista === v.id}
            onClick={() => {
              onChangeVista(v.id);
              setAnioVisto(null);
            }}
            className={`rounded-full py-1.5 text-xs font-semibold transition-colors ${
              vista === v.id ? "bg-brand text-asphalt-900" : "text-paper/70 hover:text-paper"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Qué periodo se cambia al tocar la cuadrícula */}
      <div role="group" aria-label="Periodo a cambiar" className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={objetivo === "A"}
          onClick={() => setObjetivo("A")}
          className={`rounded-xl border px-3 py-2 text-left transition-colors ${
            objetivo === "A" ? "border-brand bg-brand/15" : "border-white/10 hover:border-white/25"
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wide text-paper/50">Periodo A</span>
          <span className="block font-display text-sm font-bold text-brand">{mesLabel(mesA)}</span>
        </button>
        <button
          type="button"
          aria-pressed={objetivo === "B"}
          onClick={() => setObjetivo("B")}
          className={`rounded-xl border px-3 py-2 text-left transition-colors ${
            objetivo === "B" ? "border-yellow bg-yellow/15" : "border-white/10 hover:border-white/25"
          }`}
        >
          <span className="block text-[10px] uppercase tracking-wide text-paper/50">Periodo B</span>
          <span className="block font-display text-sm font-bold text-yellow">{mesLabel(mesB)}</span>
        </button>
      </div>

      <div className={`grid gap-2 ${vista === "mensual" ? "grid-cols-4" : vista === "trimestral" ? "grid-cols-4" : "grid-cols-3"}`}>
        {celdas.map((c) => {
          const conDatos = periodos.includes(c.clave);
          const esA = c.clave === mesA;
          const esB = c.clave === mesB;
          return (
            <button
              key={c.clave}
              type="button"
              disabled={!conDatos}
              aria-pressed={esA || esB}
              onClick={() => elegir(c.clave)}
              title={conDatos ? `${mesLabel(c.clave)}${notas[c.clave] ? ` · ${notas[c.clave]}` : ""}` : "Sin datos"}
              className={`h-10 rounded-full text-[13px] transition-colors ${
                esA
                  ? "bg-brand font-bold text-asphalt-900"
                  : esB
                    ? "bg-yellow font-bold text-asphalt-900"
                    : conDatos
                      ? "bg-white/[0.07] font-medium text-paper hover:bg-white/15"
                      : "cursor-not-allowed text-paper/30"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] leading-relaxed text-paper/50">
        Elige arriba si cambias el periodo A o el B y toca un {vista === "mensual" ? "mes" : vista === "trimestral" ? "trimestre" : "año"}.
        {vista !== "mensual" && " Alcance, usuarios y tasas se promedian; el resto se suma."}
        {parcial ? " Uno de los periodos elegidos no tiene todos sus meses cargados." : ""}
      </p>
    </div>
  );
}
