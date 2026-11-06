"use client";

import { useState } from "react";
import type { FormEvent } from "react";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setState("sending"); setError("");
    try {
      const response = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) });
      const data = await response.json().catch(() => ({})) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Your message couldn't be sent. Please message us on WhatsApp.");
      setState("sent");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your message couldn't be sent. Please message us on WhatsApp."); setState("idle"); }
  }
  if (state === "sent") return <p className="contact-sent" role="status">Thank you. We&apos;ve received your message and will reply soon.</p>;
  return <form className="contact-form" onSubmit={event => void submit(event)}>
    <h2>Send us a message</h2>
    <label>Name<input name="name" required minLength={2} maxLength={120} autoComplete="name" /></label>
    <label>Email<input name="email" type="email" required maxLength={190} autoComplete="email" /></label>
    <label>Phone (optional)<input name="phone" type="tel" maxLength={20} autoComplete="tel" /></label>
    <label>Message<textarea name="message" required minLength={5} maxLength={2000} rows={5} /></label>
    <input className="contact-trap" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />
    {error && <p className="contact-error" role="alert">{error}</p>}
    <button type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send message"}</button>
  </form>;
}
