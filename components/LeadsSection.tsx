"use client";

import { CompareBarChart } from "@/components/CompareBarChart";
import { MetricTrendChart } from "@/components/MetricTrendChart";
import { SectionHeading } from "@/components/PlatformSection";
import {
  CAMPOS_LEADS,
  buscarColumna,
  compararCampo,
  leadsPorPeriodo,
  type LeadsPreparados,
} from "@/lib/leads";
import type { SheetRow } from "@/lib/types";
import { mesLabel, unidadPeriodo } from "@/lib/types";

// Sección "Análisis de leads" a partir de la hoja Leads_Detalle.
// Todo se calcula sobre el periodo elegido en los botones de arriba
// (Mensual / Trimestral / Anual) y los dos periodos que se comparan.
export function LeadsSection({
  rows,
  datos,
  mesA,
  mesB,
}: {
  rows: SheetRow[] | null;
  datos: LeadsPreparados;
  mesA: string;
  mesB: string;
}) {
  if (!rows || datos.registros.length === 0) return null;

  const labelA = mesLabel(mesA);
  const labelB = mesLabel(mesB);
  const unidad = unidadPeriodo(mesA);

  const serie = leadsPorPeriodo(datos);
  const totalA = serie.find((s) => s.periodo === mesA)?.valor ?? 0;
  const totalB = serie.find((s) => s.periodo === mesB)?.valor ?? 0;

  const graficas = CAMPOS_LEADS.map((campo) => {
    const columna = buscarColumna(rows, campo.columnas);
    return { ...campo, columna, data: compararCampo(datos, columna, mesA, mesB, campo.topN) };
  }).filter((g) => g.data.length > 0);

  const sinDatos = [
    totalA === 0 ? labelA : null,
    totalB === 0 && mesB !== mesA ? labelB : null,
  ].filter(Boolean);

  return (
    <>
      <SectionHeading tag="Formulario" title="Análisis de leads" iconSrc="/icon-forms.png" />

      {sinDatos.length > 0 && (
        <p className="mb-3 rounded-xl border border-line bg-asphalt-800 px-4 py-2.5 text-xs text-paper/60">
          No hay leads registrados en {sinDatos.join(" ni en ")}. Revisa la columna de fecha
          {datos.columnaFecha ? ` ("${datos.columnaFecha}")` : ""} en la hoja Leads_Detalle.
        </p>
      )}

      {serie.length > 1 && (
        <div>
          {/* key: se vuelve a montar al cambiar Mensual/Trimestral/Anual para que las barras se redibujen */}
          <MetricTrendChart key={unidad} title="Leads registrados" unidad={unidad} data={serie} mesA={mesA} mesB={mesB} />
        </div>
      )}

      {graficas.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {graficas.map((g) => (
            <CompareBarChart key={g.id} title={g.titulo} data={g.data} labelA={labelA} labelB={labelB} />
          ))}
        </div>
      )}
    </>
  );
}
