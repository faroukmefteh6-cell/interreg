import { DATA_TYPES, type TypeId } from "./catalog";
import { computeKpis, fmt } from "./kpi";
import type { Dataset } from "./sim";

export type SceneKpi = { label: string; value: string; unit: string; score: number | null };
export type SceneItem = {
  id: TypeId;
  name: string;
  examples: string;
  count: number; // nombre de KPI
  score: number | null; // moyenne des KPI notés, 0 à 100
  tone: "ok" | "warn" | "bad" | "muted";
  kpis: SceneKpi[];
};

export const toneOf = (score: number | null): SceneItem["tone"] => (score === null ? "muted" : score >= 80 ? "ok" : score >= 60 ? "warn" : "bad");

/** Modèle 3D standard du site : un bloc par type de données, hauteur = score moyen des KPI du type. */
export function buildTwinModel(ds: Dataset): SceneItem[] {
  const all = computeKpis(ds);
  return DATA_TYPES.map((t) => {
    const rows = all.filter((r) => r.def.type === t.id);
    const scored = rows.filter((r) => r.score !== null);
    const score = scored.length ? scored.reduce((s, r) => s + (r.score as number), 0) / scored.length : null;
    return {
      id: t.id,
      name: t.name,
      examples: t.examples,
      count: rows.length,
      score,
      tone: toneOf(score),
      kpis: rows.map((r) => ({ label: r.def.label, value: fmt(r.value, r.def.digits), unit: r.def.unit, score: r.score })),
    };
  });
}
