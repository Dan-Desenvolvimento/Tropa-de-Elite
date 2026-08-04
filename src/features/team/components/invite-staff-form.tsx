"use client";

import { LoaderCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function InviteStaffForm({ events }: { events: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [debugInvitePath, setDebugInvitePath] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setDebugInvitePath(null);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"), email: form.get("email"),
          globalRole: form.get("globalRole"), eventId: form.get("eventId") || null,
          eventRole: form.get("eventRole"),
        }),
      });
      const result = (await response.json()) as { success: boolean; message?: string; debugInvitePath?: string };
      setMessage(result.success ? "Convite enviado com sucesso." : result.message ?? "Não foi possível enviar o convite.");
      setDebugInvitePath(result.debugInvitePath ?? null);
      if (result.success) {
        formElement.reset();
        router.refresh();
      }
    } catch {
      setMessage("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  const input = "mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-red-500/60";
  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm text-zinc-400">Nome completo<input name="fullName" required className={input} /></label>
      <label className="text-sm text-zinc-400">E-mail<input name="email" type="email" required className={input} /></label>
      <label className="text-sm text-zinc-400">Papel global<select name="globalRole" className={input}><option value="checkin_operator">Operador de check-in</option><option value="admin">Administrador</option></select></label>
      <label className="text-sm text-zinc-400">Evento inicial<select name="eventId" className={input}><option value="">Nenhum</option>{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
      <input type="hidden" name="eventRole" value="checkin_operator" />
      <div className="sm:col-span-2 flex flex-wrap items-center gap-4"><button disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white disabled:bg-zinc-800">{pending ? <LoaderCircle className="size-4 animate-spin" /> : <UserPlus className="size-4" />}{pending ? "Enviando" : "Enviar convite"}</button>{message ? <p className="text-sm text-zinc-400">{message}</p> : null}{debugInvitePath ? <a href={debugInvitePath} className="text-sm font-semibold text-red-400 underline">Abrir convite local</a> : null}</div>
    </form>
  );
}
