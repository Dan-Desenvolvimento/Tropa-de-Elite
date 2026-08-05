"use client";

import { KeyRound, LoaderCircle } from "lucide-react";
import { FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const currentPassword = String(
      form.get("currentPassword") ?? "",
    );
    const newPassword = String(
      form.get("newPassword") ?? "",
    );
    const confirmation = String(
      form.get("confirmation") ?? "",
    );

    if (newPassword.length < 8) {
      setError(
        "A nova senha precisa ter pelo menos 8 caracteres.",
      );
      setPending(false);
      return;
    }

    if (newPassword !== confirmation) {
      setError("A confirmação da nova senha não coincide.");
      setPending(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError("Escolha uma senha diferente da senha atual.");
      setPending(false);
      return;
    }

    try {
      const supabase = createClient();
      const { error: updateError } =
        await supabase.auth.updateUser({
          password: newPassword,
          current_password: currentPassword,
        });

      if (updateError) {
        setError(
          "Não foi possível alterar a senha. Confira a senha atual e tente novamente.",
        );
        return;
      }

      formElement.reset();
      setSuccess("Senha alterada com sucesso.");
    } catch {
      setError(
        "Não foi possível alterar a senha agora. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  const input =
    "mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-white outline-none focus:border-red-500/70 focus:ring-2 focus:ring-red-500/15";

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block text-sm font-medium text-zinc-300">
        Senha atual
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className={input}
        />
      </label>

      <label className="block text-sm font-medium text-zinc-300">
        Nova senha
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={input}
        />
      </label>

      <label className="block text-sm font-medium text-zinc-300">
        Confirmar nova senha
        <input
          name="confirmation"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={input}
        />
      </label>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200"
        >
          {error}
        </div>
      ) : null}

      {success ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200"
        >
          {success}
        </div>
      ) : null}

      <button
        disabled={pending}
        className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white transition hover:bg-red-500 disabled:bg-zinc-800"
      >
        {pending ? (
          <LoaderCircle className="size-5 animate-spin" />
        ) : (
          <KeyRound className="size-5" />
        )}
        {pending ? "Alterando senha" : "Alterar minha senha"}
      </button>
    </form>
  );
}
