import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import fs from "fs/promises";
import path from "path";
import { NextRequest } from "next/server";
import type { User } from "./types";

const COOKIE_NAME = "llm_chat_token";
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY = "30d";

// --- JWT secret management ---

let _jwtSecret: string | null = null;

async function getJwtSecret(): Promise<string> {
  if (_jwtSecret) return _jwtSecret;

  const envSecret = process.env.JWT_SECRET;
  if (envSecret) {
    _jwtSecret = envSecret;
    return envSecret;
  }

  // Auto-generate and persist a secret
  const secretFile = path.join(process.cwd(), "data", ".jwt-secret");
  try {
    _jwtSecret = await fs.readFile(secretFile, "utf-8");
  } catch {
    _jwtSecret = bcrypt.genSaltSync(24).replace(/\//g, "_");
    await fs.mkdir(path.dirname(secretFile), { recursive: true });
    await fs.writeFile(secretFile, _jwtSecret, "utf-8");
  }
  return _jwtSecret;
}

// --- Password utilities ---

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// --- JWT utilities ---

export interface JwtPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
  tokenVersion: number;
}

export async function signToken(user: User): Promise<string> {
  const secret = await getJwtSecret();
  const payload: JwtPayload = {
    userId: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    tokenVersion: user.tokenVersion,
  };
  return jwt.sign(payload, secret, { expiresIn: TOKEN_EXPIRY });
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const secret = await getJwtSecret();
    const decoded = jwt.verify(token, secret) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

// --- Cookie utilities ---

export function setTokenCookie(token: string): string {
  // Returns Set-Cookie header value
  const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearTokenCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function getTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(COOKIE_NAME)?.value ?? null;
}

// --- User store (users.json) ---

const USERS_FILE = "users.json";

function getUsersPath(): string {
  return path.join(process.cwd(), "data", USERS_FILE);
}

export async function loadUsers(): Promise<User[]> {
  try {
    const raw = await fs.readFile(getUsersPath(), "utf-8");
    return JSON.parse(raw) as User[];
  } catch {
    return [];
  }
}

export async function saveUsers(users: User[]): Promise<void> {
  await fs.mkdir(path.dirname(getUsersPath()), { recursive: true });
  await fs.writeFile(getUsersPath(), JSON.stringify(users, null, 2), "utf-8");
}

export async function findUserByUsername(
  username: string
): Promise<User | null> {
  const users = await loadUsers();
  return users.find((u) => u.username === username) ?? null;
}

export async function findUserById(userId: string): Promise<User | null> {
  const users = await loadUsers();
  return users.find((u) => u.id === userId) ?? null;
}

// --- High-level auth helper ---

export async function getAuthUser(req: NextRequest): Promise<User> {
  const token = getTokenFromRequest(req);
  if (!token) throw new AuthError("Not authenticated", 401);

  const payload = await verifyToken(token);
  if (!payload) throw new AuthError("Invalid token", 401);

  const user = await findUserById(payload.userId);
  if (!user) throw new AuthError("User not found", 401);

  // Check token version (for logout invalidation)
  if (user.tokenVersion !== payload.tokenVersion) {
    throw new AuthError("Token expired", 401);
  }

  return user;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

// --- Input validation ---

export function validateUsername(username: string): string | null {
  if (!username || username.length < 3 || username.length > 20) {
    return "用户名长度需在 3-20 个字符之间";
  }
  if (!/^[a-zA-Z0-9_\u4e00-\u9fff]+$/.test(username)) {
    return "用户名只能包含字母、数字、下划线或中文";
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password || password.length < 8) {
    return "密码长度至少 8 个字符";
  }
  return null;
}
