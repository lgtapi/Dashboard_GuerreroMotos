"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { MonthSwitcher } from "@/components/MonthSwitcher";
import { CompareBarChart } from "@/components/CompareBarChart";
import { PlatformCompareChart } from "@/components/PlatformCompareChart";
import { PlatformSection, SectionHeading } from "@/components/PlatformSection";
import {
  RedesRow,
  SheetRow,
  compareCountsByField,
  mesLabel,
  sortIsoDatesAsc,
  sheetHasRealData,
} from "@/lib/types";

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
  const redes = useSheetTab<RedesRow[]>("Redes_LookerStudio");
  const instagram = useSheetTab<SheetRow[]>("Instagram_Historico");
  const facebook = useSheetTab<SheetRow[]>("Facebook_Historico");
  const tiktok = useSheetTab<SheetRow[]>("TikTok_Historico");
  const fbFormatos = useSheetTab<SheetRow[]>("Facebook_Formatos");
  const waHistorico = useSheetTab<SheetRow[]>("WhatsApp_Historico");
  const waCanal = useSheetTab<SheetRow[]>("WhatsApp_Canal");
  const waAsesor = useSheetTab<SheetRow[]>("WhatsApp_Asesor");
  const webTrafico = useSheetTab<SheetRow[]>("Trafico_Web_Historico");
  const leadsDetalle = useSheetTab<SheetRow[]>("Leads_Detalle");
  const campanas = useSheetTab<SheetRow[]>("Campanas_Historico");

  const months = useMemo(() => {
    if (!redes.data) return [];
    return sortIsoDatesAsc(redes.data.map((r) => String(r.Mes)));
  }, [redes.data]);

  const [mesA, setMesA] = useState<string>("");
  const [mesB, setMesB] = useState<string>("");

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
      };
    });
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
      };
    });
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
      };
    });
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
            <MonthSwitcher months={months} mesA={mesA} mesB={mesB} onChangeA={setMesA} onChangeB={setMesB} />
          </div>

          {/* Comparativo general entre plataformas */}
          {plataformasChartData.length > 0 && (
            <>
              <SectionHeading tag="General" title="Visualizaciones por plataforma" iconSrc="/logo.png" iconBg="bg-white" />
              <PlatformCompareChart title="" data={plataformasChartData} labelA={labelA} labelB={labelB} />
            </>
          )}

          {/* Instagram */}
          <PlatformSection tag="Instagram" title="Instagram" iconSrc="/icon-instagram.png" rows={instagram.data} mesA={mesA} mesB={mesB} />

          {/* Facebook */}
          <PlatformSection tag="Facebook" title="Facebook" iconSrc="/icon-facebook.png" rows={facebook.data} mesA={mesA} mesB={mesB} />
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
          <PlatformSection tag="TikTok" title="TikTok" iconSrc="/icon-tiktok.png" rows={tiktok.data} mesA={mesA} mesB={mesB} />

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

      <footer className="mt-14 flex items-center justify-center border-t border-line pt-5 text-xs text-neutral-500 print:text-black">
        <span className="font-display uppercase tracking-wide">Elaborado por Carlos García</span>
      </footer>
    </div>
  );
}
