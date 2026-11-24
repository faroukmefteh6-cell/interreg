import type { ReactNode } from "react";
import { AXES, type AxisId } from "@/lib/catalog";

export const axisText: Record<AxisId, string> = { env: "text-env", soc: "text-soc", eco: "text-eco", leg: "text-leg", tec: "text-tec" };
export const axisBg: Record<AxisId, string> = { env: "bg-env", soc: "bg-soc", eco: "bg-eco", leg: "bg-leg", tec: "bg-tec" };
export const axisSoft: Record<AxisId, string> = { env: "bg-env-soft text-env", soc: "bg-soc-soft text-soc", eco: "bg-eco-soft text-eco", leg: "bg-leg-soft text-leg", tec: "bg-tec-soft text-tec" };

export function PageHeader({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {lead && <p className="mt-1 max-w-prose text-muted">{lead}</p>}
      </div>
      {children}
    </header>
  );
}

export function Card({ title, children, className = "", action }: { title?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`min-w-0 rounded-lg border border-line bg-surface p-4 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function AxisChip({ axis }: { axis: AxisId }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${axisSoft[axis]}`}>{AXES[axis].name}</span>;
}

export function ModuleChip({ n }: { n: number }) {
  return <span className="mr-1 inline-block rounded border border-line bg-bg px-1.5 font-mono text-xs">{n}</span>;
}

export function ScoreBar({ score, axis }: { score: number | null; axis?: AxisId }) {
  if (score === null) return <span className="text-xs text-muted">indicatif</span>;
  const color = axis ? axisBg[axis] : score >= 85 ? "bg-ok" : score >= 60 ? "bg-warn" : "bg-bad";
  return (
    <div className="flex items-center gap-2" role="img" aria-label={`Score ${Math.round(score)} sur 100`}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(2, Math.min(100, score))}%` }} />
      </div>
      <span className="tnum w-8 text-right text-xs text-muted">{Math.round(score)}</span>
    </div>
  );
}

export function Trend({ trend }: { trend: "mieux" | "pire" | "stable" | "n/a" }) {
  const map = { mieux: ["▲", "text-ok", "Mieux que la période précédente"], pire: ["▼", "text-bad", "Moins bien que la période précédente"], stable: ["■", "text-muted", "Stable"], "n/a": ["–", "text-muted", "Non disponible"] } as const;
  const [sym, cls, label] = map[trend];
  return <span className={`text-xs ${cls}`} title={label} aria-label={label}>{sym}</span>;
}

export function SimulatedBanner() {
  return (
    <div className="mb-6 rounded-md border border-warn/40 bg-soc-soft px-3 py-2 text-sm text-soc">
      Données simulées : les valeurs servent à démontrer la plateforme et ne décrivent aucun site réel.
    </div>
  );
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <th className={`border-b border-line bg-bg px-3 py-2 text-left font-mono text-xs font-medium uppercase tracking-wide text-muted ${className}`}>{children}</th>;
}
export function Td({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return <td className={`border-b border-line px-3 py-2 align-top ${className}`}>{children}</td>;
}
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-line bg-surface"><table className="w-full min-w-[640px] border-collapse text-sm">{children}</table></div>;
}
