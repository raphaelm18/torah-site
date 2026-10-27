import { NextResponse } from "next/server";
import { droppedAsSpam } from "@/lib/spam";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function resend(path: string, init?: RequestInit) {
  const apiKey = process.env.RESEND_API_KEY ?? "";
  return fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "torah-site",
      ...(init?.headers ?? {}),
    },
  });
}

export async function POST(request: Request) {
  const form = await request.formData();
  if (droppedAsSpam(form)) return NextResponse.json({ ok: true });

  const email = String(form.get("email") ?? "")
    .replace(/[\r\n]+/g, "")
    .trim()
    .toLowerCase();

  if (!EMAIL.test(email) || email.length > 320) {
    return NextResponse.json(
      { error: "That email address doesn’t look valid." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const segmentId = process.env.RESEND_SEGMENT_ID;
  if (!apiKey || !segmentId) {
    return NextResponse.json(
      {
        error:
          "Email signup is not configured. Set RESEND_API_KEY and RESEND_SEGMENT_ID.",
      },
      { status: 503 },
    );
  }

  const created = await resend("/contacts", {
    method: "POST",
    body: JSON.stringify({ email, unsubscribed: false }),
  });
  if (!created.ok && created.status !== 409) {
    console.error("Resend contact error", created.status, await created.text());
    return NextResponse.json(
      { error: "The signup could not be saved. Try again in a little while." },
      { status: 502 },
    );
  }

  const added = await resend(
    `/contacts/${encodeURIComponent(email)}/segments/${segmentId}`,
    { method: "POST" },
  );
  if (!added.ok && added.status !== 409) {
    console.error("Resend segment error", added.status, await added.text());
    return NextResponse.json(
      { error: "The signup could not be saved. Try again in a little while." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
