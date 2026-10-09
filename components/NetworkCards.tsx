"use client";

import { useState } from "react";
import Image from "next/image";
import { MetricTrendChart } from "@/components/MetricTrendChart";
import { fmtNumber, fmtPct, pctChange, unidadPeriodo, type SheetRow } from "@/lib/types";
import { colorPlataforma, etiquetaMetrica, metricasRedes, valorRed } from "@/lib/redes";

const ICONOS: Record<string, string> = {
  facebook: "/icon-facebook.png",
  instagram: "/icon-instagram.png",
  tiktok: "/icon-tiktok.png",
};

// Una tarjeta por red con todas sus métricas (periodo A → B). Al tocar una
// métrica se abre debajo su gráfica de evolución.
export function NetworkCards({
  rows,
  plataformas,
  mesA,
  mesB,
}: {
  rows: SheetRow[] | null;
  plataformas: string[];
  mesA: string;
  mesB: string;
}) {
  const [sel, setSel] = useState<{ red: string; metrica: string } | null>(null);
  const metricas = metricasRedes(rows);
  if (!rows || plataformas.length === 0 || metricas.length === 0) return null;

  const tarjetas = plataformas
    .map((red) => ({
      red,
      filas: metricas
        .map((m) => ({ m, a: valorRed(rows, mesA, red, m), b: valorRed(rows, mesB, red, m) }))
        .filter((f) => f.a !== null || f.b !== null), // los null no se muestran
    }))
    .filter((t) => t.filas.length > 0);

  const serie = sel
    ? [...new Set(rows.map((r) => String(r.Mes)))]
        .sort()
        .map((p) => ({ periodo: p, valor: valorRed(rows, p, sel.red, sel.metrica) }))
        .filter((s): s is { periodo: string; valor: number } => s.valor !== null)
    : [];

  return (
    <>
      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 2xl:grid-cols-3">
        {tarjetas.map(({ red, filas }, i) => {
          const destacada = i === 1; // la tarjeta del medio va en naranja, como en el concepto
          const icono = ICONOS[red.toLowerCase()];
          return (
            <article
              key={red}
              id={red.toLowerCase()}
              className={`scroll-mt-6 rounded-[22px] p-4 ${
                destacada ? "bg-brand-gradient text-asphalt-900" : "bg-white text-asphalt-800"
              } print:border print:border-neutral-300`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="flex items-center gap-2 font-display text-[22px] font-extrabold uppercase">
                  {icono && <Image src={icono} alt="" width={22} height={22} className="h-[22px] w-[22px] object-contain" />}
                  {red}
                </h3>
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: destacada ? "#111" : colorPlataforma(red, i, true) }}
                  aria-hidden="true"
                />
              </div>
              <ul>
                {filas.map((f) => {
                  const on = sel?.red === red && sel.metrica === f.m;
                  const cambio = pctChange(f.a, f.b);
                  return (
                    <li key={f.m}>
                      <button
                        type="button"
                        aria-pressed={on}
                        onClick={() => setSel(on ? null : { red, metrica: f.m })}
                        title="Ver gráfica"
                        className={`-mx-2 flex min-h-[44px] w-[calc(100%+16px)] items-center justify-between gap-2 rounded-xl border-t px-2 py-1.5 text-left transition-colors ${
                          destacada ? "border-black/15 hover:bg-black/10" : "border-neutral-200 hover:bg-orange-50"
                        } ${on ? (destacada ? "bg-black/15" : "bg-orange-100") : ""}`}
                      >
                        <span className="flex items-center gap-2 text-xs">
                          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 opacity-50" fill="currentColor" aria-hidden="true">
                            <rect x="1" y="9" width="3" height="6" rx="1" />
                            <rect x="6.5" y="4" width="3" height="11" rx="1" />
                            <rect x="12" y="1" width="3" height="14" rx="1" />
                          </svg>
                          {etiquetaMetrica(f.m)}
                        </span>
                        <span className="flex items-baseline gap-1.5 whitespace-nowrap text-[13px]">
                          <span className="opacity-60">{fmtNumber(f.a)} →</span>
                          <strong className="font-display text-[19px]">{fmtNumber(f.b)}</strong>
                          {cambio !== null && (
                            <span
                              className={`text-[11px] font-bold ${
                                destacada ? "text-asphalt-900/80" : cambio >= 0 ? "text-green-700" : "text-red-600"
                              }`}
                            >
                              {cambio >= 0 ? "▲" : "▼"}
                              {fmtPct(Math.abs(cambio)).replace("+", "")}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>

      {sel && serie.length > 0 && (
        <div className="mt-3.5">
          <MetricTrendChart
            key={`${sel.red}-${sel.metrica}`}
            title={`${sel.red} · ${etiquetaMetrica(sel.metrica)}`}
            unidad={unidadPeriodo(mesA)}
            data={serie}
            mesA={mesA}
            mesB={mesB}
            onClose={() => setSel(null)}
          />
        </div>
      )}
    </>
  );
}
