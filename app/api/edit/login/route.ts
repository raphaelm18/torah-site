import { NextResponse } from "next/server";
import {
  EDIT_COOKIE,
  editingConfigured,
  passwordMatches,
  sessionToken,
} from "@/lib/edit-auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/writing");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/writing";

  if (!editingConfigured()) {
    return NextResponse.json(
      { error: "Editing is not configured. Set EDIT_PASSWORD." },
      { status: 503 },
    );
  }

  if (!passwordMatches(password)) {
    return NextResponse.json(
      { error: "That password doesn’t match." },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ ok: true, next: safeNext });
  response.cookies.set(EDIT_COOKIE, sessionToken(), {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
