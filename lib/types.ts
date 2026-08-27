export type SheetRow = Record<string, string | number | null>;

export const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// "2026-05-01" -> "Mayo 2026"
export function mesLabel(isoDate: string): string {
  const [y, m] = isoDate.split("-").map(Number);
  if (!y || !m) return isoDate;
  return `${MESES_ES[m - 1]} ${y}`;
}

export function sortIsoDatesAsc(dates: string[]): string[] {
  return [...new Set(dates)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

export function pctChange(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a === null || a === undefined || b === null || b === undefined || a === 0) return null;
  return ((b - a) / a) * 100;
}

export function fmtNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 1000) {
    return (n / 1000).toLocaleString("es-CO", { maximumFractionDigits: 1 }) + " mil";
  }
  return n.toLocaleString("es-CO", { maximumFractionDigits: 1 });
}

export function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString("es-CO", { maximumFractionDigits: 1 })}%`;
}

// true si la fila ya trae al menos un valor numérico real (no "Pendiente", no vacío).
// Se usa para decidir si una sección completa del dashboard se muestra o se oculta.
export function sheetHasRealData(rows: SheetRow[] | null | undefined, ignoreKeys: string[] = []): boolean {
  if (!rows || rows.length === 0) return false;
  return rows.some((r) =>
    Object.entries(r).some(([k, v]) => !ignoreKeys.includes(k) && typeof v === "number")
  );
}

// Encabezados "métrica" de una hoja *_Historico: todo menos Fecha/Mes/Plataforma
// y las columnas de variación % (que el dashboard recalcula solo, dinámicamente).
export function metricKeysFromRow(row: SheetRow | undefined): string[] {
  if (!row) return [];
  return Object.keys(row).filter(
    (k) => k !== "Fecha" && k !== "Mes" && k !== "Plataforma" && !k.includes("Var")
  );
}

export function findRowByMonth(
  rows: SheetRow[] | null | undefined,
  mes: string,
  dateField: "Fecha" | "Mes" = "Fecha"
): SheetRow | undefined {
  if (!rows) return undefined;
  return rows.find((r) => String(r[dateField]) === mes);
}

// Cuenta ocurrencias de un campo (ej. Tipo_gestion, Moto_interes) en dos meses,
// a partir de una tabla de registros individuales como Leads_Detalle.
// topN limita a los N valores con más total combinado (útil para campos con
// muchos valores distintos, como el modelo de moto).
export function compareCountsByField(
  rows: SheetRow[] | null | undefined,
  field: string,
  mesA: string,
  mesB: string,
  dateField: "Fecha" | "Mes" = "Mes",
  topN?: number
): { name: string; a: number; b: number }[] {
  if (!rows) return [];
  const counts = new Map<string, { a: number; b: number }>();
  for (const r of rows) {
    const mes = String(r[dateField]);
    if (mes !== mesA && mes !== mesB) continue;
    const raw = r[field];
    const value = raw === null || raw === undefined || raw === "" ? "Sin dato" : String(raw);
    const entry = counts.get(value) || { a: 0, b: 0 };
    if (mes === mesA) entry.a += 1;
    if (mes === mesB) entry.b += 1;
    counts.set(value, entry);
  }
  let list = [...counts.entries()].map(([name, v]) => ({ name, ...v }));
  list.sort((x, y) => y.a + y.b - (x.a + x.b));
  if (topN) list = list.slice(0, topN);
  return list;
}

export type RedesRow = {
  Mes: string;
  Plataforma: string;
  Alcance: number | null;
  Clics_en_enlace: number | null;
  Historias_publicadas: number | null;
  Interacciones: number | null;
  Publicaciones: number | null;
  Seguidores_nuevos: number | null;
  Visitas_perfil: number | null;
  Visualizaciones: number | null;
};

export const METRICAS_REDES: { key: keyof RedesRow; label: string }[] = [
  { key: "Visualizaciones", label: "Visualizaciones" },
  { key: "Alcance", label: "Alcance" },
  { key: "Interacciones", label: "Interacciones" },
  { key: "Clics_en_enlace", label: "Clics en el enlace" },
  { key: "Visitas_perfil", label: "Visitas al perfil" },
  { key: "Seguidores_nuevos", label: "Seguidores nuevos" },
];
