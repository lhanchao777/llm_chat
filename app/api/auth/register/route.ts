import { NextRequest, NextResponse } from "next/server";
import {
  findUserByUsername,
  hashPassword,
  loadUsers,
  saveUsers,
  signToken,
  setTokenCookie,
  validateUsername,
  validatePassword,
} from "@/lib/auth";
import { migrateLegacyData } from "@/lib/migrate";
import { generateId } from "@/lib/utils";
import type { User } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const usernameError = validateUsername(username);
  if (usernameError) {
    return NextResponse.json({ error: usernameError }, { status: 400 });
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    return NextResponse.json({ error: passwordError }, { status: 400 });
  }

  const existing = await findUserByUsername(username);
  if (existing) {
    return NextResponse.json({ error: "用户名已被占用" }, { status: 409 });
  }

  const users = await loadUsers();
  const isFirstUser = users.length === 0;

  const user: User = {
    id: generateId(),
    username,
    passwordHash: await hashPassword(password),
    isAdmin: isFirstUser,
    tokenVersion: 0,
    createdAt: Date.now(),
  };

  users.push(user);
  await saveUsers(users);

  // Migrate legacy data for the first user
  if (isFirstUser) {
    await migrateLegacyData(user.id);
  }

  const token = await signToken(user);
  const { passwordHash, ...safeUser } = user;

  const res = NextResponse.json({ user: safeUser });
  res.headers.set("Set-Cookie", setTokenCookie(token));
  return res;
}
