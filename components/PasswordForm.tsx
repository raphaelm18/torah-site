"use client";

import { useState, type FormEvent } from "react";

export function PasswordForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const response = await fetch("/api/edit/login", {
      method: "POST",
      body: new FormData(event.currentTarget),
      headers: { Accept: "application/json" },
    });
    const body = (await response.json().catch(() => null)) as {
      error?: string;
      next?: string;
    } | null;
    if (!response.ok) {
      setPending(false);
      setError(body?.error || "Could not sign in.");
      return;
    }
    window.location.href = body?.next || next;
  }

  return (
    <form className="fields" onSubmit={onSubmit}>
      <input type="hidden" name="next" value={next} />
      <label>
        <span className="kicker">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      {error ? (
        <p className="form-note error" role="alert">
          {error}
        </p>
      ) : null}
      <button className="send" type="submit" disabled={pending}>
        {pending ? "Checking" : "Enter"}
      </button>
    </form>
  );
}
