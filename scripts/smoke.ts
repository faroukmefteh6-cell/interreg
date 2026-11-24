import { AXES, AXIS_IDS } from "../src/lib/catalog";
import { axisScores, computeKpis, fmt, maturity } from "../src/lib/kpi";
import { analyseAll } from "../src/lib/analytics";
import { checkQuality } from "../src/lib/quality";
import { esrsRows } from "../src/lib/reporting";
import { simulate } from "../src/lib/scenario";
import { getDataset, ingest } from "../src/lib/store";

const ds = getDataset();
const res = computeKpis(ds);
for (const r of res) console.log(r.def.axis.padEnd(4), r.def.label.padEnd(38), fmt(r.value, r.def.digits).padStart(9), r.def.unit.padEnd(10), "cible", fmt(r.target, r.def.digits).padStart(8), "score", fmt(r.score), r.trend, r.secondary ? `| ${r.secondary.label}: ${fmt(r.secondary.value, r.secondary.digits)}` : "");
const sc = axisScores(res);
console.log(AXIS_IDS.map((a) => `${AXES[a].name} ${fmt(sc[a])}`).join(" · "), "|", maturity(sc));
const q = checkQuality(ds);
console.log("qualité", fmt(q.score, 1), q.series.map((s) => `${s.asset}:${fmt(s.completeness, 1)}%/${s.outliers}o`).join(" "), "issues", q.issues.length);
console.log(analyseAll(ds).map((a) => `${a.asset} dérive ${a.driftPct.toFixed(1)}% ${a.anomaly ? "ANOMALIE" : ""} prév7 ${Math.round(a.forecast7)}`).join("\n"));
const s = simulate(ds, { pressureDropBar: 0.5, fixLeaks: true, chillerSetpointC: 1, scrapReductionPts: 0.5 });
console.log("simu", Math.round(s.kwhSaved.central), "kWh", s.co2Saved.central.toFixed(2), "t", Math.round(s.eurSaved.central), "€", s.lines.map((l) => Math.round(l.kwh)));
console.log(esrsRows(ds, res).map((r) => `${r.code} ${r.status} ${r.value}`).join(" | "));
console.log(ingest([{ asset: "G1", date: ds.days[34].date, kWh: 300 }]), ingest([{ asset: "T1", date: ds.days[3].date, kWh: 5 }]));

// import / export
import { exportData, importCsv, SPECS } from "../src/lib/exchange";
import { buildTwinModel } from "../src/lib/twin3d";
for (const sp of SPECS) {
  const e = exportData(ds, sp.id, "csv");
  if ("error" in e) throw new Error(e.error);
  if (sp.canImport) {
    const r = importCsv(ds, sp.id, e.body, false);
    if (!r.ok || r.rejected.length) throw new Error(`aller-retour ${sp.id}: ${JSON.stringify(r)}`);
  }
}
console.log("export/import aller-retour OK sur", SPECS.length, "types");
const bad = importCsv(ds, "eau", "date;water_m3\n2000-01-01;5\n" + ds.days[5].date + ";abc\n" + ds.days[6].date + ";12,5\n", true);
console.log("import invalide", bad.accepted, bad.rejected.map((x) => x.error));
console.log(importCsv(ds, "eau", "x;y\n1;2", false).error);
console.log(buildTwinModel(ds).map((i) => `${i.id}:${i.count}:${i.score === null ? "-" : Math.round(i.score)}`).join(" "));
for (const f of ["kpis", "esrs", "all"]) { const e = exportData(ds, f, f === "all" ? "json" : "csv"); console.log(f, "error" in e ? e.error : e.body.length); }
