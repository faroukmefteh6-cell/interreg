import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { DEMO_LEVEL, LEVELS } from "@/lib/catalog";
import "./globals.css";

const sans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-sans" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Plateforme GREENFAB",
  description: "Jumeau numérique pour suivre la durabilité d'une PME sur les cinq axes du Green Factory Model.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const level = LEVELS.find((l) => l.n === DEMO_LEVEL)!;
  return (
    <html lang="fr" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <div className="mx-auto grid min-h-screen max-w-[1280px] md:grid-cols-[230px_1fr]">
          <aside className="border-b border-line md:border-b-0 md:border-r">
            <div className="px-5 pb-2 pt-5">
              <div className="font-mono text-xs uppercase tracking-wider text-accent">INTERREG GREENFAB · WP2</div>
              <div className="mt-1 text-lg font-semibold leading-tight">Plateforme de jumeau numérique</div>
              <div className="mt-2 text-xs text-muted">Niveau {level.n} · {level.name}</div>
            </div>
            <Sidebar />
          </aside>
          <main className="min-w-0 px-5 py-6 md:px-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
