import { NextResponse } from "next/server";
import { findDemoUser } from "@/lib/demo-users";
import { SESSION_COOKIE, encodeSession } from "@/lib/session";

/**
 * POST /api/auth/login  — DEV mock auth.
 * Replaced later by a call to the FastAPI backend (POST /api/auth/login → JWT).
 */
export async function POST(req: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  const user = findDemoUser(email, password);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid credentials." },
      { status: 401 },
    );
  }

  const res = NextResponse.json({
    ok: true,
    role: user.role,
    name: user.name,
    home: user.home,
  });
  res.cookies.set(
    SESSION_COOKIE,
    encodeSession({ email: user.email, role: user.role, name: user.name }),
    {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8h
    },
  );
  return res;
}
