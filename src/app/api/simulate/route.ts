import { NextResponse } from "next/server";
import { simulate, type ScenarioInput } from "@/lib/scenario";
import { getDataset } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: Partial<ScenarioInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const nums: (keyof ScenarioInput)[] = ["pressureDropBar", "chillerSetpointC", "scrapReductionPts"];
  for (const k of nums) {
    const v = body[k];
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return NextResponse.json({ error: `${k} doit être un nombre positif` }, { status: 400 });
  }
  if (typeof body.fixLeaks !== "boolean") return NextResponse.json({ error: "fixLeaks doit être un booléen" }, { status: 400 });
  return NextResponse.json(simulate(getDataset(), body as ScenarioInput));
}
