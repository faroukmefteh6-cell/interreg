import Link from "next/link";
import { AxisChip, ModuleChip, PageHeader, ScoreBar, SimulatedBanner, TableWrap, Td, Th, Trend } from "@/components/ui";
import { AXES, AXIS_IDS, DATA_TYPES, typeName, type AxisId, type TypeId } from "@/lib/catalog";
import { axisScores, computeKpis, fmt, type KpiResult } from "@/lib/kpi";
import { getDataset } from "@/lib/store";

export const dynamic = "force-dynamic";

function Rows({ rows, showType }: { rows: KpiResult[]; showType: boolean }) {
  return (
    <TableWrap>
      <thead>
        <tr><Th>{showType ? "Axe" : "Type de données"}</Th><Th>KPI</Th><Th className="text-right">Valeur</Th><Th className="text-right">Cible</Th><Th>Score</Th><Th>Tendance</Th><Th>Modules</Th></tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.def.id}>
            <Td>{showType ? <AxisChip axis={r.def.axis} /> : <span className="text-sm">{typeName(r.def.type)}</span>}</Td>
            <Td>
              <details>
                <summary className="cursor-pointer font-medium">{r.def.label}</summary>
                <dl className="mt-2 max-w-md space-y-1 text-xs text-muted">
                  <div><dt className="inline font-medium text-ink">Formule : </dt><dd className="inline">{r.def.formula}</dd></div>
                  <div><dt className="inline font-medium text-ink">Données : </dt><dd className="inline">{r.def.data}</dd></div>
                  <div><dt className="inline font-medium text-ink">Type de données : </dt><dd className="inline">{typeName(r.def.type)}</dd></div>
                  <div><dt className="inline font-medium text-ink">Axe : </dt><dd className="inline">{AXES[r.def.axis].name}</dd></div>
                  <div><dt className="inline font-medium text-ink">Cadence : </dt><dd className="inline">{r.def.cadence}</dd></div>
                  <div><dt className="inline font-medium text-ink">Niveau de maturité requis : </dt><dd className="inline">{r.def.level}</dd></div>
                  <div><dt className="inline font-medium text-ink">Période de référence : </dt><dd className="tnum inline">{fmt(r.baseline, r.def.digits)} {r.def.unit}</dd></div>
                  {r.secondary && <div><dt className="inline font-medium text-ink">{r.secondary.label} : </dt><dd className="tnum inline">{fmt(r.secondary.value, r.secondary.digits)} {r.secondary.unit}</dd></div>}
                </dl>
              </details>
            </Td>
            <Td className="tnum text-right font-medium">{fmt(r.value, r.def.digits)} <span className="text-xs font-normal text-muted">{r.def.unit}</span></Td>
            <Td className="tnum text-right text-muted">{r.def.informative ? "–" : fmt(r.target, r.def.digits)}</Td>
            <Td><ScoreBar score={r.score} axis={r.def.axis} /></Td>
            <Td><Trend trend={r.trend} /></Td>
            <Td>{r.def.modules.map((m) => <ModuleChip key={m} n={m} />)}</Td>
          </tr>
        ))}
      </tbody>
    </TableWrap>
  );
}

const pill = (on: boolean) => `rounded-full border px-3 py-1 text-sm ${on ? "border-accent bg-accent text-bg" : "border-line bg-surface hover:border-accent"}`;

export default function KpiPage({ searchParams }: { searchParams: { view?: string; axis?: string; type?: string } }) {
  const byType = searchParams.view === "type";
  const axis = AXIS_IDS.find((a) => a === searchParams.axis) as AxisId | undefined;
  const type = DATA_TYPES.find((t) => t.id === searchParams.type)?.id as TypeId | undefined;
  const ds = getDataset();
  const all = computeKpis(ds);
  const scores = axisScores(all);
  const count = (t: TypeId) => all.filter((r) => r.def.type === t).length;

  return (
    <>
      <PageHeader title="KPI" lead="Chaque KPI renvoie à sa fiche : formule, données sources, axe, type de données, module de calcul et cadence. Le score compare la valeur à la cible." />
      <SimulatedBanner />

      <div className="mb-3 inline-flex rounded-md border border-line bg-surface p-0.5" role="group" aria-label="Choix de la vue">
        <Link href="/kpi" className={`rounded px-3 py-1.5 text-sm ${!byType ? "bg-accent text-bg" : ""}`}>Par axe</Link>
        <Link href="/kpi?view=type" className={`rounded px-3 py-1.5 text-sm ${byType ? "bg-accent text-bg" : ""}`}>Par type de données</Link>
      </div>

      {!byType && (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par axe">
            <Link href="/kpi" className={pill(!axis)}>Tous</Link>
            {AXIS_IDS.map((a) => (
              <Link key={a} href={`/kpi?axis=${a}`} className={pill(axis === a)}>{AXES[a].name} <span className="tnum opacity-70">{Math.round(scores[a])}</span></Link>
            ))}
          </div>
          <Rows rows={axis ? all.filter((r) => r.def.axis === axis) : all} showType={false} />
        </>
      )}

      {byType && (
        <>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Filtrer par type de données">
            <Link href="/kpi?view=type" className={pill(!type)}>Tous</Link>
            {DATA_TYPES.map((t) => (
              <Link key={t.id} href={`/kpi?view=type&type=${t.id}`} className={pill(type === t.id)}>{t.name} <span className="tnum opacity-70">{count(t.id)}</span></Link>
            ))}
          </div>
          <div className="space-y-6">
            {DATA_TYPES.filter((t) => !type || t.id === type).map((t) => {
              const rows = all.filter((r) => r.def.type === t.id);
              return (
                <section key={t.id}>
                  <h2 className="mb-1 text-sm font-semibold">{t.name} <span className="font-normal text-muted">· {t.examples}</span></h2>
                  {rows.length ? <Rows rows={rows} showType /> : <p className="rounded-lg border border-dashed border-line px-4 py-3 text-sm text-muted">Option non activée : aucune donnée collectée, donc aucun KPI calculé pour ce type.</p>}
                </section>
              );
            })}
          </div>
        </>
      )}
      <p className="mt-3 text-xs text-muted">Valeurs de la période du {ds.days[90].date} au {ds.days[119].date}. Tendance comparée aux 30 jours précédents. Les indicateurs « indicatif » donnent du contexte et ne sont pas notés. Cibles de démonstration, à fixer avec l'entreprise.</p>
    </>
  );
}
