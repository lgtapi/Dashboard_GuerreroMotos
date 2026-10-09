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
import { MESES_ES, fmtNumber, type SheetRow } from "@/lib/types";

// Gráficas de la hoja creadores_contenido.
//  1. General: cada creador mes a mes (todas las redes o la red elegida).
//  2. Por red: cada creador en cada red social, en el mes elegido.
//  3. Tabla creador × red con totales.
// Las columnas se detectan solas: creador, mes/fecha, plataforma y las métricas numéricas.

const COLORES = ["#ff5803", "#4c8dff", "#ffb23c", "#3fd6c6", "#e1306c", "#a78bfa", "#f2e6d8", "#4ade80"];

const clave = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const buscar = (columnas: string[], opciones: string[]) =>
  opciones.map((o) => columnas.find((c) => clave(c) === clave(o))).find(Boolean) ??
  opciones.map((o) => columnas.find((c) => clave(c).includes(clave(o)))).find(Boolean) ??
  null;
const etiquetaMes = (k: string) => `${MESES_ES[Number(k.slice(5, 7)) - 1].slice(0, 3)} ${k.slice(2, 4)}`;
const nombreMes = (k: string) => `${MESES_ES[Number(k.slice(5, 7)) - 1]} ${k.slice(0, 4)}`;
const num = (v: number) => v.toLocaleString("es-CO", { maximumFractionDigits: 1 });

export function CreatorsStats({ rows }: { rows: SheetRow[] | null }) {
  const datos = useMemo(() => {
    if (!rows || rows.length === 0) return null;
    const columnas = [...new Set(rows.slice(0, 100).flatMap((r) => Object.keys(r)))];
    const colCreador = buscar(columnas, ["Creador", "Creador_contenido", "Creador de contenido", "Creadores", "Nombre", "Influencer", "Perfil"]);
    const colFecha = buscar(columnas, ["Mes", "Fecha"]);
    const colRed = buscar(columnas, ["Plataforma", "Red social", "Red"]);
    const fijas = [colCreador, colFecha, colRed];
    const metricas = columnas.filter(
      (c) => !fijas.includes(c) && !/var/i.test(c) && rows.some((r) => typeof r[c] === "number")
    );
    const registros = rows
      .map((r) => {
        const m = colFecha ? normalizarMes(r[colFecha]) : null;
        return {
          mes: typeof m === "string" && /^\d{4}-\d{2}-01$/.test(m) ? m : null,
          creador: colCreador ? String(r[colCreador] ?? "").trim() : "",
          red: colRed ? String(r[colRed] ?? "").trim() : "General",
          row: r,
        };
      })
      .filter((r) => r.creador && r.mes);
    return {
      columnas,
      colCreador,
      colFecha,
      colRed,
      metricas,
      registros,
      creadores: [...new Set(registros.map((r) => r.creador))],
      redes: [...new Set(registros.map((r) => r.red).filter(Boolean))],
      meses: [...new Set(registros.map((r) => r.mes as string))].sort(),
    };
  }, [rows]);

  const [metricaElegida, setMetrica] = useState("");
  const [redElegida, setRed] = useState("Todas");
  const [mesElegido, setMes] = useState<string | null>(null); // null = último mes

  if (!datos) return <Aviso>No hay registros en la hoja <strong>creadores_contenido</strong>.</Aviso>;
  if (!datos.colCreador || !datos.colFecha) {
    return (
      <Aviso>
        La hoja <strong>creadores_contenido</strong> necesita una columna con el creador (por ejemplo <em>Creador</em>) y otra con
        el mes (<em>Mes</em> o <em>Fecha</em>). Columnas encontradas: {datos.columnas.join(", ")}.
      </Aviso>
    );
  }
  if (datos.registros.length === 0 || datos.metricas.length === 0) {
    return <Aviso>La hoja creadores_contenido todavía no tiene filas con creador, mes y métricas numéricas.</Aviso>;
  }

  const { creadores, redes, meses, metricas, registros } = datos;
  const metrica = metricas.includes(metricaElegida) ? metricaElegida : metricas[0];
  const red = redes.includes(redElegida) ? redElegida : "Todas";
  const todos = mesElegido === "todos";
  const mes = todos ? null : mesElegido && meses.includes(mesElegido) ? mesElegido : meses[meses.length - 1];
  const colorDe = (c: string) => COLORES[creadores.indexOf(c) % COLORES.length];

  const suma = (f: (r: (typeof registros)[number]) => boolean) =>
    registros.reduce((s, r) => {
      const v = r.row[metrica];
      return f(r) && typeof v === "number" ? s + v : s;
    }, 0);

  // 1. General: mes a mes por creador
  const porMes = meses.map((m) => {
    const fila: Record<string, string | number> = { nombre: etiquetaMes(m) };
    creadores.forEach((c) => (fila[c] = suma((r) => r.mes === m && r.creador === c && (red === "Todas" || r.red === red))));
    return fila;
  });

  // 2. Por red social, en el mes elegido (o en todos los meses)
  const enPeriodo = (r: (typeof registros)[number]) => todos || r.mes === mes;
  const porRed = redes.map((rd) => {
    const fila: Record<string, string | number> = { nombre: rd };
    creadores.forEach((c) => (fila[c] = suma((r) => enPeriodo(r) && r.red === rd && r.creador === c)));
    return fila;
  });

  // 3. Tabla creador × red
  const tabla = creadores.map((c) => ({
    creador: c,
    valores: redes.map((rd) => suma((r) => enPeriodo(r) && r.red === rd && r.creador === c)),
  }));
  const totalPorRed = redes.map((_, i) => tabla.reduce((s, t) => s + t.valores[i], 0));
  const totalGeneral = totalPorRed.reduce((s, v) => s + v, 0);
  const ganador = [...tabla].sort((a, b) => b.valores.reduce((s, v) => s + v, 0) - a.valores.reduce((s, v) => s + v, 0))[0];

  const textoPeriodo = todos ? "todos los meses" : mes ? nombreMes(mes) : "";
  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
      activo ? "border-brand bg-brand text-asphalt-900" : "border-line text-paper/70 hover:border-brand hover:text-brand"
    }`;
  const tooltip = {
    cursor: { fill: "rgba(255,255,255,0.05)" },
    contentStyle: { background: "#161616", border: "1px solid #2c2c2c", borderRadius: 10 },
    labelStyle: { color: "#f7f7f5", fontWeight: 600 },
    formatter: (v: unknown, n: unknown) => [typeof v === "number" ? num(v) : "—", String(n)] as [string, string],
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Filtros */}
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-asphalt-800 px-5 py-4 print:hidden">
        <Fila etiqueta="Métrica">
          {metricas.map((m) => (
            <button key={m} type="button" aria-pressed={m === metrica} onClick={() => setMetrica(m)} className={chip(m === metrica)}>
              {m.replace(/_/g, " ")}
            </button>
          ))}
        </Fila>
        {redes.length > 1 && (
          <Fila etiqueta="Red">
            {["Todas", ...redes].map((r) => (
              <button key={r} type="button" aria-pressed={r === red} onClick={() => setRed(r)} className={chip(r === red)}>
                {r}
              </button>
            ))}
          </Fila>
        )}
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
        {ganador && totalGeneral > 0 && (
          <p className="pt-1 text-sm text-paper/70">
            En {textoPeriodo}, <strong style={{ color: colorDe(ganador.creador) }}>{ganador.creador}</strong> lidera en{" "}
            {metrica.replace(/_/g, " ").toLowerCase()} con{" "}
            <strong className="text-paper">{num(ganador.valores.reduce((s, v) => s + v, 0))}</strong> de {num(totalGeneral)} en total.
          </p>
        )}
      </div>

      {/* 1. General por mes */}
      <Tarjeta titulo={`General · ${metrica.replace(/_/g, " ")} por mes · ${red === "Todas" ? "todas las redes" : red}`}>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porMes} margin={{ top: 10, right: 8, left: 0, bottom: 4 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
              <XAxis dataKey="nombre" stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} interval={0} />
              <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} tickFormatter={(v: number) => fmtNumber(v)} width={56} />
              <Tooltip {...tooltip} />
              <Legend wrapperStyle={{ fontSize: 12, color: "#a3a3a3" }} />
              {creadores.map((c) => (
                <Bar key={c} dataKey={c} name={c} fill={colorDe(c)} radius={[4, 4, 0, 0]} maxBarSize={28} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Tarjeta>

      {/* 2. Por red social */}
      {redes.length > 1 && (
        <Tarjeta titulo={`Cada creador en cada red · ${textoPeriodo}`}>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porRed} margin={{ top: 10, right: 8, left: 0, bottom: 4 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
                <XAxis dataKey="nombre" stroke="#a3a3a3" tick={{ fontSize: 12, fill: "#a3a3a3" }} interval={0} />
                <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} tickFormatter={(v: number) => fmtNumber(v)} width={56} />
                <Tooltip {...tooltip} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#a3a3a3" }} />
                {creadores.map((c) => (
                  <Bar key={c} dataKey={c} name={c} fill={colorDe(c)} radius={[5, 5, 0, 0]} maxBarSize={48} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Tarjeta>
      )}

      {/* 3. Tabla general */}
      <Tarjeta titulo={`Resumen general · ${metrica.replace(/_/g, " ")} · ${textoPeriodo}`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b border-line text-[11px] uppercase tracking-wide text-paper/50">
                <th className="py-2 text-left font-semibold">Creador</th>
                {redes.map((rd) => (
                  <th key={rd} className="px-2 py-2 text-right font-semibold">{rd}</th>
                ))}
                <th className="py-2 pl-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {tabla.map((t) => {
                const total = t.valores.reduce((s, v) => s + v, 0);
                return (
                  <tr key={t.creador} className="border-b border-line/60">
                    <td className="py-2.5">
                      <span className="flex items-center gap-2 text-paper">
                        <i className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: colorDe(t.creador) }} />
                        {t.creador}
                      </span>
                    </td>
                    {t.valores.map((v, i) => {
                      const mejor = v > 0 && v === Math.max(...tabla.map((x) => x.valores[i]));
                      return (
                        <td key={redes[i]} className={`px-2 py-2.5 text-right font-display text-base ${mejor ? "font-bold text-brand" : "text-paper/80"}`}>
                          {v ? num(v) : "—"}
                        </td>
                      );
                    })}
                    <td className="py-2.5 pl-2 text-right font-display text-base font-bold text-paper">{num(total)}</td>
                  </tr>
                );
              })}
              <tr className="text-paper/60">
                <td className="py-2.5 text-xs uppercase tracking-wide">Total</td>
                {totalPorRed.map((v, i) => (
                  <td key={redes[i]} className="px-2 py-2.5 text-right font-display">{num(v)}</td>
                ))}
                <td className="py-2.5 pl-2 text-right font-display font-bold text-paper">{num(totalGeneral)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[11px] text-paper/45">En naranja, el creador con el valor más alto en cada red.</p>
      </Tarjeta>
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