"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

export function SubscribeForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const stamp = useRef<HTMLInputElement>(null);
  const opened = useRef(0);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    opened.current = Date.now();
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stamp.current) stamp.current.value = String(opened.current);
    setStatus("sending");
    setError("");
    const response = await fetch("/api/subscribe", {
      method: "POST",
      body: new FormData(event.currentTarget),
      headers: { Accept: "application/json" },
    });
    if (response.ok) {
      setStatus("sent");
      setEmail("");
      return;
    }
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setStatus("error");
    setError(body?.error || "The signup could not be saved.");
  }

  if (status === "sent") {
    return (
      <p className="form-note" role="status">
        You’re signed up. New pieces will come by email.
      </p>
    );
  }

  return (
    <form className={compact ? "subscribe" : "fields"} onSubmit={onSubmit}>
      <div className="hp" aria-hidden="true">
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <input ref={stamp} type="hidden" name="loadedAt" defaultValue="" />
      <label className={compact ? "subscribe-email" : undefined}>
        <span className="kicker">New pieces by email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </label>
      {error ? (
        <p className="form-note error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="send" type="submit" disabled={status === "sending"}>
        {status === "sending" ? "Sending" : "Subscribe"}
      </button>
    </form>
  );
}
