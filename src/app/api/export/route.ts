import { exportData } from "@/lib/exchange";
import { getDataset } from "@/lib/store";

export const dynamic = "force-dynamic";

// GET /api/export?dataset=energie|eau|...|esrs|kpis|all&format=csv|json
export function GET(req: Request) {
  const url = new URL(req.url);
  const dataset = url.searchParams.get("dataset") ?? "esrs";
  const format = url.searchParams.get("format") === "json" ? "json" : "csv";
  const r = exportData(getDataset(), dataset, format);
  if ("error" in r) return Response.json({ error: r.error }, { status: 400 });
  return new Response(r.body, { headers: { "Content-Type": r.mime, "Content-Disposition": `attachment; filename="${r.filename}"` } });
}
