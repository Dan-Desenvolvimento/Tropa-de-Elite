"use client";

import { LoaderCircle, MessageCircle } from "lucide-react";
import { useState } from "react";

export function WhatsAppReminderButton({
  eventId,
  disabled = false,
  disabledReason,
}: {
  eventId: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [pending, setPending] = useState(false);

  async function send() {
    if (!window.confirm("Enviar agora o lembrete com o link individual do ingresso pelo WhatsApp para todos os inscritos confirmados que aceitaram comunicações?")) return;
    setPending(true);
    const response = await fetch(`/api/admin/events/${eventId}/whatsapp-reminder`, { method: "POST" });
    const body = await response.json().catch(() => null) as { message?: string; data?: { eligible?: number } } | null;
    setPending(false);
    window.alert(response.ok ? `Envio iniciado para ${body?.data?.eligible ?? 0} contatos. Acompanhe o histórico do evento.` : (body?.message ?? "Não foi possível iniciar o envio."));
  }

  return (
    <button type="button" onClick={() => void send()} disabled={disabled || pending} title={disabled ? disabledReason : "Enviar agora para os inscritos elegíveis"} className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:opacity-40">
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <MessageCircle className="size-4" />}
      Enviar WhatsApp
    </button>
  );
}
