"use client";

import { useState, type FormEvent } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

function draftFor(postTitle?: string) {
  const title = postTitle?.trim().slice(0, 200);
  return title ? `Thoughts on “${title}”:\n\n` : "";
}

export function ContactForm({
  postTitle,
  loadedAt,
}: {
  postTitle?: string;
  loadedAt: number;
}) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [message, setMessage] = useState(() => draftFor(postTitle));

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus({ kind: "sending" });

    const response = await fetch("/api/contact", {
      method: "POST",
      body: new FormData(form),
      headers: { Accept: "application/json" },
    });

    if (response.ok) {
      setStatus({ kind: "sent" });
      setMessage("");
      return;
    }

    const body = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    setStatus({
      kind: "error",
      message: body?.error || "The message could not be sent.",
    });
  }

  if (status.kind === "sent") {
    return (
      <p className="form-note" role="status">
        Sent. Thank you.
      </p>
    );
  }

  return (
    <form className="fields" onSubmit={onSubmit}>
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
      </div>
      <input type="hidden" name="loadedAt" value={String(loadedAt)} />

      <label>
        <span className="kicker">Name</span>
        <input name="name" type="text" required autoComplete="name" maxLength={200} />
      </label>
      <label>
        <span className="kicker">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={320}
        />
      </label>
      <label>
        <span className="kicker">Message</span>
        <textarea
          name="message"
          required
          maxLength={8000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
      </label>

      {status.kind === "error" ? (
        <p className="form-note error" role="alert">
          {status.message}
        </p>
      ) : null}

      <button className="send" type="submit" disabled={status.kind === "sending"}>
        {status.kind === "sending" ? "Sending" : "Send"}
      </button>
    </form>
  );
}
