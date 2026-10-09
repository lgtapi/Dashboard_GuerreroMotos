import type { Metadata } from "next";
import "./globals.css";

// Se usan fuentes del sistema (sin next/font/google) a propósito: así el
// proyecto compila sin salida a internet hacia Google Fonts, algo que
// algunas redes corporativas bloquean. Ver la pila de fuentes en
// tailwind.config.ts / globals.css.

export const metadata: Metadata = {
  title: "Guerrero Motos · Panel comparativo",
  description: "Panel comparativo de métricas, mes contra mes.",
  icons: { icon: "/logo.png" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Se cargan como <link> normal (las pide el navegador, no el build de
            Next). Si el usuario no tiene internet, Tailwind cae a las fuentes
            del sistema definidas en tailwind.config.ts sin romper nada. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700;800&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white font-sans text-neutral-900">{children}</body>
    </html>
  );
}
