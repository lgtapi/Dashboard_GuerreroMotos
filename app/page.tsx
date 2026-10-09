"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CompareBarChart } from "@/components/CompareBarChart";
import { PlatformCompareChart } from "@/components/PlatformCompareChart";
import { PlatformTimelineChart } from "@/components/PlatformTimelineChart";
import { YearCompareChart } from "@/components/YearCompareChart";
import { CreatorsCompare } from "@/components/CreatorsCompare";
import { AdvisorsAssignment } from "@/components/AdvisorsAssignment";
import { NavRail, type NavItem } from "@/components/NavRail";
import { PeriodPanel } from "@/components/PeriodPanel";
import { KpiTiles } from "@/components/KpiTiles";
import { NetworkCards } from "@/components/NetworkCards";
import { LeadsCompact } from "@/components/LeadsCompact";
import { PlatformSection, SectionHeading } from "@/components/PlatformSection";
import { prepararLeads } from "@/lib/leads";
import { etiquetaMetrica, metricasRedes, plataformasRedes, valorRed } from "@/lib/redes";
import { SheetRow, fmtNumber, mesLabel, sortIsoDatesAsc, sheetHasRealData } from "@/lib/types";
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
  const [verInteranual, setVerInteranual] = useState(false);
  const creadoresRaw = useSheetTab<SheetRow[]>("creadores_contenido");
  const [verCreadores, setVerCreadores] = useState(false);
  const asignacionesRaw = useSheetTab<SheetRow[]>("Asignación_Asesores");
  const [verAsesores, setVerAsesores] = useState(false);
  const fbFormatosRaw = useSheetTab<SheetRow[]>("Facebook_Formatos");
  const waHistoricoRaw = useSheetTab<SheetRow[]>("WhatsApp_Historico");
  const waCanalRaw = useSheetTab<SheetRow[]>("WhatsApp_Canal");
  const waAsesorRaw = useSheetTab<SheetRow[]>("WhatsApp_Asesor");
  const webTraficoRaw = useSheetTab<SheetRow[]>("Trafico_Web_Historico");
  const leadsDetalleRaw = useSheetTab<SheetRow[]>("Leads_Detalle");
  const campanasRaw = useSheetTab<SheetRow[]>("Campanas_Historico");

  const redes = { ...redesRaw, data: usePeriodo(redesRaw.data, "Mes", vista) };
  const fbFormatos = {
    ...fbFormatosRaw,
    data: usePeriodo(fbFormatosRaw.data, "Mes", vista, ["Formato", "Categoría"]),
  };
  const waHistorico = { ...waHistoricoRaw, data: usePeriodo(waHistoricoRaw.data, "Fecha", vista) };
  const waCanal = { ...waCanalRaw, data: usePeriodo(waCanalRaw.data, "Fecha", vista, ["Canal"]) };
  const waAsesor = { ...waAsesorRaw, data: usePeriodo(waAsesorRaw.data, "Fecha", vista, ["Asesor"]) };
  const webTrafico = { ...webTraficoRaw, data: usePeriodo(webTraficoRaw.data, "Fecha", vista) };
  // Leads_Detalle: cada lead queda asociado al periodo (mes / trimestre / año)
  // de su fecha, para que responda a los botones del selector.
  const leads = useMemo(() => prepararLeads(leadsDetalleRaw.data, vista), [leadsDetalleRaw.data, vista]);
  const campanas = { ...campanasRaw, data: usePeriodo(campanasRaw.data, "Fecha", vista) };

  const months = useMemo(() => {
    if (!redes.data) return [];
    // Periodos de redes + periodos con leads, para poder elegir también
    // un mes que solo tenga respuestas del formulario.
    return sortIsoDatesAsc([...redes.data.map((r) => String(r.Mes)), ...leads.periodos]);
  }, [redes.data, leads.periodos]);

  const [mesA, setMesA] = useState<string>("");
  const [mesB, setMesB] = useState<string>("");

  function cambiarVista(nuevaVista: Vista) {
    setVista(nuevaVista);
    setMesA("");
    setMesB("");
  }

  const notasPeriodos = useMemo(
    () => coberturaPeriodos(redesRaw.data, "Mes", vista),
    [redesRaw.data, vista]
  );

  // Por defecto se comparan los dos últimos periodos con datos de redes
  // (si no hay, los dos últimos con leads).
  useEffect(() => {
    if (mesA && mesB) return;
    const deRedes = sortIsoDatesAsc((redes.data ?? []).map((r) => String(r.Mes)));
    const base = deRedes.length > 0 ? deRedes : months;
    if (base.length >= 2) {
      setMesA(base[base.length - 2]);
      setMesB(base[base.length - 1]);
    } else if (base.length === 1) {
      setMesA(base[0]);
      setMesB(base[0]);
    }
  }, [months, redes.data, mesA, mesB]);

  const labelA = mesLabel(mesA);
  const labelB = mesLabel(mesB);

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

  const plataformas = useMemo(() => plataformasRedes(redes.data), [redes.data]);
  const periodosRedes = useMemo(
    () => sortIsoDatesAsc((redes.data ?? []).map((r) => String(r.Mes))),
    [redes.data]
  );

  // Métrica principal de la gráfica general: Seguidores_totales si la hoja la
  // tiene; si no, Visualizaciones.
  const metricaGeneral = useMemo(() => {
    const ms = metricasRedes(redes.data);
    return ms.includes("Seguidores_totales") ? "Seguidores_totales" : ms.includes("Visualizaciones") ? "Visualizaciones" : ms[0] ?? "Visualizaciones";
  }, [redes.data]);

  // Plataforma con el mayor valor de la métrica principal en el periodo B
  const destacada = useMemo(() => {
    const filas = plataformas
      .map((p) => ({ p, a: valorRed(redes.data, mesA, p, metricaGeneral), b: valorRed(redes.data, mesB, p, metricaGeneral) }))
      .filter((f) => f.b !== null)
      .sort((x, y) => (y.b ?? 0) - (x.b ?? 0));
    return filas[0] ?? null;
  }, [plataformas, redes.data, mesA, mesB, metricaGeneral]);

  const [seccion, setSeccion] = useState("general");
  const navItems: NavItem[] = [
    { id: "general", label: "General", short: "GEN" },
    ...plataformas.slice(0, 4).map((p) => ({ id: p.toLowerCase(), label: p, short: p.slice(0, 2).toUpperCase() })),
    { id: "anio", label: "Comparar con el año anterior", short: "AÑO" },
    { id: "creadores", label: "Métricas creadores", short: "CRE" },
    { id: "asesores", label: "Asignación de asesores", short: "ASE" },
    { id: "canales", label: "WhatsApp, web y campañas", short: "MÁS" },
    { id: "leads", label: "Análisis de leads", short: "LDS" },
  ];
  function irA(id: string) {
    setSeccion(id);
    if (id === "anio") setVerInteranual(true);
    if (id === "creadores") setVerCreadores(true);
    if (id === "asesores") setVerAsesores(true);
  }

  const isLoading = redes.loading && !redes.data;
  const hasError = redes.error;
  const listo = !isLoading && !hasError && months.length > 0 && mesA && mesB;
  const anioB = mesB.slice(0, 4);
  const anioAnterior = anioB ? String(Number(anioB) - 1) : "";

  const botonVista = (activo: boolean) =>
    `flex items-center gap-2 rounded-full border px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide transition-colors ${
      activo ? "border-brand bg-brand text-asphalt-900" : "border-white/15 bg-black/30 text-paper hover:border-brand hover:text-brand"
    }`;

  return (
    <div className="min-h-screen bg-asphalt-900 bg-dashboard p-3 text-paper sm:p-5 print:bg-white print:p-0">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-4 lg:flex-row lg:items-start">
        <NavRail items={navItems} activo={seccion} onIr={irA} />

        {/* PANEL CENTRAL */}
        <main className="glass flex min-w-0 flex-1 flex-col gap-5 rounded-[32px] p-4 sm:p-7 print:rounded-none print:border-0 print:p-0">
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-extrabold uppercase italic leading-none tracking-wide sm:text-[34px]">
                Dashboard de analítica <span className="text-brand">Guerrero Motos</span>
              </h1>
              {listo && (
                <p className="mt-1.5 text-[13px] text-paper/60">
                  Comparando <strong className="text-brand-light">{labelA}</strong> → <strong className="text-yellow">{labelB}</strong> · vista {vista}
                </p>
              )}
            </div>
            {listo && (
              <div className="flex flex-wrap gap-2 print:hidden">
                <button type="button" aria-expanded={verInteranual} onClick={() => setVerInteranual((v) => !v)} className={botonVista(verInteranual)}>
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor">
                    <rect x="1" y="4" width="6" height="11" rx="1" opacity="0.45" />
                    <rect x="2.5" y="8" width="3" height="7" rx="0.8" />
                    <rect x="9" y="2" width="6" height="13" rx="1" opacity="0.45" />
                    <rect x="10.5" y="6" width="3" height="9" rx="0.8" />
                  </svg>
                  {anioAnterior} vs {anioB}
                </button>
                <button type="button" aria-expanded={verCreadores} onClick={() => setVerCreadores((v) => !v)} className={botonVista(verCreadores)}>
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                    <circle cx="5" cy="5" r="2.3" />
                    <circle cx="11" cy="5" r="2.3" />
                    <path d="M1.5 14c0-2.2 1.6-3.8 3.5-3.8S8.5 11.8 8.5 14" />
                    <path d="M7.5 14c0-2.2 1.6-3.8 3.5-3.8s3.5 1.6 3.5 3.8" />
                  </svg>
                  Métricas creadores
                </button>
                <button type="button" aria-expanded={verAsesores} onClick={() => setVerAsesores((v) => !v)} className={botonVista(verAsesores)}>
                  <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="4.5" r="2.5" />
                    <path d="M3 14c0-2.8 2.2-4.6 5-4.6s5 1.8 5 4.6" />
                    <path d="M11.5 2.5l1.2 1.2 2-2.2" />
                  </svg>
                  Asignación de asesores
                </button>
              </div>
            )}
          </header>

          {hasError && (
            <div className="rounded-xl border border-down/40 bg-down/10 p-4 text-sm text-down print:hidden">
              No se pudo leer el Google Sheet: {redes.error}
            </div>
          )}
          {isLoading && !hasError && (
            <div className="rounded-xl border border-line bg-asphalt-800 p-6 text-center text-paper/60">Cargando datos…</div>
          )}

          {listo && (
            <>
              {/* En pantallas pequeñas el selector de periodos va arriba */}
              <div className="lg:hidden print:hidden">
                <PeriodPanel
                  periodos={months}
                  mesA={mesA}
                  mesB={mesB}
                  onChangeA={setMesA}
                  onChangeB={setMesB}
                  vista={vista}
                  onChangeVista={cambiarVista}
                  notas={notasPeriodos}
                />
              </div>

              {/* Vistas que se abren con los botones */}
              {verInteranual && (
                <section id="anio" className="scroll-mt-6">
                  <SubTitulo titulo={`Comparación ${anioAnterior} vs ${anioB}`} onCerrar={() => setVerInteranual(false)} />
                  <YearCompareChart actual={redesRaw.data} anterior={redes2025Raw.data} periodo={mesB} vista={vista} />
                </section>
              )}
              {verCreadores && (
                <section id="creadores" className="scroll-mt-6">
                  <SubTitulo titulo="Métricas creadores" onCerrar={() => setVerCreadores(false)} />
                  <CreatorsCompare rows={creadoresRaw.data} vista={vista} mesA={mesA} mesB={mesB} />
                </section>
              )}
              {verAsesores && (
                <section id="asesores" className="scroll-mt-6">
                  <SubTitulo titulo="Asignación de asesores" onCerrar={() => setVerAsesores(false)} />
                  <AdvisorsAssignment rows={asignacionesRaw.data} vista={vista} mesA={mesA} mesB={mesB} />
                </section>
              )}

              {/* Indicadores */}
              <KpiTiles rows={redes.data} periodos={periodosRedes} mesA={mesA} mesB={mesB} />

              {/* Gráfica general + plataforma destacada */}
              <section id="general" className="flex scroll-mt-6 flex-col gap-3.5 xl:flex-row">
                <div className="min-w-0 flex-1">
                  <PlatformTimelineChart rows={redes.data ?? []} metrica={metricaGeneral} mesA={mesA} mesB={mesB} />
                </div>
                {destacada && (
                  <div className="flex flex-col gap-3 rounded-[24px] bg-gradient-to-br from-brand to-brand-dim p-5 text-asphalt-900 xl:w-[230px] xl:shrink-0">
                    <span className="text-[11px] font-bold uppercase tracking-widest">Plataforma destacada</span>
                    <h3 className="font-display text-[34px] font-extrabold uppercase leading-none">{destacada.p}</h3>
                    <p className="text-[13px] leading-snug">
                      Mayor {etiquetaMetrica(metricaGeneral).toLowerCase()} en {labelB}.
                    </p>
                    <div className="mt-auto flex flex-col gap-2.5">
                      <div className="flex justify-between border-t border-black/20 pt-2.5">
                        <span className="text-xs">{labelB}</span>
                        <strong className="font-display text-[22px]">{fmtNumber(destacada.b)}</strong>
                      </div>
                      <div className="flex justify-between border-t border-black/20 pt-2.5">
                        <span className="text-xs">{labelA}</span>
                        <strong className="font-display text-[22px]">{fmtNumber(destacada.a)}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Redes */}
              <section aria-label="Redes" className="flex flex-col gap-3">
                <SubTitulo titulo={`Redes · ${labelA} → ${labelB}`} nota="Toca una métrica para ver su gráfica" />
                <NetworkCards rows={redes.data} plataformas={plataformas} mesA={mesA} mesB={mesB} />
              </section>

              {/* Más canales */}
              <section id="canales" className="flex scroll-mt-6 flex-col">
                {formatosData.length > 0 && (
                  <>
                    <SectionHeading tag="Facebook" title="Formatos de contenido · Facebook" iconSrc="/icon-facebook.png" />
                    <CompareBarChart title="Visualizaciones por formato de contenido" data={formatosData} labelA={labelA} labelB={labelB} />
                  </>
                )}

                {campanasChartData.length > 0 && (
                  <>
                    <SectionHeading tag="Campañas" title="Campañas publicitarias" iconSrc="/icon-forms.png" />
                    <PlatformCompareChart title="Gasto por plataforma" data={campanasChartData} labelA={labelA} labelB={labelB} />
                  </>
                )}
                <PlatformSection tag="Campañas IG" title="Campañas · Instagram" iconSrc="/icon-instagram.png" rows={campanas.data} mesA={mesA} mesB={mesB} dateField="Fecha" platformFilter="Instagram" />
                <PlatformSection tag="Campañas FB" title="Campañas · Facebook" iconSrc="/icon-facebook.png" rows={campanas.data} mesA={mesA} mesB={mesB} dateField="Fecha" platformFilter="Facebook" />

                <div id="whatsapp" className="scroll-mt-6">
                  <PlatformSection tag="WhatsApp" title="WhatsApp" iconSrc="/icon-whatsapp.png" rows={waHistorico.data} mesA={mesA} mesB={mesB} />
                </div>
                {waCanalData.length > 0 && (
                  <div className="mt-4">
                    <CompareBarChart title="Conversaciones por canal de entrada" data={waCanalData} labelA={labelA} labelB={labelB} />
                  </div>
                )}
                {waAsignadasData.length > 0 && (
                  <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <CompareBarChart title="Conversaciones asignadas por asesor" data={waAsignadasData} labelA={labelA} labelB={labelB} />
                    <CompareBarChart title="Conversaciones finalizadas por asesor" data={waFinalizadasData} labelA={labelA} labelB={labelB} />
                  </div>
                )}

                <div id="web" className="scroll-mt-6">
                  <PlatformSection tag="Web" title="Tráfico web" iconSrc="/logo.png" rows={webTrafico.data} mesA={mesA} mesB={mesB} />
                </div>
              </section>
            </>
          )}
        </main>

        {/* PANEL DERECHO */}
        {listo && (
          <aside
            aria-label="Periodo y leads"
            className="glass flex w-full shrink-0 flex-col gap-4 rounded-[32px] p-4 sm:p-5 lg:sticky lg:top-5 lg:max-h-[calc(100vh-40px)] lg:w-[340px] lg:overflow-y-auto xl:w-[370px] print:static print:max-h-none print:w-full print:border-0"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white p-1.5">
                <Image src="/logo.png" alt="" width={40} height={40} className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-[15px] font-semibold">Guerrero Motos</div>
                <div className="text-xs text-paper/60">Elaborado por Carlos García</div>
              </div>
            </div>

            <div className="grid grid-cols-3 rounded-[18px] border border-white/[0.07] bg-black/35 px-1.5 py-3 text-center">
              <div>
                <div className="font-display text-[22px] font-extrabold">{plataformas.length}</div>
                <div className="text-[11px] text-paper/60">Redes</div>
              </div>
              <div className="border-x border-white/10">
                <div className="font-display text-[22px] font-extrabold">{periodosRedes.length}</div>
                <div className="text-[11px] text-paper/60">{vista === "mensual" ? "Meses" : vista === "trimestral" ? "Trimestres" : "Años"} con datos</div>
              </div>
              <div>
                <div className="font-display text-[22px] font-extrabold">{leads.registros.length.toLocaleString("es-CO")}</div>
                <div className="text-[11px] text-paper/60">Leads</div>
              </div>
            </div>

            <div className="hidden lg:block print:hidden">
              <PeriodPanel
                periodos={months}
                mesA={mesA}
                mesB={mesB}
                onChangeA={setMesA}
                onChangeB={setMesB}
                vista={vista}
                onChangeVista={cambiarVista}
                notas={notasPeriodos}
              />
            </div>

            <LeadsCompact rows={leadsDetalleRaw.data} datos={leads} mesA={mesA} mesB={mesB} />
          </aside>
        )}
      </div>
    </div>
  );
}

function SubTitulo({ titulo, nota, onCerrar }: { titulo: string; nota?: string; onCerrar?: () => void }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <h2 className="flex items-center gap-2.5 font-display text-lg font-bold uppercase">
        <i className="inline-block h-[18px] w-[3px] rounded bg-brand" />
        {titulo}
      </h2>
      {nota && <span className="text-xs text-paper/50 print:hidden">{nota}</span>}
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label={`Cerrar ${titulo}`}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-paper/80 hover:border-brand hover:text-brand print:hidden"
        >
          ×
        </button>
      )}
    </div>
  );
}
