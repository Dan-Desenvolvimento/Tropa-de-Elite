"use client";

import { LoaderCircle, Mail, RotateCcw, ShieldX, UserX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegistrationActions({
  eventId,
  registrationId,
  checkedIn,
  cancelled,
}: {
  eventId: string;
  registrationId: string;
  checkedIn: boolean;
  cancelled: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  async function resend() {
    setPending("resend");
    await fetch(`/api/admin/events/${eventId}/registrations/${registrationId}/resend`, { method: "POST" });
    setPending(null);
  }

  async function mutate(action: "cancel" | "undo_checkin" | "anonymize") {
    const message = action === "cancel" ? "Cancelar esta inscrição?" : action === "undo_checkin" ? "Desfazer este check-in?" : "Anonimizar permanentemente os dados pessoais desta inscrição? Esta ação não pode ser desfeita.";
    if (!window.confirm(message)) return;
    setPending(action);
    await fetch(`/api/admin/events/${eventId}/registrations/${registrationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setPending(null);
    router.refresh();
  }

  if (pending) return <LoaderCircle className="size-4 animate-spin text-red-500" />;

  return (
    <div className="flex items-center gap-1">
      {!cancelled ? <button onClick={resend} title="Reenviar ingresso" className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white"><Mail className="size-4" /></button> : null}
      {checkedIn ? <button onClick={() => void mutate("undo_checkin")} title="Desfazer check-in" className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-amber-400"><RotateCcw className="size-4" /></button> : null}
      {!cancelled ? <button onClick={() => void mutate("cancel")} title="Cancelar inscrição" className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-red-400"><UserX className="size-4" /></button> : null}
      <button onClick={() => void mutate("anonymize")} title="Anonimizar dados" className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-red-400"><ShieldX className="size-4" /></button>
    </div>
  );
}
