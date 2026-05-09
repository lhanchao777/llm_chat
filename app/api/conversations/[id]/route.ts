import { NextRequest, NextResponse } from "next/server";
import {
  getConversation,
  saveConversation,
  deleteConversation,
  loadServerSettings,
} from "@/lib/server-storage";

export const runtime = "nodejs";

// GET /api/conversations/[id] - get single conversation with messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const settings = await loadServerSettings();
  const conv = await getConversation(id, settings.storagePath || undefined);
  if (!conv) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(conv);
}

// PUT /api/conversations/[id] - update a conversation
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const conv = { ...body, id };
  const settings = await loadServerSettings();
  await saveConversation(conv, settings.storagePath || undefined);
  return NextResponse.json(conv);
}

// DELETE /api/conversations/[id] - delete a conversation
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const settings = await loadServerSettings();
  const deleted = await deleteConversation(id, settings.storagePath || undefined);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
