"use client";

import { LoaderCircle, UserRoundCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function WaitlistPromotionButton({
  eventId,
  promotionCount,
}: {
  eventId: string;
  promotionCount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function promote() {
    const message = `${promotionCount} ${promotionCount === 1 ? "participante será promovido" : "participantes serão promovidos"} por ordem de inscrição e receberão o ingresso por e-mail. Continuar?`;
    if (!window.confirm(message)) return;

    setPending(true);
    const response = await fetch(`/api/admin/events/${eventId}/waitlist/promote`, { method: "POST" });
    const body = await response.json().catch(() => null) as
      | { success: true; data: { promoted: number; remainingWaitlist: number } }
      | { success: false; message: string }
      | null;
    setPending(false);

    if (!response.ok || !body?.success) {
      window.alert(body && !body.success ? body.message : "Não foi possível promover a lista de espera.");
      return;
    }

    window.alert(`${body.data.promoted} ${body.data.promoted === 1 ? "participante promovido" : "participantes promovidos"}. Os e-mails de confirmação foram enfileirados.`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void promote()}
      disabled={pending || promotionCount < 1}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <UserRoundCheck className="size-4" />}
      {pending ? "Promovendo" : `Confirmar ${promotionCount} da espera`}
    </button>
  );
}
