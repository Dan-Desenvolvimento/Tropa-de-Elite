"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function TeamStatusButton({ userId, active }: { userId: string; active: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function toggle() {
    if (!window.confirm(active ? "Desativar o acesso deste usuário?" : "Reativar este usuário?")) return;
    setPending(true);
    await fetch(`/api/admin/team/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !active }) });
    setPending(false); router.refresh();
  }
  return <button onClick={toggle} disabled={pending} className="mt-2 text-xs text-zinc-600 underline underline-offset-2 hover:text-white disabled:opacity-50">{pending ? "Salvando…" : active ? "Desativar" : "Reativar"}</button>;
}
