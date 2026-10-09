// Preparación de la hoja Leads_Detalle (un registro por lead / respuesta del
// formulario) para que responda a los botones Mensual / Trimestral / Anual y a
// los selectores de periodo del dashboard.

import { normalizarMes } from "@/lib/fechas";
import { periodoDe, type Vista } from "@/lib/periodos";
import type { SheetRow } from "@/lib/types";

// Quita tildes, signos y espacios para comparar nombres de columna.
const clave = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Columnas de fecha que se buscan, en orden de preferencia. Si la hoja trae
// "Mes" se usa esa; si no, la fecha del registro o la marca temporal del
// formulario de Google.
const CANDIDATOS_FECHA = ["Mes", "Fecha", "Fecha_registro", "Fecha registro", "Marca temporal", "Timestamp"];

// Campos que se grafican. Para cada uno se aceptan varios nombres de columna,
// por si en la hoja quedó escrito distinto.
export const CAMPOS_LEADS = [
  {
    id: "canal",
    titulo: "¿Cómo nos conoció? (canal)",
    columnas: ["Canal_normalizado", "Canal", "¿Cómo nos conoció?", "Como nos conocio", "Medio"],
    topN: 8,
  },
  {
    id: "gestion",
    titulo: "Tipo de gestión",
    columnas: ["Tipo_gestion", "Tipo de gestión", "Gestion"],
    topN: 8,
  },
  {
    id: "moto",
    titulo: "Moto de interés (más consultadas)",
    columnas: ["Moto_interes", "Moto de interés", "Moto", "Modelo"],
    topN: 8,
  },
  {
    id: "atendio",
    titulo: "¿A quién vio o quién lo atendió?",
    columnas: ["¿A quien vio o quien lo atendio?", "Asesor", "Atendido por"],
    topN: 8,
  },
] as const;

export function buscarColumna(rows: SheetRow[], candidatos: readonly string[]): string | null {
  const columnas = new Set<string>();
  for (const row of rows.slice(0, 50)) Object.keys(row).forEach((c) => columnas.add(c));
  const lista = [...columnas];
  for (const candidato of candidatos) {
    const encontrada = lista.find((c) => clave(c) === clave(candidato));
    if (encontrada) return encontrada;
  }
  // Coincidencia parcial: "Fecha de contacto", "Canal de entrada", etc.
  for (const candidato of candidatos) {
    const encontrada = lista.find((c) => clave(c).includes(clave(candidato)));
    if (encontrada) return encontrada;
  }
  return null;
}

export type LeadsPreparados = {
  // Cada lead con su periodo (mes, trimestre o año) ya calculado.
  registros: { periodo: string; row: SheetRow }[];
  // Columna de fecha que se usó (para mostrarla en la nota de la sección).
  columnaFecha: string | null;
  // Periodos en los que hay al menos un lead, ordenados.
  periodos: string[];
};

export function prepararLeads(rows: SheetRow[] | null, vista: Vista): LeadsPreparados {
  if (!rows || rows.length === 0) return { registros: [], columnaFecha: null, periodos: [] };
  const columnaFecha = buscarColumna(rows, CANDIDATOS_FECHA);
  if (!columnaFecha) return { registros: [], columnaFecha: null, periodos: [] };

  const registros: { periodo: string; row: SheetRow }[] = [];
  for (const row of rows) {
    const mes = normalizarMes(row[columnaFecha]);
    if (typeof mes !== "string" || !/^\d{4}-\d{2}-01$/.test(mes)) continue; // sin fecha válida
    registros.push({ periodo: periodoDe(mes, vista), row });
  }
  const periodos = [...new Set(registros.map((r) => r.periodo))].sort();
  return { registros, columnaFecha, periodos };
}

const esVacio = (valor: unknown) =>
  valor === null || valor === undefined || ["", "null", "n/a", "-"].includes(String(valor).trim().toLowerCase());

// Total de leads por periodo (para la gráfica de evolución).
export function leadsPorPeriodo(datos: LeadsPreparados): { periodo: string; valor: number }[] {
  const conteo = new Map<string, number>();
  for (const { periodo } of datos.registros) conteo.set(periodo, (conteo.get(periodo) ?? 0) + 1);
  return datos.periodos.map((periodo) => ({ periodo, valor: conteo.get(periodo) ?? 0 }));
}

// Cuenta los valores de una columna en los dos periodos comparados.
export function compararCampo(
  datos: LeadsPreparados,
  columna: string | null,
  periodoA: string,
  periodoB: string,
  topN?: number
): { name: string; a: number; b: number }[] {
  if (!columna) return [];
  const conteo = new Map<string, { name: string; a: number; b: number }>();
  for (const { periodo, row } of datos.registros) {
    if (periodo !== periodoA && periodo !== periodoB) continue;
    const valor = row[columna];
    if (esVacio(valor)) continue;
    const texto = String(valor).trim();
    const id = clave(texto); // "Instagram" e "instagram " cuentan juntos
    const entrada = conteo.get(id) ?? { name: texto, a: 0, b: 0 };
    if (periodo === periodoA) entrada.a += 1;
    if (periodo === periodoB) entrada.b += 1;
    conteo.set(id, entrada);
  }
  let lista = [...conteo.values()].sort((x, y) => y.a + y.b - (x.a + x.b));
  if (topN) lista = lista.slice(0, topN);
  return lista;
}

// Valor más frecuente de una columna en un periodo (p. ej. "canal principal").
export function principal(datos: LeadsPreparados, columna: string | null, periodo: string): string | null {
  if (!columna) return null;
  const conteo = new Map<string, { name: string; n: number }>();
  for (const r of datos.registros) {
    if (r.periodo !== periodo || esVacio(r.row[columna])) continue;
    const texto = String(r.row[columna]).trim();
    const entrada = conteo.get(clave(texto)) ?? { name: texto, n: 0 };
    entrada.n += 1;
    conteo.set(clave(texto), entrada);
  }
  const top = [...conteo.values()].sort((a, b) => b.n - a.n)[0];
  return top ? top.name : null;
}
