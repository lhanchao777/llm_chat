import { NextRequest, NextResponse } from "next/server";
import {
  findUserByUsername,
  verifyPassword,
  signToken,
  setTokenCookie,
} from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  if (!username || !password) {
    return NextResponse.json(
      { error: "请输入用户名和密码" },
      { status: 400 }
    );
  }

  const user = await findUserByUsername(username);
  if (!user) {
    return NextResponse.json(
      { error: "用户名或密码错误" },
      { status: 401 }
    );
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "用户名或密码错误" },
      { status: 401 }
    );
  }

  const token = await signToken(user);
  const { passwordHash, ...safeUser } = user;

  const res = NextResponse.json({ user: safeUser });
  res.headers.set("Set-Cookie", setTokenCookie(token));
  return res;
}
