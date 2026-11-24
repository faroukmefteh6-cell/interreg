import { NextResponse } from "next/server";
import { resetDataset } from "@/lib/store";

export const dynamic = "force-dynamic";

export function POST() {
  resetDataset();
  return NextResponse.json({ ok: true });
}
