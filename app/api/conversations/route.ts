import { NextRequest, NextResponse } from "next/server";
import { listConversations, saveConversation } from "@/lib/server-storage";
import { getAuthUser, AuthError } from "@/lib/auth";
import { Conversation } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const conversations = await listConversations(user.id);
    const summaries = conversations.map(({ id, title, model, createdAt, updatedAt }) => ({
      id,
      title,
      model,
      createdAt,
      updatedAt,
    }));
    return NextResponse.json(summaries);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    const body = await req.json();
    const conv: Conversation = body;
    await saveConversation(user.id, conv);
    return NextResponse.json(conv);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
