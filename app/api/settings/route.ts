import { NextRequest, NextResponse } from "next/server";
import { loadServerSettings, saveServerSettings } from "@/lib/server-storage";

export const runtime = "nodejs";

// GET /api/settings - load settings
export async function GET() {
  const settings = await loadServerSettings();
  return NextResponse.json(settings);
}

// PUT /api/settings - update settings
export async function PUT(req: NextRequest) {
  const body = await req.json();
  await saveServerSettings(body);
  return NextResponse.json(body);
}
