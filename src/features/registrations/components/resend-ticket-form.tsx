"use client";

import { LoaderCircle, MailCheck } from "lucide-react";
import { FormEvent, useState } from "react";

const neutralMessage =
  "Caso exista uma inscrição vinculada a este e-mail, enviaremos novamente o ingresso.";

export function ResendTicketForm({ eventSlug }: { eventSlug: string }) {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    try {
      await fetch(`/api/events/${encodeURIComponent(eventSlug)}/resend-ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMessage(neutralMessage);
    } catch {
      setMessage("Não foi possível processar sua solicitação agora. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm font-medium text-zinc-300">
        E-mail utilizado na inscrição
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="voce@exemplo.com"
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500/70 focus:ring-2 focus:ring-red-500/15"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-4 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-800"
      >
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : <MailCheck className="size-5" />}
        {pending ? "Processando" : "Reenviar ingresso"}
      </button>

      {message ? (
        <div role="status" className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-200">
          {message}
        </div>
      ) : null}
    </form>
  );
}
