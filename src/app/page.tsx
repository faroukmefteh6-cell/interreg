import Link from "next/link";
import { LineChart } from "@/components/LineChart";
import { AxisChip, Card, PageHeader, ScoreBar, SimulatedBanner, Trend, axisText } from "@/components/ui";
import { analyseAll } from "@/lib/analytics";
import { AXES, AXIS_IDS } from "@/lib/catalog";
import { axisScores, computeKpis, fmt, maturity } from "@/lib/kpi";
import { checkQuality, cleanEnergy } from "@/lib/quality";
import { METERED_ASSETS } from "@/lib/sim";
import { getDataset } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function Dashboard() {
  const ds = getDataset();
  const results = computeKpis(ds);
  const scores = axisScores(results);
  const clean = cleanEnergy(ds);
  const total = ds.days.map((_, i) => METERED_ASSETS.reduce((s, a) => s + clean(a.id, i), 0));
  const quality = checkQuality(ds);
  const anomalies = analyseAll(ds).filter((a) => a.anomaly);
  const gaps = ds.requirements.filter((r) => r.status !== "conforme");
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;

  return (
    <>
      <PageHeader title="Tableau de bord" lead={`${ds.siteName} · période du ${ds.days[90].date} au ${ds.days[119].date}, comparée aux 30 jours précédents.`}>
        <div className="rounded-md border border-line bg-surface px-3 py-2 text-sm">
          Maturité globale : <strong>{maturity(scores)}</strong>
        </div>
      </PageHeader>
      <SimulatedBanner />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {AXIS_IDS.map((a) => {
          const rs = results.filter((r) => r.def.axis === a);
          return (
            <Link key={a} href={`/kpi?axis=${a}`} className="min-w-0 rounded-lg border border-line bg-surface p-4 hover:border-accent">
              <div className={`text-sm font-semibold ${axisText[a]}`}>{AXES[a].name}</div>
              <div className="tnum mt-1 text-3xl font-semibold">{Math.round(scores[a])}<span className="text-sm font-normal text-muted"> / 100</span></div>
              <div className="mt-1 text-xs text-muted">{rs.length} KPI · {AXES[a].def}</div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card title="Consommation d'énergie du site (électricité + gaz)">
          <LineChart dates={ds.days.map((d) => d.date)} series={[{ label: "kWh par jour (données nettoyées)", values: total, tone: "accent" }, { label: "moyenne de la période de référence", values: total.map(() => mean(total.slice(0, 30))), tone: "muted", dashed: true }]} unit="kWh par jour" markFrom={90} />
        </Card>
        <Card title="À traiter">
          <ul className="space-y-3 text-sm">
            {anomalies.map((a) => (
              <li key={a.asset} className="flex gap-2"><span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-bad" /><span>Dérive de consommation sur <Link className="text-accent underline" href={`/twin?asset=${a.asset}`}>{a.asset}</Link> : {fmt(a.driftPct, 1)} % par rapport au modèle appris sur la période de référence.</span></li>
            ))}
            <li className="flex gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${quality.issues.length ? "bg-warn" : "bg-ok"}`} /><span>{quality.issues.length} valeurs manquantes ou aberrantes détectées, qualité des données à {fmt(quality.score)} %. <Link className="text-accent underline" href="/data">Voir le détail</Link></span></li>
            <li className="flex gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${gaps.length ? "bg-warn" : "bg-ok"}`} /><span>{gaps.length} exigences réglementaires en écart ou à vérifier. <Link className="text-accent underline" href="/kpi?axis=leg">Axe Légal</Link></span></li>
          </ul>
        </Card>
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold">KPI principaux</h2>
      <div className="overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <tbody>
            {results.filter((r) => r.def.level === 1).slice(0, 8).map((r) => (
              <tr key={r.def.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2"><AxisChip axis={r.def.axis} /></td>
                <td className="px-3 py-2">{r.def.label}</td>
                <td className="tnum px-3 py-2 text-right font-medium">{fmt(r.value, r.def.digits)} <span className="text-xs font-normal text-muted">{r.def.unit}</span></td>
                <td className="px-3 py-2"><Trend trend={r.trend} /></td>
                <td className="px-3 py-2"><ScoreBar score={r.score} axis={r.def.axis} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
