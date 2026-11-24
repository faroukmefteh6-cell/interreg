import type { KpiResult } from "./kpi";
import type { Dataset } from "./sim";

export type EsrsPoint = {
  code: string;
  topic: string;
  label: string;
  axis: "env" | "soc" | "leg";
  kpi?: string; // id du KPI qui fournit la valeur
  available: (ds: Dataset) => boolean;
};

const hasMeters = (ds: Dataset) => ds.days.some((d) => Object.values(d.energy).some((v) => typeof v === "number"));

/** Points de données types, inspirés des thèmes ESRS. Liste à valider avec un expert conformité. */
export const ESRS_POINTS: EsrsPoint[] = [
  { code: "E1-5", topic: "Climat", label: "Consommation d'énergie totale", axis: "env", kpi: "env-energy", available: hasMeters },
  { code: "E1-6", topic: "Climat", label: "Émissions de GES (périmètres 1 et 2)", axis: "env", kpi: "env-ghg", available: hasMeters },
  { code: "E1-6b", topic: "Climat", label: "Émissions de GES (périmètre 3)", axis: "env", available: () => false },
  { code: "E3-4", topic: "Eau", label: "Consommation d'eau", axis: "env", kpi: "env-water", available: (ds) => ds.days.some((d) => d.water > 0) },
  { code: "E5-5", topic: "Économie circulaire", label: "Part de matières recyclées", axis: "env", kpi: "env-scrap", available: (ds) => ds.days.some((d) => d.recycledShare > 0) },
  { code: "E5-5b", topic: "Économie circulaire", label: "Déchets par type et destination", axis: "env", available: () => false },
  { code: "S1-6", topic: "Effectifs", label: "Effectif", axis: "soc", available: (ds) => ds.workforce > 0 },
  { code: "S1-13", topic: "Formation", label: "Heures de formation par salarié", axis: "soc", kpi: "soc-training", available: (ds) => ds.days.some((d) => d.trainingHours > 0) },
  { code: "S1-14", topic: "Santé et sécurité", label: "Accidents du travail", axis: "soc", kpi: "soc-accidents", available: () => true },
  { code: "S1-8", topic: "Dialogue social", label: "Salariés couverts par une convention collective", axis: "soc", available: () => false },
  { code: "G1-1", topic: "Conduite des affaires", label: "Politique de conformité", axis: "leg", kpi: "leg-compliance", available: (ds) => ds.requirements.length > 0 },
  { code: "G1-4", topic: "Conduite des affaires", label: "Incidents de non-conformité", axis: "leg", available: (ds) => ds.requirements.some((r) => r.status === "écart") },
];

export function esrsCoverage(ds: Dataset): number {
  return (ESRS_POINTS.filter((p) => p.available(ds)).length / ESRS_POINTS.length) * 100;
}

export type EsrsRow = { code: string; topic: string; label: string; status: "Disponible" | "Manquant"; value: string; unit: string };

export function esrsRows(ds: Dataset, results: KpiResult[]): EsrsRow[] {
  return ESRS_POINTS.map((p) => {
    const ok = p.available(ds);
    const r = p.kpi ? results.find((x) => x.def.id === p.kpi) : undefined;
    const value = ok && r && r.value !== null ? r.value.toLocaleString("fr-FR", { maximumFractionDigits: r.def.digits, minimumFractionDigits: r.def.digits }) : ok && p.code === "S1-6" ? String(ds.workforce) : "";
    return { code: p.code, topic: p.topic, label: p.label, status: ok ? "Disponible" : "Manquant", value, unit: r ? r.def.unit : p.code === "S1-6" ? "personnes" : "" };
  });
}

export function esrsCsv(rows: EsrsRow[]): string {
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  return ["code;thème;indicateur;statut;valeur;unité", ...rows.map((r) => [r.code, r.topic, r.label, r.status, r.value, r.unit].map(esc).join(";"))].join("\n");
}
