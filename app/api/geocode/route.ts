import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lon = req.nextUrl.searchParams.get("lon");

  if (!lat || !lon) {
    return NextResponse.json({ error: "lat and lon are required" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&format=json&accept-language=zh&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "LLMChat/1.0 (contact: admin@llmchat.local)",
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Nominatim returned ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Geocoding failed" },
      { status: 500 }
    );
  }
}
