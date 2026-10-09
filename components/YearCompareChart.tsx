"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Vista } from "@/lib/periodos";
import { SheetRow, fmtNumber, fmtPct, mesLabel, pctChange } from "@/lib/types";
import {
  claveDelSeleccionado,
  metricasDe,
  plataformasDe,
  serieInteranual,
  unirHojas,
} from "@/lib/interanual";

// Colores: el año anterior es la barra ancha de referencia (tono neutro);
// el año actual, la barra angosta en naranja de la marca, por delante.
const COLOR_ANTERIOR = "#6b6259";
const COLOR_ANTERIOR_SEL = "#a39587";
const COLOR_ACTUAL = "#ff5803";
const COLOR_ACTUAL_SEL = "#ffb23c";

const ETIQUETAS: Record<string, string> = {
  Clics_en_enlace: "Clics en el enlace",
  Visitas_perfil: "Visitas al perfil",
  Seguidores_nuevos: "Seguidores nuevos",
  Historias_publicadas: "Historias publicadas",
};
const nombre = (k: string) => ETIQUETAS[k] ?? k.replace(/_/g, " ");

export function YearCompareChart({
  actual,
  anterior,
  periodo,
  vista,
}: {
  actual: SheetRow[] | null; // Redes_LookerStudio
  anterior: SheetRow[] | null; // 2025_Redes_LookerStudio
  periodo: string; // periodo B del selector (p. ej. "2026-09-01")
  vista: Vista;
}) {
  const filas = useMemo(() => unirHojas(actual, anterior), [actual, anterior]);
  const metricas = useMemo(() => metricasDe(anterior), [anterior]);
  const plataformas = useMemo(() => plataformasDe(filas), [filas]);

  const [metricaElegida, setMetrica] = useState("Visualizaciones");
  const [plataforma, setPlataforma] = useState("Todas");

  const metrica = metricas.includes(metricaElegida) ? metricaElegida : metricas[0];
  const anioActual = Number(periodo.slice(0, 4)) || new Date().getFullYear();
  const anioAnterior = anioActual - 1;
  const claveSel = claveDelSeleccionado(periodo, vista);

  const serie = useMemo(
    () => (metrica ? serieInteranual(filas, anioActual, metrica, plataforma, vista) : []),
    [filas, anioActual, metrica, plataforma, vista]
  );

  if (!anterior || anterior.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-asphalt-800 p-5 text-sm text-paper/60">
        No se encontraron datos en la hoja <strong>2025_Redes_LookerStudio</strong>. Revisa que exista con ese nombre exacto y
        que tenga las columnas Mes y Plataforma.
      </div>
    );
  }
  if (!metrica) return null;

  const sel = serie.find((p) => p.clave === claveSel);
  const cambio = sel ? pctChange(sel.anterior, sel.actual) : null;
  const nombrePeriodo = sel
    ? vista === "mensual"
      ? mesLabel(periodo).split(" ")[0]
      : vista === "trimestral"
        ? sel.etiqueta
        : "Año completo"
    : "";

  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
      activo ? "border-brand bg-brand text-asphalt-900" : "border-line text-paper/70 hover:border-brand hover:text-brand"
    }`;

  return (
    <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden" role="group" aria-label="Métrica">
        <span className="mr-1 font-display text-xs uppercase tracking-wide text-paper/55">Métrica</span>
        {metricas.map((m) => (
          <button key={m} type="button" aria-pressed={m === metrica} onClick={() => setMetrica(m)} className={chip(m === metrica)}>
            {nombre(m)}
          </button>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden" role="group" aria-label="Plataforma">
        <span className="mr-1 font-display text-xs uppercase tracking-wide text-paper/55">Plataforma</span>
        {["Todas", ...plataformas].map((p) => (
          <button key={p} type="button" aria-pressed={p === plataforma} onClick={() => setPlataforma(p)} className={chip(p === plataforma)}>
            {p}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-display text-sm uppercase tracking-wide text-paper/70">
            {nombre(metrica)} · {plataforma === "Todas" ? "todas las plataformas" : plataforma} · {anioAnterior} vs {anioActual}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-paper/60">
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-4 rounded-sm" style={{ background: COLOR_ANTERIOR }} />
              {anioAnterior} (referencia)
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2 rounded-sm" style={{ background: COLOR_ACTUAL }} />
              {anioActual}
            </span>
          </div>
        </div>

        {sel && (
          <div className="rounded-xl border border-line bg-asphalt-900 px-4 py-2.5">
            <div className="text-[11px] uppercase tracking-wide text-paper/50">{nombrePeriodo}</div>
            <div className="flex items-baseline gap-2 font-display text-lg font-bold text-paper">
              <span className="text-paper/60">{fmtNumber(sel.anterior)}</span>
              <span className="text-brand">→</span>
              <span>{fmtNumber(sel.actual)}</span>
              {cambio !== null && (
                <span
                  className={`ml-1 rounded-full px-2 py-0.5 text-xs ${cambio >= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}
                >
                  {cambio >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(cambio)).replace("+", "")}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {serie.length === 0 ? (
        <p className="py-10 text-center text-sm text-paper/50">No hay datos de {nombre(metrica)} para comparar.</p>
      ) : (
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={serie} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
              {/* Dos ejes X sobre el mismo lugar: así la barra del año actual queda dentro de la del año anterior */}
              <XAxis xAxisId="anterior" dataKey="etiqueta" stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} interval={0} />
              <XAxis xAxisId="actual" dataKey="etiqueta" hide />
              <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} tickFormatter={(v: number) => fmtNumber(v)} width={56} />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
                formatter={(value: number, name: string) => [
                  value === null || value === undefined ? "—" : value.toLocaleString("es-CO", { maximumFractionDigits: 1 }),
                  name,
                ]}
                contentStyle={{ background: "#0d0d0d", border: "1px solid #3a3a3a", borderRadius: 10 }}
                labelStyle={{ color: "#f7f7f5", fontWeight: 600 }}
              />
              <Bar xAxisId="anterior" dataKey="anterior" name={String(anioAnterior)} barSize={vista === "anual" ? 120 : vista === "trimestral" ? 72 : 34} radius={[6, 6, 0, 0]}>
                {serie.map((p) => (
                  <Cell key={p.clave} fill={p.clave === claveSel ? COLOR_ANTERIOR_SEL : COLOR_ANTERIOR} />
                ))}
              </Bar>
              <Bar xAxisId="actual" dataKey="actual" name={String(anioActual)} barSize={vista === "anual" ? 56 : vista === "trimestral" ? 30 : 14} radius={[4, 4, 0, 0]}>
                {serie.map((p) => (
                  <Cell key={p.clave} fill={p.clave === claveSel ? COLOR_ACTUAL_SEL : COLOR_ACTUAL} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-2 text-[11px] text-paper/45">
        Barra ancha: {anioAnterior} · barra interna: {anioActual}. El periodo elegido arriba se resalta en tono más claro.
      </p>
    </div>
  );
}
