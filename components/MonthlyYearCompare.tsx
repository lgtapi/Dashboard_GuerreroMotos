"use client";

import { useMemo, useState } from "react";
import { OverlayCompareChart } from "@/components/OverlayCompareChart";
import type { SheetRow } from "@/lib/types";

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MESES_LARGOS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const mesDe = (r: SheetRow) => Number(String(r.Mes ?? "").slice(5, 7));
const redDe = (r: SheetRow) => String(r.Plataforma ?? "").trim();

// Comparación 2025 vs 2026 con filtro por mes y por red social, con el mismo
// diseño de barras superpuestas (2025 ancha, 2026 angosta por dentro).
//  - Mes "Todos": eje X = meses, para la red elegida (o la suma de todas).
//  - Un mes concreto: eje X = redes sociales, en ese mes.
export function MonthlyYearCompare({
  anterior,
  actual,
  metricas,
}: {
  anterior: SheetRow[] | null; // filas de 2025
  actual: SheetRow[] | null; // filas de 2026
  metricas: string[];
}) {
  const [metricaElegida, setMetrica] = useState("");
  const [red, setRed] = useState("Todas");
  const [mes, setMes] = useState(0); // 0 = todos los meses

  const redes = useMemo(
    () => [...new Set([...(actual ?? []), ...(anterior ?? [])].map(redDe).filter(Boolean))],
    [actual, anterior]
  );
  const meses = useMemo(
    () => [...new Set([...(actual ?? []), ...(anterior ?? [])].map(mesDe).filter((m) => m >= 1 && m <= 12))].sort((a, b) => a - b),
    [actual, anterior]
  );

  if (metricas.length === 0 || (!actual?.length && !anterior?.length)) return null;
  const metrica = metricas.includes(metricaElegida) ? metricaElegida : metricas[0];

  // Suma de la métrica para un mes y una red (o todas). null si no hay dato.
  const valor = (rows: SheetRow[] | null, m: number, r: string): number | null => {
    let total: number | null = null;
    for (const fila of rows ?? []) {
      if (mesDe(fila) !== m || (r !== "Todas" && redDe(fila) !== r)) continue;
      const v = fila[metrica];
      if (typeof v === "number") total = (total ?? 0) + v;
    }
    return total;
  };

  const data =
    mes === 0
      ? meses.map((m) => ({ name: MESES[m - 1], a: valor(anterior, m, red), b: valor(actual, m, red) }))
      : (red === "Todas" ? redes : [red]).map((r) => ({ name: r, a: valor(anterior, mes, r), b: valor(actual, mes, r) }));

  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
      activo ? "border-brand bg-brand text-asphalt-900" : "border-line text-paper/70 hover:border-brand hover:text-brand"
    }`;

  const titulo =
    mes === 0
      ? `${metrica} · ${red === "Todas" ? "todas las redes" : red} · por mes`
      : `${metrica} · ${MESES_LARGOS[mes - 1]} · ${red === "Todas" ? "por red social" : red}`;

  return (
    <OverlayCompareChart
      title={titulo}
      data={data}
      labelA="2025"
      labelB="2026"
      anchoA={mes === 0 ? 40 : 64}
      anchoB={mes === 0 ? 16 : 26}
    >
      <div className="mb-4 flex flex-col gap-2 print:hidden">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Métrica">
          <span className="mr-1 w-16 font-display text-xs uppercase tracking-wide text-paper/55">Métrica</span>
          {metricas.map((m) => (
            <button key={m} type="button" aria-pressed={m === metrica} onClick={() => setMetrica(m)} className={chip(m === metrica)}>
              {m}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Red social">
          <span className="mr-1 w-16 font-display text-xs uppercase tracking-wide text-paper/55">Red</span>
          {["Todas", ...redes].map((r) => (
            <button key={r} type="button" aria-pressed={r === red} onClick={() => setRed(r)} className={chip(r === red)}>
              {r}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Mes">
          <span className="mr-1 w-16 font-display text-xs uppercase tracking-wide text-paper/55">Mes</span>
          <button type="button" aria-pressed={mes === 0} onClick={() => setMes(0)} className={chip(mes === 0)}>
            Todos
          </button>
          {meses.map((m) => (
            <button key={m} type="button" aria-pressed={mes === m} onClick={() => setMes(m)} className={chip(mes === m)}>
              {MESES[m - 1]}
            </button>
          ))}
        </div>
      </div>
    </OverlayCompareChart>
  );
}