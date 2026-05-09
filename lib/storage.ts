import { Conversation, AppSettings, DEFAULT_SETTINGS } from "./types";

// ============= Conversations (server-side file storage) =============

export async function fetchConversationList(): Promise<
  Pick<Conversation, "id" | "title" | "model" | "createdAt" | "updatedAt">[]
> {
  const res = await fetch("/api/conversations");
  if (!res.ok) return [];
  return res.json();
}

export async function fetchConversation(id: string): Promise<Conversation | null> {
  const res = await fetch(`/api/conversations/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export async function createConversation(conv: Conversation): Promise<void> {
  await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(conv),
  });
}

export async function updateConversation(conv: Conversation): Promise<void> {
  await fetch(`/api/conversations/${conv.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(conv),
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await fetch(`/api/conversations/${id}`, { method: "DELETE" });
}

// ============= Settings (server-side file storage) =============

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch("/api/settings");
  if (!res.ok) return DEFAULT_SETTINGS;
  const parsed = await res.json();
  return { ...DEFAULT_SETTINGS, ...parsed };
}

export async function saveServerSettings(settings: AppSettings): Promise<void> {
  await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(settings),
  });
}
