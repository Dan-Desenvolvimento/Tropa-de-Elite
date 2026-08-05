"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TeamStatusButton({
  userId,
  active,
  disabled = false,
}: {
  userId: string;
  active: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (disabled) return;

    if (
      !window.confirm(
        active
          ? "Desativar o acesso deste usuário?"
          : "Reativar este usuário?",
      )
    ) {
      return;
    }

    setPending(true);

    const response = await fetch(
      `/api/admin/team/${userId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          active: !active,
        }),
      },
    );

    const result = (await response.json()) as {
      success: boolean;
      message?: string;
    };

    setPending(false);

    if (!response.ok || !result.success) {
      window.alert(
        result.message ??
          "Não foi possível alterar o acesso.",
      );
      return;
    }

    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={pending || disabled}
      className="mt-2 text-xs text-zinc-600 underline underline-offset-2 hover:text-white disabled:no-underline disabled:opacity-40"
    >
      {pending
        ? "Salvando…"
        : disabled
          ? "Somente proprietário"
          : active
            ? "Desativar"
            : "Reativar"}
    </button>
  );
}
