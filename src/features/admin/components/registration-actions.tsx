"use client";

import {
  LoaderCircle,
  Mail,
  RotateCcw,
  ShieldX,
  UserX,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function RegistrationActions({
  eventId,
  registrationId,
  checkedIn,
  cancelled,
  canManage,
  canAnonymize,
}: {
  eventId: string;
  registrationId: string;
  checkedIn: boolean;
  cancelled: boolean;
  canManage: boolean;
  canAnonymize: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] =
    useState<string | null>(null);

  async function resend() {
    setPending("resend");

    const response = await fetch(
      `/api/admin/events/${eventId}/registrations/${registrationId}/resend`,
      { method: "POST" },
    );

    setPending(null);

    if (!response.ok) {
      window.alert(
        "Não foi possível reenviar o ingresso.",
      );
    }
  }

  async function mutate(
    action:
      | "cancel"
      | "undo_checkin"
      | "anonymize",
  ) {
    const message =
      action === "cancel"
        ? "Cancelar esta inscrição?"
        : action === "undo_checkin"
          ? "Desfazer este check-in?"
          : "Anonimizar permanentemente os dados pessoais desta inscrição? Esta ação não pode ser desfeita.";

    if (!window.confirm(message)) return;

    setPending(action);

    const response = await fetch(
      `/api/admin/events/${eventId}/registrations/${registrationId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      },
    );

    setPending(null);

    if (!response.ok) {
      window.alert(
        "A ação não foi autorizada ou não pôde ser concluída.",
      );
      return;
    }

    router.refresh();
  }

  if (!canManage && !canAnonymize) {
    return null;
  }

  if (pending) {
    return (
      <LoaderCircle className="size-4 animate-spin text-red-500" />
    );
  }

  return (
    <div className="flex items-center gap-1">
      {canManage && !cancelled ? (
        <button
          onClick={resend}
          title="Reenviar ingresso"
          className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white"
        >
          <Mail className="size-4" />
        </button>
      ) : null}

      {canManage && checkedIn ? (
        <button
          onClick={() =>
            void mutate("undo_checkin")
          }
          title="Desfazer check-in"
          className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-amber-400"
        >
          <RotateCcw className="size-4" />
        </button>
      ) : null}

      {canManage && !cancelled ? (
        <button
          onClick={() => void mutate("cancel")}
          title="Cancelar inscrição"
          className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-red-400"
        >
          <UserX className="size-4" />
        </button>
      ) : null}

      {canAnonymize ? (
        <button
          onClick={() =>
            void mutate("anonymize")
          }
          title="Anonimizar dados"
          className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-red-400"
        >
          <ShieldX className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
