import fs from "fs/promises";
import path from "path";
import { generateId } from "./utils";
import { hashPassword, loadUsers, saveUsers } from "./auth";
import type { User } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

/**
 * One-time migration: move legacy data (data/settings.json, data/conversations/)
 * into data/users/{adminId}/ for the first registered admin user.
 *
 * Called after admin account is created during registration.
 * Safe to call multiple times — skips if already migrated.
 */
export async function migrateLegacyData(adminId: string): Promise<void> {
  const legacySettings = path.join(DATA_DIR, "settings.json");
  const legacyConversations = path.join(DATA_DIR, "conversations");

  const adminDir = path.join(DATA_DIR, "users", adminId);
  const adminConvDir = path.join(adminDir, "conversations");

  // Check if legacy data exists
  const hasLegacySettings = await fileExists(legacySettings);
  const hasLegacyConvs = await dirExists(legacyConversations);

  if (!hasLegacySettings && !hasLegacyConvs) return;

  // Ensure admin directory exists
  await fs.mkdir(adminConvDir, { recursive: true });

  // Move settings
  if (hasLegacySettings) {
    const targetSettings = path.join(adminDir, "settings.json");
    if (!(await fileExists(targetSettings))) {
      await fs.rename(legacySettings, targetSettings);
    }
  }

  // Move conversations
  if (hasLegacyConvs) {
    try {
      const files = await fs.readdir(legacyConversations);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const src = path.join(legacyConversations, file);
        const dst = path.join(adminConvDir, file);
        if (!(await fileExists(dst))) {
          await fs.rename(src, dst);
        }
      }
      // Remove empty legacy directory
      await fs.rmdir(legacyConversations);
    } catch {
      // ignore errors during cleanup
    }
  }
}

/**
 * Create admin user from env vars or generate random credentials.
 * Returns the created user (or existing admin if already exists).
 */
export async function ensureAdmin(): Promise<User> {
  const users = await loadUsers();
  const existingAdmin = users.find((u) => u.isAdmin);
  if (existingAdmin) return existingAdmin;

  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || generateRandomPassword();

  // Check if username is taken
  const existing = users.find((u) => u.username === username);
  if (existing) {
    // Make existing user admin
    existing.isAdmin = true;
    await saveUsers(users);
    return existing;
  }

  const admin: User = {
    id: generateId(),
    username,
    passwordHash: await hashPassword(password),
    isAdmin: true,
    tokenVersion: 0,
    createdAt: Date.now(),
  };

  users.push(admin);
  await saveUsers(users);

  // Run data migration for admin
  await migrateLegacyData(admin.id);

  // Log credentials if auto-generated
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`\n[Auth] Admin account created:`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${password}`);
    console.log(`  (Set ADMIN_USERNAME and ADMIN_PASSWORD env vars to customize)\n`);
  }

  return admin;
}

function generateRandomPassword(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let result = "";
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
