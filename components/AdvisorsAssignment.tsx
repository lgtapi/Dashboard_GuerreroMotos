"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Vista } from "@/lib/periodos";
import { prepararAsignaciones, sumar } from "@/lib/asignaciones";
import { SheetRow, fmtPct, mesLabel, mesLabelCorto, pctChange } from "@/lib/types";

const COLOR_A = "#ff5803";
const COLOR_B = "#ffb23c";
// Negocios: tonos de la marca, distintos también en luminosidad
const COLORES_NEGOCIO = ["#ff5803", "#ffb23c", "#f2e6d8", "#a33a02", "#c9b49c", "#ff9a5c", "#6b6259"];

const num = (n: number) => n.toLocaleString("es-CO", { maximumFractionDigits: 1 });

// Asignación de asesores / agentes (hoja Asignación_Asesores): compara por
// fechas (periodos del selector), por asesor y por negocio.
export function AdvisorsAssignment({
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
  const datos = useMemo(() => prepararAsignaciones(rows, vista), [rows, vista]);
  const [negocioElegido, setNegocio] = useState("Todos");
  const [periodoMatriz, setPeriodoMatriz] = useState<"A" | "B">("B");

  if (!rows || rows.length === 0) {
    return <Aviso>No se encontraron datos en la hoja <strong>Asignación_Asesores</strong>. Revisa que exista con ese nombre exacto.</Aviso>;
  }
  if (!datos.columnaFecha || !datos.columnaAsesor) {
    return (
      <Aviso>
        La hoja <strong>Asignación_Asesores</strong> necesita una columna de fecha (<em>Fecha</em> o <em>Mes</em>) y una del asesor
        (<em>Asesor</em> o <em>Agente</em>). Columnas encontradas: {datos.columnas.join(", ") || "ninguna"}.
      </Aviso>
    );
  }
  if (datos.registros.length === 0) {
    return <Aviso>La hoja Asignación_Asesores todavía no tiene asignaciones con fecha y asesor.</Aviso>;
  }

  const negocio = negocioElegido === "Todos" || datos.negocios.includes(negocioElegido) ? negocioElegido : "Todos";
  const hayNegocio = !!datos.columnaNegocio && datos.negocios.length > 0;
  const labelA = mesLabel(mesA);
  const labelB = mesLabel(mesB);

  // 1) Por asesor: periodo A vs B
  const porAsesor = datos.asesores
    .map((asesor) => ({
      asesor,
      a: sumar(datos, { periodo: mesA, asesor, negocio }),
      b: sumar(datos, { periodo: mesB, asesor, negocio }),
    }))
    .filter((f) => f.a > 0 || f.b > 0);
  const topeAsesor = Math.max(1, ...porAsesor.flatMap((f) => [f.a, f.b]));
  const totalA = porAsesor.reduce((s, f) => s + f.a, 0);
  const totalB = porAsesor.reduce((s, f) => s + f.b, 0);
  const cambioTotal = pctChange(totalA, totalB);

  // 2) Matriz asesor × negocio en el periodo elegido
  const periodoM = periodoMatriz === "A" ? mesA : mesB;
  const negociosMatriz = negocio === "Todos" ? datos.negocios : [negocio];
  const matriz = datos.asesores
    .map((asesor) => ({
      asesor,
      celdas: negociosMatriz.map((n) => sumar(datos, { periodo: periodoM, asesor, negocio: n })),
    }))
    .filter((f) => f.celdas.some((v) => v > 0));
  const topeMatriz = Math.max(1, ...matriz.flatMap((f) => f.celdas));

  // 3) Evolución por periodo, apilada por negocio
  const serie = datos.periodos.map((p) => {
    const fila: Record<string, string | number> = { periodo: p, corto: mesLabelCorto(p), largo: mesLabel(p) };
    negociosMatriz.forEach((n) => (fila[n] = sumar(datos, { periodo: p, negocio: n })));
    return fila;
  });
  const colorNegocio = (n: string) => COLORES_NEGOCIO[datos.negocios.indexOf(n) % COLORES_NEGOCIO.length];

  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
      activo ? "border-brand bg-brand text-asphalt-900" : "border-line text-paper/70 hover:border-brand hover:text-brand"
    }`;
  const unidad = vista === "mensual" ? "mes" : vista === "trimestral" ? "trimestre" : "año";

  return (
    <div className="flex flex-col gap-4">
      {hayNegocio && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-asphalt-800 px-5 py-4 print:hidden" role="group" aria-label="Negocio">
          <span className="mr-1 font-display text-xs uppercase tracking-wide text-paper/55">Negocio</span>
          {["Todos", ...datos.negocios].map((n) => (
            <button key={n} type="button" aria-pressed={n === negocio} onClick={() => setNegocio(n)} className={chip(n === negocio)}>
              {n}
            </button>
          ))}
        </div>
      )}

      {/* 1. Por asesor, comparando fechas */}
      <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-sm uppercase tracking-wide text-paper/70">
              Asignaciones por asesor{negocio !== "Todos" ? ` · ${negocio}` : ""}
            </p>
            <div className="mt-1 flex gap-4 text-[11px] text-paper/60">
              <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_A }} />{labelA}</span>
              <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_B }} />{labelB}</span>
            </div>
          </div>
          <div className="rounded-xl border border-line bg-asphalt-900 px-4 py-2 text-right">
            <div className="text-[11px] uppercase tracking-wide text-paper/50">Total asignaciones</div>
            <div className="flex items-baseline justify-end gap-2 font-display text-lg font-bold">
              <span className="text-paper/60">{num(totalA)}</span>
              <span className="text-brand">→</span>
              <span className="text-paper">{num(totalB)}</span>
              {cambioTotal !== null && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${cambioTotal >= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
                  {cambioTotal >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(cambioTotal)).replace("+", "")}
                </span>
              )}
            </div>
          </div>
        </div>

        {porAsesor.length === 0 ? (
          <p className="py-6 text-center text-sm text-paper/50">No hay asignaciones en {labelA} ni en {labelB}.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {porAsesor.map((f) => {
              const cambio = pctChange(f.a, f.b);
              return (
                <li key={f.asesor} className="grid grid-cols-[minmax(90px,160px)_1fr_auto] items-center gap-3">
                  <span className="truncate text-sm text-paper/85" title={f.asesor}>{f.asesor}</span>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="h-3 rounded-r" style={{ width: `${(f.a / topeAsesor) * 100}%`, minWidth: f.a ? 3 : 0, background: COLOR_A }} />
                      <span className="text-[11px] text-paper/60">{num(f.a)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 rounded-r" style={{ width: `${(f.b / topeAsesor) * 100}%`, minWidth: f.b ? 3 : 0, background: COLOR_B }} />
                      <span className="text-[11px] font-semibold text-paper">{num(f.b)}</span>
                    </div>
                  </div>
                  <span className={`w-16 text-right text-xs font-bold ${cambio === null ? "text-paper/40" : cambio >= 0 ? "text-up" : "text-down"}`}>
                    {cambio === null ? "nuevo" : `${cambio >= 0 ? "▲" : "▼"} ${fmtPct(Math.abs(cambio)).replace("+", "")}`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 2. Asesor × negocio */}
      {hayNegocio && (
        <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-sm uppercase tracking-wide text-paper/70">Asesor × negocio · {mesLabel(periodoM)}</p>
            <div className="flex gap-2 print:hidden" role="group" aria-label="Periodo de la matriz">
              <button type="button" aria-pressed={periodoMatriz === "A"} onClick={() => setPeriodoMatriz("A")} className={chip(periodoMatriz === "A")}>{labelA}</button>
              <button type="button" aria-pressed={periodoMatriz === "B"} onClick={() => setPeriodoMatriz("B")} className={chip(periodoMatriz === "B")}>{labelB}</button>
            </div>
          </div>
          {matriz.length === 0 ? (
            <p className="py-6 text-center text-sm text-paper/50">No hay asignaciones en {mesLabel(periodoM)}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-1 text-sm">
                <thead>
                  <tr>
                    <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-paper/45">Asesor</th>
                    {negociosMatriz.map((n) => (
                      <th key={n} className="px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-paper/60">{n}</th>
                    ))}
                    <th className="px-2 text-right text-[11px] font-semibold uppercase tracking-wide text-paper/45">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {matriz.map((f) => (
                    <tr key={f.asesor}>
                      <td className="whitespace-nowrap pr-3 text-paper/85">{f.asesor}</td>
                      {f.celdas.map((v, i) => {
                        const t = v / topeMatriz;
                        return (
                          <td
                            key={negociosMatriz[i]}
                            className="h-10 min-w-[64px] rounded-md text-center font-display text-base font-semibold"
                            style={{
                              background: v ? `rgba(255,88,3,${0.12 + t * 0.78})` : "rgba(255,255,255,0.03)",
                              color: t > 0.55 ? "#111" : v ? "#f7f7f5" : "rgba(247,247,245,0.3)",
                            }}
                          >
                            {v ? num(v) : "·"}
                          </td>
                        );
                      })}
                      <td className="pl-2 text-right font-display font-bold text-paper">{num(f.celdas.reduce((s, v) => s + v, 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-2 text-[11px] text-paper/45">Naranja más intenso = más asignaciones.</p>
        </div>
      )}

      {/* 3. Evolución por fecha, por negocio */}
      {serie.length > 0 && (
        <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-sm uppercase tracking-wide text-paper/70">Asignaciones por {unidad}{hayNegocio ? " y negocio" : ""}</p>
            {hayNegocio && (
              <div className="flex flex-wrap gap-3 text-[11px] text-paper/60">
                {negociosMatriz.map((n) => (
                  <span key={n} className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colorNegocio(n) }} />{n}</span>
                ))}
              </div>
            )}
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serie} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
                <XAxis
                  dataKey="corto"
                  interval={0}
                  stroke="#a3a3a3"
                  tick={(props: { x: number; y: number; payload: { value: string; index: number } }) => {
                    const p = String(serie[props.payload.index]?.periodo ?? "");
                    const marcado = p === mesA || p === mesB;
                    return (
                      <text x={props.x} y={props.y + 12} textAnchor="middle" fontSize={11} fontWeight={marcado ? 700 : 400} fill={p === mesA ? COLOR_A : p === mesB ? COLOR_B : "#a3a3a3"}>
                        {props.payload.value}
                      </text>
                    );
                  }}
                />
                <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} allowDecimals={false} width={40} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.largo ?? ""}
                  contentStyle={{ background: "#0d0d0d", border: "1px solid #3a3a3a", borderRadius: 10 }}
                  labelStyle={{ color: "#f7f7f5", fontWeight: 600 }}
                />
                {negociosMatriz.map((n, i) => (
                  <Bar
                    key={n}
                    dataKey={n}
                    name={n}
                    stackId="negocio"
                    fill={colorNegocio(n)}
                    stroke="#161616"
                    strokeWidth={1}
                    maxBarSize={48}
                    radius={i === negociosMatriz.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-[11px] text-paper/45">
            Los periodos comparados se marcan en el eje: <span style={{ color: COLOR_A }}>{labelA}</span> y <span style={{ color: COLOR_B }}>{labelB}</span>.
          </p>
        </div>
      )}
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-asphalt-800 p-5 text-sm text-paper/60">{children}</div>;
}
