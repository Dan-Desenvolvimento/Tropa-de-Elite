"use client";

import { Mail, LoaderCircle } from "lucide-react";
import { useState } from "react";

export function EventReminderButton({ eventId, available }: { eventId: string; available: boolean }) {
  const [pending, setPending] = useState(false);
  async function send() {
    if (!window.confirm("Enviar o novo lembrete para todos os inscritos confirmados?")) return;
    setPending(true);
    const response = await fetch(`/api/admin/events/${eventId}/reminder`, { method: "POST" });
    const body = await response.json().catch(() => null);
    setPending(false);
    window.alert(response.ok ? "Lembretes enfileirados para envio." : (body?.message ?? "Não foi possível enviar o lembrete."));
  }
  return (
    <button type="button" onClick={() => void send()} disabled={!available || pending} title={available ? "Enviar lembrete para os inscritos" : "Disponível nas 48 horas anteriores ao evento"} className="inline-flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-3 text-sm font-semibold text-red-300 enabled:hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40">
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Mail className="size-4" />}
      {available ? "Enviar lembrete" : "Lembrete em breve"}
    </button>
  );
}
