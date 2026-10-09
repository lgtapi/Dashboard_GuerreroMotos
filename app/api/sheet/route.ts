import { NextRequest, NextResponse } from "next/server";
import { fetchSheetTab } from "@/lib/sheets";

// Nunca cachear: cada vez que el navegador llame a esta ruta, se lee el
// Google Sheet en vivo. Así, cuando agregas una fila nueva en Sheets,
// el dashboard la refleja en el siguiente poll (ver app/page.tsx).
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const tab = req.nextUrl.searchParams.get("tab");
  if (!tab) {
    return NextResponse.json({ error: "Falta el parámetro ?tab=" }, { status: 400 });
  }
  try {
    const rows = await fetchSheetTab(tab);
    return NextResponse.json(
      { tab, rows },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
