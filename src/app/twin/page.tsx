import Link from "next/link";
import TwinScene from "@/components/TwinScene";
import { LineChart } from "@/components/LineChart";
import { Card, PageHeader, SimulatedBanner } from "@/components/ui";
import { analyseAsset } from "@/lib/analytics";
import { fmt } from "@/lib/kpi";
import { ASSETS, type AssetId } from "@/lib/sim";
import { getDataset } from "@/lib/store";
import { buildTwinModel } from "@/lib/twin3d";

export const dynamic = "force-dynamic";

/** Représentation inspirée de l'Asset Administration Shell, simplifiée pour la démonstration. */
function shell(id: AssetId) {
  const a = ASSETS.find((x) => x.id === id)!;
  return {
    idShort: `Asset_${a.id}`,
    assetKind: "Instance",
    submodels: {
      Nameplate: { name: a.name, type: a.type, line: a.line, commissioned: a.commissioned, ratedPowerKw: a.ratedPowerKw },
      TimeSeries: { carrier: a.carrier === "elec" ? "électricité" : "gaz", unit: "kWh/jour", metered: a.metered, source: a.protocol },
      Operational: { automationLevel: a.automation },
    },
  };
}

export default function TwinPage({ searchParams }: { searchParams: { asset?: string } }) {
  const ds = getDataset();
  const asset = ASSETS.find((a) => a.id === searchParams.asset) ?? ASSETS[0];
  const lines = Array.from(new Set(ASSETS.map((a) => a.line)));
  const an = asset.metered ? analyseAsset(ds, asset.id) : null;
  const events = ds.events.filter((e) => e.asset === asset.id);

  return (
    <>
      <PageHeader title="Jumeau numérique" lead="Un jumeau par équipement, ligne et site. Pour chaque équipement mesuré, un modèle appris sur la période de référence signale les dérives de consommation." />
      <SimulatedBanner />
      <h2 className="mb-2 text-sm font-semibold">Modèle 3D du site : un bloc par type de données</h2>
      <div className="mb-8"><TwinScene items={buildTwinModel(ds)} /></div>
      <h2 className="mb-2 text-sm font-semibold">Jumeaux des équipements</h2>
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <Card title={ds.siteName}>
          {lines.map((l) => (
            <div key={l} className="mb-3 last:mb-0">
              <div className="font-mono text-xs uppercase tracking-wide text-muted">{l}</div>
              <ul className="mt-1">
                {ASSETS.filter((a) => a.line === l).map((a) => (
                  <li key={a.id}>
                    <Link href={`/twin?asset=${a.id}`} aria-current={a.id === asset.id ? "page" : undefined} className={`flex items-center justify-between rounded px-2 py-1.5 text-sm ${a.id === asset.id ? "bg-accent text-bg" : "hover:bg-accent-soft"}`}>
                      <span>{a.name}</span>
                      <span className="font-mono text-xs opacity-70">{a.id}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>

        <div className="min-w-0 space-y-4">
          <Card title={`${asset.name} (${asset.id})`}>
            <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
              <div><dt className="text-xs text-muted">Type</dt><dd>{asset.type}</dd></div>
              <div><dt className="text-xs text-muted">Puissance nominale</dt><dd className="tnum">{asset.ratedPowerKw} kW</dd></div>
              <div><dt className="text-xs text-muted">Mise en service</dt><dd className="tnum">{asset.commissioned}</dd></div>
              <div><dt className="text-xs text-muted">Source de données</dt><dd>{asset.protocol}</dd></div>
              <div><dt className="text-xs text-muted">Compteur</dt><dd>{asset.metered ? "Oui" : "Non, saisie manuelle"}</dd></div>
              <div><dt className="text-xs text-muted">Automatisation</dt><dd className="tnum">niveau {asset.automation} sur 4</dd></div>
            </dl>
          </Card>

          {an ? (
            <Card title="Consommation réelle et consommation attendue">
              <LineChart dates={an.dates} series={[{ label: "réel (nettoyé)", values: an.actual, tone: an.anomaly ? "bad" : "accent" }, { label: "attendu par le modèle", values: an.expected, tone: "muted", dashed: true }]} unit="kWh par jour" markFrom={ds.days.length - 14} />
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div><div className="text-xs text-muted">Écart sur 14 jours</div><div className={`tnum text-lg font-semibold ${an.anomaly ? "text-bad" : ""}`}>{fmt(an.driftPct, 1)} %</div></div>
                <div><div className="text-xs text-muted">Statut</div><div className="text-lg font-semibold">{an.anomaly ? "Dérive à examiner" : "Normal"}</div></div>
                <div><div className="text-xs text-muted">Prévision 7 jours</div><div className="tnum text-lg font-semibold">{fmt(an.forecast7)} kWh</div></div>
              </div>
              {an.anomaly && <p className="mt-3 text-sm text-muted">Écart durable au-delà de 8 % : vérifier les fuites, l'encrassement ou un réglage modifié, puis ouvrir une intervention de maintenance.</p>}
            </Card>
          ) : (
            <Card title="Pas de compteur"><p className="text-sm text-muted">Cet équipement n'a pas de compteur : la couverture de mesure IoT est incomplète. Installer un compteur permettrait de modéliser sa consommation.</p></Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <Card title="Interventions de maintenance">
              {events.length ? (
                <ul className="space-y-1 text-sm">{events.map((e) => <li key={e.date}><span className="tnum text-muted">{e.date}</span> · {e.failure ? "Panne" : "Préventif"} · {e.repairHours} h</li>)}</ul>
              ) : <p className="text-sm text-muted">Aucune intervention sur la période.</p>}
            </Card>
            <Card title="Jumeau (format inspiré de l'AAS)">
              <pre className="max-h-64 overflow-auto rounded bg-bg p-3 font-mono text-xs">{JSON.stringify(shell(asset.id), null, 2)}</pre>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
