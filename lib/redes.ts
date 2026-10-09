// Utilidades compartidas para la hoja Redes_LookerStudio (ya agrupada por
// periodo con usePeriodo): métricas, valores por plataforma y totales.

import type { SheetRow } from "@/lib/types";

// Paleta de plataformas en tonos de la marca. Se distinguen también por
// luminosidad (naranja medio, ámbar claro, crema muy claro).
export const COLOR_PLATAFORMA: Record<string, string> = {
  facebook: "#ff5803",
  instagram: "#ffb23c",
  tiktok: "#f2e6d8",
  whatsapp: "#4ade80",
};
// Versión para usar sobre fondo blanco (el crema no se ve sobre blanco).
export const COLOR_PLATAFORMA_SOBRE_BLANCO: Record<string, string> = {
  facebook: "#ff5803",
  instagram: "#e09200",
  tiktok: "#a8927a",
  whatsapp: "#16a34a",
};
const EXTRA = ["#c9b49c", "#a33a02", "#ff9a5c", "#6b6259"];

export function colorPlataforma(nombre: string, i = 0, sobreBlanco = false): string {
  const k = nombre.trim().toLowerCase();
  const mapa = sobreBlanco ? COLOR_PLATAFORMA_SOBRE_BLANCO : COLOR_PLATAFORMA;
  return mapa[k] ?? EXTRA[i % EXTRA.length];
}

export const ETIQUETAS_METRICA: Record<string, string> = {
  Clics_en_enlace: "Clics en el enlace",
  Visitas_perfil: "Visitas al perfil",
  Seguidores_nuevos: "Seguidores nuevos",
  Seguidores_totales: "Seguidores totales",
  Historias_publicadas: "Historias publicadas",
  Publicaciones: "Publicaciones",
};
export const etiquetaMetrica = (k: string) => ETIQUETAS_METRICA[k] ?? k.replace(/_/g, " ");

const igual = (a: unknown, b: string) => String(a ?? "").trim().toLowerCase() === b.trim().toLowerCase();

export function plataformasRedes(rows: SheetRow[] | null): string[] {
  if (!rows) return [];
  return [...new Set(rows.map((r) => String(r.Plataforma ?? "").trim()).filter(Boolean))];
}

// Métricas numéricas, en el orden de las columnas de la hoja.
export function metricasRedes(rows: SheetRow[] | null): string[] {
  if (!rows) return [];
  const claves: string[] = [];
  for (const row of rows) {
    for (const [k, v] of Object.entries(row)) {
      if (k === "Mes" || k === "Fecha" || k === "Plataforma" || k.includes("Var")) continue;
      if (typeof v === "number" && !claves.includes(k)) claves.push(k);
    }
  }
  return claves;
}

export function valorRed(rows: SheetRow[] | null, periodo: string, plataforma: string, metrica: string): number | null {
  const fila = (rows ?? []).find((r) => String(r.Mes) === periodo && igual(r.Plataforma, plataforma));
  const v = fila?.[metrica];
  return typeof v === "number" ? v : null;
}

// Suma de todas las plataformas para un periodo (null si ninguna tiene dato).
export function totalRedes(rows: SheetRow[] | null, periodo: string, metrica: string): number | null {
  let total: number | null = null;
  for (const r of rows ?? []) {
    if (String(r.Mes) !== periodo) continue;
    const v = r[metrica];
    if (typeof v === "number") total = (total ?? 0) + v;
  }
  return total;
}
