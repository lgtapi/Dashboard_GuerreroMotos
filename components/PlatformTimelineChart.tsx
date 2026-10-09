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

import { colorPlataforma, etiquetaMetrica, metricasRedes } from "@/lib/redes";

const corto = (numero: number) =>
  Math.abs(numero) >= 1000
    ? `${(numero / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 })}k`
    : numero.toLocaleString("es-CO", { maximumFractionDigits: 3 });

export function PlatformTimelineChart({
  rows,
  metrica: metricaInicial = "Visualizaciones",
  mesA,
  mesB,
}: {
  rows: SheetRow[];
  metrica?: string;
  mesA: string;
  mesB: string;
}) {
  const [seleccion, setSeleccion] = useState("Todas");
  const metricasDisponibles = useMemo(() => metricasRedes(rows), [rows]);
  const [metricaElegida, setMetricaElegida] = useState(metricaInicial);
  const metrica = metricasDisponibles.includes(metricaElegida)
    ? metricaElegida
    : metricasDisponibles.includes(metricaInicial)
      ? metricaInicial
      : metricasDisponibles[0] ?? metricaInicial;

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
  const colorDe = (plataforma: string) => colorPlataforma(plataforma, plataformas.indexOf(plataforma));
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
      {metricasDisponibles.length > 1 && (
        <div className="mb-2 flex flex-wrap items-center gap-2 print:hidden" role="group" aria-label="Métrica">
          <span className="mr-1 font-display text-xs uppercase tracking-wide text-paper/55">Métrica</span>
          {metricasDisponibles.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={m === metrica}
              onClick={() => setMetricaElegida(m)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                m === metrica ? "border-paper bg-paper font-semibold text-asphalt-900" : "border-line text-paper/65 hover:text-paper"
              }`}
            >
              {etiquetaMetrica(m)}
            </button>
          ))}
        </div>
      )}
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
              <i className="inline-block h-2.5 w-2.5 rounded-sm border border-brand/60 bg-brand/20" />
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
        {etiquetaMetrica(metrica)} · {activa === "Todas" ? "todas las plataformas" : activa} · por {unidad}
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
              fill={COLOR_A}
              fillOpacity={0.14}
              stroke="none"
              ifOverflow="visible"
            />
            {mesB !== mesA && (
              <ReferenceArea
                x1={cortoB}
                x2={cortoB}
                fill={COLOR_B}
                fillOpacity={0.14}
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
