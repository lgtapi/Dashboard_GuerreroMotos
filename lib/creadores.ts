// Hoja creadores_contenido: una fila por creador y mes (y, si existe, por
// plataforma). Se agrupa según la vista del dashboard (mes / trimestre / año).

import { normalizarMes } from "@/lib/fechas";
import { buscarColumna } from "@/lib/leads";
import { periodoDe, reglaDeAgregacion, type Vista } from "@/lib/periodos";
import type { SheetRow } from "@/lib/types";

const COLUMNAS_CREADOR = ["Creador", "Creador_contenido", "Creador de contenido", "Creadores", "Nombre", "Influencer", "Perfil"];
const COLUMNAS_FECHA = ["Mes", "Fecha"];
const COLUMNAS_PLATAFORMA = ["Plataforma", "Red", "Red social"];

export type DatosCreadores = {
  columnaCreador: string | null;
  columnaFecha: string | null;
  columnaPlataforma: string | null;
  creadores: string[];
  plataformas: string[];
  metricas: string[];
  periodos: string[];
  // valor[periodo][creador][metrica]
  valor: (periodo: string, creador: string, metrica: string, plataforma: string) => number | null;
  columnas: string[];
};

export function prepararCreadores(rows: SheetRow[] | null, vista: Vista): DatosCreadores {
  const vacio: DatosCreadores = {
    columnaCreador: null, columnaFecha: null, columnaPlataforma: null,
    creadores: [], plataformas: [], metricas: [], periodos: [], valor: () => null, columnas: [],
  };
  if (!rows || rows.length === 0) return vacio;

  const columnas = [...new Set(rows.slice(0, 50).flatMap((r) => Object.keys(r)))];
  const columnaCreador = buscarColumna(rows, COLUMNAS_CREADOR);
  const columnaFecha = buscarColumna(rows, COLUMNAS_FECHA);
  const columnaPlataforma = buscarColumna(rows, COLUMNAS_PLATAFORMA);
  if (!columnaCreador || !columnaFecha) return { ...vacio, columnaCreador, columnaFecha, columnas };

  const fijas = [columnaCreador, columnaFecha, columnaPlataforma];
  const metricas = columnas.filter(
    (c) => !fijas.includes(c) && !c.includes("Var") && rows.some((r) => typeof r[c] === "number")
  );

  // La fecha se lleva siempre a "AAAA-MM-01" (acepta 15/09/2026, Septiembre 2026, etc.)
  const validas = rows
    .map((r) => ({ ...r, [columnaFecha]: normalizarMes(r[columnaFecha]) }))
    .filter(
      (r) => /^\d{4}-\d{2}-01$/.test(String(r[columnaFecha] ?? "")) && String(r[columnaCreador] ?? "").trim() !== ""
    );
  const creadores = [...new Set(validas.map((r) => String(r[columnaCreador]).trim()))];
  const plataformas = columnaPlataforma
    ? [...new Set(validas.map((r) => String(r[columnaPlataforma] ?? "").trim()).filter(Boolean))]
    : [];
  const periodos = [...new Set(validas.map((r) => periodoDe(String(r[columnaFecha]), vista)))].sort();

  // Índice: periodo|creador|plataforma -> filas, ya ordenadas por mes
  const indice = new Map<string, SheetRow[]>();
  for (const r of [...validas].sort((a, b) => String(a[columnaFecha]).localeCompare(String(b[columnaFecha])))) {
    const id = `${periodoDe(String(r[columnaFecha]), vista)}|${String(r[columnaCreador]).trim()}`;
    indice.set(id, [...(indice.get(id) ?? []), r]);
  }

  const valor = (periodo: string, creador: string, metrica: string, plataforma: string) => {
    const filas = (indice.get(`${periodo}|${creador}`) ?? []).filter(
      (r) => plataforma === "Todas" || !columnaPlataforma || String(r[columnaPlataforma] ?? "").trim() === plataforma
    );
    // Sumar plataformas dentro de cada mes, luego aplicar la regla del periodo
    const porMes = new Map<string, number>();
    for (const r of filas) {
      const v = r[metrica];
      if (typeof v !== "number") continue;
      const mes = String(r[columnaFecha]);
      porMes.set(mes, (porMes.get(mes) ?? 0) + v);
    }
    const vals = [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);
    if (vals.length === 0) return null;
    const total = vals.reduce((s, v) => s + v, 0);
    const regla = reglaDeAgregacion(metrica);
    return regla === "suma" ? total : regla === "promedio" ? total / vals.length : vals[vals.length - 1];
  };

  return { columnaCreador, columnaFecha, columnaPlataforma, creadores, plataformas, metricas, periodos, valor, columnas };
}
