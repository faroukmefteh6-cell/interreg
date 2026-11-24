"use client";
import { useState } from "react";
import type { ScenarioInput, ScenarioResult } from "@/lib/scenario";

const fmt = (v: number, d = 0) => v.toLocaleString("fr-FR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function SimulationForm({ initialInput, initialResult }: { initialInput: ScenarioInput; initialResult: ScenarioResult }) {
  const [input, setInput] = useState<ScenarioInput>(initialInput);
  const [result, setResult] = useState<ScenarioResult>(initialResult);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [validated, setValidated] = useState(false);

  async function run(next: ScenarioInput) {
    setBusy(true);
    setError("");
    setValidated(false);
    try {
      const res = await fetch("/api/simulate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Erreur");
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de simulation");
    } finally {
      setBusy(false);
    }
  }

  const set = <K extends keyof ScenarioInput>(k: K, v: ScenarioInput[K]) => setInput((p) => ({ ...p, [k]: v }));
  const field = "w-full rounded-md border border-line bg-bg px-3 py-2 text-sm";

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <form onSubmit={(e) => { e.preventDefault(); run(input); }} className="space-y-4 rounded-lg border border-line bg-surface p-4">
        <h2 className="text-sm font-semibold">Scénario proposé</h2>
        <label className="block text-sm" htmlFor="bar">Baisse de pression du compresseur (bar)
          <input id="bar" type="number" min={0} max={2} step={0.1} value={input.pressureDropBar} onChange={(e) => set("pressureDropBar", Number(e.target.value))} className={`${field} mt-1`} />
        </label>
        <label className="flex items-center gap-2 text-sm" htmlFor="leaks">
          <input id="leaks" type="checkbox" checked={input.fixLeaks} onChange={(e) => set("fixLeaks", e.target.checked)} />
          Réparer les fuites d'air comprimé
        </label>
        <label className="block text-sm" htmlFor="chiller">Relèvement de la consigne du groupe froid (°C)
          <input id="chiller" type="number" min={0} max={4} step={0.5} value={input.chillerSetpointC} onChange={(e) => set("chillerSetpointC", Number(e.target.value))} className={`${field} mt-1`} />
        </label>
        <label className="block text-sm" htmlFor="scrap">Baisse du taux de rebuts (points)
          <input id="scrap" type="number" min={0} max={3} step={0.1} value={input.scrapReductionPts} onChange={(e) => set("scrapReductionPts", Number(e.target.value))} className={`${field} mt-1`} />
        </label>
        <button type="submit" disabled={busy} className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-bg disabled:opacity-60">{busy ? "Calcul en cours" : "Simuler"}</button>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
      </form>

      <div className="min-w-0 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["Énergie économisée", `${fmt(result.kwhSaved.central)} kWh`, `entre ${fmt(result.kwhSaved.low)} et ${fmt(result.kwhSaved.high)} par mois`],
            ["Émissions évitées", `${fmt(result.co2Saved.central, 2)} tCO₂eq`, `entre ${fmt(result.co2Saved.low, 2)} et ${fmt(result.co2Saved.high, 2)} par mois`],
            ["Économie", `${fmt(result.eurSaved.central)} €`, `entre ${fmt(result.eurSaved.low)} et ${fmt(result.eurSaved.high)} par mois`],
          ].map(([t, v, s]) => (
            <div key={t} className="rounded-lg border border-line bg-surface p-4">
              <div className="text-xs text-muted">{t}</div>
              <div className="tnum mt-1 text-2xl font-semibold">{v}</div>
              <div className="tnum mt-1 text-xs text-muted">{s}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg border border-line bg-surface">
          <table className="w-full min-w-[520px] border-collapse text-sm">
            <thead><tr>{["Action", "kWh par mois", "€ par mois", "Base de calcul"].map((h) => <th key={h} className="border-b border-line bg-bg px-3 py-2 text-left font-mono text-xs font-medium uppercase tracking-wide text-muted">{h}</th>)}</tr></thead>
            <tbody>
              {result.lines.map((l) => (
                <tr key={l.action}>
                  <td className="border-b border-line px-3 py-2">{l.action}</td>
                  <td className="tnum border-b border-line px-3 py-2 text-right">{fmt(l.kwh)}</td>
                  <td className="tnum border-b border-line px-3 py-2 text-right">{fmt(l.eur)}</td>
                  <td className="border-b border-line px-3 py-2 text-muted">{l.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-line bg-surface p-4">
          <h3 className="text-sm font-semibold">Hypothèses</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">{result.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3">
            <button type="button" onClick={() => setValidated(true)} disabled={validated} className="rounded-md border border-accent px-3 py-1.5 text-sm text-accent disabled:opacity-60">Soumettre à validation d'un expert</button>
            <span className="text-sm text-muted" aria-live="polite">{validated ? "Scénario transmis à l'expert. Aucune action n'est appliquée avant sa validation." : "Aucune action n'est appliquée sans validation."}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
