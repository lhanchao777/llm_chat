import { NextRequest, NextResponse } from "next/server";
import {
  getTokenFromRequest,
  verifyToken,
  loadUsers,
  saveUsers,
  clearTokenCookie,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      // Invalidate token by incrementing version
      const users = await loadUsers();
      const user = users.find((u) => u.id === payload.userId);
      if (user) {
        user.tokenVersion += 1;
        await saveUsers(users);
      }
    }
  }

  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearTokenCookie());
  return res;
}
