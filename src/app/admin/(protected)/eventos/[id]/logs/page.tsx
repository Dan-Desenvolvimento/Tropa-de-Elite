import Link from "next/link";
import { notFound } from "next/navigation";
import { History, Search } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { getEventPermissionSet } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/date-time";
import { createAdminClient } from "@/lib/supabase/admin";

type AuditRow = {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const actionLabels: Record<string, string> = {
  event_created: "Evento criado",
  event_updated: "Evento atualizado",
  registration_cancelled: "Inscrição cancelada",
  registration_anonymized: "Dados anonimizados",
  ticket_resent: "Ingresso reenviado",
  checkin_manual: "Check-in manual",
  checkin_removed: "Check-in desfeito",
  staff_created_with_password: "Integrante criado",
  staff_permissions_updated: "Permissões atualizadas",
  staff_activated: "Usuário ativado",
  staff_deactivated: "Usuário desativado",
  registrations_exported: "Participantes exportados",
  public_ticket_resend_requested:
    "Reenvio solicitado pelo participante",
};

export default async function EventLogsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string;
    action?: string;
  }>;
}) {
  const [{ id }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  const permissions =
    await getEventPermissionSet(id);

  if (!permissions.canViewLogs) notFound();

  const page = Math.max(
    1,
    Number(query.page ?? "1") || 1,
  );
  const pageSize = 30;
  const action =
    typeof query.action === "string" &&
    query.action.length <= 80
      ? query.action
      : "";
  const supabase = createAdminClient();

  let logsQuery = supabase
    .from("audit_logs")
    .select(
      "id,actor_id,action,entity_type,entity_id,metadata,created_at",
      { count: "exact" },
    )
    .eq("event_id", id)
    .order("created_at", { ascending: false })
    .range(
      (page - 1) * pageSize,
      page * pageSize - 1,
    );

  if (action) {
    logsQuery = logsQuery.eq("action", action);
  }

  const [
    { data: event },
    { data, count, error },
  ] = await Promise.all([
    supabase
      .from("events")
      .select("name,timezone")
      .eq("id", id)
      .maybeSingle<{
        name: string;
        timezone: string;
      }>(),
    logsQuery,
  ]);

  if (!event || error) notFound();

  const logs = (data ?? []) as AuditRow[];
  const actorIds = [
    ...new Set(
      logs
        .map((log) => log.actor_id)
        .filter(
          (value): value is string =>
            Boolean(value),
        ),
    ),
  ];

  const { data: profiles } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", actorIds)
    : {
        data: [] as Array<{
          id: string;
          full_name: string;
        }>,
      };

  const actorNames = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      profile.full_name,
    ]),
  );
  const total = count ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(total / pageSize),
  );

  return (
    <main>
      <PageHeader
        eyebrow="Auditoria"
        title={event.name}
        description={`${total.toLocaleString(
          "pt-BR",
        )} ações administrativas registradas.`}
        actions={
          permissions.canEditEvent ? (
            <Link
              href={`/admin/eventos/${id}`}
              className="rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
            >
              Voltar ao evento
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-5 p-5 sm:p-8 lg:p-10">
        <form className="flex max-w-xl gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
            <select
              name="action"
              defaultValue={action}
              aria-label="Filtrar ação"
              className="h-11 w-full rounded-xl border border-white/10 bg-[#111114] pl-10 pr-3 text-sm text-zinc-300"
            >
              <option value="">
                Todas as ações
              </option>
              {Object.entries(actionLabels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </div>
          <button className="rounded-xl bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/15">
            Filtrar
          </button>
        </form>

        <div className="overflow-hidden rounded-2xl border border-white/8">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-col gap-3 border-b border-white/8 bg-white/[0.015] p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                  <History className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-white">
                    {actionLabels[log.action] ??
                      log.action}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {log.actor_id
                      ? actorNames.get(log.actor_id) ??
                        "Usuário da equipe"
                      : "Sistema / participante"}

                    {log.entity_type ===
                      "registration" &&
                    log.entity_id &&
                    (
                      permissions.canViewRegistrations ||
                      permissions.canManageRegistrations ||
                      permissions.canAnonymizeRegistrations
                    ) ? (
                      <>
                        {" "}
                        ·{" "}
                        <Link
                          href={`/admin/eventos/${id}/inscritos/${log.entity_id}`}
                          className="text-zinc-300 hover:text-red-400"
                        >
                          ver participante
                        </Link>
                      </>
                    ) : null}
                  </p>
                  <AuditDetails
                    metadata={log.metadata}
                  />
                </div>
              </div>
              <time
                className="shrink-0 text-xs text-zinc-600"
                dateTime={log.created_at}
              >
                {formatDateTime(
                  log.created_at,
                  event.timezone,
                )}
              </time>
            </div>
          ))}

          {logs.length === 0 ? (
            <p className="p-12 text-center text-sm text-zinc-600">
              Nenhuma ação encontrada.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between text-sm text-zinc-600">
          <span>
            Página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1, action)}
                className="rounded-lg border border-white/10 px-3 py-2 hover:text-white"
              >
                Anterior
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={pageHref(page + 1, action)}
                className="rounded-lg border border-white/10 px-3 py-2 hover:text-white"
              >
                Próxima
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}

function AuditDetails({
  metadata,
}: {
  metadata: Record<string, unknown>;
}) {
  const details = [
    typeof metadata.reason === "string" &&
    metadata.reason
      ? `Motivo: ${metadata.reason}`
      : null,
    typeof metadata.count === "number"
      ? `${metadata.count.toLocaleString(
          "pt-BR",
        )} registros`
      : null,
    typeof metadata.role === "string"
      ? `Perfil: ${metadata.role}`
      : null,
  ].filter(Boolean);

  return details.length ? (
    <p className="mt-1 truncate text-xs text-zinc-600">
      {details.join(" · ")}
    </p>
  ) : null;
}

function pageHref(page: number, action: string) {
  const params = new URLSearchParams({
    page: String(page),
  });
  if (action) params.set("action", action);
  return `?${params}`;
}
