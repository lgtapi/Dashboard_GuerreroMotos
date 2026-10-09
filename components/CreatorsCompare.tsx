"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Vista } from "@/lib/periodos";
import { prepararCreadores } from "@/lib/creadores";
import { SheetRow, fmtNumber, mesLabel, mesLabelCorto } from "@/lib/types";

const COLOR_1 = "#ff5803"; // creador 1: naranja de la marca
const COLOR_2 = "#ffb23c"; // creador 2: ámbar (más claro, se distingue también por luminosidad)

const nombre = (k: string) => k.replace(/_/g, " ");

// Comparativo cara a cara entre dos creadores de contenido (hoja
// creadores_contenido). Responde a la vista (mes / trimestre / año) y a los
// dos periodos elegidos en el selector del dashboard.
export function CreatorsCompare({
  rows,
  vista,
  mesA,
  mesB,
}: {
  rows: SheetRow[] | null;
  vista: Vista;
  mesA: string;
  mesB: string;
}) {
  const datos = useMemo(() => prepararCreadores(rows, vista), [rows, vista]);
  const [c1Elegido, setC1] = useState("");
  const [c2Elegido, setC2] = useState("");
  const [plataforma, setPlataforma] = useState("Todas");
  const [periodoElegido, setPeriodo] = useState<"A" | "B">("B");
  const [metricaElegida, setMetrica] = useState("");

  if (!rows || rows.length === 0) {
    return (
      <Aviso>
        No se encontraron datos en la hoja <strong>creadores_contenido</strong>. Revisa que exista con ese nombre exacto.
      </Aviso>
    );
  }
  if (!datos.columnaCreador || !datos.columnaFecha) {
    return (
      <Aviso>
        La hoja <strong>creadores_contenido</strong> necesita una columna con el nombre del creador (por ejemplo{" "}
        <em>Creador</em>) y otra con el mes (<em>Mes</em> o <em>Fecha</em>). Columnas encontradas:{" "}
        {datos.columnas.join(", ") || "ninguna"}.
      </Aviso>
    );
  }
  if (datos.creadores.length === 0 || datos.metricas.length === 0) {
    return <Aviso>La hoja creadores_contenido todavía no tiene filas con creador, mes y métricas numéricas.</Aviso>;
  }

  const c1 = datos.creadores.includes(c1Elegido) ? c1Elegido : datos.creadores[0];
  const c2Opciones = datos.creadores.filter((c) => c !== c1);
  const c2 = c2Opciones.includes(c2Elegido) ? c2Elegido : c2Opciones[0] ?? c1;
  const metrica = datos.metricas.includes(metricaElegida) ? metricaElegida : datos.metricas[0];
  const periodo = periodoElegido === "A" ? mesA : mesB;
  const plat = datos.plataformas.includes(plataforma) ? plataforma : "Todas";

  // Cara a cara: una fila por métrica
  const filas = datos.metricas
    .map((m) => {
      const v1 = datos.valor(periodo, c1, m, plat);
      const v2 = datos.valor(periodo, c2, m, plat);
      const tope = Math.max(v1 ?? 0, v2 ?? 0);
      return {
        m,
        v1,
        v2,
        w1: tope > 0 && v1 ? `${(v1 / tope) * 100}%` : "0%",
        w2: tope > 0 && v2 ? `${(v2 / tope) * 100}%` : "0%",
        gana: v1 === null || v2 === null || v1 === v2 ? 0 : v1 > v2 ? 1 : 2,
      };
    })
    .filter((f) => f.v1 !== null || f.v2 !== null);
  const victorias1 = filas.filter((f) => f.gana === 1).length;
  const victorias2 = filas.filter((f) => f.gana === 2).length;

  // Evolución por periodo de la métrica elegida
  const serie = datos.periodos.map((p) => ({
    periodo: p,
    corto: mesLabelCorto(p),
    largo: mesLabel(p),
    c1: datos.valor(p, c1, metrica, plat),
    c2: datos.valor(p, c2, metrica, plat),
  }));

  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
      activo ? "border-brand bg-brand text-asphalt-900" : "border-line text-paper/70 hover:border-brand hover:text-brand"
    }`;
  const selectCls =
    "rounded-full border border-line bg-asphalt-900 px-3 py-1.5 font-display text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-brand";

  return (
    <div className="flex flex-col gap-4">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-asphalt-800 px-5 py-4 print:hidden">
        <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-paper/55">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_1 }} />
          Creador 1
          <select value={c1} onChange={(e) => setC1(e.target.value)} className={selectCls} style={{ color: COLOR_1 }}>
            {datos.creadores.map((c) => (
              <option key={c} value={c} className="bg-asphalt-900 text-paper">{c}</option>
            ))}
          </select>
        </label>
        <span className="font-display text-sm text-paper/50">vs</span>
        <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-paper/55">
          <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COLOR_2 }} />
          Creador 2
          <select value={c2} onChange={(e) => setC2(e.target.value)} className={selectCls} style={{ color: COLOR_2 }}>
            {c2Opciones.map((c) => (
              <option key={c} value={c} className="bg-asphalt-900 text-paper">{c}</option>
            ))}
          </select>
        </label>
        <div className="ml-auto flex flex-wrap items-center gap-2" role="group" aria-label="Periodo">
          <button type="button" aria-pressed={periodoElegido === "A"} onClick={() => setPeriodo("A")} className={chip(periodoElegido === "A")}>
            {mesLabel(mesA)}
          </button>
          <button type="button" aria-pressed={periodoElegido === "B"} onClick={() => setPeriodo("B")} className={chip(periodoElegido === "B")}>
            {mesLabel(mesB)}
          </button>
        </div>
        {datos.plataformas.length > 0 && (
          <div className="flex basis-full flex-wrap items-center gap-2" role="group" aria-label="Plataforma">
            <span className="mr-1 font-display text-xs uppercase tracking-wide text-paper/55">Plataforma</span>
            {["Todas", ...datos.plataformas].map((p) => (
              <button key={p} type="button" aria-pressed={p === plat} onClick={() => setPlataforma(p)} className={chip(p === plat)}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cara a cara */}
      <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <p className="font-display text-sm uppercase tracking-wide text-paper/70">Cara a cara · {mesLabel(periodo)}</p>
          {filas.length > 0 && (
            <p className="text-xs text-paper/60">
              {c1} gana en <strong style={{ color: COLOR_1 }}>{victorias1}</strong> · {c2} gana en{" "}
              <strong style={{ color: COLOR_2 }}>{victorias2}</strong>
            </p>
          )}
        </div>

        {filas.length === 0 ? (
          <p className="py-8 text-center text-sm text-paper/50">No hay datos de estos creadores en {mesLabel(periodo)}.</p>
        ) : (
          <>
            <div className="mb-2 grid grid-cols-[1fr_auto_1fr] items-center gap-3 font-display text-sm font-bold uppercase">
              <span className="text-right" style={{ color: COLOR_1 }}>{c1}</span>
              <span className="w-28 text-center text-[11px] font-semibold text-paper/40 sm:w-36">Métrica</span>
              <span style={{ color: COLOR_2 }}>{c2}</span>
            </div>
            <ul className="flex flex-col gap-2.5">
              {filas.map((f) => (
                <li key={f.m} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                  <div className="flex items-center justify-end gap-2">
                    <span className={`font-display text-sm ${f.gana === 1 ? "font-bold text-paper" : "text-paper/60"}`}>{fmtNumber(f.v1)}</span>
                    <div className="flex h-6 w-full max-w-[320px] justify-end overflow-hidden rounded-l-md bg-asphalt-900">
                      <div className="h-full rounded-l-md" style={{ width: f.w1, background: COLOR_1, opacity: f.gana === 2 ? 0.55 : 1 }} />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMetrica(f.m)}
                    aria-pressed={f.m === metrica}
                    className={`w-28 rounded-full px-2 py-1 text-center text-[11px] font-semibold uppercase tracking-wide sm:w-36 ${
                      f.m === metrica ? "bg-paper text-asphalt-900" : "text-paper/70 hover:text-paper"
                    }`}
                    title="Ver evolución por mes"
                  >
                    {nombre(f.m)}
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-full max-w-[320px] overflow-hidden rounded-r-md bg-asphalt-900">
                      <div className="h-full rounded-r-md" style={{ width: f.w2, background: COLOR_2, opacity: f.gana === 1 ? 0.55 : 1 }} />
                    </div>
                    <span className={`font-display text-sm ${f.gana === 2 ? "font-bold text-paper" : "text-paper/60"}`}>{fmtNumber(f.v2)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-paper/45">
              Cada fila se escala a su propio máximo. Toca el nombre de una métrica para ver su evolución por {vista === "mensual" ? "mes" : vista === "trimestral" ? "trimestre" : "año"}.
            </p>
          </>
        )}
      </div>

      {/* Evolución */}
      {serie.length > 0 && (
        <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-sm uppercase tracking-wide text-paper/70">
              {nombre(metrica)} · evolución por {vista === "mensual" ? "mes" : vista === "trimestral" ? "trimestre" : "año"}
            </p>
            <div className="flex gap-4 text-[11px] text-paper/60">
              <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4" style={{ background: COLOR_1 }} />{c1}</span>
              <span className="flex items-center gap-1.5"><i className="inline-block h-0.5 w-4" style={{ background: COLOR_2 }} />{c2}</span>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 16, right: 28, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
                <XAxis dataKey="corto" stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} interval={0} />
                <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} tickFormatter={(v: number) => fmtNumber(v)} width={56} />
                <ReferenceLine x={mesLabelCorto(periodo)} stroke="#f7f7f5" strokeOpacity={0.35} strokeDasharray="4 4" />
                <Tooltip
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.largo ?? ""}
                  formatter={(value: number, name: string) => [
                    value === null || value === undefined ? "—" : value.toLocaleString("es-CO", { maximumFractionDigits: 1 }),
                    name,
                  ]}
                  contentStyle={{ background: "#0d0d0d", border: "1px solid #3a3a3a", borderRadius: 10 }}
                  labelStyle={{ color: "#f7f7f5", fontWeight: 600 }}
                />
                <Line type="monotone" dataKey="c1" name={c1} stroke={COLOR_1} strokeWidth={3} dot={{ r: 4, fill: COLOR_1 }} connectNulls />
                <Line type="monotone" dataKey="c2" name={c2} stroke={COLOR_2} strokeWidth={3} strokeDasharray="6 4" dot={{ r: 4, fill: COLOR_2 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-paper/45">La línea punteada vertical marca {mesLabel(periodo)}.</p>
        </div>
      )}
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-asphalt-800 p-5 text-sm text-paper/60">{children}</div>;
}
