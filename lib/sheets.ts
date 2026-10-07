// Lee una pestaña de un Google Sheet público (compartido como "Cualquiera con el
// enlace · Lector") usando el endpoint de Google Visualization API. No requiere
// API key ni OAuth: basta con el ID de la hoja de cálculo.
//
// Se usa el formato JSON (no CSV) porque las fechas vienen codificadas de forma
// explícita como Date(año, mesIndex, día), sin depender del locale del CSV.

export type SheetRow = Record<string, string | number | null>;

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

function gvizUrl(tab: string) {
  if (!SHEET_ID) {
    throw new Error(
      "Falta la variable de entorno GOOGLE_SHEET_ID. Copia .env.local.example a .env.local y pega el ID de tu Google Sheet."
    );
  }
  const encodedTab = encodeURIComponent(tab);
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodedTab}`;
}

// Convierte celdas tipo Date(2026,4,1) -> "2026-05-01" (ISO, mes 1-indexado)
function parseGvizDate(raw: string): string {
  const match = /^Date\((\d+),(\d+),(\d+)/.exec(raw);
  if (!match) return raw;
  const [, y, mZeroIndexed, d] = match;
  const month = String(Number(mZeroIndexed) + 1).padStart(2, "0");
  const day = String(Number(d)).padStart(2, "0");
  return `${y}-${month}-${day}`;
}

// El dashboard compara por MES. Si en la hoja una fila de septiembre trae
// "2026-09-01" y otra "2026-09-11" o "Septiembre 2026", se verían como meses
// distintos (tres "Sep 26" en el eje). Por eso toda columna de fecha se lleva a
// la clave única "AAAA-MM-01".
const COLUMNAS_FECHA = ["mes", "fecha"];

const MESES_TEXTO: Record<string, number> = {
  ene: 1, jan: 1, feb: 2, mar: 3, abr: 4, apr: 4, may: 5, jun: 6, jul: 7,
  ago: 8, aug: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12, dec: 12,
};

const claveMes = (anio: number, mes: number) =>
  `${anio}-${String(mes).padStart(2, "0")}-01`;

export function normalizarMes(valor: string | number | null): string | number | null {
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

function normalizarFechas(rows: SheetRow[]): SheetRow[] {
  return rows.map((row) => {
    const salida: SheetRow = { ...row };
    for (const columna of Object.keys(salida)) {
      if (COLUMNAS_FECHA.includes(columna.trim().toLowerCase())) {
        salida[columna] = normalizarMes(salida[columna]);
      }
    }
    return salida;
  });
}

function extractCellValue(cell: { v: unknown; f?: string } | null): string | number | null {
  if (cell === null || cell === undefined) return null;
  const v = cell.v;
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.startsWith("Date(")) {
    return parseGvizDate(v);
  }
  if (typeof v === "number" || typeof v === "string") return v;
  return cell.f ?? null;
}

export const CORREGIR_MILES = true;

const COLUMNAS_DE_CONTEO = [
  "visualiz", "alcance", "interac", "clic", "visita", "seguidor", "impresion",
  "sesion", "usuario", "pagina", "página", "mensaje", "conversacion",
  "conversación", "publicacion", "publicación", "historia", "conversion",
  "conversión", "reproduc",
];

function esColumnaDeConteo(columna: string): boolean {
  const nombre = columna.toLowerCase();
  if (nombre.includes("var") || nombre.includes("tasa") || nombre.includes("promedio")) return false;
  return COLUMNAS_DE_CONTEO.some((parte) => nombre.includes(parte));
}

export function corregirMiles(rows: SheetRow[], tab = ""): SheetRow[] {
  if (!CORREGIR_MILES) return rows;
  const cambios: string[] = [];
  const corregidas = rows.map((row) => {
    const corregida: SheetRow = { ...row };
    for (const [columna, valor] of Object.entries(corregida)) {
      if (
        typeof valor === "number" &&
        esColumnaDeConteo(columna) &&
        !Number.isInteger(valor) &&
        Math.abs(valor) < 1000
      ) {
        corregida[columna] = Math.round(valor * 1000);
        cambios.push(`${columna}: ${valor} -> ${corregida[columna]}`);
      }
    }
    return corregida;
  });
  if (cambios.length) {
    console.warn(`[${tab}] ${cambios.length} valor(es) con formato de miles corregidos:`, cambios.slice(0, 20));
  }
  return corregidas;
}

export async function fetchSheetTab(tab: string): Promise<SheetRow[]> {
  const url = gvizUrl(tab);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`No se pudo leer la pestaña "${tab}" (HTTP ${res.status}). Revisa que exista y que la hoja esté compartida como "Cualquiera con el enlace".`);
  }
  const text = await res.text();

  // La respuesta viene envuelta en: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const jsonMatch = /setResponse\(([\s\S]*)\);?\s*$/.exec(text.trim());
  if (!jsonMatch) {
    throw new Error(`Respuesta inesperada de Google Sheets para la pestaña "${tab}". Verifica el GOOGLE_SHEET_ID y que la hoja sea pública para lectores.`);
  }
  const data = JSON.parse(jsonMatch[1]);

  if (data.status === "error") {
    const msg = data.errors?.[0]?.detailed_message || "Error desconocido de Google Sheets";
    throw new Error(`Google Sheets devolvió un error para "${tab}": ${msg}`);
  }

  const cols: string[] = data.table.cols.map(
    (c: { label?: string; id: string }, i: number) => c.label || c.id || `col_${i}`
  );

  const rows: SheetRow[] = (data.table.rows || []).map((r: { c: ({ v: unknown; f?: string } | null)[] }) => {
    const obj: SheetRow = {};
    cols.forEach((colName, i) => {
      obj[colName] = extractCellValue(r.c[i]);
    });
    return obj;
  });

  return corregirMiles(normalizarFechas(rows), tab);
}