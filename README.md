# Plateforme GREENFAB – jumeau numérique (WP2, sujet 2)

Première version fonctionnelle de la plateforme décrite dans la note de conception :
Next.js 14 (App Router), TypeScript et Tailwind CSS.

## Lancer

```bash
npm install
npm run dev      # http://localhost:3000
npm run build && npm start
npm test         # vérifie le moteur (KPI, qualité, simulation) sans Next
```

## Ce que fait cette version

| Page | Module | Contenu |
| --- | --- | --- |
| `/` | 8 | Score des cinq axes, énergie du site, points à traiter, KPI principaux |
| `/kpi` | 6 | 16 KPI par axe avec fiche (formule, données, cadence, niveau), cible, score, tendance |
| `/twin` | 3, 4 | Jumeau par équipement (format inspiré de l'AAS), modèle de consommation attendue, détection de dérive, prévision à 7 jours |
| `/data` | 1, 2 | Équipements et protocoles, contrôle de qualité des données, API d'envoi de mesures |
| `/simulation` | 5 | Scénarios (pression d'air, fuites, groupe froid, rebuts) avec fourchette d'incertitude et validation par un expert |
| `/reporting` | 7 | Points de données ESRS disponibles ou manquants, export CSV |

API : `GET /api/kpis`, `POST /api/simulate`, `POST /api/ingest`, `GET /api/export`.

## Données simulées

Les données d'un site fictif sont générées dans `src/lib/sim.ts` (120 jours, graine fixe).
Elles contiennent volontairement des valeurs manquantes, des valeurs aberrantes et une dérive
de fuites sur le compresseur, pour montrer les modules 2 et 4.
Les facteurs d'émission, les prix de l'énergie, les cibles et les coefficients de simulation sont
des valeurs de démonstration à remplacer.

## Brancher de vraies données

1. Remplacer `buildDataset()` dans `src/lib/sim.ts` par la lecture de votre source (ERP, GMAO, compteurs).
2. Remplacer le magasin en mémoire de `src/lib/store.ts` par une base de séries temporelles (par exemple InfluxDB).
3. Brancher la passerelle (OPC UA, Modbus, MQTT) sur `POST /api/ingest`.
4. Compléter les fiches KPI dans `src/lib/kpi.ts` avec la liste de l'équipe, notamment pour l'axe Légal.

## Limites de cette version

- Pas d'authentification ni de multi-sites : à ajouter avant tout usage réel.
- Les données ajoutées par l'API sont perdues au redémarrage.
- Le « jumeau » est un modèle statistique simple (régression) et des règles physiques simples ; il n'est pas calibré sur un site réel.

## Nouveautés (version 2)

- **KPI** : vue « Par axe » et vue « Par type de données » ; KPI de suivi du matériel (disponibilité, appareils en ligne, latence, pertes, batterie, firmware, passerelles).
- **Jumeau numérique** : modèle 3D standard du site (un bloc par type de données, hauteur = score moyen des KPI ; glisser pour tourner).
- **Données et connectivité** : tableau du matériel, import CSV (avec vérification avant import) et export CSV/JSON de chaque type de données. API : `GET /api/export?dataset=energie&format=csv`, `POST /api/import`, `POST /api/reset`.
- La page « Architecture » a été retirée.

Limites : les dates importées doivent être dans la période simulée (120 jours) ; les données sont en mémoire et reviennent à l'état d'origine à l'arrêt du serveur ; pas d'authentification.
