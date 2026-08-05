"use client";

import {
  LoaderCircle,
  Save,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  ACCESS_PRESETS,
  EMPTY_EVENT_PERMISSIONS,
  EVENT_PERMISSION_LABELS,
  type AccessPreset,
  type EventPermissionSet,
} from "@/lib/auth/permissions";

type EventAccess = {
  eventId: string;
  eventName: string;
  permissions: EventPermissionSet;
};

type TargetProfile = {
  id: string;
  fullName: string;
  email: string | null;
  isOwner: boolean;
  canCreateEvents: boolean;
  canManageTeam: boolean;
};

export function TeamPermissionsForm({
  target,
  initialEvents,
  currentUserIsOwner,
}: {
  target: TargetProfile;
  initialEvents: EventAccess[];
  currentUserIsOwner: boolean;
}) {
  const router = useRouter();
  const [isOwner, setIsOwner] =
    useState(target.isOwner);
  const [
    canCreateEvents,
    setCanCreateEvents,
  ] = useState(target.canCreateEvents);
  const [canManageTeam, setCanManageTeam] =
    useState(target.canManageTeam);
  const [events, setEvents] =
    useState(initialEvents);
  const [pending, setPending] = useState(false);
  const [message, setMessage] =
    useState<string | null>(null);

  const hasAnyEventAccess = useMemo(
    () =>
      events.some((event) =>
        Object.values(event.permissions).some(
          Boolean,
        ),
      ),
    [events],
  );

  function updateEventPermission(
    eventId: string,
    key: keyof EventPermissionSet,
    value: boolean,
  ) {
    setEvents((current) =>
      current.map((event) =>
        event.eventId === eventId
          ? {
              ...event,
              permissions: {
                ...event.permissions,
                [key]: value,
              },
            }
          : event,
      ),
    );
  }

  function applyPreset(
    eventId: string,
    value: string,
  ) {
    if (value === "none") {
      setEvents((current) =>
        current.map((event) =>
          event.eventId === eventId
            ? {
                ...event,
                permissions: {
                  ...EMPTY_EVENT_PERMISSIONS,
                },
              }
            : event,
        ),
      );
      return;
    }

    if (value === "custom") return;

    const preset =
      ACCESS_PRESETS[
        value as Exclude<
          AccessPreset,
          "custom"
        >
      ];

    setEvents((current) =>
      current.map((event) =>
        event.eventId === eventId
          ? {
              ...event,
              permissions: { ...preset },
            }
          : event,
      ),
    );
  }

  async function save() {
    setPending(true);
    setMessage(null);

    const response = await fetch(
      `/api/admin/team/${target.id}/permissions`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isOwner,
          canCreateEvents:
            isOwner || canCreateEvents,
          canManageTeam:
            isOwner || canManageTeam,
          eventPermissions: isOwner
            ? []
            : events.map((event) => ({
                eventId: event.eventId,
                ...event.permissions,
              })),
        }),
      },
    );

    const result = (await response.json()) as {
      success: boolean;
      message?: string;
    };

    setPending(false);
    setMessage(
      result.success
        ? "Permissões atualizadas com sucesso."
        : result.message ??
            "Não foi possível salvar as permissões.",
    );

    if (result.success) {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-500">
              Integrante
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              {target.fullName}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              {target.email ??
                "E-mail não localizado"}
            </p>
          </div>

          {currentUserIsOwner ? (
            <label className="flex max-w-sm cursor-pointer gap-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <input
                type="checkbox"
                checked={isOwner}
                onChange={(event) =>
                  setIsOwner(
                    event.target.checked,
                  )
                }
                className="mt-1 size-4 accent-amber-500"
              />
              <span>
                <span className="flex items-center gap-2 text-sm font-semibold text-amber-200">
                  <ShieldCheck className="size-4" />
                  Proprietário
                </span>
                <span className="mt-1 block text-xs leading-5 text-amber-100/65">
                  Acesso total a todos os eventos,
                  equipe e permissões.
                </span>
              </span>
            </label>
          ) : null}
        </div>
      </section>

      {!isOwner ? (
        <>
          <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
            <h2 className="font-semibold text-white">
              Permissões gerais
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              Essas permissões não concedem acesso
              automático aos eventos existentes.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <PermissionToggle
                checked={canCreateEvents}
                onChange={setCanCreateEvents}
                label="Criar eventos"
                description="Pode cadastrar um novo evento. O criador recebe acesso de gestor ao evento criado."
                disabled={!currentUserIsOwner}
              />
              <PermissionToggle
                checked={canManageTeam}
                onChange={setCanManageTeam}
                label="Gerenciar equipe"
                description="Pode cadastrar e ajustar integrantes que não sejam proprietários."
                disabled={!currentUserIsOwner}
              />
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="font-semibold text-white">
                Permissões por evento
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Um integrante pode ter funções
                diferentes em cada evento.
              </p>
            </div>

            {events.map((event) => (
              <article
                key={event.eventId}
                className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="font-semibold text-white">
                    {event.eventName}
                  </h3>

                  <select
                    aria-label={`Perfil em ${event.eventName}`}
                    defaultValue="custom"
                    onChange={(selectEvent) =>
                      applyPreset(
                        event.eventId,
                        selectEvent.target.value,
                      )
                    }
                    className="h-10 rounded-xl border border-white/10 bg-[#111114] px-3 text-xs text-zinc-300"
                  >
                    <option value="custom">
                      Personalizado
                    </option>
                    <option value="none">
                      Sem acesso
                    </option>
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
                  </select>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {EVENT_PERMISSION_LABELS.map(
                    (permission) => (
                      <PermissionToggle
                        key={permission.key}
                        checked={
                          event.permissions[
                            permission.key
                          ]
                        }
                        onChange={(value) =>
                          updateEventPermission(
                            event.eventId,
                            permission.key,
                            value,
                          )
                        }
                        label={permission.label}
                        description={
                          permission.description
                        }
                        disabled={
                          permission.sensitive &&
                          !currentUserIsOwner
                        }
                      />
                    ),
                  )}
                </div>
              </article>
            ))}

            {!hasAnyEventAccess ? (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
                Este integrante ficará sem acesso a
                eventos. Isso é permitido quando ele
                possui somente uma permissão geral.
              </div>
            ) : null}
          </section>
        </>
      ) : (
        <section className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 text-sm text-amber-100">
          Proprietários não precisam de permissões
          individuais. Eles possuem acesso total e
          automático a todos os eventos.
        </section>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-white/8 pt-5">
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-bold text-white hover:bg-red-500 disabled:bg-zinc-800"
        >
          {pending ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {pending
            ? "Salvando"
            : "Salvar permissões"}
        </button>

        {message ? (
          <p
            role="status"
            className="text-sm text-zinc-400"
          >
            {message}
          </p>
        ) : null}
      </div>
    </div>
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
