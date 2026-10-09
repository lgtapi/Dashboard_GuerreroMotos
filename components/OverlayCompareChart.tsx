"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtNumber } from "@/lib/types";

// Gráfica superpuesta: la barra ANCHA es el periodo A (2025, referencia) y la
// barra ANGOSTA del periodo B (2026) va dentro de ella, por delante.
const COLOR_A = "#4c8dff"; // 2025
const COLOR_B = "#ff5803"; // 2026

export function OverlayCompareChart({
  title,
  data,
  labelA,
  labelB,
  anchoA = 64,
  anchoB = 26,
  children,
}: {
  title: string;
  data: { name: string; a: number | null; b: number | null }[];
  labelA: string;
  labelB: string;
  anchoA?: number; // ancho de la barra de A (px)
  anchoB?: number; // ancho de la barra de B (px)
  children?: React.ReactNode; // filtros opcionales, se muestran sobre la gráfica
}) {
  return (
    <div className="rounded-2xl border border-line bg-asphalt-800 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-sm uppercase tracking-wide text-paper/70">{title}</h3>
        <div className="flex gap-4 text-[11px] text-paper/60">
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-4 rounded-sm" style={{ background: COLOR_A }} />
            {labelA}
          </span>
          <span className="flex items-center gap-1.5">
            <i className="inline-block h-2.5 w-2 rounded-sm" style={{ background: COLOR_B }} />
            {labelB}
          </span>
        </div>
      </div>
      {children}
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2c" vertical={false} />
            {/* Dos ejes X en el mismo lugar: así la barra de B queda dentro de la de A */}
            <XAxis xAxisId="a" dataKey="name" stroke="#a3a3a3" tick={{ fontSize: 12, fill: "#a3a3a3" }} interval={0} />
            <XAxis xAxisId="b" dataKey="name" hide />
            <YAxis stroke="#a3a3a3" tick={{ fontSize: 11, fill: "#a3a3a3" }} tickFormatter={(v: number) => fmtNumber(v)} width={56} />
            <Tooltip
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              formatter={(value, name) => [
                typeof value === "number" ? value.toLocaleString("es-CO", { maximumFractionDigits: 1 }) : "—",
                String(name),
              ]}
              contentStyle={{ background: "#161616", border: "1px solid #2c2c2c", borderRadius: 10 }}
              labelStyle={{ color: "#f7f7f5", fontWeight: 600 }}
            />
            <Bar xAxisId="a" dataKey="a" name={labelA} fill={COLOR_A} barSize={anchoA} radius={[6, 6, 0, 0]} />
            <Bar xAxisId="b" dataKey="b" name={labelB} fill={COLOR_B} barSize={anchoB} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}