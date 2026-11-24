import type { TypeId } from "./catalog";
import { computeKpis } from "./kpi";
import { esrsCsv, esrsRows } from "./reporting";
import { ASSETS, METERED_ASSETS, type AssetId, type Dataset, type Day } from "./sim";

/** Import et export des données (modules 1 et 2). Format : CSV (séparateur « ; », décimale « , » acceptée). */

type Cell = string | number | null;
type Rec = Record<string, string>;

type Spec = {
  id: TypeId;
  label: string;
  columns: string[];
  help: string;
  canImport: boolean;
  rows: (ds: Dataset) => Cell[][];
  check?: (ds: Dataset, r: Rec) => string | null;
  commit?: (ds: Dataset, r: Rec) => void;
};

const num = (s: string | undefined): number | null => {
  if (s === undefined || s.trim() === "") return null;
  const v = Number(s.trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(v) ? v : NaN;
};
const dayOf = (ds: Dataset, date: string): Day | undefined => ds.days.find((d) => d.date === date);
const needDay = (ds: Dataset, r: Rec) => (dayOf(ds, r.date) ? null : `date hors période ou invalide : « ${r.date ?? ""} » (période ${ds.days[0].date} à ${ds.days[ds.days.length - 1].date})`);
const needNum = (r: Rec, col: string, opts: { min?: number; max?: number } = {}) => {
  const v = num(r[col]);
  if (v === null) return `${col} est vide`;
  if (Number.isNaN(v)) return `${col} n'est pas un nombre : « ${r[col]} »`;
  if (opts.min !== undefined && v < opts.min) return `${col} doit être ≥ ${opts.min}`;
  if (opts.max !== undefined && v > opts.max) return `${col} doit être ≤ ${opts.max}`;
  return null;
};
const first = (...errs: (string | null)[]) => errs.find((e) => e !== null) ?? null;

export const SPECS: Spec[] = [
  {
    id: "energie", label: "Énergie (compteurs)", columns: ["date", "asset", "kWh"], canImport: true,
    help: "Un relevé journalier par compteur. asset : C1, L1, L2, G1 ou B1. kWh vide = valeur manquante.",
    rows: (ds) => ds.days.flatMap((d) => METERED_ASSETS.map((a) => [d.date, a.id, d.energy[a.id] ?? null])),
    check: (ds, r) => first(needDay(ds, r), METERED_ASSETS.some((a) => a.id === r.asset) ? null : `équipement sans compteur : « ${r.asset ?? ""} »`, r.kWh?.trim() === "" ? null : needNum(r, "kWh", { min: 0 })),
    commit: (ds, r) => { dayOf(ds, r.date)!.energy[r.asset as AssetId] = num(r.kWh); },
  },
  {
    id: "eau", label: "Eau", columns: ["date", "water_m3"], canImport: true,
    help: "Consommation d'eau journalière en m³.",
    rows: (ds) => ds.days.map((d) => [d.date, d.water]),
    check: (ds, r) => first(needDay(ds, r), needNum(r, "water_m3", { min: 0 })),
    commit: (ds, r) => { dayOf(ds, r.date)!.water = num(r.water_m3) as number; },
  },
  {
    id: "production", label: "Production", columns: ["date", "production"], canImport: true,
    help: "Unités produites par jour.",
    rows: (ds) => ds.days.map((d) => [d.date, d.production]),
    check: (ds, r) => first(needDay(ds, r), needNum(r, "production", { min: 0 })),
    commit: (ds, r) => { dayOf(ds, r.date)!.production = Math.round(num(r.production) as number); },
  },
  {
    id: "dechets", label: "Déchets et matières", columns: ["date", "scrap_units", "recycled_pct"], canImport: true,
    help: "Unités rebutées par jour et part de matières recyclées en pourcentage (0 à 100).",
    rows: (ds) => ds.days.map((d) => [d.date, d.scrapUnits, Math.round(d.recycledShare * 1000) / 10]),
    check: (ds, r) => first(needDay(ds, r), needNum(r, "scrap_units", { min: 0 }), needNum(r, "recycled_pct", { min: 0, max: 100 })),
    commit: (ds, r) => { const d = dayOf(ds, r.date)!; d.scrapUnits = Math.round(num(r.scrap_units) as number); d.recycledShare = (num(r.recycled_pct) as number) / 100; },
  },
  {
    id: "facteurs", label: "Facteurs externes (météo)", columns: ["date", "temp_c"], canImport: true,
    help: "Température extérieure moyenne du jour, en °C.",
    rows: (ds) => ds.days.map((d) => [d.date, d.temp]),
    check: (ds, r) => first(needDay(ds, r), needNum(r, "temp_c", { min: -50, max: 60 })),
    commit: (ds, r) => { dayOf(ds, r.date)!.temp = num(r.temp_c) as number; },
  },
  {
    id: "finance", label: "Finance et ventes", columns: ["date", "revenue_eur", "cost_eur", "orders_total", "orders_on_time"], canImport: true,
    help: "Chiffre d'affaires et coûts hors énergie en €, commandes livrées et commandes livrées à l'heure.",
    rows: (ds) => ds.days.map((d) => [d.date, d.revenue, d.cost, d.ordersTotal, d.ordersOnTime]),
    check: (ds, r) => first(needDay(ds, r), needNum(r, "revenue_eur", { min: 0 }), needNum(r, "cost_eur", { min: 0 }), needNum(r, "orders_total", { min: 0 }), needNum(r, "orders_on_time", { min: 0 }), (num(r.orders_on_time) as number) > (num(r.orders_total) as number) ? "orders_on_time ne peut pas dépasser orders_total" : null),
    commit: (ds, r) => { const d = dayOf(ds, r.date)!; d.revenue = num(r.revenue_eur) as number; d.cost = num(r.cost_eur) as number; d.ordersTotal = num(r.orders_total) as number; d.ordersOnTime = num(r.orders_on_time) as number; },
  },
  {
    id: "rh", label: "Ressources humaines et sécurité", columns: ["date", "accidents", "training_hours"], canImport: true,
    help: "Accidents déclarés et heures de formation du jour.",
    rows: (ds) => ds.days.map((d) => [d.date, d.accidents, d.trainingHours]),
    check: (ds, r) => first(needDay(ds, r), needNum(r, "accidents", { min: 0 }), needNum(r, "training_hours", { min: 0 })),
    commit: (ds, r) => { const d = dayOf(ds, r.date)!; d.accidents = num(r.accidents) as number; d.trainingHours = num(r.training_hours) as number; },
  },
  {
    id: "lean", label: "Lean (Kaizen)", columns: ["date", "kaizen"], canImport: true,
    help: "Nombre d'actions Kaizen clôturées par jour.",
    rows: (ds) => ds.days.map((d) => [d.date, d.kaizen]),
    check: (ds, r) => first(needDay(ds, r), needNum(r, "kaizen", { min: 0 })),
    commit: (ds, r) => { dayOf(ds, r.date)!.kaizen = num(r.kaizen) as number; },
  },
  {
    id: "maintenance", label: "Maintenance", columns: ["date", "asset", "failure", "repair_hours"], canImport: true,
    help: "Une ligne par intervention. failure : oui ou non. Une intervention existante (même date et même équipement) est remplacée.",
    rows: (ds) => ds.events.map((e) => [e.date, e.asset, e.failure ? "oui" : "non", e.repairHours]),
    check: (ds, r) => first(needDay(ds, r), ASSETS.some((a) => a.id === r.asset) ? null : `équipement inconnu : « ${r.asset ?? ""} »`, /^(oui|non)$/i.test(r.failure ?? "") ? null : "failure doit valoir oui ou non", needNum(r, "repair_hours", { min: 0 })),
    commit: (ds, r) => {
      const ev = { date: r.date, asset: r.asset as AssetId, failure: /^oui$/i.test(r.failure), repairHours: num(r.repair_hours) as number };
      const i = ds.events.findIndex((e) => e.date === ev.date && e.asset === ev.asset);
      if (i >= 0) ds.events[i] = ev;
      else ds.events.push(ev);
      ds.events.sort((a, b) => a.date.localeCompare(b.date));
    },
  },
  {
    id: "reglementaire", label: "Documents réglementaires (exigences)", columns: ["id", "label", "family", "status", "audit_closed"], canImport: true,
    help: "Registre des exigences. status : conforme, écart ou à vérifier. audit_closed : oui ou non. Une exigence existante (même id) est mise à jour.",
    rows: (ds) => ds.requirements.map((q) => [q.id, q.label, q.family, q.status, q.auditClosed ? "oui" : "non"]),
    check: (_ds, r) => first(r.id?.trim() ? null : "id est vide", r.label?.trim() ? null : "label est vide", /^(conforme|écart|à vérifier)$/i.test(r.status ?? "") ? null : "status doit valoir conforme, écart ou à vérifier", /^(oui|non)$/i.test(r.audit_closed ?? "") ? null : "audit_closed doit valoir oui ou non"),
    commit: (ds, r) => {
      const q = { id: r.id.trim(), label: r.label.trim(), family: (r.family ?? "").trim() || "Autre", status: r.status.toLowerCase() as "conforme" | "écart" | "à vérifier", auditClosed: /^oui$/i.test(r.audit_closed) };
      const i = ds.requirements.findIndex((x) => x.id === q.id);
      if (i >= 0) ds.requirements[i] = q;
      else ds.requirements.push(q);
    },
  },
  {
    id: "materiel", label: "Matériel et connectivité", columns: ["device", "name", "kind", "asset", "protocol", "online", "last_seen_min", "firmware_ok", "battery_pct", "uptime_pct", "latency_ms", "loss_pct"], canImport: false,
    help: "Export seulement : l'état du matériel vient des passerelles, pas d'un fichier.",
    rows: (ds) => ds.devices.map((d) => [d.id, d.name, d.kind, d.asset, d.protocol, d.online ? "oui" : "non", d.lastSeenMin, d.firmwareOk ? "oui" : "non", d.battery, d.stats.cur.uptime, d.stats.cur.latencyMs, d.stats.cur.lossPct]),
  },
];

export const specOf = (id: string) => SPECS.find((s) => s.id === id);

// ---------- CSV ----------
export function toCsv(columns: string[], rows: Cell[][]): string {
  const f = (c: Cell) => {
    if (c === null || c === undefined) return "";
    const s = typeof c === "number" ? String(c).replace(".", ",") : c;
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [columns.join(";"), ...rows.map((r) => r.map(f).join(";"))].join("\r\n") + "\r\n";
}

export function parseCsv(text: string): { header: string[]; rows: { line: number; rec: Rec }[] } {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = (firstLine.match(/;/g) ?? []).length >= (firstLine.match(/,/g) ?? []).length && firstLine.includes(";") ? ";" : firstLine.includes(",") ? "," : ";";
  const table: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (q) {
      if (ch === '"' && src[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      table.push(row); row = [];
    } else cur += ch;
  }
  if (cur !== "" || row.length) { row.push(cur); table.push(row); }
  const lines = table.map((r, i) => ({ r, line: i + 1 })).filter((x) => x.r.some((c) => c.trim() !== ""));
  if (!lines.length) return { header: [], rows: [] };
  const header = lines[0].r.map((h) => h.trim());
  return { header, rows: lines.slice(1).map(({ r, line }) => ({ line, rec: Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])) })) };
}

// ---------- Import ----------
export type ImportReport = {
  ok: boolean;
  error?: string;
  total: number;
  accepted: number;
  rejected: { line: number; error: string }[];
  applied: boolean;
  preview: Rec[];
};

export function importCsv(ds: Dataset, id: string, text: string, apply: boolean): ImportReport {
  const spec = specOf(id);
  const fail = (error: string): ImportReport => ({ ok: false, error, total: 0, accepted: 0, rejected: [], applied: false, preview: [] });
  if (!spec) return fail(`Type de données inconnu : ${id}`);
  if (!spec.canImport || !spec.check || !spec.commit) return fail(`Le type « ${spec.label} » ne s'importe pas : ${spec.help}`);
  if (!text.trim()) return fail("Le fichier est vide.");
  const { header, rows } = parseCsv(text);
  const missing = spec.columns.filter((c) => !header.includes(c));
  if (missing.length) return fail(`Colonnes manquantes : ${missing.join(", ")}. Colonnes attendues : ${spec.columns.join(" ; ")}.`);
  if (!rows.length) return fail("Le fichier ne contient aucune ligne de données.");
  if (rows.length > 20000) return fail("Fichier trop volumineux : 20 000 lignes au maximum.");
  const rejected: ImportReport["rejected"] = [];
  const ok: Rec[] = [];
  for (const { line, rec } of rows) {
    const err = spec.check(ds, rec);
    if (err) rejected.push({ line, error: err });
    else ok.push(rec);
  }
  if (apply) for (const rec of ok) spec.commit(ds, rec);
  return { ok: true, total: rows.length, accepted: ok.length, rejected: rejected.slice(0, 50), applied: apply && ok.length > 0, preview: ok.slice(0, 5) };
}

// ---------- Export ----------
export type ExportResult = { filename: string; mime: string; body: string } | { error: string };

export function exportData(ds: Dataset, dataset: string, format: "csv" | "json"): ExportResult {
  if (dataset === "all") {
    if (format === "csv") return { error: "L'export complet existe seulement en JSON." };
    return { filename: "donnees-completes.json", mime: "application/json; charset=utf-8", body: JSON.stringify(ds, null, 2) };
  }
  if (dataset === "esrs" || dataset === "kpis") {
    const results = computeKpis(ds);
    const columns = dataset === "esrs" ? ["code", "thème", "indicateur", "statut", "valeur", "unité"] : ["id", "axe", "type", "kpi", "valeur", "unité", "cible", "score", "tendance"];
    const rows: Cell[][] = dataset === "esrs"
      ? esrsRows(ds, results).map((r) => [r.code, r.topic, r.label, r.status, r.value, r.unit])
      : results.map((r) => [r.def.id, r.def.axis, r.def.type, r.def.label, r.value === null ? null : Math.round(r.value * 100) / 100, r.def.unit, Math.round(r.target * 100) / 100, r.score === null ? null : Math.round(r.score), r.trend]);
    if (format === "json") return { filename: `${dataset}.json`, mime: "application/json; charset=utf-8", body: JSON.stringify(rows.map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]]))), null, 2) };
    return { filename: `${dataset}.csv`, mime: "text/csv; charset=utf-8", body: dataset === "esrs" ? "\uFEFF" + esrsCsv(esrsRows(ds, results)) : toCsv(columns, rows) };
  }
  const spec = specOf(dataset);
  if (!spec) return { error: `Type de données inconnu : ${dataset}` };
  const rows = spec.rows(ds);
  if (format === "json") return { filename: `${spec.id}.json`, mime: "application/json; charset=utf-8", body: JSON.stringify(rows.map((r) => Object.fromEntries(spec.columns.map((c, i) => [c, r[i]]))), null, 2) };
  return { filename: `${spec.id}.csv`, mime: "text/csv; charset=utf-8", body: toCsv(spec.columns, rows) };
}
