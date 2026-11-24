import { driver, fit } from "./model";
import { cleanEnergy } from "./quality";
import { METERED_ASSETS, type AssetId, type Dataset } from "./sim";

export type AssetAnalysis = {
  asset: AssetId;
  expected: number[]; // kWh attendus (modèle appris sur la période de référence)
  actual: number[];
  dates: string[];
  driftPct: number; // écart moyen des 14 derniers jours
  anomaly: boolean;
  forecast7: number; // kWh sur les 7 prochains jours
};

/**
 * Module 4 : modèle statistique appris sur les 60 premiers jours (période de référence),
 * puis comparaison avec la consommation récente. Un écart durable signale une dérive.
 */
export function analyseAsset(ds: Dataset, asset: AssetId): AssetAnalysis {
  const clean = cleanEnergy(ds);
  const actual = ds.days.map((_, i) => clean(asset, i));
  const x = driver(ds, asset);
  const m = fit(x.slice(0, 60), actual.slice(0, 60));
  const expected = x.map((v) => m.a + m.b * v);
  const last = 14;
  const dev = actual.slice(-last).reduce((s, v, i) => s + (v - expected[expected.length - last + i]), 0) / last;
  const meanExp = expected.slice(-last).reduce((s, v) => s + v, 0) / last;
  const driftPct = (dev / Math.max(1, meanExp)) * 100;
  const typicalWeek = x.slice(-28).reduce((s, v) => s + v, 0) / 28;
  return { asset, expected, actual, dates: ds.days.map((d) => d.date), driftPct, anomaly: Math.abs(driftPct) > 8, forecast7: (m.a + m.b * typicalWeek) * 7 };
}

export function analyseAll(ds: Dataset): AssetAnalysis[] {
  return METERED_ASSETS.map((a) => analyseAsset(ds, a.id));
}
