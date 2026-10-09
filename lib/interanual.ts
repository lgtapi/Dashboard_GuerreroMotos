// Comparación año contra año (p. ej. 2025 vs 2026) a partir de
// Redes_LookerStudio (año actual) y 2025_Redes_LookerStudio (año anterior).

import { reglaDeAgregacion, type Vista } from "@/lib/periodos";
import { MESES_ES, type SheetRow } from "@/lib/types";

export type PuntoInteranual = {
  clave: number; // mes 1-12, trimestre 1-4 o 1 para el año
  etiqueta: string; // "Sep", "T3", "Año"
  anterior: number | null;
  actual: number | null;
};

const anioDe = (mes: unknown) => Number(String(mes ?? "").slice(0, 4)) || null;
const mesDe = (mes: unknown) => Number(String(mes ?? "").slice(5, 7)) || null;

// Une las dos hojas. Si un mismo mes y plataforma está en ambas, gana la hoja
// del año actual.
export function unirHojas(actual: SheetRow[] | null, anterior: SheetRow[] | null): SheetRow[] {
  const vistos = new Set<string>();
  const salida: SheetRow[] = [];
  for (const row of [...(actual ?? []), ...(anterior ?? [])]) {
    const id = `${row.Mes}|${String(row.Plataforma ?? "").trim().toLowerCase()}`;
    if (vistos.has(id)) continue;
    vistos.add(id);
    salida.push(row);
  }
  return salida;
}

// Métricas numéricas que trae la hoja de referencia (2025).
export function metricasDe(rows: SheetRow[] | null): string[] {
  if (!rows) return [];
  const claves = new Set<string>();
  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      if (k === "Mes" || k === "Fecha" || k === "Plataforma" || k.includes("Var")) continue;
      if (typeof v === "number") claves.add(k);
    }
  }
  return [...claves];
}

export function plataformasDe(rows: SheetRow[]): string[] {
  return [...new Set(rows.map((r) => String(r.Plataforma ?? "").trim()).filter(Boolean))];
}

function claveDePeriodo(mes: number, vista: Vista): number {
  if (vista === "anual") return 1;
  if (vista === "trimestral") return Math.ceil(mes / 3);
  return mes;
}

function etiqueta(clave: number, vista: Vista): string {
  if (vista === "anual") return "Año";
  if (vista === "trimestral") return `T${clave}`;
  return MESES_ES[clave - 1].slice(0, 3);
}

// Valor de una métrica por periodo para un año. "Todas" suma las plataformas.
// Dentro de un trimestre o año se aplica la misma regla del dashboard
// (suma, promedio o último valor según la métrica).
function valoresDelAnio(
  rows: SheetRow[],
  anio: number,
  metrica: string,
  plataforma: string,
  vista: Vista
): Map<number, number> {
  // 1) total por mes (sumando plataformas si es "Todas")
  const porMes = new Map<number, number>();
  for (const row of rows) {
    if (anioDe(row.Mes) !== anio) continue;
    if (plataforma !== "Todas" && String(row.Plataforma ?? "").trim().toLowerCase() !== plataforma.toLowerCase()) continue;
    const v = row[metrica];
    const mes = mesDe(row.Mes);
    if (typeof v !== "number" || !mes) continue;
    porMes.set(mes, (porMes.get(mes) ?? 0) + v);
  }
  // 2) agrupar meses en el periodo de la vista
  const grupos = new Map<number, number[]>();
  [...porMes.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([mes, v]) => {
      const k = claveDePeriodo(mes, vista);
      grupos.set(k, [...(grupos.get(k) ?? []), v]);
    });
  const regla = reglaDeAgregacion(metrica);
  const salida = new Map<number, number>();
  grupos.forEach((vals, k) => {
    const total = vals.reduce((s, v) => s + v, 0);
    salida.set(k, regla === "suma" ? total : regla === "promedio" ? total / vals.length : vals[vals.length - 1]);
  });
  return salida;
}

export function serieInteranual(
  rows: SheetRow[],
  anioActual: number,
  metrica: string,
  plataforma: string,
  vista: Vista
): PuntoInteranual[] {
  const actual = valoresDelAnio(rows, anioActual, metrica, plataforma, vista);
  const anterior = valoresDelAnio(rows, anioActual - 1, metrica, plataforma, vista);
  const total = vista === "anual" ? 1 : vista === "trimestral" ? 4 : 12;
  const puntos: PuntoInteranual[] = [];
  for (let k = 1; k <= total; k++) {
    const a = anterior.get(k) ?? null;
    const b = actual.get(k) ?? null;
    if (a === null && b === null) continue;
    puntos.push({ clave: k, etiqueta: etiqueta(k, vista), anterior: a, actual: b });
  }
  return puntos;
}

// Periodo (mes, trimestre o año) del selector del dashboard -> clave numérica.
export function claveDelSeleccionado(periodo: string, vista: Vista): number | null {
  const t = /^\d{4}-T([1-4])$/.exec(periodo);
  if (t) return Number(t[1]);
  if (/^\d{4}$/.test(periodo)) return 1;
  const m = mesDe(periodo);
  return m ? claveDePeriodo(m, vista) : null;
}
