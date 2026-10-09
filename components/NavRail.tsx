"use client";

import Image from "next/image";

export type NavItem = { id: string; label: string; short: string };

// Riel de navegación vertical (escritorio) que pasa a barra horizontal en
// pantallas pequeñas. Cada botón lleva a su sección dentro de la página.
export function NavRail({ items, activo, onIr }: { items: NavItem[]; activo: string; onIr: (id: string) => void }) {
  return (
    <nav
      aria-label="Secciones"
      className="glass flex shrink-0 items-center gap-2 overflow-x-auto rounded-[28px] p-2.5 print:hidden lg:sticky lg:top-5 lg:max-h-[calc(100vh-40px)] lg:w-[76px] lg:flex-col lg:overflow-y-auto lg:py-4"
    >
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white p-1 lg:mb-3">
        <Image src="/logo.png" alt="Guerrero Motos" width={44} height={44} className="h-full w-full object-contain" />
      </div>
      {items.map((item) => {
        const on = item.id === activo;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            onClick={() => onIr(item.id)}
            aria-label={item.label}
            aria-current={on ? "true" : undefined}
            title={item.label}
            className={`flex h-12 min-w-12 shrink-0 items-center justify-center rounded-2xl px-2 font-display text-[13px] font-bold tracking-wide transition-colors ${
              on
                ? "bg-brand-gradient text-asphalt-900 shadow-brand"
                : "text-paper/60 hover:bg-white/5 hover:text-paper"
            }`}
          >
            {item.short}
          </a>
        );
      })}
      <div className="hidden flex-1 lg:block" />
      <button
        type="button"
        onClick={() => window.print()}
        aria-label="Descargar PDF"
        title="Descargar PDF"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-asphalt-900 transition-transform hover:scale-105"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 4v11" />
          <path d="M7 10l5 5 5-5" />
          <path d="M5 20h14" />
        </svg>
      </button>
    </nav>
  );
}
