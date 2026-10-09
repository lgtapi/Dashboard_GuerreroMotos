"use client";

import { useState } from "react";
import { CompareBarChart } from "@/components/CompareBarChart";
import {
  CAMPOS_LEADS,
  buscarColumna,
  compararCampo,
  leadsPorPeriodo,
  type LeadsPreparados,
} from "@/lib/leads";
import { mesLabel, mesLabelCorto, type SheetRow } from "@/lib/types";

const COLOR_A = "#ff5803";
const COLOR_B = "#ffb23c";

// Análisis de leads (hoja Leads_Detalle) en formato compacto para el panel
// derecho. Cada tarjeta se puede ampliar para ver la gráfica completa.
export function LeadsCompact({
  rows,
  datos,
  mesA,
  mesB,
}: {
  rows: SheetRow[] | null;
  datos: LeadsPreparados;
  mesA: string;
  mesB: string;
}) {
  const [ampliada, setAmpliada] = useState<string | null>(null);
  if (!rows || datos.registros.length === 0) return null;

  const serie = leadsPorPeriodo(datos).slice(-12);
  const tope = Math.max(1, ...serie.map((s) => s.valor));
  const totalA = serie.find((s) => s.periodo === mesA)?.valor ?? 0;
  const totalB = serie.find((s) => s.periodo === mesB)?.valor ?? 0;

  const tarjetas = CAMPOS_LEADS.map((campo) => {
    const columna = buscarColumna(rows, campo.columnas);
    return { ...campo, data: compararCampo(datos, columna, mesA, mesB, campo.topN) };
  }).filter((t) => t.data.length > 0);

  return (
    <section id="leads" aria-label="Análisis de leads" className="flex scroll-mt-6 flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2.5 font-display text-lg font-bold uppercase">
          <i className="inline-block h-[18px] w-[3px] rounded bg-brand" />
          Análisis de leads
        </h2>
      </div>

      {/* Leads registrados por periodo */}
      <div className="rounded-[18px] border border-white/[0.07] bg-black/35 p-3.5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm font-semibold">Leads registrados</span>
          <span className="text-xs text-paper/60">
            <span style={{ color: COLOR_A }}>{totalA}</span> → <strong style={{ color: COLOR_B }}>{totalB}</strong>
          </span>
        </div>
        <div className="flex h-16 items-end gap-1" aria-hidden="true">
          {serie.map((s) => (
            <div
              key={s.periodo}
              title={`${mesLabel(s.periodo)}: ${s.valor}`}
              className="flex-1 rounded-t"
              style={{
                height: `${Math.max(6, (s.valor / tope) * 100)}%`,
                background: s.periodo === mesA ? COLOR_A : s.periodo === mesB ? COLOR_B : "rgba(255,88,3,0.35)",
              }}
            />
          ))}
        </div>
        <div className="mt-1 flex gap-1">
          {serie.map((s) => (
            <span key={s.periodo} className="flex-1 truncate text-center text-[9px] text-paper/45">
              {mesLabelCorto(s.periodo).split(" ")[0]}
            </span>
          ))}
        </div>
      </div>

      {tarjetas.map((t) => {
        const tope2 = Math.max(1, ...t.data.flatMap((d) => [d.a, d.b]));
        return (
          <div key={t.id} className="rounded-[18px] border border-white/[0.07] bg-black/35 p-3.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-paper/85">Formulario</span>
              <button
                type="button"
                onClick={() => setAmpliada(ampliada === t.id ? null : t.id)}
                aria-expanded={ampliada === t.id}
                className="text-[11px] font-semibold text-brand-light hover:text-yellow"
              >
                {ampliada === t.id ? "Cerrar" : "Ampliar"}
              </button>
            </div>
            <div className="mb-2 text-sm font-semibold">{t.titulo}</div>
            <ul className="flex flex-col gap-1.5">
              {t.data.slice(0, 4).map((d) => (
                <li key={d.name} className="flex items-center gap-2">
                  <span className="w-[86px] shrink-0 truncate text-[11px] text-paper/70" title={d.name}>
                    {d.name}
                  </span>
                  <div className="flex flex-1 flex-col gap-0.5">
                    <div className="h-[5px] rounded" style={{ width: `${(d.a / tope2) * 100}%`, minWidth: d.a ? 2 : 0, background: COLOR_A }} />
                    <div className="h-[5px] rounded" style={{ width: `${(d.b / tope2) * 100}%`, minWidth: d.b ? 2 : 0, background: COLOR_B }} />
                  </div>
                  <span className="w-12 shrink-0 text-right text-[10px] text-paper/60">
                    {d.a}/<strong className="text-paper">{d.b}</strong>
                  </span>
                </li>
              ))}
            </ul>
            {ampliada === t.id && (
              <div className="mt-3">
                <CompareBarChart title={t.titulo} data={t.data} labelA={mesLabel(mesA)} labelB={mesLabel(mesB)} />
              </div>
            )}
          </div>
        );
      })}
      <p className="flex gap-3 text-[11px] text-paper/55">
        <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: COLOR_A }} />{mesLabel(mesA)}</span>
        <span className="flex items-center gap-1.5"><i className="inline-block h-2 w-2 rounded-full" style={{ background: COLOR_B }} />{mesLabel(mesB)}</span>
      </p>
    </section>
  );
}
