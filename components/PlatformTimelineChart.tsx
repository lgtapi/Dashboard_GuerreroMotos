"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { SheetRow, fmtNumber, mesLabel, mesLabelCorto, unidadPeriodo } from "@/lib/types";
import {
  COLOR_A,
  COLOR_B,
  COLOR_ENTRE,
  COLOR_OTROS,
  OPACIDAD_OTROS,
  colorDePeriodo,
} from "@/components/MetricTrendChart";

// Colores de la marca Guerrero Motos: naranja, ámbar y crema.
// Se distinguen también por lo claro/oscuro, no solo por el tono.
const COLOR_PLATAFORMA: Record<string, string> = {
  facebook: "#ff5803",
  instagram: "#ffb23c",
  tiktok: "#f2e6d8",
  whatsapp: "#cc4602",
};
const COLORES_EXTRA = ["#cc4602", "#c9b49c", "#ff9a5c", "#6b6259"];

const corto = (numero: number) =>
  Math.abs(numero) >= 1000
    ? `${(numero / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 })}k`
    : numero.toLocaleString("es-CO", { maximumFractionDigits: 3 });

export function PlatformTimelineChart({
  rows,
  metrica = "Visualizaciones",
  mesA,
  mesB,
}: {
  rows: SheetRow[];
  metrica?: string;
  mesA: string;
  mesB: string;
}) {
  const [seleccion, setSeleccion] = useState("Todas");

  const { plataformas, filas } = useMemo(() => {
    const todas = [...new Set(rows.map((row) => String(row.Plataforma ?? "")))].filter(Boolean);
    const plataformas = todas.filter((plataforma) =>
      rows.some((row) => String(row.Plataforma) === plataforma && typeof row[metrica] === "number")
    );
    const periodos = [...new Set(rows.map((row) => String(row.Mes)))].sort();
    const filas = periodos.map((periodo) => {
      const fila: Record<string, string | number | null> = {
        periodo,
        corto: mesLabelCorto(periodo),
        largo: mesLabel(periodo),
      };
      for (const plataforma of plataformas) {
        const row = rows.find(
          (item) => String(item.Mes) === periodo && String(item.Plataforma) === plataforma
        );
        const valor = row?.[metrica];
        fila[plataforma] = typeof valor === "number" ? valor : null;
      }
      return fila;
    });
    return { plataformas, filas };
  }, [rows, metrica]);

  if (plataformas.length === 0 || filas.length === 0) return null;

  const activa = plataformas.includes(seleccion) ? seleccion : "Todas";
  const unidad = unidadPeriodo(mesA);
  const colorDe = (plataforma: string) =>
    COLOR_PLATAFORMA[plataforma.toLowerCase()] ??
    COLORES_EXTRA[plataformas.indexOf(plataforma) % COLORES_EXTRA.length];
  const cortoA = mesLabelCorto(mesA);
  const cortoB = mesLabelCorto(mesB);
  const hayEntre = filas.some(
    (fila) => colorDePeriodo(String(fila.periodo), mesA, mesB).fill === COLOR_ENTRE
  );

  const chip = (nombre: string) => {
    const activaChip = activa === nombre;
    return (
      <button
        key={nombre}
        type="button"
        aria-pressed={activaChip}
        onClick={() => setSeleccion(nombre)}
        className={`rounded-full border px-3.5 py-1 font-display text-xs font-semibold uppercase tracking-wide transition-colors ${
          activaChip
            ? "border-brand bg-brand text-asphalt-900"
            : "border-line text-paper/70 hover:border-brand hover:text-brand"
        }`}
      >
        {nombre}
      </button>
    );
  };

  return (
    <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
      <div className="mb-3 flex flex-wrap items-center gap-2 print:hidden" role="group" aria-label="Filtrar por plataforma">
        <span className="mr-1 font-display text-xs uppercase tracking-wide text-paper/55">Plataforma</span>
        {chip("Todas")}
        {plataformas.map(chip)}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-paper/60">
        {activa === "Todas" ? (
          <>
            {plataformas.map((plataforma) => (
              <span key={plataforma} className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colorDe(plataforma) }} />
                {plataforma}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm border border-white/30 bg-white/10" />
              Franja = periodos comparados ({mesLabel(mesA)} y {mesLabel(mesB)})
            </span>
          </>
        ) : (
          <>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_A }} />
              {mesLabel(mesA)}
            </span>
            {mesB !== mesA && (
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_B }} />
                {mesLabel(mesB)}
              </span>
            )}
            {hayEntre && (
              <span className="flex items-center gap-1.5">
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: COLOR_ENTRE }} />
                Entre ambos
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <i
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ background: COLOR_OTROS, opacity: OPACIDAD_OTROS + 0.15 }}
              />
              Otros periodos
            </span>
          </>
        )}
      </div>

      <p className="mb-2 font-display text-sm uppercase tracking-wide text-paper/70">
        {metrica} · {activa === "Todas" ? "todas las plataformas" : activa} · por {unidad}
      </p>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={filas} margin={{ top: 20, right: 8, left: 0, bottom: 4 }} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
            <XAxis dataKey="corto" stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} interval={0} />
            <YAxis
              stroke="#a3a3a3"
              tick={{ fontSize: 11, fill: "#a3a3a3" }}
              tickFormatter={(value: number) => fmtNumber(value)}
              width={56}
            />
            <ReferenceArea
              x1={cortoA}
              x2={cortoA}
              fill="#ffffff"
              fillOpacity={0.06}
              stroke="none"
              ifOverflow="visible"
            />
            {mesB !== mesA && (
              <ReferenceArea
                x1={cortoB}
                x2={cortoB}
                fill="#ffffff"
                fillOpacity={0.1}
                stroke="none"
                ifOverflow="visible"
              />
            )}
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.06)" }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.largo ?? ""}
              formatter={(value: number, name: string) => [
                value.toLocaleString("es-CO", { maximumFractionDigits: 3 }),
                name,
              ]}
              contentStyle={{ background: "#0d0d0d", border: "1px solid #3a3a3a", borderRadius: 10 }}
              labelStyle={{ color: "#f7f7f5", fontWeight: 600 }}
              itemStyle={activa === "Todas" ? undefined : { color: "#ffb23c" }}
            />
            {activa === "Todas" ? (
              plataformas.map((plataforma) => (
                <Bar
                  key={plataforma}
                  dataKey={plataforma}
                  name={plataforma}
                  fill={colorDe(plataforma)}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={26}
                />
              ))
            ) : (
              <Bar dataKey={activa} name={activa} radius={[6, 6, 0, 0]} maxBarSize={56}>
                {filas.map((fila) => {
                  const color = colorDePeriodo(String(fila.periodo), mesA, mesB);
                  return <Cell key={String(fila.periodo)} fill={color.fill} fillOpacity={color.opacity} />;
                })}
                <LabelList
                  dataKey={activa}
                  position="top"
                  formatter={(value: number) => corto(value)}
                  fill="#e5e5e5"
                  fontSize={10}
                />
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}