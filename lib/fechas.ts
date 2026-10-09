// Utilidades de fecha compartidas entre el servidor (lectura del Sheet) y el
// navegador (sección de leads). Todas las fechas se llevan a la clave de mes
// "AAAA-MM-01" para que coincidan con los botones de mes / trimestre / año.

export type Celda = string | number | null;

const MESES_TEXTO: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

const claveMes = (anio: number, mes: number) =>
  `${anio}-${String(mes).padStart(2, "0")}-01`;

export function normalizarMes(valor: Celda): Celda {
  if (typeof valor !== "string") return valor;
  const texto = valor.trim().toLowerCase();
  if (!texto) return valor;

  let m = /^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?/.exec(texto); // 2026-09-11, 2026/09
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return claveMes(Number(m[1]), Number(m[2]));

  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/.exec(texto); // 11/09/2026 (día/mes/año)
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12) return claveMes(Number(m[3]), Number(m[2]));

  m = /([a-záéíóú]{3})[a-záéíóú]*\.?[\s\-/]*(?:de\s+)?(\d{4}|\d{2})\b/.exec(texto); // Septiembre 2026, sep-26
  if (m && MESES_TEXTO[m[1]]) {
    const anio = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
    return claveMes(anio, MESES_TEXTO[m[1]]);
  }
  return valor;
}

