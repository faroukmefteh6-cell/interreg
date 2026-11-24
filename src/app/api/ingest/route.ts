import { NextResponse } from "next/server";
import { ingest } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corps JSON invalide" }, { status: 400 });
  }
  const rows = Array.isArray(body) ? body : [body];
  const result = ingest(rows as { asset: string; date: string; kWh: number }[]);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
