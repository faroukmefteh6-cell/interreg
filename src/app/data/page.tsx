import { Card, PageHeader, ScoreBar, SimulatedBanner, TableWrap, Td, Th, Trend } from "@/components/ui";
import DataExchange from "@/components/DataExchange";
import { SPECS } from "@/lib/exchange";
import { computeKpis, fmt } from "@/lib/kpi";
import { checkQuality } from "@/lib/quality";
import { ASSETS } from "@/lib/sim";
import { getDataset } from "@/lib/store";

export const dynamic = "force-dynamic";

const OTHER_SOURCES = [
  { name: "ERP : commandes, coûts, chiffre d'affaires", access: "API ou export CSV", cadence: "Journalière" },
  { name: "GMAO : pannes et interventions", access: "API ou export", cadence: "À chaque événement" },
  { name: "Données RH : formation, accidents", access: "Saisie ou import de fichiers", cadence: "Mensuelle" },
  { name: "Facteurs externes : météo, prix de l'énergie", access: "API publiques", cadence: "Horaire" },
];

export default function DataPage() {
  const ds = getDataset();
  const q = checkQuality(ds);
  const hw = computeKpis(ds).filter((r) => r.def.type === "materiel");
  const specs = SPECS.map(({ id, label, columns, help, canImport }) => ({ id, label, columns, help, canImport }));
  const offline = ds.devices.filter((d) => !d.online).length;
  return (
    <>
      <PageHeader title="Données et connectivité" lead="Modules 1 et 2 : d'où viennent les données, comment elles arrivent, et ce que la plateforme contrôle avant tout calcul de KPI." />
      <SimulatedBanner />

      <h2 className="mb-2 text-sm font-semibold">Équipements et mode de connexion</h2>
      <TableWrap>
        <thead><tr><Th>Équipement</Th><Th>Protocole</Th><Th>Compteur</Th><Th>Cas de connectivité</Th></tr></thead>
        <tbody>
          {ASSETS.map((a) => (
            <tr key={a.id}>
              <Td><span className="font-mono text-xs text-muted">{a.id}</span> {a.name}</Td>
              <Td>{a.protocol}</Td>
              <Td>{a.metered ? "Oui" : "Non"}</Td>
              <Td className="text-muted">{a.protocol.includes("OPC") ? "Équipement récent : lecture directe en OPC UA" : a.protocol.includes("Saisie") ? "Pas de source numérique : saisie ou nouveau compteur" : "Équipement plus ancien : passerelle en périphérie vers MQTT"}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>

      <h2 className="mb-2 mt-8 text-sm font-semibold">Suivi du matériel et de la connectivité</h2>
      <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {hw.map((r) => (
          <div key={r.def.id} className="rounded-lg border border-line bg-surface p-3">
            <div className="text-xs text-muted">{r.def.label}</div>
            <div className="tnum mt-1 text-xl font-semibold">{fmt(r.value, r.def.digits)} <span className="text-xs font-normal text-muted">{r.def.unit}</span></div>
            <div className="mt-1 flex items-center justify-between gap-2"><ScoreBar score={r.score} axis={r.def.axis} /><Trend trend={r.trend} /></div>
          </div>
        ))}
      </div>
      <TableWrap>
        <thead><tr><Th>Appareil</Th><Th>Type</Th><Th>Équipement</Th><Th>État</Th><Th className="text-right">Dernier signal</Th><Th className="text-right">Disponibilité</Th><Th className="text-right">Latence</Th><Th className="text-right">Pertes</Th><Th className="text-right">Batterie</Th><Th>Firmware</Th></tr></thead>
        <tbody>
          {ds.devices.map((d) => (
            <tr key={d.id}>
              <Td><span className="font-mono text-xs text-muted">{d.id}</span> {d.name}<div className="text-xs text-muted">{d.protocol}</div></Td>
              <Td>{d.kind}</Td>
              <Td>{d.asset}</Td>
              <Td><span className={`rounded-full px-2.5 py-0.5 text-xs ${d.online ? "bg-accent-soft text-accent" : "bg-line text-bad"}`}>{d.online ? "en ligne" : "hors ligne"}</span></Td>
              <Td className="tnum text-right">{d.lastSeenMin < 120 ? `${fmt(d.lastSeenMin)} min` : `${fmt(d.lastSeenMin / 60, 1)} h`}</Td>
              <Td className="tnum text-right">{fmt(d.stats.cur.uptime, 1)} %</Td>
              <Td className="tnum text-right">{fmt(d.stats.cur.latencyMs)} ms</Td>
              <Td className="tnum text-right">{fmt(d.stats.cur.lossPct, 1)} %</Td>
              <Td className={`tnum text-right ${d.battery !== null && d.battery < 30 ? "text-bad" : ""}`}>{d.battery === null ? "secteur" : `${fmt(d.battery)} %`}</Td>
              <Td>{d.firmwareOk ? "à jour" : <span className="text-bad">à mettre à jour</span>}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
      <p className="mt-2 text-xs text-muted">{offline} appareil(s) hors ligne sur {ds.devices.length}. Ces mesures alimentent les KPI du type « Matériel et connectivité » (page KPI, vue par type de données).</p>

      <h2 className="mb-2 mt-8 text-sm font-semibold">Import et export des données</h2>
      <DataExchange specs={specs} />

      <h2 className="mb-2 mt-8 text-sm font-semibold">Qualité des données (module 2)</h2>
      <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
        <TableWrap>
          <thead><tr><Th>Série</Th><Th className="text-right">Complétude</Th><Th className="text-right">Manquantes</Th><Th className="text-right">Aberrantes</Th><Th className="text-right">Score</Th></tr></thead>
          <tbody>
            {q.series.map((s) => (
              <tr key={s.asset}>
                <Td>{s.name}</Td>
                <Td className="tnum text-right">{fmt(s.completeness, 1)} %</Td>
                <Td className="tnum text-right">{s.missing}</Td>
                <Td className="tnum text-right">{s.outliers}</Td>
                <Td className="tnum text-right font-medium">{fmt(s.score)}</Td>
              </tr>
            ))}
          </tbody>
        </TableWrap>
        <Card title="Anomalies de données récentes">
          {q.issues.length ? (
            <ul className="space-y-1.5 text-sm">
              {q.issues.slice(0, 8).map((i) => (
                <li key={`${i.asset}-${i.date}-${i.kind}`}><span className="tnum text-muted">{i.date}</span> · {i.asset} · {i.kind === "manquante" ? "valeur manquante" : `valeur aberrante (${fmt(i.value)} kWh)`}</li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted">Aucune anomalie.</p>}
          <p className="mt-3 text-xs text-muted">Les valeurs manquantes ou aberrantes sont remplacées par la valeur attendue pour le calcul des KPI, et signalées ici.</p>
        </Card>
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold">Autres sources</h2>
      <TableWrap>
        <thead><tr><Th>Source</Th><Th>Accès</Th><Th>Cadence</Th></tr></thead>
        <tbody>{OTHER_SOURCES.map((s) => <tr key={s.name}><Td>{s.name}</Td><Td>{s.access}</Td><Td>{s.cadence}</Td></tr>)}</tbody>
      </TableWrap>

      <h2 className="mb-2 mt-8 text-sm font-semibold">Envoyer des mesures par l'API</h2>
      <Card>
        <p className="mb-2 text-sm text-muted">Une passerelle ou un script peut envoyer des relevés journaliers. Les données sont gardées en mémoire dans cette version de démonstration.</p>
        <pre className="overflow-x-auto rounded bg-bg p-3 font-mono text-xs">{`curl -X POST http://localhost:3000/api/ingest \\
  -H "Content-Type: application/json" \\
  -d '[{"asset":"G1","date":"${ds.days[34].date}","kWh":120}]'`}</pre>
      </Card>
    </>
  );
}
