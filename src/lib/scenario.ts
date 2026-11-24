import { cleanEnergy } from "./quality";
import { PARAMS, type Dataset } from "./sim";

export type ScenarioInput = {
  pressureDropBar: number; // baisse de la pression de consigne du compresseur
  fixLeaks: boolean; // réparation des fuites d'air comprimé
  chillerSetpointC: number; // relèvement de la consigne du groupe froid
  scrapReductionPts: number; // baisse du taux de rebuts, en points
};

export type ScenarioResult = {
  baselineKwh: number; // consommation mensuelle observée sur les 30 derniers jours
  kwhSaved: { low: number; central: number; high: number };
  co2Saved: { low: number; central: number; high: number }; // tCO2eq
  eurSaved: { low: number; central: number; high: number };
  lines: { action: string; kwh: number; eur: number; basis: string }[];
  assumptions: string[];
  needsExpert: true;
};

/**
 * Jumeau hybride (module 5) : une règle physique simple par action, appliquée à la
 * consommation observée de l'équipement (partie statistique).
 * Les coefficients sont des hypothèses de démonstration, à calibrer sur le site.
 */
export const COEFFS = {
  perBarCompressor: 0.07, // part de l'énergie du compresseur économisée par bar de pression en moins
  leakShare: 0.15, // part de l'énergie du compresseur perdue en fuites
  perDegChiller: 0.03, // part de l'énergie du groupe froid économisée par °C de consigne en plus
  scrapEnergyShare: 1, // l'énergie incorporée dans une unité rebutée est perdue
  uncertainty: 0.4, // ±40 % autour de la valeur centrale
};

export function simulate(ds: Dataset, input: ScenarioInput): ScenarioResult {
  const clean = cleanEnergy(ds);
  const from = ds.days.length - 30;
  const month = (asset: "C1" | "G1" | "L1" | "L2") => {
    let s = 0;
    for (let i = from; i < ds.days.length; i++) s += clean(asset, i);
    return s;
  };
  const c1 = month("C1");
  const g1 = month("G1");
  const prodEnergy = month("L1") + month("L2");
  const units = ds.days.slice(from).reduce((s, d) => s + d.production, 0);
  const scrapNow = ds.days.slice(from).reduce((s, d) => s + d.scrapUnits, 0) / Math.max(1, units);

  const bar = Math.max(0, Math.min(2, input.pressureDropBar));
  const dChill = Math.max(0, Math.min(4, input.chillerSetpointC));
  const dScrap = Math.max(0, Math.min(scrapNow * 100, input.scrapReductionPts)) / 100;

  const kwhPressure = c1 * COEFFS.perBarCompressor * bar;
  const kwhLeaks = input.fixLeaks ? (c1 - kwhPressure) * COEFFS.leakShare : 0;
  const kwhChill = g1 * COEFFS.perDegChiller * dChill;
  const kwhScrap = prodEnergy * dScrap * COEFFS.scrapEnergyShare;

  const lines = [
    { action: `Pression du compresseur −${bar} bar`, kwh: kwhPressure, basis: `${COEFFS.perBarCompressor * 100} % de l'énergie du compresseur par bar` },
    { action: "Réparation des fuites d'air comprimé", kwh: kwhLeaks, basis: `${COEFFS.leakShare * 100} % de l'énergie du compresseur perdue en fuites` },
    { action: `Consigne du groupe froid +${dChill} °C`, kwh: kwhChill, basis: `${COEFFS.perDegChiller * 100} % de l'énergie du groupe froid par °C` },
    { action: `Rebuts −${(dScrap * 100).toFixed(1)} point`, kwh: kwhScrap, basis: "énergie de procédé non perdue en rebuts" },
  ].map((l) => ({ ...l, eur: l.kwh * PARAMS.priceElec }));

  const central = lines.reduce((s, l) => s + l.kwh, 0);
  const u = COEFFS.uncertainty;
  const band = (v: number) => ({ low: v * (1 - u), central: v, high: v * (1 + u) });
  return {
    baselineKwh: c1 + g1 + prodEnergy,
    kwhSaved: band(central),
    co2Saved: band((central * PARAMS.efElec) / 1000),
    eurSaved: band(central * PARAMS.priceElec),
    lines,
    assumptions: [
      "Coefficients physiques de démonstration, à calibrer sur le site.",
      "Consommation de référence : 30 derniers jours, après nettoyage des données.",
      "Prix de l'électricité et facteur d'émission fixés dans les paramètres.",
      `Incertitude de ±${u * 100} % autour de la valeur centrale.`,
    ],
    needsExpert: true,
  };
}
