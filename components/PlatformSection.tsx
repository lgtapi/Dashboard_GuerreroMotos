"use client";

import Image from "next/image";
import { MetricCard } from "@/components/MetricCard";
import {
  SheetRow,
  findRowByMonth,
  mesLabel,
  metricKeysFromRow,
  sheetHasRealData,
} from "@/lib/types";

const LABELS: Record<string, string> = {
  "Total usuarios": "Total de usuarios",
  "Usuarios nuevos": "Usuarios nuevos",
  "Promedio diario activos": "Promedio diario de activos",
  "Mensajes enviados": "Mensajes enviados",
  "Mensajes recibidos": "Mensajes recibidos",
  "Conversaciones finalizadas": "Conversaciones finalizadas",
  Sesiones: "Sesiones",
  Usuarios: "Usuarios",
  "Paginas vistas": "Páginas vistas",
  "Duracion promedio seg": "Duración promedio (seg)",
  "Tasa rebote": "Tasa de rebote",
  Conversiones: "Conversiones",
  Gasto: "Gasto",
  Impresiones: "Impresiones",
  Clics: "Clics",
  CTR: "CTR",
  CPC: "CPC",
  Resultados: "Resultados",
  "Costo por resultado": "Costo por resultado",
};

export function PlatformSection({
  tag,
  title,
  iconSrc,
  rows,
  mesA,
  mesB,
  dateField = "Fecha",
  platformFilter,
}: {
  tag: string;
  title: string;
  iconSrc: string;
  rows: SheetRow[] | null;
  mesA: string;
  mesB: string;
  dateField?: "Fecha" | "Mes";
  platformFilter?: string;
}) {
  const scoped = platformFilter ? (rows || []).filter((r) => r.Plataforma === platformFilter) : rows;

  if (!sheetHasRealData(scoped)) return null;

  const rowA = findRowByMonth(scoped, mesA, dateField);
  const rowB = findRowByMonth(scoped, mesB, dateField);
  const keys = metricKeysFromRow(rowA).length ? metricKeysFromRow(rowA) : metricKeysFromRow(rowB);

  if (keys.length === 0) return null;

  return (
    <>
      <SectionHeading tag={tag} title={title} iconSrc={iconSrc} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {keys.map((key) => {
          const vA = rowA?.[key];
          const vB = rowB?.[key];
          return (
            <MetricCard
              key={key}
              label={LABELS[key] || key}
              labelA={mesLabel(mesA)}
              labelB={mesLabel(mesB)}
              valueA={typeof vA === "number" ? vA : null}
              valueB={typeof vB === "number" ? vB : null}
            />
          );
        })}
      </div>
    </>
  );
}

export function SectionHeading({
  tag,
  title,
  iconSrc,
  iconBg = "bg-white",
}: {
  tag: string;
  title: string;
  iconSrc: string;
  iconBg?: string;
}) {
  return (
    <div className="mb-3.5 mt-9 flex items-center gap-3">
      <div className={`flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg ${iconBg}`}>
        <Image src={iconSrc} alt={tag} width={22} height={22} className="object-contain" />
      </div>
      <h2 className="font-display text-xl font-bold uppercase italic tracking-wide">{title}</h2>
      <div className="h-px flex-1 bg-gradient-to-r from-line to-transparent" />
    </div>
  );
}