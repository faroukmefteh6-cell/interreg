import { NextResponse } from "next/server";
import { importCsv } from "@/lib/exchange";
import { getDataset } from "@/lib/store";

export const dynamic = "force-dynamic";

// POST /api/import  { dataset, csv, dryRun? }
export async function POST(req: Request) {
  let body: { dataset?: unknown; csv?: unknown; dryRun?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Corps JSON invalide" }, { status: 400 });
  }
  if (typeof body.dataset !== "string" || typeof body.csv !== "string") {
    return NextResponse.json({ ok: false, error: "Champs attendus : dataset et csv (texte)" }, { status: 400 });
  }
  const r = importCsv(getDataset(), body.dataset, body.csv, body.dryRun !== true);
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
