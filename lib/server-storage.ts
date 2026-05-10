import fs from "fs/promises";
import path from "path";
import { Conversation, AppSettings, DEFAULT_SETTINGS } from "./types";

const SETTINGS_FILE = "settings.json";

function getUserDataDir(userId: string): string {
  return path.join(process.cwd(), "data", "users", userId);
}

function getUserConversationsDir(userId: string): string {
  return path.join(getUserDataDir(userId), "conversations");
}

function getUserSettingsPath(userId: string): string {
  return path.join(getUserDataDir(userId), SETTINGS_FILE);
}

export async function getStorageDir(userId: string): Promise<string> {
  const dir = getUserConversationsDir(userId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function loadServerSettings(userId: string): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(getUserSettingsPath(userId), "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveServerSettings(userId: string, settings: AppSettings): Promise<void> {
  const settingsPath = getUserSettingsPath(userId);
  await fs.mkdir(path.dirname(settingsPath), { recursive: true });
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  const dir = await getStorageDir(userId);
  try {
    const files = await fs.readdir(dir);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));
    const conversations: Conversation[] = [];

    for (const file of jsonFiles) {
      try {
        const raw = await fs.readFile(path.join(dir, file), "utf-8");
        const conv: Conversation = JSON.parse(raw);
        conversations.push(conv);
      } catch {
        // skip corrupt files
      }
    }

    // sort by updatedAt descending
    conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    return conversations;
  } catch {
    return [];
  }
}

export async function getConversation(userId: string, id: string): Promise<Conversation | null> {
  const dir = await getStorageDir(userId);
  const filePath = path.join(dir, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveConversation(userId: string, conv: Conversation): Promise<void> {
  const dir = await getStorageDir(userId);
  const filePath = path.join(dir, `${conv.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(conv, null, 2), "utf-8");
}

export async function deleteConversation(userId: string, id: string): Promise<boolean> {
  const dir = await getStorageDir(userId);
  const filePath = path.join(dir, `${id}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
