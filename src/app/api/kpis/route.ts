import { NextResponse } from "next/server";
import { axisScores, computeKpis } from "@/lib/kpi";
import { getDataset } from "@/lib/store";

export const dynamic = "force-dynamic";

export function GET() {
  const results = computeKpis(getDataset());
  return NextResponse.json({
    simulated: true,
    axisScores: axisScores(results),
    kpis: results.map((r) => ({ id: r.def.id, axis: r.def.axis, label: r.def.label, unit: r.def.unit, value: r.value, previous: r.prev, baseline: r.baseline, target: r.target, score: r.score, trend: r.trend, modules: r.def.modules })),
  });
}
