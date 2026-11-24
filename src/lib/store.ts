import { buildDataset, type AssetId, type Dataset } from "./sim";

// Magasin en mémoire (module 2). En production : base de séries temporelles.
const g = globalThis as unknown as { __greenfab?: Dataset };

export function getDataset(): Dataset {
  if (!g.__greenfab) g.__greenfab = buildDataset();
  return g.__greenfab;
}

export type IngestResult = { ok: true; updated: number } | { ok: false; error: string };

/** Ajoute ou corrige des mesures journalières d'énergie (kWh) reçues par l'API. */
export function ingest(rows: { asset: string; date: string; kWh: number }[]): IngestResult {
  const ds = getDataset();
  let updated = 0;
  for (const row of rows) {
    if (!row || typeof row.kWh !== "number" || !Number.isFinite(row.kWh) || row.kWh < 0) {
      return { ok: false, error: "kWh doit être un nombre positif" };
    }
    const day = ds.days.find((d) => d.date === row.date);
    if (!day) return { ok: false, error: `Date hors période : ${row.date}` };
    if (!(row.asset in day.energy)) return { ok: false, error: `Équipement sans compteur : ${row.asset}` };
    day.energy[row.asset as AssetId] = row.kWh;
    updated++;
  }
  return { ok: true, updated };
}

export function resetDataset(): void {
  g.__greenfab = undefined;
}
