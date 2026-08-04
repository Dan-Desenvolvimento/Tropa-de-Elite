"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function SetPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password.length < 8) { setError("A senha precisa ter pelo menos 8 caracteres."); setPending(false); return; }
    if (password !== confirmation) { setError("As senhas não coincidem."); setPending(false); return; }
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError("Não foi possível definir a senha."); setPending(false); return; }
    router.replace("/admin"); router.refresh();
  }

  const input = "mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-white outline-none focus:border-red-500/70";
  return <form onSubmit={submit} className="space-y-5"><label className="block text-sm text-zinc-300">Nova senha<input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} /></label><label className="block text-sm text-zinc-300">Confirmar senha<input name="confirmation" type="password" required minLength={8} autoComplete="new-password" className={input} /></label>{error ? <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</div> : null}<button disabled={pending} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-bold text-white disabled:bg-zinc-800">{pending ? <LoaderCircle className="size-5 animate-spin" /> : <Save className="size-5" />}{pending ? "Salvando" : "Definir senha"}</button></form>;
}
