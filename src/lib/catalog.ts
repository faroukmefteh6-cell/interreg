export type AxisId = "env" | "soc" | "eco" | "leg" | "tec";

export const AXES: Record<AxisId, { name: string; def: string }> = {
  env: { name: "Environnemental", def: "énergie, GES, eau, déchets, matériaux" },
  soc: { name: "Social", def: "sécurité, conditions de travail, formation, satisfaction" },
  eco: { name: "Économique", def: "profit, coûts, qualité, délais, investissements" },
  leg: { name: "Légal", def: "conformité, audits, transparence, obligations sociales" },
  tec: { name: "Technologique", def: "automatisation, IoT, Lean, maintenance, qualité" },
};
export const AXIS_IDS = Object.keys(AXES) as AxisId[];

export type ModuleDef = { n: number; name: string; desc: string; oss: string; href?: string };

export const MODULES: ModuleDef[] = [
  { n: 1, name: "Collecte et connectivité", desc: "Lecture des compteurs, capteurs, automates, ERP/MES ; import de fichiers ; mise en tampon en cas de coupure réseau.", oss: "Eclipse BaSyx DataBridge, Node-RED", href: "/data" },
  { n: 2, name: "Qualité et référentiel des données", desc: "Contrôle des valeurs manquantes ou aberrantes, unités, horodatage ; catalogue des sources et de leur fiabilité.", oss: "InfluxDB, base relationnelle", href: "/data" },
  { n: 3, name: "Jumeau numérique (modèle d'actifs)", desc: "Un jumeau par équipement, ligne et site, avec ses données, ses caractéristiques et ses relations.", oss: "Asset Administration Shell, Eclipse BaSyx, Eclipse Ditto", href: "/twin" },
  { n: 4, name: "Analytique et modèles", desc: "Prévision de consommation, détection d'anomalies, maintenance prédictive ; suivi de la dérive des modèles.", oss: "Kafka-ML ou équivalent ; modèles du sujet 1", href: "/twin" },
  { n: 5, name: "Simulation de scénarios", desc: "Test d'une action avant déploiement ; estimation de l'effet sur énergie, émissions et coûts.", oss: "Modèles physiques + statistiques (jumeau hybride)", href: "/simulation" },
  { n: 6, name: "KPI et Performance Wheel", desc: "Calcul des KPI par axe, score par axe, comparaison à une référence (baseline).", oss: "Service de calcul dédié, Grafana", href: "/kpi" },
  { n: 7, name: "Reporting et conformité", desc: "Préparation des données CSRD/ESRS, facteurs d'émission ; brouillons validés par un expert.", oss: "Modèles de langage ouverts (sujet 1)", href: "/reporting" },
  { n: 8, name: "Interface et administration", desc: "Tableaux de bord par rôle, alertes, gestion des accès, multi-sites, API.", oss: "Next.js, API REST", href: "/" },
];

export type ModuleStatus = "actif" | "partiel" | "inactif";

export const LEVELS: { n: 1 | 2 | 3; name: string; goal: string; modules: Record<number, ModuleStatus> }[] = [
  { n: 1, name: "Suivi", goal: "Mesurer et situer la PME sur les cinq axes", modules: { 1: "actif", 2: "actif", 3: "partiel", 4: "inactif", 5: "inactif", 6: "actif", 7: "partiel", 8: "actif" } },
  { n: 2, name: "Prévision", goal: "Anticiper les dérives et cibler la maintenance", modules: { 1: "actif", 2: "actif", 3: "partiel", 4: "actif", 5: "inactif", 6: "actif", 7: "partiel", 8: "actif" } },
  { n: 3, name: "Jumeau et aide à la décision", goal: "Simuler des scénarios et piloter de façon assistée", modules: { 1: "actif", 2: "actif", 3: "actif", 4: "actif", 5: "actif", 6: "actif", 7: "actif", 8: "actif" } },
];

/** Niveau de maturité du site de démonstration. */
export const DEMO_LEVEL: 1 | 2 | 3 = 3;

export type TypeId = "energie" | "equipements" | "production" | "maintenance" | "lean" | "finance" | "dechets" | "eau" | "facteurs" | "rh" | "reglementaire" | "materiel" | "video";

export const DATA_TYPES: { id: TypeId; name: string; examples: string }[] = [
  { id: "energie", name: "Énergie", examples: "électricité, gaz, vapeur, air comprimé" },
  { id: "eau", name: "Eau", examples: "compteurs d'eau" },
  { id: "equipements", name: "Équipements et automates", examples: "état, puissance, dérive" },
  { id: "production", name: "Production et qualité", examples: "unités produites, rebuts, temps de cycle" },
  { id: "maintenance", name: "Maintenance", examples: "pannes, interventions, MTBF, MTTR" },
  { id: "lean", name: "Lean", examples: "actions Kaizen, audits 5S" },
  { id: "finance", name: "Finance et ventes", examples: "coûts, marge, chiffre d'affaires" },
  { id: "dechets", name: "Déchets et matières", examples: "pesées, tri, matières recyclées" },
  { id: "facteurs", name: "Facteurs externes", examples: "météo, prix de l'énergie" },
  { id: "rh", name: "Ressources humaines et sécurité", examples: "accidents, formations, satisfaction" },
  { id: "reglementaire", name: "Documents réglementaires", examples: "exigences, audits, reporting" },
  { id: "materiel", name: "Matériel et connectivité", examples: "compteurs, capteurs, passerelles" },
  { id: "video", name: "Vidéo (option)", examples: "défauts, zones de sécurité" },
];
export const typeName = (id: TypeId) => DATA_TYPES.find((t) => t.id === id)!.name;
