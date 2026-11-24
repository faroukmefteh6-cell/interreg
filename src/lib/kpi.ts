import { AXIS_IDS, type AxisId, type TypeId } from "./catalog";
import { checkQuality, cleanEnergy } from "./quality";
import { esrsCoverage } from "./reporting";
import { analyseAll } from "./analytics";
import { ASSETS, METERED_ASSETS, PARAMS, type Dataset, type Stat } from "./sim";

export type KpiDef = {
  id: string;
  axis: AxisId;
  type: TypeId;
  label: string;
  unit: string;
  modules: number[];
  data: string;
  formula: string;
  cadence: string;
  higherIsBetter: boolean;
  /** cible : valeur absolue, ou facteur appliqué à la valeur de la période de référence */
  target: { abs: number } | { vsBaseline: number };
  /** indicateur de contexte : affiché mais exclu du score */
  informative?: boolean;
  level: 1 | 2 | 3;
  digits: number;
  compute: (c: Ctx) => number | null;
  secondary?: { label: string; unit: string; digits: number; compute: (c: Ctx) => number | null };
};

export type Period = { from: number; to: number }; // indices de jours, to exclu
export type Ctx = { ds: Dataset; p: Period; energy: (asset: string, i: number) => number; dq: number };

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const avg = (xs: number[]) => (xs.length ? sum(xs) / xs.length : 0);
const idx = (p: Period) => Array.from({ length: p.to - p.from }, (_, k) => p.from + k);

function energyBy(c: Ctx) {
  let elec = 0;
  let gaz = 0;
  const byAsset: Record<string, number> = {};
  for (const a of METERED_ASSETS) {
    const s = sum(idx(c.p).map((i) => c.energy(a.id, i)));
    byAsset[a.id] = s;
    if (a.carrier === "elec") elec += s;
    else gaz += s;
  }
  return { elec, gaz, total: elec + gaz, byAsset };
}
const units = (c: Ctx) => sum(idx(c.p).map((i) => c.ds.days[i].production));
const slice = (c: Ctx) => c.ds.days.slice(c.p.from, c.p.to);
const energyCost = (c: Ctx) => { const e = energyBy(c); return e.elec * PARAMS.priceElec + e.gaz * PARAMS.priceGaz; };

function eventsIn(c: Ctx, lookback = 0) {
  const from = c.ds.days[Math.max(0, c.p.from - lookback)].date;
  const to = c.ds.days[c.p.to - 1].date;
  return c.ds.events.filter((e) => e.date >= from && e.date <= to);
}
const failures = (c: Ctx) => eventsIn(c).filter((e) => e.failure).length;

/** Indicateurs de connectivité de la période courante, précédente ou de référence. */
const periodKey = (c: Ctx): "cur" | "prev" | "base" => (c.p.from >= 90 ? "cur" : c.p.from >= 60 ? "prev" : "base");
const stat = (c: Ctx, f: (s: Stat) => number) => c.ds.devices.map((d) => f(d.stats[periodKey(c)]));

export const KPIS: KpiDef[] = [
  // ---------- Énergie ----------
  { id: "env-energy", axis: "env", type: "energie", label: "Consommation d'énergie", unit: "kWh", modules: [2, 6], data: "Compteurs ; production pour la version normalisée", formula: "Somme des relevés d'énergie (électricité + gaz) sur la période, après nettoyage du module 2", cadence: "Mensuelle", higherIsBetter: false, target: { vsBaseline: 0.95 }, level: 1, digits: 0, compute: (c) => energyBy(c).total, secondary: { label: "Intensité énergétique", unit: "kWh / 1000 unités", digits: 0, compute: (c) => (energyBy(c).total / Math.max(1, units(c))) * 1000 } },
  { id: "env-ghg", axis: "env", type: "energie", label: "Émissions de GES", unit: "tCO₂eq", modules: [6, 7], data: "Consommations d'énergie, facteurs d'émission", formula: "(kWh électricité × FE élec + kWh gaz × FE gaz) / 1000", cadence: "Mensuelle", higherIsBetter: false, target: { vsBaseline: 0.95 }, level: 1, digits: 1, compute: (c) => { const e = energyBy(c); return (e.elec * PARAMS.efElec + e.gaz * PARAMS.efGaz) / 1000; } },
  { id: "env-utilities", axis: "env", type: "energie", label: "Part des utilités dans l'énergie", unit: "%", modules: [2, 6], data: "Sous-compteurs air comprimé, froid et chaleur", formula: "Énergie des utilités (C1, G1, B1) / énergie totale", cadence: "Mensuelle", higherIsBetter: false, target: { abs: 40 }, level: 2, digits: 0, compute: (c) => { const e = energyBy(c); return ((e.byAsset.C1 + e.byAsset.G1 + e.byAsset.B1) / Math.max(1, e.total)) * 100; } },
  // ---------- Eau ----------
  { id: "env-water", axis: "env", type: "eau", label: "Consommation d'eau", unit: "m³", modules: [2, 6], data: "Compteurs d'eau", formula: "Somme des relevés d'eau sur la période", cadence: "Mensuelle", higherIsBetter: false, target: { vsBaseline: 0.97 }, level: 1, digits: 0, compute: (c) => sum(slice(c).map((d) => d.water)) },
  { id: "env-waterint", axis: "env", type: "eau", label: "Intensité en eau", unit: "L / unité", modules: [2, 6], data: "Compteurs d'eau, production", formula: "Eau consommée (litres) / unités produites", cadence: "Mensuelle", higherIsBetter: false, target: { vsBaseline: 0.97 }, level: 1, digits: 1, compute: (c) => (sum(slice(c).map((d) => d.water)) * 1000) / Math.max(1, units(c)) },
  // ---------- Équipements et automates ----------
  { id: "tec-automation", axis: "tec", type: "equipements", label: "Niveau d'automatisation", unit: "%", modules: [3, 6], data: "Inventaire des équipements", formula: "Moyenne des niveaux d'automatisation (0 à 4) / 4", cadence: "Annuelle", higherIsBetter: true, target: { abs: 70 }, level: 1, digits: 0, compute: () => (sum(ASSETS.map((a) => a.automation)) / (ASSETS.length * 4)) * 100 },
  { id: "tec-drift", axis: "tec", type: "equipements", label: "Équipements en dérive de consommation", unit: "nb", modules: [4, 6], data: "Compteurs d'énergie, modèle de consommation attendue", formula: "Équipements dont l'écart à la consommation attendue dépasse 8 % sur 14 jours", cadence: "Mensuelle", higherIsBetter: false, target: { abs: 0 }, level: 2, digits: 0, compute: (c) => (c.p.to === 120 ? analyseAll(c.ds).filter((a) => a.anomaly).length : null) },
  // ---------- Production et qualité ----------
  { id: "eco-output", axis: "eco", type: "production", label: "Production", unit: "unités", modules: [6], data: "ERP, MES", formula: "Unités produites sur la période", cadence: "Mensuelle", higherIsBetter: true, target: { vsBaseline: 1 }, level: 1, digits: 0, compute: (c) => units(c) },
  { id: "eco-productivity", axis: "eco", type: "production", label: "Productivité", unit: "unités / salarié / jour ouvré", modules: [6], data: "ERP, MES, données RH", formula: "Unités produites / effectif / jours de production", cadence: "Mensuelle", higherIsBetter: true, target: { vsBaseline: 1 }, level: 1, digits: 1, compute: (c) => units(c) / c.ds.workforce / Math.max(1, slice(c).filter((d) => d.production > 1000).length) },
  { id: "env-scrap", axis: "env", type: "production", label: "Taux de rebuts", unit: "%", modules: [2, 4, 6], data: "Production, déchets, matières entrantes", formula: "Unités rebutées / unités produites", cadence: "Mensuelle", higherIsBetter: false, target: { abs: 3.5 }, level: 1, digits: 2, compute: (c) => (sum(slice(c).map((d) => d.scrapUnits)) / Math.max(1, units(c))) * 100 },
  // ---------- Maintenance ----------
  { id: "tec-mtbf", axis: "tec", type: "maintenance", label: "MTBF", unit: "h", modules: [4, 6], data: "GMAO, état des équipements", formula: "Heures de fonctionnement / nombre de pannes (16 h par jour et par équipement)", cadence: "Mensuelle", higherIsBetter: true, target: { abs: 800 }, level: 2, digits: 0, compute: (c) => { const f = failures(c); return f === 0 ? null : ((c.p.to - c.p.from) * 16 * METERED_ASSETS.length) / f; }, secondary: { label: "MTTR", unit: "h", digits: 1, compute: (c) => { const ev = eventsIn(c).filter((e) => e.failure); return ev.length ? sum(ev.map((e) => e.repairHours)) / ev.length : null; } } },
  { id: "tec-preventive", axis: "tec", type: "maintenance", label: "Part de maintenance préventive", unit: "%", modules: [4, 6], data: "GMAO", formula: "Interventions préventives / interventions totales sur 90 jours", cadence: "Mensuelle", higherIsBetter: true, target: { abs: 40 }, level: 2, digits: 0, compute: (c) => { const ev = eventsIn(c, 90); return ev.length ? (ev.filter((e) => !e.failure).length / ev.length) * 100 : null; } },
  // ---------- Lean ----------
  { id: "tec-lean", axis: "tec", type: "lean", label: "Actions Kaizen", unit: "nb", modules: [6], data: "Registre Kaizen", formula: "Actions Kaizen clôturées sur la période", cadence: "Mensuelle", higherIsBetter: true, target: { abs: 3 }, level: 1, digits: 0, compute: (c) => sum(slice(c).map((d) => d.kaizen)) },
  { id: "tec-5s", axis: "tec", type: "lean", label: "Score 5S", unit: "/ 100", modules: [6], data: "Audits 5S", formula: "Note du dernier audit 5S du mois", cadence: "Mensuelle", higherIsBetter: true, target: { abs: 85 }, level: 1, digits: 0, compute: (c) => { const m = c.ds.days[c.p.to - 1].date.slice(0, 7); return c.ds.monthly.find((x) => x.month === m)?.score5S ?? null; } },
  // ---------- Finance et ventes ----------
  { id: "eco-margin", axis: "eco", type: "finance", label: "Marge", unit: "%", modules: [6], data: "ERP, comptabilité", formula: "(Chiffre d'affaires − coûts − énergie) / chiffre d'affaires", cadence: "Mensuelle", higherIsBetter: true, target: { abs: 28 }, level: 1, digits: 1, compute: (c) => { const rev = sum(slice(c).map((d) => d.revenue)); const cost = sum(slice(c).map((d) => d.cost)) + energyCost(c); return ((rev - cost) / Math.max(1, rev)) * 100; }, secondary: { label: "Chiffre d'affaires", unit: "k€", digits: 0, compute: (c) => sum(slice(c).map((d) => d.revenue)) / 1000 } },
  { id: "eco-unitcost", axis: "eco", type: "finance", label: "Coût unitaire", unit: "€ / unité", modules: [5, 6], data: "ERP, production", formula: "(Coûts hors énergie + énergie) / unités produites", cadence: "Mensuelle", higherIsBetter: false, target: { vsBaseline: 0.98 }, level: 1, digits: 2, compute: (c) => (sum(slice(c).map((d) => d.cost)) + energyCost(c)) / Math.max(1, units(c)) },
  { id: "eco-energycost", axis: "eco", type: "finance", label: "Coût énergétique unitaire", unit: "€ / unité", modules: [5, 6], data: "Factures, compteurs, commandes", formula: "Coût de l'énergie / unités produites", cadence: "Mensuelle", higherIsBetter: false, target: { vsBaseline: 0.95 }, level: 2, digits: 2, compute: (c) => energyCost(c) / Math.max(1, units(c)), secondary: { label: "Livraison à l'heure", unit: "%", digits: 0, compute: (c) => (sum(slice(c).map((d) => d.ordersOnTime)) / Math.max(1, sum(slice(c).map((d) => d.ordersTotal)))) * 100 } },
  // ---------- Déchets et matières ----------
  { id: "env-recycled", axis: "env", type: "dechets", label: "Part de matières recyclées", unit: "%", modules: [2, 6], data: "Pesées, tri, matières entrantes", formula: "Moyenne journalière de la part de matières recyclées", cadence: "Mensuelle", higherIsBetter: true, target: { abs: 65 }, level: 1, digits: 0, compute: (c) => avg(slice(c).map((d) => d.recycledShare)) * 100 },
  { id: "env-waste", axis: "env", type: "dechets", label: "Déchets de production", unit: "kg", modules: [2, 6], data: "Pesées, balance connectée", formula: "Unités rebutées × masse moyenne par unité", cadence: "Mensuelle", higherIsBetter: false, target: { vsBaseline: 0.95 }, level: 1, digits: 0, compute: (c) => sum(slice(c).map((d) => d.scrapUnits)) * PARAMS.kgWastePerScrapUnit },
  // ---------- Facteurs externes ----------
  { id: "env-temp", axis: "env", type: "facteurs", label: "Température extérieure moyenne", unit: "°C", modules: [2], data: "API météo", formula: "Moyenne des températures journalières", cadence: "Journalière", higherIsBetter: false, target: { abs: 0 }, informative: true, level: 1, digits: 1, compute: (c) => avg(slice(c).map((d) => d.temp)) },
  { id: "env-hdd", axis: "env", type: "facteurs", label: "Degrés-jours de chauffage", unit: "DJU", modules: [2, 6], data: "API météo", formula: "Somme de max(0 ; 15 − température) par jour", cadence: "Mensuelle", higherIsBetter: false, target: { abs: 0 }, informative: true, level: 1, digits: 0, compute: (c) => sum(slice(c).map((d) => Math.max(0, 15 - d.temp))) },
  // ---------- Ressources humaines et sécurité ----------
  { id: "soc-accidents", axis: "soc", type: "rh", label: "Accidents", unit: "nb", modules: [6], data: "Registre des incidents", formula: "Nombre d'accidents déclarés sur la période", cadence: "Mensuelle", higherIsBetter: false, target: { abs: 0 }, level: 1, digits: 0, compute: (c) => sum(slice(c).map((d) => d.accidents)) },
  { id: "soc-training", axis: "soc", type: "rh", label: "Heures de formation par salarié", unit: "h", modules: [6], data: "Données RH", formula: "Heures de formation / effectif", cadence: "Mensuelle", higherIsBetter: true, target: { abs: 4 }, level: 1, digits: 1, compute: (c) => sum(slice(c).map((d) => d.trainingHours)) / c.ds.workforce },
  { id: "soc-satisfaction", axis: "soc", type: "rh", label: "Satisfaction des employés", unit: "/ 5", modules: [6], data: "Enquêtes internes", formula: "Note moyenne de la dernière enquête mensuelle", cadence: "Mensuelle", higherIsBetter: true, target: { abs: 4 }, level: 1, digits: 1, compute: (c) => { const m = c.ds.days[c.p.to - 1].date.slice(0, 7); return c.ds.monthly.find((x) => x.month === m)?.satisfaction ?? null; } },
  // ---------- Documents réglementaires ----------
  { id: "leg-compliance", axis: "leg", type: "reglementaire", label: "Conformité aux exigences", unit: "%", modules: [7], data: "Registre des exigences, rapports d'audit", formula: "Exigences conformes / exigences applicables", cadence: "Trimestrielle", higherIsBetter: true, target: { abs: 95 }, level: 1, digits: 0, compute: (c) => (c.ds.requirements.filter((r) => r.status === "conforme").length / c.ds.requirements.length) * 100, secondary: { label: "Actions d'audit clôturées", unit: "%", digits: 0, compute: (c) => (c.ds.requirements.filter((r) => r.auditClosed).length / c.ds.requirements.length) * 100 } },
  { id: "leg-gaps", axis: "leg", type: "reglementaire", label: "Exigences en écart ou à vérifier", unit: "nb", modules: [7], data: "Registre des exigences", formula: "Exigences dont le statut n'est pas « conforme »", cadence: "Trimestrielle", higherIsBetter: false, target: { abs: 0 }, level: 1, digits: 0, compute: (c) => c.ds.requirements.filter((r) => r.status !== "conforme").length },
  { id: "leg-esrs", axis: "leg", type: "reglementaire", label: "Données de reporting (ESRS) couvertes", unit: "%", modules: [7], data: "Données des autres axes", formula: "Points de données ESRS disponibles / points demandés", cadence: "Annuelle", higherIsBetter: true, target: { abs: 80 }, level: 2, digits: 0, compute: (c) => esrsCoverage(c.ds) },
  // ---------- Matériel et connectivité ----------
  { id: "tec-iot", axis: "tec", type: "materiel", label: "Couverture de mesure IoT", unit: "%", modules: [2, 6], data: "Inventaire des compteurs, contrôles du module 2", formula: "Équipements équipés d'un compteur / équipements", cadence: "Annuelle", higherIsBetter: true, target: { abs: 90 }, level: 1, digits: 0, compute: () => (METERED_ASSETS.length / ASSETS.length) * 100, secondary: { label: "Qualité des données", unit: "%", digits: 0, compute: (c) => c.dq } },
  { id: "hw-availability", axis: "tec", type: "materiel", label: "Disponibilité des appareils", unit: "%", modules: [1, 6], data: "Messages reçus par les passerelles", formula: "Moyenne du temps de disponibilité de chaque appareil", cadence: "Journalière", higherIsBetter: true, target: { abs: 99 }, level: 1, digits: 1, compute: (c) => avg(stat(c, (s) => s.uptime)) },
  { id: "hw-online", axis: "tec", type: "materiel", label: "Appareils en ligne", unit: "%", modules: [1, 6], data: "État des appareils", formula: "Appareils en ligne / appareils installés", cadence: "Temps réel", higherIsBetter: true, target: { abs: 100 }, level: 1, digits: 0, compute: (c) => (c.ds.devices.filter((d) => d.online).length / c.ds.devices.length) * 100, secondary: { label: "Appareils hors ligne", unit: "nb", digits: 0, compute: (c) => c.ds.devices.filter((d) => !d.online).length } },
  { id: "hw-latency", axis: "tec", type: "materiel", label: "Latence moyenne", unit: "ms", modules: [1, 6], data: "Horodatage des messages", formula: "Délai moyen entre la mesure et sa réception", cadence: "Journalière", higherIsBetter: false, target: { abs: 100 }, level: 2, digits: 0, compute: (c) => avg(stat(c, (s) => s.latencyMs)) },
  { id: "hw-loss", axis: "tec", type: "materiel", label: "Perte de messages", unit: "%", modules: [1, 2, 6], data: "Compteurs de séquence MQTT", formula: "Moyenne des messages attendus mais non reçus", cadence: "Journalière", higherIsBetter: false, target: { abs: 1 }, level: 2, digits: 1, compute: (c) => avg(stat(c, (s) => s.lossPct)) },
  { id: "hw-gap", axis: "tec", type: "materiel", label: "Silence maximal d'un appareil", unit: "min", modules: [1, 6], data: "Horodatage des messages", formula: "Plus longue durée sans message d'un appareil", cadence: "Journalière", higherIsBetter: false, target: { abs: 30 }, level: 2, digits: 0, compute: (c) => Math.max(...stat(c, (s) => s.gapMin)) },
  { id: "hw-battery", axis: "tec", type: "materiel", label: "Appareils à batterie faible", unit: "nb", modules: [1, 6], data: "Niveau de batterie remonté par les appareils", formula: "Appareils sur batterie sous 25 %", cadence: "Journalière", higherIsBetter: false, target: { abs: 0 }, level: 2, digits: 0, compute: (c) => c.ds.devices.filter((d) => d.battery !== null && d.battery < 25).length },
  { id: "hw-firmware", axis: "tec", type: "materiel", label: "Micrologiciels à jour", unit: "%", modules: [1, 6], data: "Inventaire des appareils", formula: "Appareils avec la dernière version / appareils installés", cadence: "Mensuelle", higherIsBetter: true, target: { abs: 95 }, level: 2, digits: 0, compute: (c) => (c.ds.devices.filter((d) => d.firmwareOk).length / c.ds.devices.length) * 100 },
  { id: "hw-gateways", axis: "tec", type: "materiel", label: "Passerelles en service", unit: "%", modules: [1, 6], data: "État des passerelles et du courtier MQTT", formula: "Passerelles en ligne / passerelles installées", cadence: "Temps réel", higherIsBetter: true, target: { abs: 100 }, level: 1, digits: 0, compute: (c) => { const g = c.ds.devices.filter((d) => d.kind === "passerelle"); return (g.filter((d) => d.online).length / g.length) * 100; } },
];

export type KpiResult = {
  def: KpiDef;
  value: number | null;
  prev: number | null;
  baseline: number | null;
  target: number;
  score: number | null; // null pour un indicateur de contexte
  trend: "mieux" | "pire" | "stable" | "n/a";
  secondary?: { label: string; unit: string; digits: number; value: number | null };
};

export type Periods = { cur: Period; prev: Period; base: Period };
export const PERIODS: Periods = { base: { from: 0, to: 30 }, prev: { from: 60, to: 90 }, cur: { from: 90, to: 120 } };

export function scoreOf(def: KpiDef, value: number | null, target: number): number {
  if (value === null) return 0;
  if (def.higherIsBetter) return Math.max(0, Math.min(100, (value / Math.max(target, 1e-9)) * 100));
  if (target === 0) return Math.max(0, 100 - value * 40);
  return Math.max(0, Math.min(100, (target / Math.max(value, 1e-9)) * 100));
}

export function computeKpis(ds: Dataset): KpiResult[] {
  const dq = checkQuality(ds).score;
  const energy = cleanEnergy(ds);
  const ctx = (p: Period): Ctx => ({ ds, p, energy: (a, i) => energy(a as never, i), dq });
  return KPIS.map((def) => {
    const value = def.compute(ctx(PERIODS.cur));
    const prev = def.compute(ctx(PERIODS.prev));
    const baseline = def.compute(ctx(PERIODS.base));
    const target = "abs" in def.target ? def.target.abs : (baseline ?? 0) * def.target.vsBaseline;
    let trend: KpiResult["trend"] = "n/a";
    if (value !== null && prev !== null) {
      const rel = prev === 0 ? (value === 0 ? 0 : 1) : (value - prev) / Math.abs(prev);
      trend = Math.abs(rel) < 0.01 ? "stable" : def.informative ? "stable" : (rel > 0) === def.higherIsBetter ? "mieux" : "pire";
    }
    const sec = def.secondary ? { label: def.secondary.label, unit: def.secondary.unit, digits: def.secondary.digits, value: def.secondary.compute(ctx(PERIODS.cur)) } : undefined;
    return { def, value, prev, baseline, target, score: def.informative ? null : scoreOf(def, value, target), trend, secondary: sec };
  });
}

export function axisScores(results: KpiResult[]): Record<AxisId, number> {
  const out = {} as Record<AxisId, number>;
  for (const a of AXIS_IDS) {
    const rs = results.filter((r) => r.def.axis === a && r.score !== null);
    out[a] = rs.length ? rs.reduce((s, r) => s + (r.score as number), 0) / rs.length : 0;
  }
  return out;
}

export function maturity(scores: Record<AxisId, number>): "Débutant" | "Intermédiaire" | "Avancé" {
  const m = AXIS_IDS.reduce((s, a) => s + scores[a], 0) / AXIS_IDS.length;
  return m >= 85 ? "Avancé" : m >= 65 ? "Intermédiaire" : "Débutant";
}

export function fmt(v: number | null, digits = 0): string {
  if (v === null || !Number.isFinite(v)) return "n/d";
  return v.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}
