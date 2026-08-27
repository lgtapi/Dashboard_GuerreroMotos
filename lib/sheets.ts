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

  return rows;
}
