import fs from "fs/promises";
import path from "path";
import { Conversation, AppSettings, DEFAULT_SETTINGS } from "./types";

const SETTINGS_FILE = "settings.json";

function getDefaultDataDir(): string {
  return path.join(process.cwd(), "data", "conversations");
}

function getSettingsPath(): string {
  return path.join(process.cwd(), "data", SETTINGS_FILE);
}

export async function getStorageDir(customPath?: string): Promise<string> {
  const dir = customPath || getDefaultDataDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function loadServerSettings(): Promise<AppSettings> {
  try {
    const raw = await fs.readFile(getSettingsPath(), "utf-8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveServerSettings(settings: AppSettings): Promise<void> {
  const dir = path.dirname(getSettingsPath());
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), "utf-8");
}

export async function listConversations(storagePath?: string): Promise<Conversation[]> {
  const dir = await getStorageDir(storagePath);
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

export async function getConversation(id: string, storagePath?: string): Promise<Conversation | null> {
  const dir = await getStorageDir(storagePath);
  const filePath = path.join(dir, `${id}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveConversation(conv: Conversation, storagePath?: string): Promise<void> {
  const dir = await getStorageDir(storagePath);
  const filePath = path.join(dir, `${conv.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(conv, null, 2), "utf-8");
}

export async function deleteConversation(id: string, storagePath?: string): Promise<boolean> {
  const dir = await getStorageDir(storagePath);
  const filePath = path.join(dir, `${id}.json`);
  try {
    await fs.unlink(filePath);
    return true;
  } catch {
    return false;
  }
}
