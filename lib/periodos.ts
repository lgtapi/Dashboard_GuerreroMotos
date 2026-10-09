import { useMemo } from "react";
import type { SheetRow } from "@/lib/types";

export type Vista = "mensual" | "trimestral" | "anual";
type Regla = "suma" | "promedio" | "ultimo";

export function reglaDeAgregacion(columna: string): Regla {
  const key = columna.toLowerCase();
  // Totales acumulados (total de usuarios / total de seguidores): vale el último mes del periodo
  if (key === "total usuarios" || (key.includes("total") && key.includes("seguidor"))) return "ultimo";
  if (
    key.includes("alcance") ||
    key === "usuarios" ||
    key.includes("promedio") ||
    key.includes("tasa") ||
    key.includes("costo") ||
    key === "ctr" ||
    key === "cpc"
  ) {
    return "promedio";
  }
  return "suma";
}

export function periodoDe(iso: string, vista: Vista): string {
  if (vista === "mensual") return iso;
  const [year, month] = iso.split("-").map(Number);
  if (!year || !month) return iso;
  return vista === "anual" ? String(year) : `${year}-T${Math.ceil(month / 3)}`;
}

export function agruparPorPeriodo(
  rows: SheetRow[],
  dateField: string,
  vista: Vista,
  groupBy: string[] = ["Plataforma"]
): SheetRow[] {
  if (vista === "mensual") return rows;

  const grupos = new Map<string, SheetRow[]>();
  for (const row of rows) {
    const fecha = row[dateField];
    if (typeof fecha !== "string") continue;
    const id = [periodoDe(fecha, vista), ...groupBy.map((key) => String(row[key] ?? ""))].join("||");
    const grupo = grupos.get(id) ?? [];
    grupo.push(row);
    grupos.set(id, grupo);
  }

  const salida: SheetRow[] = [];
  for (const filas of grupos.values()) {
    filas.sort((a, b) => String(a[dateField]).localeCompare(String(b[dateField])));
    const fila: SheetRow = { ...filas[0] };
    fila[dateField] = periodoDe(String(filas[0][dateField]), vista);

    for (const key of Object.keys(fila)) {
      if (key === dateField || groupBy.includes(key)) continue;
      if (key.includes("Var")) {
        fila[key] = null;
        continue;
      }
      const nums = filas.map((item) => item[key]).filter((value): value is number => typeof value === "number");
      if (nums.length === 0) continue;
      const total = nums.reduce((sum, value) => sum + value, 0);
      const regla = reglaDeAgregacion(key);
      fila[key] = regla === "suma" ? total : regla === "promedio" ? total / nums.length : nums[nums.length - 1];
    }
    salida.push(fila);
  }
  return salida;
}

export function remapearFechas(rows: SheetRow[], dateField: string, vista: Vista): SheetRow[] {
  if (vista === "mensual") return rows;
  return rows.map((row) => {
    const fecha = row[dateField];
    return typeof fecha === "string" ? { ...row, [dateField]: periodoDe(fecha, vista) } : row;
  });
}

export function coberturaPeriodos(
  rows: SheetRow[] | null,
  dateField: string,
  vista: Vista
): Record<string, string> {
  if (!rows || vista === "mensual") return {};
  const esperado = vista === "trimestral" ? 3 : 12;
  const meses = new Map<string, Set<string>>();
  for (const row of rows) {
    const fecha = row[dateField];
    if (typeof fecha !== "string") continue;
    const periodo = periodoDe(fecha, vista);
    const mesesDelPeriodo = meses.get(periodo) ?? new Set<string>();
    mesesDelPeriodo.add(fecha.slice(0, 7));
    meses.set(periodo, mesesDelPeriodo);
  }

  const notas: Record<string, string> = {};
  meses.forEach((mesesDelPeriodo, periodo) => {
    if (mesesDelPeriodo.size < esperado) notas[periodo] = `${mesesDelPeriodo.size} de ${esperado} meses`;
  });
  return notas;
}

export function usePeriodo(
  rows: SheetRow[] | null,
  dateField: string,
  vista: Vista,
  groupBy: string[] = ["Plataforma"],
  registros = false
): SheetRow[] | null {
  const groupKey = groupBy.join("|");
  return useMemo(() => {
    if (!rows) return null;
    return registros
      ? remapearFechas(rows, dateField, vista)
      : agruparPorPeriodo(rows, dateField, vista, groupBy);
  }, [rows, dateField, vista, groupKey, registros]);
}