import { PageHeader, SimulatedBanner } from "@/components/ui";
import { simulate, type ScenarioInput } from "@/lib/scenario";
import { getDataset } from "@/lib/store";
import { SimulationForm } from "./SimulationForm";

export const dynamic = "force-dynamic";

export default function SimulationPage() {
  const input: ScenarioInput = { pressureDropBar: 0.5, fixLeaks: true, chillerSetpointC: 1, scrapReductionPts: 0.5 };
  const result = simulate(getDataset(), input);
  return (
    <>
      <PageHeader title="Simulation de scénarios" lead="Module 5 : tester une action sur le jumeau avant de la déployer. Une règle physique simple par action est appliquée à la consommation observée de l'équipement (jumeau hybride)." />
      <SimulatedBanner />
      <SimulationForm initialInput={input} initialResult={result} />
    </>
  );
}
