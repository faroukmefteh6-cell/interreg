import { PageHeader, SimulatedBanner, TableWrap, Td, Th } from "@/components/ui";
import { computeKpis, fmt } from "@/lib/kpi";
import { esrsCoverage, esrsRows } from "@/lib/reporting";
import { getDataset } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function ReportingPage() {
  const ds = getDataset();
  const rows = esrsRows(ds, computeKpis(ds));
  const missing = rows.filter((r) => r.status === "Manquant");
  return (
    <>
      <PageHeader title="Reporting ESRS" lead="Module 7 : préparation des données de durabilité. La plateforme rassemble les points de données disponibles et signale ceux qui manquent ; un expert valide le rapport final.">
        <a href="/api/export?dataset=esrs&format=csv" download className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg">Exporter en CSV</a>
      </PageHeader>
      <SimulatedBanner />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-surface p-4"><div className="text-xs text-muted">Couverture des points de données</div><div className="tnum mt-1 text-2xl font-semibold">{fmt(esrsCoverage(ds))} %</div></div>
        <div className="rounded-lg border border-line bg-surface p-4"><div className="text-xs text-muted">Points disponibles</div><div className="tnum mt-1 text-2xl font-semibold">{rows.length - missing.length} / {rows.length}</div></div>
        <div className="rounded-lg border border-line bg-surface p-4"><div className="text-xs text-muted">À collecter</div><div className="mt-1 text-sm">{missing.map((m) => m.label).join(" ; ")}</div></div>
      </div>
      <TableWrap>
        <thead><tr><Th>Code</Th><Th>Thème</Th><Th>Indicateur</Th><Th>Statut</Th><Th className="text-right">Valeur</Th><Th>Unité</Th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.code}>
              <Td className="font-mono text-xs">{r.code}</Td>
              <Td>{r.topic}</Td>
              <Td>{r.label}</Td>
              <Td><span className={r.status === "Disponible" ? "text-ok" : "text-warn"}>{r.status}</span></Td>
              <Td className="tnum text-right">{r.value}</Td>
              <Td className="text-muted">{r.unit}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <p className="mt-3 text-xs text-muted">Liste de points de données inspirée des thèmes ESRS, à valider avec un expert conformité. Les facteurs d'émission utilisés (électricité 0,052 et gaz 0,205 kgCO₂eq/kWh) sont des valeurs de démonstration à remplacer par la base officielle.</p>
    </>
  );
}
