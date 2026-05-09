import { NextRequest, NextResponse } from "next/server";
import { listConversations, saveConversation, loadServerSettings } from "@/lib/server-storage";
import { Conversation } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/conversations - list all conversations (summary only, no messages)
export async function GET() {
  const settings = await loadServerSettings();
  const conversations = await listConversations(settings.storagePath || undefined);
  // return without messages for the list view
  const summaries = conversations.map(({ id, title, model, createdAt, updatedAt }) => ({
    id,
    title,
    model,
    createdAt,
    updatedAt,
  }));
  return NextResponse.json(summaries);
}

// POST /api/conversations - create a new conversation
export async function POST(req: NextRequest) {
  const body = await req.json();
  const conv: Conversation = body;
  const settings = await loadServerSettings();
  await saveConversation(conv, settings.storagePath || undefined);
  return NextResponse.json(conv);
}
