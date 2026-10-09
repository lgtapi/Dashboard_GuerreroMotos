// Hoja Asignación_Asesores. Acepta dos formatos:
//  - un registro por asignación (cada fila cuenta 1), o
//  - filas ya resumidas con una columna numérica de cantidad (Asignaciones,
//    Cantidad, Total…), que se suma.
// Todo se agrupa según la vista del dashboard (mes / trimestre / año).

import { normalizarMes } from "@/lib/fechas";
import { buscarColumna } from "@/lib/leads";
import { periodoDe, type Vista } from "@/lib/periodos";
import type { SheetRow } from "@/lib/types";

const COLUMNAS_FECHA = ["Fecha", "Mes", "Fecha_asignacion", "Fecha de asignación", "Marca temporal", "Timestamp"];
const COLUMNAS_ASESOR = ["Asesor", "Agente", "Asesor_asignado", "Asesor asignado", "Agente asignado", "Vendedor", "Responsable"];
const COLUMNAS_NEGOCIO = ["Negocio", "Linea_negocio", "Línea de negocio", "Unidad de negocio", "Tipo_negocio", "Tipo de negocio", "Sede"];
const COLUMNAS_CANTIDAD = ["Asignaciones", "Cantidad", "Total", "Leads", "Conversaciones", "Casos"];

export type Asignacion = { periodo: string; asesor: string; negocio: string; n: number };

export type DatosAsignaciones = {
  columnaFecha: string | null;
  columnaAsesor: string | null;
  columnaNegocio: string | null;
  columnaCantidad: string | null;
  columnas: string[];
  registros: Asignacion[];
  periodos: string[];
  asesores: string[]; // ordenados por total, de mayor a menor
  negocios: string[]; // ordenados por total, de mayor a menor
};

const vacioTexto = (v: unknown) =>
  v === null || v === undefined || ["", "null", "n/a", "-"].includes(String(v).trim().toLowerCase());

export function prepararAsignaciones(rows: SheetRow[] | null, vista: Vista): DatosAsignaciones {
  const columnas = rows ? [...new Set(rows.slice(0, 50).flatMap((r) => Object.keys(r)))] : [];
  const base: DatosAsignaciones = {
    columnaFecha: null, columnaAsesor: null, columnaNegocio: null, columnaCantidad: null,
    columnas, registros: [], periodos: [], asesores: [], negocios: [],
  };
  if (!rows || rows.length === 0) return base;

  const columnaFecha = buscarColumna(rows, COLUMNAS_FECHA);
  const columnaAsesor = buscarColumna(rows, COLUMNAS_ASESOR);
  const columnaNegocio = buscarColumna(rows, COLUMNAS_NEGOCIO);
  const candidataCantidad = buscarColumna(rows, COLUMNAS_CANTIDAD);
  const columnaCantidad =
    candidataCantidad && rows.some((r) => typeof r[candidataCantidad] === "number") ? candidataCantidad : null;
  const info = { ...base, columnaFecha, columnaAsesor, columnaNegocio, columnaCantidad };
  if (!columnaFecha || !columnaAsesor) return info;

  const registros: Asignacion[] = [];
  for (const r of rows) {
    const mes = normalizarMes(r[columnaFecha]);
    if (typeof mes !== "string" || !/^\d{4}-\d{2}-01$/.test(mes)) continue;
    if (vacioTexto(r[columnaAsesor])) continue;
    const n = columnaCantidad ? r[columnaCantidad] : 1;
    if (typeof n !== "number") continue;
    registros.push({
      periodo: periodoDe(mes, vista),
      asesor: String(r[columnaAsesor]).trim(),
      negocio: columnaNegocio && !vacioTexto(r[columnaNegocio]) ? String(r[columnaNegocio]).trim() : "Sin negocio",
      n,
    });
  }

  const orden = (clave: "asesor" | "negocio") => {
    const tot = new Map<string, number>();
    registros.forEach((r) => tot.set(r[clave], (tot.get(r[clave]) ?? 0) + r.n));
    return [...tot.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k);
  };

  return {
    ...info,
    registros,
    periodos: [...new Set(registros.map((r) => r.periodo))].sort(),
    asesores: orden("asesor"),
    negocios: orden("negocio"),
  };
}

export function sumar(
  datos: DatosAsignaciones,
  filtro: { periodo?: string; asesor?: string; negocio?: string }
): number {
  return datos.registros.reduce(
    (s, r) =>
      (filtro.periodo === undefined || r.periodo === filtro.periodo) &&
      (filtro.asesor === undefined || r.asesor === filtro.asesor) &&
      (filtro.negocio === undefined || filtro.negocio === "Todos" || r.negocio === filtro.negocio)
        ? s + r.n
        : s,
    0
  );
}
