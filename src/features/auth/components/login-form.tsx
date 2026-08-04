"use client";

import { LoaderCircle, LockKeyhole } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const formData = new FormData(event.currentTarget);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: String(formData.get("email") ?? "").trim().toLowerCase(),
        password: String(formData.get("password") ?? ""),
      });

      if (signInError) {
        const invalidCredentials =
          signInError.code === "invalid_credentials" || signInError.status === 400;
        setError(
          invalidCredentials
            ? "E-mail ou senha inválidos."
            : "Não foi possível conectar ao serviço de autenticação. Tente novamente.",
        );
        return;
      }

      const requestedPath = searchParams.get("next");
      const safePath = requestedPath?.startsWith("/admin") ? requestedPath : "/admin";
      router.replace(safePath);
      router.refresh();
    } catch {
      setError("Não foi possível entrar agora. Tente novamente.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm font-medium text-zinc-300">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-white outline-none focus:border-red-500/70 focus:ring-2 focus:ring-red-500/15"
        />
      </label>
      <label className="block text-sm font-medium text-zinc-300">
        Senha
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-white outline-none focus:border-red-500/70 focus:ring-2 focus:ring-red-500/15"
        />
      </label>
      {error ? (
        <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-red-600 px-6 py-4 text-sm font-bold uppercase tracking-[0.08em] text-white transition hover:bg-red-500 disabled:bg-zinc-800"
      >
        {pending ? <LoaderCircle className="size-5 animate-spin" /> : <LockKeyhole className="size-5" />}
        {pending ? "Entrando" : "Entrar no painel"}
      </button>
    </form>
  );
}
