"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { normalizarMes } from "@/lib/sheets";
import { MESES_ES, type SheetRow } from "@/lib/types";

// Estadísticas de la hoja Leads_Detalle (una fila por lead).
// Todo se calcula solo con las columnas que tenga la hoja:
//  - la columna de fecha (Mes, Fecha o Marca temporal) arma la evolución por mes;
//  - cada columna de texto con pocas opciones (canal, tipo de gestión, moto,
//    asesor…) se grafica como ranking;
//  - si existen canal y tipo de gestión, se cruzan en una matriz.

const COLOR_PERIODO = "#ff5803";
const COLOR_ANTERIOR = "#ffb23c";
const COLOR_OTROS = "rgba(255,88,3,0.35)";

const clave = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const vacio = (v: unknown) => v === null || v === undefined || ["", "null", "n/a", "-", "na"].includes(String(v).trim().toLowerCase());
const etiquetaMes = (k: string) => `${MESES_ES[Number(k.slice(5, 7)) - 1].slice(0, 3)} ${k.slice(2, 4)}`;
const nombreMes = (k: string) => `${MESES_ES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;

const FECHAS = ["Mes", "Fecha", "Marca temporal", "Fecha_registro", "Timestamp"];
// Orden y nombre bonito de los campos conocidos; el resto se agrega después.
const CONOCIDOS: { claves: string[]; titulo: string }[] = [
  { claves: ["canalnormalizado", "canal", "comonosconocio", "medio"], titulo: "¿Cómo nos conoció? (canal)" },
  { claves: ["tipogestion", "tipodegestion", "gestion"], titulo: "Tipo de gestión" },
  { claves: ["motointeres", "motodeinteres", "moto", "modelo"], titulo: "Moto de interés" },
  { claves: ["aquienviooquienloatendio", "aquienvioquienloatendio", "asesor", "atendidopor"], titulo: "¿A quién vio o quién lo atendió?" },
];
// Columnas que no tiene sentido graficar (identifican a la persona)
const EXCLUIR = /nombre|telefono|celular|correo|email|cedula|documento|direccion|comentario|observacion|id$/i;

type Campo = { columna: string; titulo: string };

function detectarCampos(rows: SheetRow[], columnaFecha: string | null): Campo[] {
  const columnas = [...new Set(rows.slice(0, 200).flatMap((r) => Object.keys(r)))];
  const candidatas = columnas.filter((c) => {
    if (c === columnaFecha || EXCLUIR.test(clave(c))) return false;
    const valores = rows.map((r) => r[c]).filter((v) => !vacio(v));
    if (valores.length < Math.max(3, rows.length * 0.2)) return false; // casi vacía
    if (valores.some((v) => typeof v === "number")) return false; // numérica
    const distintos = new Set(valores.map((v) => clave(String(v)))).size;
    return distintos >= 2 && distintos <= 40 && distintos < valores.length * 0.8; // categórica
  });
  const campos: Campo[] = [];
  for (const k of CONOCIDOS) {
    const c = candidatas.find((col) => k.claves.includes(clave(col)));
    if (c) campos.push({ columna: c, titulo: k.titulo });
  }
  for (const c of candidatas) {
    if (!campos.some((f) => f.columna === c)) campos.push({ columna: c, titulo: c.replace(/_/g, " ") });
  }
  return campos;
}

export function LeadsStats({ rows }: { rows: SheetRow[] | null }) {
  const preparado = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const columnas = [...new Set(rows.slice(0, 50).flatMap((r) => Object.keys(r)))];
    const columnaFecha = FECHAS.map((f) => columnas.find((c) => clave(c) === clave(f))).find(Boolean) ?? null;
    const registros = rows
      .map((r) => {
        const m = columnaFecha ? normalizarMes(r[columnaFecha]) : null;
        return { mes: typeof m === "string" && /^\d{4}-\d{2}-01$/.test(m) ? m : null, row: r };
      })
      .filter((r) => !columnaFecha || r.mes);
    const meses = [...new Set(registros.map((r) => r.mes).filter((m): m is string => !!m))].sort();
    return { columnaFecha, registros, meses, campos: detectarCampos(rows, columnaFecha) };
  }, [rows]);

  const [mesElegido, setMes] = useState<string | null>(null); // null = último mes con datos
  const [filtroCanal, setFiltroCanal] = useState("Todos");

  if (!preparado || preparado.registros.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-asphalt-800 p-5 text-sm text-paper/60">
        No hay registros en la hoja <strong>Leads_Detalle</strong>.
      </div>
    );
  }

  const { registros, meses, campos } = preparado;
  const todos = mesElegido === "todos";
  const mes = todos ? null : mesElegido && meses.includes(mesElegido) ? mesElegido : meses[meses.length - 1] ?? null;
  const mesAnterior = mes ? meses[meses.indexOf(mes) - 1] ?? null : null;

  const campoCanal = campos[0]?.titulo.startsWith("¿Cómo") ? campos[0] : null;
  const opcionesCanal = campoCanal
    ? [...new Set(registros.map((r) => r.row[campoCanal.columna]).filter((v) => !vacio(v)).map((v) => String(v).trim()))].sort()
    : [];
  const pasaCanal = (r: { row: SheetRow }) =>
    filtroCanal === "Todos" || !campoCanal || clave(String(r.row[campoCanal.columna] ?? "")) === clave(filtroCanal);

  const filtrados = registros.filter(pasaCanal);
  const delPeriodo = filtrados.filter((r) => todos || !mes || r.mes === mes);
  const delAnterior = mesAnterior ? filtrados.filter((r) => r.mes === mesAnterior) : [];
  const cambio = mesAnterior && delAnterior.length > 0 ? ((delPeriodo.length - delAnterior.length) / delAnterior.length) * 100 : null;

  // Evolución mensual
  const porMes = meses.map((m) => ({
    mes: m,
    nombre: etiquetaMes(m),
    leads: filtrados.filter((r) => r.mes === m).length,
  }));

  // Ranking por campo
  const ranking = (columna: string) => {
    const cuenta = new Map<string, { nombre: string; n: number; antes: number }>();
    for (const r of delPeriodo) {
      const v = r.row[columna];
      if (vacio(v)) continue;
      const t = String(v).trim();
      const e = cuenta.get(clave(t)) ?? { nombre: t, n: 0, antes: 0 };
      e.n += 1;
      cuenta.set(clave(t), e);
    }
    for (const r of delAnterior) {
      const v = r.row[columna];
      if (vacio(v)) continue;
      const e = cuenta.get(clave(String(v).trim()));
      if (e) e.antes += 1;
    }
    const lista = [...cuenta.values()].sort((a, b) => b.n - a.n);
    const total = lista.reduce((s, x) => s + x.n, 0);
    return { lista: lista.slice(0, 8), otros: lista.slice(8).reduce((s, x) => s + x.n, 0), total };
  };

  // Matriz canal × tipo de gestión
  const campoGestion = campos.find((c) => c.titulo === "Tipo de gestión");
  const matriz = campoCanal && campoGestion ? cruzar(delPeriodo, campoCanal.columna, campoGestion.columna) : null;

  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
      activo ? "border-brand bg-brand text-asphalt-900" : "border-line text-paper/70 hover:border-brand hover:text-brand"
    }`;
  const textoPeriodo = todos ? "todo el periodo" : mes ? nombreMes(mes) : "todo el periodo";

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-asphalt-800 px-5 py-4 print:hidden">
        {meses.length > 0 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Mes">
            <span className="mr-1 w-16 font-display text-xs uppercase tracking-wide text-paper/55">Mes</span>
            <button type="button" aria-pressed={todos} onClick={() => setMes("todos")} className={chip(todos)}>
              Todos
            </button>
            {meses.map((m) => (
              <button key={m} type="button" aria-pressed={m === mes} onClick={() => setMes(m)} className={chip(m === mes)}>
                {etiquetaMes(m)}
              </button>
            ))}
          </div>
        )}
        {opcionesCanal.length > 1 && (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Canal">
            <span className="mr-1 w-16 font-display text-xs uppercase tracking-wide text-paper/55">Canal</span>
            {["Todos", ...opcionesCanal].map((c) => (
              <button key={c} type="button" aria-pressed={c === filtroCanal} onClick={() => setFiltroCanal(c)} className={chip(c === filtroCanal)}>
                {c}
              </button>
            ))}
          </div>
        )}
        <p className="pt-1 text-sm text-paper/70">
          <strong className="font-display text-xl text-paper">{delPeriodo.length.toLocaleString("es-CO")}</strong> leads en {textoPeriodo}
          {filtroCanal !== "Todos" ? ` · canal ${filtroCanal}` : ""}
          {cambio !== null && mesAnterior && (
            <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold ${cambio >= 0 ? "bg-up/15 text-up" : "bg-down/15 text-down"}`}>
              {cambio >= 0 ? "▲" : "▼"} {Math.abs(cambio).toLocaleString("es-CO", { maximumFractionDigits: 1 })}% vs {nombreMes(mesAnterior)}
            </span>
          )}
        </p>
      </div>

      {/* Evolución por mes */}
      {porMes.length > 1 && (
        <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
          <h3 className="mb-3 font-display text-sm uppercase tracking-wide text-paper/70">Leads por mes</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porMes} margin={{ top: 22, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
                <XAxis dataKey="nombre" stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} interval={0} />
                <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} allowDecimals={false} width={40} />
                <Tooltip
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                  formatter={(v) => [String(v), "Leads"]}
                  contentStyle={{ background: "#161616", border: "1px solid #2c2c2c", borderRadius: 10 }}
                  labelStyle={{ color: "#f7f7f5", fontWeight: 600 }}
                />
                <Bar dataKey="leads" radius={[6, 6, 0, 0]} maxBarSize={56}>
                  {porMes.map((p) => (
                    <Cell
                      key={p.mes}
                      fill={todos || p.mes === mes ? COLOR_PERIODO : p.mes === mesAnterior ? COLOR_ANTERIOR : COLOR_OTROS}
                    />
                  ))}
                  <LabelList dataKey="leads" position="top" fill="#e5e5e5" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!todos && mes && (
            <p className="mt-2 flex gap-4 text-[11px] text-paper/55">
              <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_PERIODO }} />{nombreMes(mes)}</span>
              {mesAnterior && (
                <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_ANTERIOR }} />{nombreMes(mesAnterior)} (mes anterior)</span>
              )}
            </p>
          )}
        </div>
      )}

      {/* Rankings por campo */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {campos
          .filter((c) => !(filtroCanal !== "Todos" && c === campoCanal))
          .map((c) => {
            const { lista, otros, total } = ranking(c.columna);
            if (lista.length === 0) return null;
            const tope = Math.max(...lista.map((x) => x.n));
            return (
              <div key={c.columna} className="rounded-2xl border border-line bg-asphalt-800 p-5">
                <h3 className="mb-4 font-display text-sm uppercase tracking-wide text-paper/70">{c.titulo}</h3>
                <ul className="flex flex-col gap-2.5">
                  {lista.map((x) => {
                    const pct = total ? (x.n / total) * 100 : 0;
                    const dif = mesAnterior && !todos ? x.n - x.antes : null;
                    return (
                      <li key={x.nombre} className="grid grid-cols-[minmax(90px,170px)_1fr_auto] items-center gap-3">
                        <span className="truncate text-sm text-paper/85" title={x.nombre}>{x.nombre}</span>
                        <div className="h-5 overflow-hidden rounded-md bg-asphalt-900">
                          <div className="h-full rounded-md" style={{ width: `${(x.n / tope) * 100}%`, background: COLOR_PERIODO }} />
                        </div>
                        <span className="w-28 text-right text-xs text-paper/70">
                          <strong className="font-display text-sm text-paper">{x.n}</strong> · {pct.toLocaleString("es-CO", { maximumFractionDigits: 0 })}%
                          {dif !== null && dif !== 0 && (
                            <span className={`ml-1 font-bold ${dif > 0 ? "text-up" : "text-down"}`}>{dif > 0 ? `+${dif}` : dif}</span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                {otros > 0 && <p className="mt-2 text-[11px] text-paper/45">Otros: {otros}</p>}
              </div>
            );
          })}
      </div>

      {/* Matriz canal × tipo de gestión */}
      {matriz && matriz.filas.length > 0 && matriz.columnas.length > 1 && (
        <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
          <h3 className="mb-4 font-display text-sm uppercase tracking-wide text-paper/70">Canal × tipo de gestión · {textoPeriodo}</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-1 text-sm">
              <thead>
                <tr>
                  <th className="text-left text-[11px] font-semibold uppercase tracking-wide text-paper/45">Canal</th>
                  {matriz.columnas.map((g) => (
                    <th key={g} className="px-2 text-center text-[11px] font-semibold uppercase tracking-wide text-paper/60">{g}</th>
                  ))}
                  <th className="px-2 text-right text-[11px] font-semibold uppercase tracking-wide text-paper/45">Total</th>
                </tr>
              </thead>
              <tbody>
                {matriz.filas.map((f) => (
                  <tr key={f.nombre}>
                    <td className="whitespace-nowrap pr-3 text-paper/85">{f.nombre}</td>
                    {f.celdas.map((v, i) => {
                      const t = v / matriz.tope;
                      return (
                        <td
                          key={matriz.columnas[i]}
                          className="h-10 min-w-[64px] rounded-md text-center font-display text-base font-semibold"
                          style={{
                            background: v ? `rgba(255,88,3,${0.12 + t * 0.78})` : "rgba(255,255,255,0.03)",
                            color: t > 0.55 ? "#111" : v ? "#f7f7f5" : "rgba(247,247,245,0.3)",
                          }}
                        >
                          {v || "·"}
                        </td>
                      );
                    })}
                    <td className="pl-2 text-right font-display font-bold text-paper">{f.celdas.reduce((s, v) => s + v, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-paper/45">Naranja más intenso = más leads.</p>
        </div>
      )}
    </div>
  );
}

function cruzar(registros: { row: SheetRow }[], colFila: string, colColumna: string) {
  const nombres = (col: string) => {
    const cuenta = new Map<string, { nombre: string; n: number }>();
    for (const r of registros) {
      const v = r.row[col];
      if (vacio(v)) continue;
      const t = String(v).trim();
      const e = cuenta.get(clave(t)) ?? { nombre: t, n: 0 };
      e.n += 1;
      cuenta.set(clave(t), e);
    }
    return [...cuenta.values()].sort((a, b) => b.n - a.n).slice(0, 8).map((x) => x.nombre);
  };
  const filasN = nombres(colFila);
  const columnas = nombres(colColumna);
  const filas = filasN.map((nombre) => ({
    nombre,
    celdas: columnas.map(
      (g) =>
        registros.filter((r) => clave(String(r.row[colFila] ?? "")) === clave(nombre) && clave(String(r.row[colColumna] ?? "")) === clave(g)).length
    ),
  }));
  return { filas, columnas, tope: Math.max(1, ...filas.flatMap((f) => f.celdas)) };
}