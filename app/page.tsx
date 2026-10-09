"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { CompareBarChart } from "@/components/CompareBarChart";
import { OverlayCompareChart } from "@/components/OverlayCompareChart";
import { MonthlyYearCompare } from "@/components/MonthlyYearCompare";
import { LeadsStats } from "@/components/LeadsStats";
import { CreatorsStats } from "@/components/CreatorsStats";
import { AdvisorsStats } from "@/components/AdvisorsStats";
import { PlatformCompareChart } from "@/components/PlatformCompareChart";
import { PlatformTimelineChart } from "@/components/PlatformTimelineChart";
import { PlatformSection, SectionHeading } from "@/components/PlatformSection";
import {
  SheetRow,
  compareCountsByField,
  mesLabel,
  sortIsoDatesAsc,
  sheetHasRealData,
} from "@/lib/types";
import { Vista, coberturaPeriodos, usePeriodo } from "@/lib/periodos";

const POLL_MS = 30_000;

type FetchState<T> = { data: T | null; error: string | null; loading: boolean };

function useSheetTab<T = SheetRow[]>(tab: string) {
  const [state, setState] = useState<FetchState<T>>({ data: null, error: null, loading: true });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/sheet?tab=${encodeURIComponent(tab)}`, { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ data: null, error: json.error || "Error desconocido", loading: false });
          return;
        }
        setState({ data: json.rows as T, error: null, loading: false });
      } catch (e) {
        if (cancelled) return;
        setState({ data: null, error: e instanceof Error ? e.message : "Error de red", loading: false });
      }
    }
    load();
    const interval = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tab]);

  return state;
}

export default function DashboardPage() {
  const [vista, setVista] = useState<Vista>("mensual");

  const redesRaw = useSheetTab<SheetRow[]>("Redes_LookerStudio");
  const redes2025Raw = useSheetTab<SheetRow[]>("2025_Redes_LookerStudio");
  const [verEstadisticasLeads, setVerEstadisticasLeads] = useState(false);
  const creadoresRaw = useSheetTab<SheetRow[]>("creadores_contenido");
  const [verCreadores, setVerCreadores] = useState(false);
  const asignacionesRaw = useSheetTab<SheetRow[]>("Asignación_Asesores");
  const [verAsesores, setVerAsesores] = useState(false);
  // Mientras una de estas vistas está abierta se ocultan las demás secciones
  const vistaEspecial = verEstadisticasLeads || verCreadores || verAsesores;
  const fbFormatosRaw = useSheetTab<SheetRow[]>("Facebook_Formatos");
  const waHistoricoRaw = useSheetTab<SheetRow[]>("WhatsApp_Historico");
  const waCanalRaw = useSheetTab<SheetRow[]>("WhatsApp_Canal");
  const waAsesorRaw = useSheetTab<SheetRow[]>("WhatsApp_Asesor");
  const webTraficoRaw = useSheetTab<SheetRow[]>("Trafico_Web_Historico");
  const leadsDetalleRaw = useSheetTab<SheetRow[]>("Leads_Detalle");
  const campanasRaw = useSheetTab<SheetRow[]>("Campanas_Historico");

  // Vista ANUAL: se compara 2025 (hoja 2025_Redes_LookerStudio) contra 2026
  // (hoja Redes_LookerStudio). Para que sea justo, de 2025 se toman solo los
  // mismos meses que ya tiene 2026 (p. ej. enero–septiembre contra enero–septiembre).
  const mesesDe2026 = useMemo(
    () => [...new Set((redesRaw.data ?? []).map((r) => String(r.Mes).slice(5, 7)))].sort(),
    [redesRaw.data]
  );
  const redesBase = useMemo(() => {
    if (vista !== "anual" || !redesRaw.data) return redesRaw.data;
    const de2025 = (redes2025Raw.data ?? []).filter(
      (r) => String(r.Mes).startsWith("2025-") && mesesDe2026.includes(String(r.Mes).slice(5, 7))
    );
    return [...de2025, ...redesRaw.data];
  }, [vista, redesRaw.data, redes2025Raw.data, mesesDe2026]);
  const redes = { ...redesRaw, data: usePeriodo(redesBase, "Mes", vista) };

  // Métricas de la comparación anual (se buscan por nombre aproximado)
  const metricasAnuales = useMemo(() => {
    const columnas = Object.keys((redesRaw.data ?? [])[0] ?? {});
    const buscar = (patron: RegExp) => columnas.find((c) => patron.test(c));
    return [
      buscar(/total.*seguid|seguid.*total/i),
      buscar(/seguid.*nuev/i),
      buscar(/seguid.*perd/i),
      buscar(/^visualiz/i),
    ].filter((c): c is string => !!c);
  }, [redesRaw.data]);
  const esAnual = vista === "anual";
  const NOMBRES_MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const rangoMeses =
    mesesDe2026.length > 0
      ? `${NOMBRES_MES[Number(mesesDe2026[0]) - 1]}–${NOMBRES_MES[Number(mesesDe2026[mesesDe2026.length - 1]) - 1]}`
      : "";
  const fbFormatos = {
    ...fbFormatosRaw,
    data: usePeriodo(fbFormatosRaw.data, "Mes", vista, ["Formato", "Categoría"]),
  };
  const waHistorico = { ...waHistoricoRaw, data: usePeriodo(waHistoricoRaw.data, "Fecha", vista) };
  const waCanal = { ...waCanalRaw, data: usePeriodo(waCanalRaw.data, "Fecha", vista, ["Canal"]) };
  const waAsesor = { ...waAsesorRaw, data: usePeriodo(waAsesorRaw.data, "Fecha", vista, ["Asesor"]) };
  const webTrafico = { ...webTraficoRaw, data: usePeriodo(webTraficoRaw.data, "Fecha", vista) };
  const leadsDetalle = {
    ...leadsDetalleRaw,
    data: usePeriodo(leadsDetalleRaw.data, "Mes", vista, [], true),
  };
  const campanas = { ...campanasRaw, data: usePeriodo(campanasRaw.data, "Fecha", vista) };

  const months = useMemo(() => {
    if (!redes.data) return [];
    return sortIsoDatesAsc(redes.data.map((r) => String(r.Mes)));
  }, [redes.data]);

  const [mesA, setMesA] = useState<string>("");
  const [mesB, setMesB] = useState<string>("");

  function cambiarVista(nuevaVista: Vista) {
    setVista(nuevaVista);
    setMesA("");
    setMesB("");
  }

  const notasPeriodos = useMemo(
    () => coberturaPeriodos(redesBase, "Mes", vista),
    [redesBase, vista]
  );

  useEffect(() => {
    if (months.length >= 2 && (!mesA || !mesB)) {
      setMesA(months[months.length - 2]);
      setMesB(months[months.length - 1]);
    } else if (months.length === 1 && !mesA) {
      setMesA(months[0]);
      setMesB(months[0]);
    }
  }, [months, mesA, mesB]);

  const labelA = mesLabel(mesA);
  const labelB = mesLabel(mesB);

  // Una gráfica por métrica: cada plataforma con su valor en el año A y el año B
  const anualesData = useMemo(() => {
    if (!esAnual || !redes.data) return [];
    const plataformas = [...new Set(redes.data.map((r) => String(r.Plataforma ?? "").trim()).filter(Boolean))];
    return metricasAnuales
      .map((metrica) => ({
        metrica,
        data: plataformas
          .map((p) => {
            const fila = (periodo: string) =>
              redes.data!.find((r) => String(r.Mes) === periodo && String(r.Plataforma ?? "").trim() === p);
            const a = fila(mesA)?.[metrica];
            const b = fila(mesB)?.[metrica];
            return { name: p, a: typeof a === "number" ? a : 0, b: typeof b === "number" ? b : 0, conDato: typeof a === "number" || typeof b === "number" };
          })
          .filter((d) => d.conDato),
      }))
      .filter((m) => m.data.length > 0);
  }, [esAnual, redes.data, metricasAnuales, mesA, mesB]);

  // Comparativo cruzado por plataforma (Visualizaciones), a partir de Redes_LookerStudio
  const plataformasChartData = useMemo(() => {
    if (!redes.data || !mesA || !mesB) return [];
    const plataformas = [...new Set(redes.data.map((r) => r.Plataforma))];
    return plataformas
      .map((p) => {
        const rowA = redes.data!.find((r) => r.Plataforma === p && String(r.Mes) === mesA);
        const rowB = redes.data!.find((r) => r.Plataforma === p && String(r.Mes) === mesB);
        return {
          platform: p,
          a: typeof rowA?.Visualizaciones === "number" ? rowA.Visualizaciones : 0,
          b: typeof rowB?.Visualizaciones === "number" ? rowB.Visualizaciones : 0,
        };
      })
      .filter((d) => d.a > 0 || d.b > 0);
  }, [redes.data, mesA, mesB]);

  // Comparativo de campañas pagadas (Gasto) entre Instagram y Facebook
  const campanasChartData = useMemo(() => {
    if (!sheetHasRealData(campanas.data) || !mesA || !mesB) return [];
    const plataformas = [...new Set(campanas.data!.map((r) => String(r.Plataforma)))];
    return plataformas
      .map((p) => {
        const rowA = campanas.data!.find((r) => r.Plataforma === p && String(r.Fecha) === mesA);
        const rowB = campanas.data!.find((r) => r.Plataforma === p && String(r.Fecha) === mesB);
        return {
          platform: p,
          a: typeof rowA?.Gasto === "number" ? rowA.Gasto : 0,
          b: typeof rowB?.Gasto === "number" ? rowB.Gasto : 0,
        };
      })
      .filter((d) => d.a > 0 || d.b > 0);
  }, [campanas.data, mesA, mesB]);

  const formatosData = useMemo(() => {
    if (!sheetHasRealData(fbFormatos.data) || !mesA || !mesB) return [];
    const rows = fbFormatos.data!;
    const formatos = [...new Set(rows.map((r) => String(r.Formato)))];
    return formatos.map((f) => {
      const rowA = rows.find((r) => String(r.Mes) === mesA && r.Categoría === "Visualizaciones" && r.Formato === f);
      const rowB = rows.find((r) => String(r.Mes) === mesB && r.Categoría === "Visualizaciones" && r.Formato === f);
      return {
        name: f.replace(/_/g, " "),
        a: typeof rowA?.Valor === "number" ? rowA.Valor : 0,
        b: typeof rowB?.Valor === "number" ? rowB.Valor : 0,
        conDato: typeof rowA?.Valor === "number" || typeof rowB?.Valor === "number",
      };
    }).filter((d) => d.conDato);
  }, [fbFormatos.data, mesA, mesB]);

  function waAsesorData(campo: string) {
    if (!sheetHasRealData(waAsesor.data) || !mesA || !mesB) return [];
    const rows = waAsesor.data!;
    const asesores = [...new Set(rows.map((r) => String(r.Asesor)))];
    return asesores.map((asesor) => {
      const rowA = rows.find((r) => String(r.Fecha) === mesA && r.Asesor === asesor);
      const rowB = rows.find((r) => String(r.Fecha) === mesB && r.Asesor === asesor);
      return {
        name: asesor,
        a: typeof rowA?.[campo] === "number" ? (rowA[campo] as number) : 0,
        b: typeof rowB?.[campo] === "number" ? (rowB[campo] as number) : 0,
        conDato: typeof rowA?.[campo] === "number" || typeof rowB?.[campo] === "number",
      };
    }).filter((d) => d.conDato);
  }
  const waAsignadasData = useMemo(() => waAsesorData("Conversaciones asignadas"), [waAsesor.data, mesA, mesB]);
  const waFinalizadasData = useMemo(() => waAsesorData("Conversaciones finalizadas"), [waAsesor.data, mesA, mesB]);

  const waCanalData = useMemo(() => {
    if (!sheetHasRealData(waCanal.data) || !mesA || !mesB) return [];
    const rows = waCanal.data!;
    const canales = [...new Set(rows.map((r) => String(r.Canal)))];
    return canales.map((canal) => {
      const rowA = rows.find((r) => String(r.Fecha) === mesA && r.Canal === canal);
      const rowB = rows.find((r) => String(r.Fecha) === mesB && r.Canal === canal);
      return {
        name: canal,
        a: typeof rowA?.Conversaciones === "number" ? (rowA.Conversaciones as number) : 0,
        b: typeof rowB?.Conversaciones === "number" ? (rowB.Conversaciones as number) : 0,
        conDato: typeof rowA?.Conversaciones === "number" || typeof rowB?.Conversaciones === "number",
      };
    }).filter((d) => d.conDato);
  }, [waCanal.data, mesA, mesB]);

  const leadsCanalData = useMemo(
    () => compareCountsByField(leadsDetalle.data, "Canal_normalizado", mesA, mesB, "Mes"),
    [leadsDetalle.data, mesA, mesB]
  );
  const leadsTipoGestionData = useMemo(
    () => compareCountsByField(leadsDetalle.data, "Tipo_gestion", mesA, mesB, "Mes"),
    [leadsDetalle.data, mesA, mesB]
  );
  const leadsMotoData = useMemo(
    () => compareCountsByField(leadsDetalle.data, "Moto_interes", mesA, mesB, "Mes", 8),
    [leadsDetalle.data, mesA, mesB]
  );
  const leadsRecomiendaData = useMemo(
    () => compareCountsByField(leadsDetalle.data, "¿A quien vio o quien lo atendio?", mesA, mesB, "Mes"),
    [leadsDetalle.data, mesA, mesB]
  );

  const isLoading = redes.loading && !redes.data;
  const hasError = redes.error;

  return (
    <div className="mx-auto max-w-6xl px-5 py-8 print:px-0 print:py-0">
      {/* Header */}
      <header className="relative mb-8 overflow-hidden rounded-2xl border border-line bg-asphalt-800 print:rounded-none print:border-0 print:border-b-2 print:border-black">
        <div className="pointer-events-none absolute inset-0 bg-brand-radial print:hidden" />
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/10 blur-3xl print:hidden" />

        <div className="relative flex flex-wrap items-center justify-between gap-5 px-6 py-6">
          <div className="flex items-center gap-4">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-line bg-white p-1.5 shadow-brand print:border-black print:shadow-none">
              <Image src="/logo.png" alt="Guerrero Motos" width={56} height={56} className="h-full w-full object-contain" priority />
            </div>
            <div>
              <h1 className="font-display text-2xl font-extrabold uppercase italic tracking-wide text-paper sm:text-3xl print:text-black">
                Dashboard de analítica <span className="text-brand">Guerrero Motos</span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-full bg-brand-gradient px-4 py-2 font-display text-xs font-bold uppercase tracking-wide text-asphalt-900 shadow-brand transition-transform hover:scale-105"
            >
              ⭳ Descargar PDF
            </button>
          </div>
        </div>
      </header>

      {hasError && (
        <div className="mb-6 rounded-xl border border-down/40 bg-down/10 p-4 text-sm text-down print:hidden">
          No se pudo leer el Google Sheet: {redes.error}
        </div>
      )}

      {isLoading && !hasError && (
        <div className="rounded-xl border border-line bg-asphalt-800 p-6 text-center text-paper/60">
          Cargando datos…
        </div>
      )}

      {!isLoading && !hasError && months.length > 0 && mesA && mesB && (
        <>
          <div className="mb-8">
            <MonthSwitcher
              months={months}
              mesA={mesA}
              mesB={mesB}
              onChangeA={setMesA}
              onChangeB={setMesB}
              vista={vista}
              onChangeVista={cambiarVista}
              notas={notasPeriodos}
            />
          </div>

          {/* Botón: estadísticas de la hoja Leads_Detalle */}
          <div className="-mt-4 mb-6 flex flex-wrap gap-3 print:hidden">
            <button
              type="button"
              aria-expanded={verEstadisticasLeads}
              onClick={() => {
                setVerEstadisticasLeads((v) => !v);
                setVerCreadores(false);
                setVerAsesores(false);
              }}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
                verEstadisticasLeads
                  ? "border-brand bg-brand text-asphalt-900"
                  : "border-line bg-asphalt-800 text-paper hover:border-brand hover:text-brand"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                <rect x="1" y="9" width="3" height="6" rx="1" />
                <rect x="6.5" y="4" width="3" height="11" rx="1" />
                <rect x="12" y="1" width="3" height="14" rx="1" />
              </svg>
              {verEstadisticasLeads ? "Ocultar estadísticas de leads" : "Estadísticas de leads"}
            </button>
            <button
              type="button"
              aria-expanded={verCreadores}
              onClick={() => {
                setVerCreadores((v) => !v);
                setVerEstadisticasLeads(false);
                setVerAsesores(false);
              }}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
                verCreadores
                  ? "border-brand bg-brand text-asphalt-900"
                  : "border-line bg-asphalt-800 text-paper hover:border-brand hover:text-brand"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                <circle cx="5" cy="5" r="2.3" />
                <circle cx="11" cy="5" r="2.3" />
                <path d="M1.5 14c0-2.2 1.6-3.8 3.5-3.8S8.5 11.8 8.5 14" />
                <path d="M7.5 14c0-2.2 1.6-3.8 3.5-3.8s3.5 1.6 3.5 3.8" />
              </svg>
              {verCreadores ? "Ocultar métricas creadores" : "Métricas creadores"}
            </button>
            <button
              type="button"
              aria-expanded={verAsesores}
              onClick={() => {
                setVerAsesores((v) => !v);
                setVerEstadisticasLeads(false);
                setVerCreadores(false);
              }}
              className={`flex items-center gap-2 rounded-full border px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
                verAsesores
                  ? "border-brand bg-brand text-asphalt-900"
                  : "border-line bg-asphalt-800 text-paper hover:border-brand hover:text-brand"
              }`}
            >
              <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="4.5" r="2.5" />
                <path d="M3 14c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6" />
                <path d="M11.5 2.5l1.2 1.2 2-2.2" />
              </svg>
              {verAsesores ? "Ocultar asignación de asesores" : "Asignación de asesores"}
            </button>
          </div>
          {verAsesores && (
            <>
              <SectionHeading tag="Asesores" title="Asignación de asesores" iconSrc="/icon-whatsapp.png" iconBg="bg-white" />
              <AdvisorsStats rows={asignacionesRaw.data} />
            </>
          )}
          {verCreadores && (
            <>
              <SectionHeading tag="Creadores" title="Métricas creadores" iconSrc="/logo.png" iconBg="bg-white" />
              <CreatorsStats rows={creadoresRaw.data} />
            </>
          )}
          {verEstadisticasLeads && (
            <>
              <SectionHeading tag="Leads" title="Estadísticas de leads" iconSrc="/icon-forms.png" />
              <LeadsStats rows={leadsDetalleRaw.data} />
            </>
          )}

          {/* Mientras se ven las estadísticas de leads, se ocultan las demás secciones */}
          {!vistaEspecial && (
            <>
          {/* Comparación anual 2025 vs 2026 */}
          {esAnual && (
            <>
              <SectionHeading tag="Anual" title={`Comparación anual ${labelA} vs ${labelB}`} iconSrc="/logo.png" iconBg="bg-white" />
              <p className="-mt-1 mb-4 text-sm text-neutral-500">
                Se comparan los mismos meses en ambos años ({rangoMeses}). Total seguidores toma el valor al cierre del último mes; las demás métricas se suman.
              </p>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {anualesData.map((m) => (
                  <OverlayCompareChart key={m.metrica} title={`${m.metrica} por plataforma`} data={m.data} labelA={labelA} labelB={labelB} />
                ))}
              </div>

              {/* Mismo diseño, con filtro por mes y por red social */}
              <div className="mt-4">
                <MonthlyYearCompare
                  anterior={(redes2025Raw.data ?? []).filter((r) => String(r.Mes).startsWith("2025-"))}
                  actual={redesRaw.data}
                  metricas={metricasAnuales}
                />
              </div>
            </>
          )}

          {/* Comparativo general entre plataformas */}
          {plataformasChartData.length > 0 && (
            <>
              <SectionHeading tag="General" title="Visualizaciones por plataforma" iconSrc="/logo.png" iconBg="bg-white" />
              <PlatformTimelineChart rows={redes.data ?? []} mesA={mesA} mesB={mesB} />
            </>
          )}

          {/* Instagram · datos de Redes_LookerStudio */}
          <PlatformSection tag="Instagram" title="Instagram" iconSrc="/icon-instagram.png" rows={redes.data} mesA={mesA} mesB={mesB} dateField="Mes" platformFilter="Instagram" graficas soloMetricas={esAnual ? metricasAnuales : undefined} />

          {/* Facebook */}
          <PlatformSection tag="Facebook" title="Facebook" iconSrc="/icon-facebook.png" rows={redes.data} mesA={mesA} mesB={mesB} dateField="Mes" platformFilter="Facebook" graficas soloMetricas={esAnual ? metricasAnuales : undefined} />
          {formatosData.length > 0 && (
            <div className="mt-4">
              <CompareBarChart title="Visualizaciones por formato de contenido" data={formatosData} labelA={labelA} labelB={labelB} />
            </div>
          )}

          {/* Campañas publicitarias (Meta Ads) */}
          {campanasChartData.length > 0 && (
            <>
              <SectionHeading tag="Campañas" title="Campañas publicitarias" iconSrc="/icon-forms.png" />
              <PlatformCompareChart title="Gasto por plataforma" data={campanasChartData} labelA={labelA} labelB={labelB} />
            </>
          )}
          <PlatformSection tag="Campañas IG" title="Campañas · Instagram" iconSrc="/icon-instagram.png" rows={campanas.data} mesA={mesA} mesB={mesB} dateField="Fecha" platformFilter="Instagram" />
          <PlatformSection tag="Campañas FB" title="Campañas · Facebook" iconSrc="/icon-facebook.png" rows={campanas.data} mesA={mesA} mesB={mesB} dateField="Fecha" platformFilter="Facebook" />

          {/* TikTok */}
          <PlatformSection tag="TikTok" title="TikTok" iconSrc="/icon-tiktok.png" rows={redes.data} mesA={mesA} mesB={mesB} dateField="Mes" platformFilter="TikTok" graficas soloMetricas={esAnual ? metricasAnuales : undefined} />

          {/* WhatsApp */}
          <PlatformSection tag="WhatsApp" title="WhatsApp" iconSrc="/icon-whatsapp.png" rows={waHistorico.data} mesA={mesA} mesB={mesB} />
          {waCanalData.length > 0 && (
            <div className="mt-4">
              <CompareBarChart title="Conversaciones por canal de entrada" data={waCanalData} labelA={labelA} labelB={labelB} />
            </div>
          )}
          {waAsignadasData.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <CompareBarChart title="Conversaciones asignadas por asesor" data={waAsignadasData} labelA={labelA} labelB={labelB} />
              <CompareBarChart title="Conversaciones finalizadas por asesor" data={waFinalizadasData} labelA={labelA} labelB={labelB} />
            </div>
          )}

          {/* Tráfico web */}
          <PlatformSection tag="Web" title="Tráfico web" iconSrc="/logo.png" rows={webTrafico.data} mesA={mesA} mesB={mesB} />

          {/* Análisis de leads (post-atención) */}
          {leadsCanalData.length > 0 && (
            <>
              <SectionHeading tag="Formulario" title="Análisis de leads" iconSrc="/icon-forms.png" />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <CompareBarChart title="¿Cómo nos conoció? (canal)" data={leadsCanalData} labelA={labelA} labelB={labelB} />
                <CompareBarChart title="Tipo de gestión" data={leadsTipoGestionData} labelA={labelA} labelB={labelB} />
                <CompareBarChart title="Moto de interés (más consultadas)" data={leadsMotoData} labelA={labelA} labelB={labelB} />
                <CompareBarChart title="¿A quien vio o quien lo atendio?" data={leadsRecomiendaData} labelA={labelA} labelB={labelB} />
              </div>
            </>
          )}
            </>
          )}
        </>
      )}

      <footer className="mt-14 flex items-center justify-center border-t border-line pt-5 text-xs text-neutral-500 print:text-black">
        <span className="font-display uppercase tracking-wide">Elaborado por Carlos García</span>
      </footer>
    </div>
  );
}