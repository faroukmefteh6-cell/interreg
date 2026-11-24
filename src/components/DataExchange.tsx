"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Spec = { id: string; label: string; columns: string[]; help: string; canImport: boolean };
type Report = { ok: boolean; error?: string; total: number; accepted: number; rejected: { line: number; error: string }[]; applied: boolean; preview: Record<string, string>[] };

const btn = "rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:border-accent";
const btnMain = "rounded-md border border-accent bg-accent px-3 py-1.5 text-sm text-bg disabled:opacity-50";

export default function DataExchange({ specs }: { specs: Spec[] }) {
  const router = useRouter();
  const importable = specs.filter((s) => s.canImport);
  const [id, setId] = useState(importable[0].id);
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const spec = specs.find((s) => s.id === id)!;

  async function post(dryRun: boolean) {
    setBusy(true); setMsg("");
    try {
      const res = await fetch("/api/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataset: id, csv: text, dryRun }) });
      const r: Report = await res.json();
      setReport(r);
      if (r.ok && !dryRun) { setMsg(`${r.accepted} ligne(s) importée(s). Les KPI sont recalculés.`); router.refresh(); }
    } catch { setReport({ ok: false, error: "Le serveur ne répond pas.", total: 0, accepted: 0, rejected: [], applied: false, preview: [] }); }
    setBusy(false);
  }

  async function reset() {
    if (!window.confirm("Remettre les données simulées d'origine ? Les imports seront perdus.")) return;
    await fetch("/api/reset", { method: "POST" });
    setReport(null); setMsg("Données d'origine rétablies."); router.refresh();
  }

  const template = "﻿" + spec.columns.join(";") + "\r\n";

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-line bg-surface p-4">
        <h3 className="mb-1 text-sm font-semibold">Exporter</h3>
        <p className="mb-3 text-xs text-muted">Télécharge les données de la plateforme (CSV avec « ; », s'ouvre dans Excel).</p>
        <ul className="space-y-1.5">
          {specs.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
              <span>{s.label}</span>
              <span className="flex gap-1.5">
                <a className={btn} href={`/api/export?dataset=${s.id}&format=csv`} download>CSV</a>
                <a className={btn} href={`/api/export?dataset=${s.id}&format=json`} download>JSON</a>
              </span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-2 border-t border-line pt-2 text-sm">
            <span>KPI calculés</span>
            <span className="flex gap-1.5"><a className={btn} href="/api/export?dataset=kpis&format=csv" download>CSV</a><a className={btn} href="/api/export?dataset=kpis&format=json" download>JSON</a></span>
          </li>
          <li className="flex items-center justify-between gap-2 text-sm">
            <span>Tout (jeu complet)</span>
            <a className={btn} href="/api/export?dataset=all&format=json" download>JSON</a>
          </li>
        </ul>
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <h3 className="mb-1 text-sm font-semibold">Importer</h3>
        <p className="mb-3 text-xs text-muted">1. Choisir le type · 2. Choisir le fichier CSV · 3. Vérifier · 4. Importer.</p>
        <label className="mb-1 block text-xs text-muted" htmlFor="type">Type de données</label>
        <select id="type" value={id} onChange={(e) => { setId(e.target.value); setReport(null); setMsg(""); }} className="mb-2 w-full rounded-md border border-line bg-bg px-2 py-1.5 text-sm">
          {importable.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <p className="mb-1 text-xs text-muted">{spec.help}</p>
        <p className="mb-2 text-xs">Colonnes : <span className="font-mono">{spec.columns.join(" ; ")}</span></p>
        <div className="mb-2 flex flex-wrap gap-2">
          <a className={btn} href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`} download={`modele-${id}.csv`}>Télécharger le modèle</a>
          <button type="button" className={btn} onClick={() => file.current?.click()}>Choisir un fichier</button>
          <input ref={file} type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setText(await f.text()); setName(f.name); setReport(null); setMsg("");
            e.target.value = "";
          }} />
        </div>
        <p className="mb-2 text-xs text-muted">{name ? `Fichier : ${name} (${text.split(/\r?\n/).filter(Boolean).length - 1} lignes)` : "Aucun fichier choisi."}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={btn} disabled={!text || busy} onClick={() => post(true)}>Vérifier</button>
          <button type="button" className={btnMain} disabled={!text || busy} onClick={() => post(false)}>Importer</button>
          <button type="button" className={btn} onClick={reset}>Données d'origine</button>
        </div>

        <div aria-live="polite" className="mt-3 text-sm">
          {msg && <p className="text-ok">{msg}</p>}
          {report && !report.ok && <p className="text-bad">{report.error}</p>}
          {report && report.ok && (
            <div>
              <p>{report.accepted} ligne(s) valide(s) sur {report.total}{report.rejected.length ? `, ${report.total - report.accepted} refusée(s)` : ""}.{!report.applied && report.accepted > 0 ? " Rien n'est encore importé." : ""}</p>
              {report.rejected.length > 0 && (
                <ul className="mt-1 max-h-32 space-y-0.5 overflow-auto text-xs text-bad">
                  {report.rejected.map((r) => <li key={r.line}>Ligne {r.line} : {r.error}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
        <p className="mt-2 text-xs text-muted">Les dates doivent être dans la période simulée (120 derniers jours). Les données restent en mémoire : elles sont perdues à l'arrêt du serveur.</p>
      </div>
    </div>
  );
}
