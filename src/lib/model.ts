import type { AssetId, Dataset } from "./sim";

/** Régression linéaire simple : y = a + b × x. */
export function fit(xs: number[], ys: number[]) {
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const b = sxx === 0 ? 0 : sxy / sxx;
  return { a: my - b * mx, b };
}

/** Variable explicative : la production pour les procédés, la température pour le froid et la chaleur. */
export function driver(ds: Dataset, asset: AssetId): number[] {
  if (asset === "G1") return ds.days.map((d) => Math.max(0, d.temp - 10));
  if (asset === "B1") return ds.days.map((d) => Math.max(0, 14 - d.temp));
  return ds.days.map((d) => d.production);
}

export function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
