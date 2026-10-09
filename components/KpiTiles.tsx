"use client";

import { fmtNumber, fmtPct, mesLabel, pctChange, type SheetRow } from "@/lib/types";
import { etiquetaMetrica, metricasRedes, totalRedes } from "@/lib/redes";

const PREFERIDAS = ["Visualizaciones", "Alcance", "Interacciones", "Seguidores_totales", "Seguidores_nuevos"];
const ACENTOS = ["#ff5803", "#e09200", "#cc4602", "#a8927a"];

// Cuatro indicadores (suma de todas las redes) en tarjetas blancas, con una
// mini-gráfica de todos los periodos donde A y B van resaltados.
export function KpiTiles({
  rows,
  periodos,
  mesA,
  mesB,
}: {
  rows: SheetRow[] | null;
  periodos: string[];
  mesA: string;
  mesB: string;
}) {
  const disponibles = metricasRedes(rows);
  const elegidas = [
    ...PREFERIDAS.filter((m) => disponibles.includes(m)),
    ...disponibles.filter((m) => !PREFERIDAS.includes(m)),
  ].slice(0, 4);
  if (elegidas.length === 0) return null;

  return (
    <section aria-label="Resumen del periodo" className="grid grid-cols-2 gap-3.5 xl:grid-cols-4">
      {elegidas.map((m, i) => {
        const a = totalRedes(rows, mesA, m);
        const b = totalRedes(rows, mesB, m);
        const cambio = pctChange(a, b);
        const serie = periodos.map((p) => ({ p, v: totalRedes(rows, p, m) ?? 0 }));
        const tope = Math.max(1, ...serie.map((s) => s.v));
        return (
          <div key={m} className="flex min-h-[132px] flex-col gap-2.5 rounded-[22px] bg-white p-4 text-asphalt-800 print:border print:border-neutral-300">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[13px] font-semibold">{etiquetaMetrica(m)}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  cambio === null ? "bg-neutral-100 text-neutral-500" : cambio >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"
                }`}
              >
                {cambio === null ? "—" : `${cambio >= 0 ? "▲" : "▼"} ${fmtPct(Math.abs(cambio)).replace("+", "")}`}
              </span>
            </div>
            <div className="flex h-9 items-end gap-[3px]" aria-hidden="true">
              {serie.slice(-12).map((s) => (
                <div
                  key={s.p}
                  className="flex-1 rounded-[3px]"
                  style={{
                    height: `${Math.max(8, (s.v / tope) * 100)}%`,
                    background: s.p === mesB ? "#ffb23c" : s.p === mesA ? ACENTOS[i % ACENTOS.length] : "#e8e2dc",
                  }}
                />
              ))}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="whitespace-nowrap font-display text-[24px] font-extrabold leading-none text-[#d14600] sm:text-[28px]">{fmtNumber(b)}</span>
              <span className="whitespace-nowrap text-[11px] text-neutral-600">
                {mesLabel(mesA).split(" ")[0]}: {fmtNumber(a)}
              </span>
            </div>
          </div>
        );
      })}
    </section>
  );
}
