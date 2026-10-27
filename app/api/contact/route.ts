import { NextResponse } from "next/server";
import { droppedAsSpam } from "@/lib/spam";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: FormDataEntryValue | null) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

export async function POST(request: Request) {
  const form = await request.formData();
  if (droppedAsSpam(form)) return NextResponse.json({ ok: true });

  const name = clean(form.get("name"));
  const email = clean(form.get("email"));
  const message = String(form.get("message") ?? "").trim();

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and a message are required." },
      { status: 400 },
    );
  }

  if (!EMAIL.test(email) || email.length > 320) {
    return NextResponse.json(
      { error: "That email address doesn’t look valid." },
      { status: 400 },
    );
  }

  if (name.length > 200 || message.length > 8000) {
    return NextResponse.json(
      { error: "That message is too long." },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !to) {
    return NextResponse.json(
      {
        error:
          "Contact email is not configured. Set RESEND_API_KEY and CONTACT_TO_EMAIL.",
      },
      { status: 503 },
    );
  }

  const from =
    process.env.CONTACT_FROM_EMAIL ||
    "Raphael ben Avraham <onboarding@resend.dev>";

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "torah-site",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `A note from ${name}`,
      text: `${message}\n\n— ${name}\n${email}`,
    }),
  });

  if (!sent.ok) {
    const detail = await sent.text();
    console.error("Resend error", sent.status, detail);
    return NextResponse.json(
      { error: "The message could not be sent. Try again in a little while." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
