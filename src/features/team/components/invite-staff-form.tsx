"use client";

import {
  LoaderCircle,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  ACCESS_PRESETS,
  EMPTY_EVENT_PERMISSIONS,
  EVENT_PERMISSION_LABELS,
  type AccessPreset,
  type EventPermissionSet,
} from "@/lib/auth/permissions";

type EventOption = {
  id: string;
  name: string;
};

export function InviteStaffForm({
  events,
  canAssignOwner,
}: {
  events: EventOption[];
  canAssignOwner: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] =
    useState<string | null>(null);
  const [preset, setPreset] =
    useState<AccessPreset>("credentialing");
  const [isOwner, setIsOwner] = useState(false);
  const [
    canCreateEvents,
    setCanCreateEvents,
  ] = useState(false);
  const [canManageTeam, setCanManageTeam] =
    useState(false);
  const [
    eventPermissions,
    setEventPermissions,
  ] = useState<EventPermissionSet>({
    ...ACCESS_PRESETS.credentialing,
  });

  const selectedPresetPermissions = useMemo(
    () =>
      preset === "custom"
        ? null
        : ACCESS_PRESETS[preset],
    [preset],
  );

  function changePreset(value: string) {
    if (value === "owner") {
      setIsOwner(true);
      setCanCreateEvents(true);
      setCanManageTeam(true);
      setPreset("custom");
      setEventPermissions({
        ...EMPTY_EVENT_PERMISSIONS,
      });
      return;
    }

    const next = value as AccessPreset;
    setIsOwner(false);
    setPreset(next);

    if (next !== "custom") {
      setEventPermissions({
        ...ACCESS_PRESETS[next],
      });
    }
  }

  function toggleEventPermission(
    key: keyof EventPermissionSet,
  ) {
    setPreset("custom");
    setEventPermissions((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function submit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setPending(true);
    setMessage(null);

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(
      form.get("password") ?? "",
    );
    const passwordConfirmation = String(
      form.get("passwordConfirmation") ?? "",
    );

    if (password.length < 8) {
      setMessage(
        "A senha inicial precisa ter pelo menos 8 caracteres.",
      );
      setPending(false);
      return;
    }

    if (password !== passwordConfirmation) {
      setMessage(
        "A confirmação da senha não coincide.",
      );
      setPending(false);
      return;
    }

    try {
      const response = await fetch(
        "/api/admin/team/invite",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fullName: form.get("fullName"),
            email: form.get("email"),
            password,
            isOwner,
            canCreateEvents:
              isOwner || canCreateEvents,
            canManageTeam:
              isOwner || canManageTeam,
            eventId: isOwner
              ? null
              : form.get("eventId") || null,
            eventPermissions: isOwner
              ? {
                  ...EMPTY_EVENT_PERMISSIONS,
                }
              : eventPermissions,
          }),
        },
      );

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
        setPreset("credentialing");
        setIsOwner(false);
        setCanCreateEvents(false);
        setCanManageTeam(false);
        setEventPermissions({
          ...ACCESS_PRESETS.credentialing,
        });
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
        Perfil inicial
        <select
          value={isOwner ? "owner" : preset}
          onChange={(event) =>
            changePreset(event.target.value)
          }
          className={input}
        >
          <option value="credentialing">
            Credenciamento
          </option>
          <option value="service">
            Atendimento
          </option>
          <option value="analyst">
            Analista
          </option>
          <option value="event_manager">
            Gestor do evento
          </option>
          <option value="custom">
            Personalizado
          </option>
          {canAssignOwner ? (
            <option value="owner">
              Proprietário
            </option>
          ) : null}
        </select>
      </label>

      {!isOwner ? (
        <label className="text-sm text-zinc-400">
          Evento inicial
          <select
            name="eventId"
            required={
              !canCreateEvents &&
              !canManageTeam
            }
            className={input}
          >
            <option value="">
              Nenhum evento
            </option>
            {events.map((event) => (
              <option
                key={event.id}
                value={event.id}
              >
                {event.name}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100 sm:col-span-1">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4" />
            Acesso total
          </div>
          <p className="mt-1 text-xs leading-5 text-amber-100/70">
            Proprietários acessam todos os eventos,
            equipe e configurações.
          </p>
        </div>
      )}

      {canAssignOwner && !isOwner ? (
        <section className="rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:col-span-2">
          <h3 className="text-sm font-semibold text-white">
            Permissões gerais
          </h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <PermissionToggle
              checked={canCreateEvents}
              onChange={setCanCreateEvents}
              label="Criar eventos"
              description="Permite cadastrar novos eventos, sem acesso automático à equipe."
            />
            <PermissionToggle
              checked={canManageTeam}
              onChange={setCanManageTeam}
              label="Gerenciar equipe"
              description="Permite cadastrar e ajustar integrantes que não sejam proprietários."
            />
          </div>
        </section>
      ) : null}

      {!isOwner ? (
        <section className="rounded-xl border border-white/8 bg-white/[0.02] p-4 sm:col-span-2">
          <h3 className="text-sm font-semibold text-white">
            Permissões no evento inicial
          </h3>
          <p className="mt-1 text-xs text-zinc-600">
            Depois, você poderá liberar outros
            eventos na página do integrante.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {EVENT_PERMISSION_LABELS.map(
              (permission) => (
                <PermissionToggle
                  key={permission.key}
                  checked={
                    eventPermissions[permission.key]
                  }
                  onChange={() =>
                    toggleEventPermission(
                      permission.key,
                    )
                  }
                  label={permission.label}
                  description={
                    permission.description
                  }
                  disabled={
                    permission.sensitive &&
                    !canAssignOwner
                  }
                />
              ),
            )}
          </div>

          {selectedPresetPermissions ? (
            <p className="mt-3 text-xs text-zinc-700">
              Perfil aplicado automaticamente.
            </p>
          ) : null}
        </section>
      ) : null}

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
          {pending
            ? "Criando acesso"
            : "Adicionar integrante"}
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
        A senha não fica visível nem armazenada no
        painel. O integrante poderá alterá-la em
        “Minha senha”.
      </p>
    </form>
  );
}

function PermissionToggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex gap-3 rounded-xl border border-white/8 p-3 ${
        disabled
          ? "opacity-45"
          : "cursor-pointer hover:bg-white/[0.03]"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) =>
          onChange(event.target.checked)
        }
        className="mt-1 size-4 accent-red-600"
      />
      <span>
        <span className="block text-sm font-medium text-zinc-200">
          {label}
        </span>
        <span className="mt-1 block text-xs leading-5 text-zinc-600">
          {description}
        </span>
      </span>
    </label>
  );
}
