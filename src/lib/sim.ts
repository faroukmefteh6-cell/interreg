/**
 * Jeu de données SIMULÉ d'un petit site industriel (module 1 : collecte).
 * Toutes les valeurs sont générées de façon déterministe : elles servent à
 * démontrer la plateforme et doivent être remplacées par les vraies sources.
 */

export type AssetId = "C1" | "L1" | "L2" | "G1" | "B1" | "T1";
export type Carrier = "elec" | "gaz";

export type Asset = {
  id: AssetId;
  name: string;
  type: string;
  line: string;
  carrier: Carrier;
  metered: boolean;
  protocol: string;
  automation: 0 | 1 | 2 | 3 | 4; // 0 manuel … 4 pilotage automatique
  ratedPowerKw: number;
  commissioned: number;
};

export const ASSETS: Asset[] = [
  { id: "C1", name: "Compresseur d'air", type: "Air comprimé", line: "Utilités", carrier: "elec", metered: true, protocol: "Modbus TCP", automation: 3, ratedPowerKw: 45, commissioned: 2016 },
  { id: "L1", name: "Ligne d'extrusion", type: "Procédé", line: "Production", carrier: "elec", metered: true, protocol: "OPC UA", automation: 4, ratedPowerKw: 120, commissioned: 2021 },
  { id: "L2", name: "Ligne d'assemblage", type: "Procédé", line: "Production", carrier: "elec", metered: true, protocol: "PROFINET", automation: 3, ratedPowerKw: 40, commissioned: 2019 },
  { id: "G1", name: "Groupe froid", type: "Froid", line: "Utilités", carrier: "elec", metered: true, protocol: "Modbus TCP", automation: 2, ratedPowerKw: 60, commissioned: 2014 },
  { id: "B1", name: "Chaudière gaz", type: "Chaleur", line: "Utilités", carrier: "gaz", metered: true, protocol: "MQTT via passerelle", automation: 2, ratedPowerKw: 300, commissioned: 2012 },
  { id: "T1", name: "Convoyeur de sortie", type: "Manutention", line: "Production", carrier: "elec", metered: false, protocol: "Saisie manuelle", automation: 1, ratedPowerKw: 8, commissioned: 2010 },
];

export const METERED_ASSETS = ASSETS.filter((a) => a.metered);

export type Day = {
  date: string; // YYYY-MM-DD
  production: number; // unités
  temp: number; // °C extérieur
  energy: Partial<Record<AssetId, number | null>>; // kWh, null = valeur manquante
  water: number; // m3
  scrapUnits: number;
  recycledShare: number; // 0..1
  accidents: number;
  trainingHours: number;
  revenue: number; // €
  cost: number; // € (hors énergie)
  ordersTotal: number;
  ordersOnTime: number;
  kaizen: number;
};

export type MaintEvent = { date: string; asset: AssetId; failure: boolean; repairHours: number };
export type Monthly = { month: string; satisfaction: number; score5S: number };
export type Requirement = { id: string; label: string; family: string; status: "conforme" | "écart" | "à vérifier"; auditClosed: boolean };

export type Stat = { uptime: number; latencyMs: number; lossPct: number; gapMin: number };
export type Device = {
  id: string;
  name: string;
  kind: "compteur" | "capteur" | "passerelle" | "automate";
  asset: AssetId | "SITE";
  protocol: string;
  online: boolean;
  lastSeenMin: number;
  firmwareOk: boolean;
  battery: number | null; // %, null si alimenté sur secteur
  stats: { base: Stat; prev: Stat; cur: Stat };
};

export type Dataset = {
  siteName: string;
  workforce: number;
  days: Day[];
  events: MaintEvent[];
  monthly: Monthly[];
  requirements: Requirement[];
  devices: Device[];
};

export const PARAMS = {
  efElec: 0.052, // kgCO2eq/kWh, valeur de démonstration (mix électrique)
  efGaz: 0.205, // kgCO2eq/kWh, valeur de démonstration
  priceElec: 0.15, // €/kWh
  priceGaz: 0.07, // €/kWh
  revenuePerUnit: 12.5,
  costPerUnit: 8.4,
  kgWastePerScrapUnit: 0.6,
};

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const END = Date.UTC(2026, 9, 19); // 19 octobre 2026
export const N_DAYS = 120;

export function isoDay(i: number): string {
  return new Date(END - (N_DAYS - 1 - i) * 86400000).toISOString().slice(0, 10);
}

export function buildDataset(): Dataset {
  const r = rng(20261019);
  const noise = (s: number) => (r() - 0.5) * 2 * s;
  const days: Day[] = [];
  const missingG1 = new Set([34, 35, 71, 98]);
  const outlierC1 = new Set([52, 104]);

  for (let i = 0; i < N_DAYS; i++) {
    const date = isoDay(i);
    const dow = new Date(date + "T00:00:00Z").getUTCDay();
    const weekend = dow === 0 || dow === 6;
    const production = Math.max(0, Math.round(weekend ? 150 + noise(120) : 1850 + noise(160)));
    // refroidissement progressif entre juillet et octobre
    const temp = Math.round((19 - i * 0.07 + noise(2.5)) * 10) / 10;
    const leak = i > 60 ? (i - 60) * 0.5 : 0; // dérive lente du compresseur (fuites)
    const e: Day["energy"] = {
      C1: Math.round(150 + 0.05 * production + leak + noise(5)),
      L1: Math.round(380 + 0.32 * production + noise(12)),
      L2: Math.round(120 + 0.11 * production + noise(6)),
      G1: Math.round(95 + 7 * Math.max(0, temp - 10) + noise(5)),
      B1: Math.round(260 + 14 * Math.max(0, 14 - temp) + noise(15)),
    };
    if (outlierC1.has(i)) e.C1 = (e.C1 as number) * 6;
    if (missingG1.has(i)) e.G1 = null;
    const scrapRate = 0.045 - i * 0.00006 + noise(0.004);
    const ordersTotal = weekend ? 0 : Math.round(34 + noise(4));
    const onTimeRate = 0.88 + i * 0.0003 + noise(0.04);
    days.push({
      date,
      production,
      temp,
      energy: e,
      water: Math.round((22 + 0.009 * production + noise(1.5)) * 10) / 10,
      scrapUnits: Math.round(production * Math.max(0.01, scrapRate)),
      recycledShare: Math.min(0.9, 0.55 + i * 0.0006 + noise(0.03)),
      accidents: r() < 0.012 ? 1 : 0,
      trainingHours: !weekend && r() < 0.65 ? Math.round(8 + r() * 24) : 0,
      revenue: Math.round(production * PARAMS.revenuePerUnit),
      cost: Math.round(production * PARAMS.costPerUnit + noise(150)),
      ordersTotal,
      ordersOnTime: Math.min(ordersTotal, Math.round(ordersTotal * Math.min(1, onTimeRate))),
      kaizen: !weekend && r() < 0.2 ? 1 : 0,
    });
  }

  const events: MaintEvent[] = [
    { date: isoDay(12), asset: "G1", failure: true, repairHours: 6 },
    { date: isoDay(27), asset: "L2", failure: false, repairHours: 2 },
    { date: isoDay(41), asset: "C1", failure: true, repairHours: 4 },
    { date: isoDay(66), asset: "L1", failure: true, repairHours: 9 },
    { date: isoDay(83), asset: "B1", failure: false, repairHours: 3 },
    { date: isoDay(97), asset: "L2", failure: true, repairHours: 3 },
    { date: isoDay(111), asset: "C1", failure: true, repairHours: 5 },
  ];

  const monthly: Monthly[] = [
    { month: "2026-07", satisfaction: 3.6, score5S: 71 },
    { month: "2026-08", satisfaction: 3.7, score5S: 74 },
    { month: "2026-09", satisfaction: 3.8, score5S: 78 },
    { month: "2026-10", satisfaction: 3.9, score5S: 80 },
  ];

  const requirements: Requirement[] = [
    { id: "R01", label: "Autorisation d'exploiter (ICPE)", family: "Environnement", status: "conforme", auditClosed: true },
    { id: "R02", label: "Suivi des rejets atmosphériques de la chaudière", family: "Environnement", status: "conforme", auditClosed: true },
    { id: "R03", label: "Registre des déchets", family: "Environnement", status: "à vérifier", auditClosed: false },
    { id: "R04", label: "Audit énergétique réglementaire", family: "Énergie", status: "conforme", auditClosed: true },
    { id: "R05", label: "Plan de mesure ISO 50001", family: "Énergie", status: "écart", auditClosed: false },
    { id: "R06", label: "Document unique d'évaluation des risques", family: "Sécurité", status: "conforme", auditClosed: true },
    { id: "R07", label: "Vérifications périodiques des équipements sous pression", family: "Sécurité", status: "conforme", auditClosed: true },
    { id: "R08", label: "Habilitations électriques à jour", family: "Sécurité", status: "écart", auditClosed: false },
    { id: "R09", label: "Registre des accidents du travail", family: "Social", status: "conforme", auditClosed: true },
    { id: "R10", label: "Plan de formation annuel", family: "Social", status: "conforme", auditClosed: true },
    { id: "R11", label: "Information du CSE sur l'usage de la vidéo", family: "Social", status: "à vérifier", auditClosed: false },
    { id: "R12", label: "Politique de protection des données (RGPD)", family: "Données", status: "conforme", auditClosed: true },
  ];

  return { siteName: "Atelier de démonstration", workforce: 62, days, events, monthly, requirements, devices: buildDevices() };
}


/** Appareils de collecte (module 1) avec leurs indicateurs de connectivité sur trois périodes. */
function buildDevices(): Device[] {
  const r = rng(77);
  const st = (u: number, lat: number, loss: number, gap: number): Stat => ({
    uptime: Math.min(100, Math.round((u + (r() - 0.5) * 0.6) * 10) / 10),
    latencyMs: Math.round(lat + (r() - 0.5) * lat * 0.2),
    lossPct: Math.max(0, Math.round((loss + (r() - 0.5) * 0.4) * 10) / 10),
    gapMin: Math.round(gap + (r() - 0.5) * gap * 0.3),
  });
  const mk = (id: string, name: string, kind: Device["kind"], asset: Device["asset"], protocol: string, o: { online?: boolean; seen: number; fw?: boolean; bat?: number | null; u: number; lat: number; loss: number; gap: number }): Device => ({
    id, name, kind, asset, protocol, online: o.online ?? true, lastSeenMin: o.seen, firmwareOk: o.fw ?? true, battery: o.bat ?? null,
    stats: { base: st(o.u - 1, o.lat * 1.2, o.loss + 0.6, o.gap * 1.3), prev: st(o.u - 0.4, o.lat * 1.1, o.loss + 0.3, o.gap * 1.1), cur: st(o.u, o.lat, o.loss, o.gap) },
  });
  return [
    mk("M-C1", "Compteur compresseur", "compteur", "C1", "Modbus TCP", { seen: 1, u: 99.8, lat: 40, loss: 0.2, gap: 3 }),
    mk("M-L1", "Compteur ligne d'extrusion", "compteur", "L1", "OPC UA", { seen: 1, u: 99.9, lat: 25, loss: 0.1, gap: 2 }),
    mk("M-L2", "Compteur ligne d'assemblage", "compteur", "L2", "PROFINET", { seen: 2, u: 99.5, lat: 55, loss: 0.4, gap: 4 }),
    mk("M-G1", "Compteur groupe froid", "compteur", "G1", "Modbus TCP", { seen: 4, u: 96.7, lat: 120, loss: 2.8, gap: 25, fw: false }),
    mk("M-B1", "Compteur gaz chaudière", "compteur", "B1", "MQTT via passerelle", { seen: 6, u: 98.4, lat: 180, loss: 1.2, gap: 12, bat: 34 }),
    mk("S-W1", "Compteur d'eau général", "capteur", "SITE", "Impulsions via passerelle", { seen: 5, u: 99.1, lat: 150, loss: 0.8, gap: 8, bat: 71 }),
    mk("S-EXT", "Sonde de température extérieure", "capteur", "SITE", "MQTT via passerelle", { online: false, seen: 95, u: 91.5, lat: 210, loss: 4.5, gap: 90, fw: false, bat: 18 }),
    mk("A-L1", "Automate ligne d'extrusion", "automate", "L1", "OPC UA", { seen: 1, u: 99.95, lat: 20, loss: 0.05, gap: 1 }),
    mk("A-L2", "Automate ligne d'assemblage", "automate", "L2", "PROFINET", { seen: 1, u: 99.7, lat: 35, loss: 0.2, gap: 2 }),
    mk("GW-1", "Passerelle en périphérie", "passerelle", "SITE", "Modbus vers MQTT", { seen: 1, u: 99.9, lat: 15, loss: 0.1, gap: 2 }),
    mk("GW-2", "Courtier MQTT", "passerelle", "SITE", "MQTT", { seen: 1, u: 99.95, lat: 10, loss: 0.05, gap: 1 }),
  ];
}
