"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { normalizarMes } from "@/lib/sheets";
import { MESES_ES, type SheetRow } from "@/lib/types";

// Gráficas de la hoja Asignación_Asesores.
// Acepta una fila por asignación (cada fila cuenta 1) o filas resumidas con una
// columna de cantidad (Asignaciones, Cantidad, Total…), que se suma.
//  1. Asignaciones por mes, apiladas por negocio.
//  2. Asignaciones por asesor en el mes elegido, frente al mes anterior.
//  3. Matriz asesor × negocio.

const COLOR_MES = "#ff5803";
const COLOR_ANTERIOR = "#ffb23c";
const COLORES_NEGOCIO = ["#ff5803", "#4c8dff", "#ffb23c", "#3fd6c6", "#e1306c", "#a78bfa", "#f2e6d8", "#4ade80"];

const clave = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const vacio = (v: unknown) => v === null || v === undefined || ["", "null", "n/a", "-", "na"].includes(String(v).trim().toLowerCase());
const buscar = (columnas: string[], opciones: string[]) =>
  opciones.map((o) => columnas.find((c) => clave(c) === clave(o))).find(Boolean) ??
  opciones.map((o) => columnas.find((c) => clave(c).includes(clave(o)))).find(Boolean) ??
  null;
const etiquetaMes = (k: string) => `${MESES_ES[Number(k.slice(5, 7)) - 1].slice(0, 3)} ${k.slice(2, 4)}`;
const nombreMes = (k: string) => `${MESES_ES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
const num = (v: number) => v.toLocaleString("es-CO", { maximumFractionDigits: 1 });

type Registro = { mes: string; asesor: string; negocio: string; n: number };

export function AdvisorsStats({ rows }: { rows: SheetRow[] | null }) {
  const datos = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const columnas = [...new Set(rows.slice(0, 100).flatMap((r) => Object.keys(r)))];
    const colFecha = buscar(columnas, ["Fecha", "Mes", "Fecha_asignacion", "Fecha de asignación", "Marca temporal"]);
    const colAsesor = buscar(columnas, ["Asesor", "Agente", "Asesor_asignado", "Asesor asignado", "Agente asignado", "Vendedor", "Responsable"]);
    const colNegocio = buscar(columnas, ["Negocio", "Linea_negocio", "Línea de negocio", "Unidad de negocio", "Tipo de negocio", "Sede"]);
    const candCantidad = buscar(columnas, ["Asignaciones", "Cantidad", "Total", "Leads", "Casos"]);
    const colCantidad = candCantidad && rows.some((r) => typeof r[candCantidad] === "number") ? candCantidad : null;

    const registros: Registro[] = [];
    if (colFecha && colAsesor) {
      for (const r of rows) {
        const mes = normalizarMes(r[colFecha]);
        if (typeof mes !== "string" || !/^\d{4}-\d{2}-01$/.test(mes) || vacio(r[colAsesor])) continue;
        const n = colCantidad ? r[colCantidad] : 1;
        if (typeof n !== "number") continue;
        registros.push({
          mes,
          asesor: String(r[colAsesor]).trim(),
          negocio: colNegocio && !vacio(r[colNegocio]) ? String(r[colNegocio]).trim() : "Sin negocio",
          n,
        });
      }
    }
    const orden = (k: "asesor" | "negocio") => {
      const t = new Map<string, number>();
      registros.forEach((r) => t.set(r[k], (t.get(r[k]) ?? 0) + r.n));
      return [...t.entries()].sort((a, b) => b[1] - a[1]).map(([x]) => x);
    };
    return {
      columnas,
      colFecha,
      colAsesor,
      colNegocio,
      registros,
      meses: [...new Set(registros.map((r) => r.mes))].sort(),
      asesores: orden("asesor"),
      negocios: orden("negocio"),
    };
  }, [rows]);

  const [mesElegido, setMes] = useState<string | null>(null); // null = último mes
  const [negocioElegido, setNegocio] = useState("Todos");

  if (!datos) return <Aviso>No hay registros en la hoja <strong>Asignación_Asesores</strong>.</Aviso>;
  if (!datos.colFecha || !datos.colAsesor) {
    return (
      <Aviso>
        La hoja <strong>Asignación_Asesores</strong> necesita una columna de fecha (<em>Fecha</em> o <em>Mes</em>) y una del asesor
        (<em>Asesor</em> o <em>Agente</em>). Columnas encontradas: {datos.columnas.join(", ")}.
      </Aviso>
    );
  }
  if (datos.registros.length === 0) return <Aviso>La hoja Asignación_Asesores todavía no tiene asignaciones con fecha y asesor.</Aviso>;

  const { registros, meses, asesores, negocios } = datos;
  const hayNegocio = !!datos.colNegocio && negocios.length > 0;
  const negocio = negocios.includes(negocioElegido) ? negocioElegido : "Todos";
  const todos = mesElegido === "todos";
  const mes = todos ? null : mesElegido && meses.includes(mesElegido) ? mesElegido : meses[meses.length - 1];
  const mesAnterior = mes ? meses[meses.indexOf(mes) - 1] ?? null : null;
  const negociosVisibles = negocio === "Todos" ? negocios : [negocio];
  const colorNegocio = (n: string) => COLORES_NEGOCIO[negocios.indexOf(n) % COLORES_NEGOCIO.length];

  const sumar = (f: (r: Registro) => boolean) => registros.reduce((s, r) => (f(r) ? s + r.n : s), 0);
  const pasaNegocio = (r: Registro) => negocio === "Todos" || r.negocio === negocio;
  const enPeriodo = (r: Registro) => todos || r.mes === mes;

  // 1. Por mes, apilado por negocio
  const porMes = meses.map((m) => {
    const fila: Record<string, string | number> = { nombre: etiquetaMes(m) };
    negociosVisibles.forEach((n) => (fila[n] = sumar((r) => r.mes === m && r.negocio === n)));
    return fila;
  });

  // 2. Por asesor: periodo elegido vs mes anterior
  const porAsesor = asesores
    .map((a) => ({
      asesor: a,
      actual: sumar((r) => enPeriodo(r) && pasaNegocio(r) && r.asesor === a),
      anterior: mesAnterior && !todos ? sumar((r) => r.mes === mesAnterior && pasaNegocio(r) && r.asesor === a) : null,
    }))
    .filter((f) => f.actual > 0 || (f.anterior ?? 0) > 0);
  const tope = Math.max(1, ...porAsesor.flatMap((f) => [f.actual, f.anterior ?? 0]));
  const totalActual = porAsesor.reduce((s, f) => s + f.actual, 0);
  const totalAnterior = porAsesor.reduce((s, f) => s + (f.anterior ?? 0), 0);
  const cambioTotal = mesAnterior && !todos && totalAnterior > 0 ? ((totalActual - totalAnterior) / totalAnterior) * 100 : null;

  // 3. Matriz asesor × negocio
  const matriz = asesores
    .map((a) => ({ asesor: a, celdas: negociosVisibles.map((n) => sumar((r) => enPeriodo(r) && r.asesor === a && r.negocio === n)) }))
    .filter((f) => f.celdas.some((v) => v > 0));
  const topeMatriz = Math.max(1, ...matriz.flatMap((f) => f.celdas));

  const textoPeriodo = todos ? "todos los meses" : mes ? nombreMes(mes) : "";
  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
      activo ? "border-brand bg-brand text-asphalt-900" : "border-line text-paper/70 hover:border-brand hover:text-brand"
    }`;

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-asphalt-800 px-5 py-4 print:hidden">
        <Fila etiqueta="Mes">
          <button type="button" aria-pressed={todos} onClick={() => setMes("todos")} className={chip(todos)}>
            Todos
          </button>
          {meses.map((m) => (
            <button key={m} type="button" aria-pressed={m === mes} onClick={() => setMes(m)} className={chip(m === mes)}>
              {etiquetaMes(m)}
            </button>
          ))}
        </Fila>
        {hayNegocio && (
          <Fila etiqueta="Negocio">
            {["Todos", ...negocios].map((n) => (
              <button key={n} type="button" aria-pressed={n === negocio} onClick={() => setNegocio(n)} className={chip(n === negocio)}>
                {n}
              </button>
            ))}
          </Fila>
        )}
        <p className="pt-1 text-sm text-paper/70">
          <strong className="font-display text-xl text-paper">{num(totalActual)}</strong> asignaciones en {textoPeriodo}
          {negocio !== "Todos" ? ` · ${negocio}` : ""}
          {cambioTotal !== null && mesAnterior && (
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${cambioTotal >= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
              {cambioTotal >= 0 ? "▲" : "▼"} {Math.abs(cambioTotal).toLocaleString("es-CO", { maximumFractionDigits: 1 })}% vs {nombreMes(mesAnterior)}
            </span>
          )}
        </p>
      </div>

      {/* 1. Por mes y negocio */}
      {porMes.length > 0 && (
        <Tarjeta titulo={`Asignaciones por mes${hayNegocio ? " y negocio" : ""}`}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMes} margin={{ top: 10, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
                <XAxis dataKey="nombre" stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} interval={0} />
                <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} allowDecimals={false} width={40} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  contentStyle={{ background: "#161616", border: "1px solid #2c2c2c", borderRadius: 10 }}
                  labelStyle={{ color: "#f7f7f5", fontWeight: 600 }}
                />
                {hayNegocio && <Legend wrapperStyle={{ fontSize: 12, color: "#a3a3a3" }} />}
                {negociosVisibles.map((n, i) => (
                  <Bar
                    key={n}
                    dataKey={n}
                    name={n}
                    stackId="negocio"
                    fill={colorNegocio(n)}
                    stroke="#161616"
                    strokeWidth={1}
                    maxBarSize={48}
                    radius={i === negociosVisibles.length - 1 ? [5, 5, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>
      )}

      {/* 2. Por asesor */}
      <Tarjeta titulo={`Asignaciones por asesor · ${textoPeriodo}${negocio !== "Todos" ? ` · ${negocio}` : ""}`}>
        {mesAnterior && !todos && (
          <div className="-mt-1 mb-3 flex gap-4 text-[11px] text-paper/60">
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_MES }} />{mes && nombreMes(mes)}</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_ANTERIOR }} />{nombreMes(mesAnterior)}</span>
          </div>
        )}
        {porAsesor.length === 0 ? (
          <p className="py-6 text-center text-sm text-paper/50">No hay asignaciones en {textoPeriodo}.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {porAsesor.map((f) => {
              const cambio = f.anterior ? ((f.actual - f.anterior) / f.anterior) * 100 : null;
              return (
                <li key={f.asesor} className="grid grid-cols-[minmax(90px,170px)_1fr_auto] items-center gap-3">
                  <span className="truncate text-sm text-paper/85" title={f.asesor}>{f.asesor}</span>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <div className="h-3.5 rounded-r" style={{ width: `${(f.actual / tope) * 100}%`, minWidth: f.actual ? 3 : 0, background: COLOR_MES }} />
                      <span className="text-xs font-semibold text-paper">{num(f.actual)}</span>
                    </div>
                    {f.anterior !== null && (
                      <div className="flex items-center gap-2">
                        <div className="h-2 rounded-r" style={{ width: `${(f.anterior / tope) * 100}%`, minWidth: f.anterior ? 3 : 0, background: COLOR_ANTERIOR }} />
                        <span className="text-[11px] text-paper/55">{num(f.anterior)}</span>
                      </div>
                    )}
                  </div>
                  <span className={`w-16 text-right text-xs font-bold ${cambio === null ? "text-paper/40" : cambio >= 0 ? "text-up" : "text-down"}`}>
                    {f.anterior === null ? "" : cambio === null ? "nuevo" : `${cambio >= 0 ? "▲" : "▼"} ${Math.abs(cambio).toLocaleString("es-CO", { maximumFractionDigits: 0 })}%`}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      {/* 3. Matriz asesor × negocio */}
      {hayNegocio && matriz.length > 0 && (
        <Tarjeta titulo={`Asesor × negocio · ${textoPeriodo}`}>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-paper/45">Asesor</th>
                  {negociosVisibles.map((n) => (
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
                          key={negociosVisibles[i]}
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
          <p className="mt-2 text-[11px] text-paper/45">Naranja más intenso = más asignaciones.</p>
        </Tarjeta>
      )}
    </div>
  );
}

function Fila({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={etiqueta}>
      <span className="mr-1 w-16 font-display text-xs uppercase tracking-wide text-paper/55">{etiqueta}</span>
      {children}
    </div>
  );
}

function Tarjeta({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
      <h3 className="mb-3 font-display text-sm uppercase tracking-wide text-paper/70">{titulo}</h3>
      {children}
    </div>
  );
}

function Aviso({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-line bg-asphalt-800 p-5 text-sm text-paper/60">{children}</div>;
}