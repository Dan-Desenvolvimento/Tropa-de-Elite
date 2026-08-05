"use client";

import { LoaderCircle, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function InviteStaffForm({
  events,
}: {
  events: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [globalRole, setGlobalRole] = useState<
    "admin" | "checkin_operator"
  >("checkin_operator");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    const passwordConfirmation = String(
      form.get("passwordConfirmation") ?? "",
    );

    if (password.length < 8) {
      setMessage("A senha inicial precisa ter pelo menos 8 caracteres.");
      setPending(false);
      return;
    }

    if (password !== passwordConfirmation) {
      setMessage("A confirmação da senha não coincide.");
      setPending(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.get("fullName"),
          email: form.get("email"),
          password,
          globalRole: form.get("globalRole"),
          eventId: form.get("eventId") || null,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      setMessage(
        result.success
          ? "Integrante criado. Envie o e-mail e a senha inicial por um canal seguro."
          : result.message ??
              "Não foi possível criar o integrante.",
      );

      if (result.success) {
        formElement.reset();
        setGlobalRole("checkin_operator");
        router.refresh();
      }
    } catch {
      setMessage(
        "Não foi possível conectar ao servidor. Tente novamente.",
      );
    } finally {
      setPending(false);
    }
  }

  const input =
    "mt-2 h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 text-sm text-white outline-none focus:border-red-500/60";

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 sm:grid-cols-2"
    >
      <label className="text-sm text-zinc-400">
        Nome completo
        <input
          name="fullName"
          required
          minLength={3}
          maxLength={120}
          autoComplete="name"
          className={input}
        />
      </label>

      <label className="text-sm text-zinc-400">
        E-mail de acesso
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={input}
        />
      </label>

      <label className="text-sm text-zinc-400">
        Senha inicial
        <input
          name="password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={input}
        />
      </label>

      <label className="text-sm text-zinc-400">
        Confirmar senha inicial
        <input
          name="passwordConfirmation"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          className={input}
        />
      </label>

      <label className="text-sm text-zinc-400">
        Perfil de acesso
        <select
          name="globalRole"
          value={globalRole}
          onChange={(event) =>
            setGlobalRole(
              event.target.value as
                | "admin"
                | "checkin_operator",
            )
          }
          className={input}
        >
          <option value="checkin_operator">
            Operador de check-in
          </option>
          <option value="admin">Administrador</option>
        </select>
      </label>

      <label className="text-sm text-zinc-400">
        {globalRole === "checkin_operator"
          ? "Evento de acesso"
          : "Evento inicial (opcional)"}
        <select
          name="eventId"
          required={globalRole === "checkin_operator"}
          className={input}
        >
          <option value="">
            {globalRole === "checkin_operator"
              ? "Selecione um evento"
              : "Todos pelo perfil administrador"}
          </option>
          {events.map((event) => (
            <option key={event.id} value={event.id}>
              {event.name}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white disabled:bg-zinc-800"
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <UserPlus className="size-4" />
          )}
          {pending ? "Criando acesso" : "Adicionar integrante"}
        </button>

        {message ? (
          <p
            role="status"
            className="max-w-2xl text-sm text-zinc-400"
          >
            {message}
          </p>
        ) : null}
      </div>

      <p className="text-xs leading-5 text-zinc-600 sm:col-span-2">
        A senha não fica visível nem armazenada no painel. Repasse as
        credenciais por um canal seguro. O integrante poderá alterar a
        senha em “Minha senha”.
      </p>
    </form>
  );
}
