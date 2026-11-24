import { driver, fit, median } from "./model";
import { METERED_ASSETS, type AssetId, type Dataset } from "./sim";

export type QualityIssue = { asset: AssetId; kind: "manquante" | "aberrante"; date: string; value: number | null };
export type SeriesQuality = {
  asset: AssetId;
  name: string;
  completeness: number; // 0..100
  missing: number;
  outliers: number;
  lastDate: string;
  score: number; // 0..100
};

/** Écarts à la consommation attendue (modèle robuste), exprimés en écarts-types robustes. */
function residuals(ds: Dataset, asset: AssetId) {
  const x = driver(ds, asset);
  const vals = ds.days.map((d) => d.energy[asset] ?? null);
  const pairs = vals.map((v, i) => ({ v, x: x[i] })).filter((p): p is { v: number; x: number } => p.v !== null);
  // premier ajustement, puis second ajustement sans les points trop éloignés
  let m = fit(pairs.map((p) => p.x), pairs.map((p) => p.v));
  let res = pairs.map((p) => p.v - (m.a + m.b * p.x));
  let sd = 1.4826 * median(res.map((r) => Math.abs(r))) || 1;
  const kept = pairs.filter((_, i) => Math.abs(res[i]) / sd < 6);
  m = fit(kept.map((p) => p.x), kept.map((p) => p.v));
  res = pairs.map((p) => p.v - (m.a + m.b * p.x));
  sd = 1.4826 * median(res.filter((_, i) => Math.abs(res[i]) / sd < 6).map((r) => Math.abs(r))) || 1;
  return { x, vals, m, sd };
}

/** Contrôles du module 2 : valeurs manquantes et aberrantes (écart à la médiane / MAD). */
export function checkQuality(ds: Dataset): { series: SeriesQuality[]; issues: QualityIssue[]; score: number } {
  const issues: QualityIssue[] = [];
  const series: SeriesQuality[] = METERED_ASSETS.map((a) => {
    const { x, vals, m, sd } = residuals(ds, a.id);
    let outliers = 0;
    vals.forEach((v, i) => {
      if (v === null) issues.push({ asset: a.id, kind: "manquante", date: ds.days[i].date, value: null });
      else if (Math.abs(v - (m.a + m.b * x[i])) / sd > 8) {
        outliers++;
        issues.push({ asset: a.id, kind: "aberrante", date: ds.days[i].date, value: v });
      }
    });
    const present = vals.filter((v) => v !== null).length;
    const missing = vals.length - present;
    const completeness = (present / vals.length) * 100;
    const score = Math.max(0, completeness - outliers * 2);
    return { asset: a.id, name: a.name, completeness, missing, outliers, lastDate: ds.days[ds.days.length - 1].date, score };
  });
  const score = series.reduce((s, x) => s + x.score, 0) / series.length;
  return { series, issues: issues.sort((a, b) => b.date.localeCompare(a.date)), score };
}

/** Valeur d'un compteur après nettoyage : manquante ou aberrante remplacée par la valeur attendue. */
export function cleanEnergy(ds: Dataset): (asset: AssetId, dayIndex: number) => number {
  const models = new Map<AssetId, ReturnType<typeof residuals>>();
  for (const a of METERED_ASSETS) models.set(a.id, residuals(ds, a.id));
  return (asset, i) => {
    const r = models.get(asset)!;
    const expected = Math.max(0, r.m.a + r.m.b * r.x[i]);
    const v = r.vals[i];
    if (v === null || v === undefined) return expected;
    return Math.abs(v - expected) / r.sd > 8 ? expected : v;
  };
}
