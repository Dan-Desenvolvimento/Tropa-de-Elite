import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Download,
  MessageSquareMore,
  ScanLine,
  Search,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { RegistrationActions } from "@/features/admin/components/registration-actions";
import { EventReminderButton } from "@/features/admin/components/event-reminder-button";
import { WaitlistPromotionButton } from "@/features/admin/components/waitlist-promotion-button";
import { isPotentialBusinessOwner } from "@/features/checkin/strategic-profile";
import { formatJobRole } from "@/features/registrations/job-roles";
import { getEventPermissionSet } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/date-time";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RegistrationListRow = {
  registration_id: string;
  full_name: string;
  email: string;
  phone: string;
  city: string;
  company_name: string | null;
  job_role: string | null;
  job_role_other: string | null;
  registration_status:
    | "confirmed"
    | "waitlist"
    | "cancelled";
  ticket_code: string;
  registered_at: string;
  checked_in_at: string | null;
  checked_in_by_name: string | null;
  total_count: number;
};

export default async function RegistrationsPage({
  params,
  searchParams,
}: PageProps<"/admin/eventos/[id]/inscritos">) {
  const [{ id }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  const permissions =
    await getEventPermissionSet(id);

  if (
    !permissions.canViewRegistrations &&
    !permissions.canManageRegistrations &&
    !permissions.canAnonymizeRegistrations
  ) {
    notFound();
  }

  const q =
    typeof query.q === "string"
      ? query.q.slice(0, 120)
      : "";
  const status =
    typeof query.status === "string" &&
    ["confirmed", "waitlist", "cancelled"].includes(
      query.status,
    )
      ? (query.status as
          | "confirmed"
          | "waitlist"
          | "cancelled")
      : null;
  const sort =
    typeof query.sort === "string" &&
    [
      "newest",
      "oldest",
      "name_asc",
      "name_desc",
    ].includes(query.sort)
      ? query.sort
      : "newest";
  const page = Math.max(
    1,
    Number(
      typeof query.page === "string"
        ? query.page
        : "1",
    ) || 1,
  );
  const pageSize = 25;

  const [supabase, admin] = await Promise.all([
    createClient(),
    Promise.resolve(createAdminClient()),
  ]);

  const [
    { data, error },
    { data: event },
    { count: confirmedCountResult },
    { count: waitlistCountResult },
  ] = await Promise.all([
    supabase.rpc(
      "list_event_registrations_admin",
      {
        target_event_id: id,
        search_term: q,
        status_filter: status,
        page_offset: (page - 1) * pageSize,
        page_limit: pageSize,
        sort_order: sort,
      },
    ),
    admin
      .from("events")
      .select("name,timezone,capacity,whatsapp_template_name")
      .eq("id", id)
      .maybeSingle<{
        name: string;
        timezone: string;
        capacity: number | null;
        whatsapp_template_name: string | null;
      }>(),
    admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("status", "confirmed"),
    admin
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", id)
      .eq("status", "waitlist"),
  ]);

  if (error || !event) notFound();

  const rows =
    (data ?? []) as RegistrationListRow[];
  const registrationIds = rows.map((row) => row.registration_id);
  const { data: consentedRegistrations } = registrationIds.length > 0
    ? await admin
        .from("registrations")
        .select("id")
        .in("id", registrationIds)
        .eq("communications_consent", true)
    : { data: [] as Array<{ id: string }> };
  const consentedRegistrationIds = new Set(
    (consentedRegistrations ?? []).map((registration) => registration.id),
  );
  const whatsappConfigured = Boolean(
    event.whatsapp_template_name &&
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_API_VERSION &&
    process.env.NEXT_PUBLIC_APP_URL,
  );
  const total = Number(
    rows[0]?.total_count ?? 0,
  );
  const pages = Math.max(
    1,
    Math.ceil(total / pageSize),
  );
  const confirmedCount = confirmedCountResult ?? 0;
  const waitlistCount = waitlistCountResult ?? 0;
  const availableSlots = event.capacity === null
    ? waitlistCount
    : Math.max(event.capacity - confirmedCount, 0);
  const promotionCount = Math.min(waitlistCount, availableSlots);

  const hasHeaderActions =
    permissions.canViewReports ||
    permissions.canCheckin ||
    permissions.canManageRegistrations;
  const reminderAvailable = true;

  return (
    <main>
      <PageHeader
        eyebrow="Participantes"
        title={event.name}
        description={`${total.toLocaleString(
          "pt-BR",
        )} ${
          total === 1
            ? "inscrição encontrada"
            : "inscrições encontradas"
        }.`}
        actions={
          hasHeaderActions ? (
            <>
              {permissions.canManageRegistrations ? (
                <>
                  <Link
                    href={`/admin/eventos/${id}/comunicacao`}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 px-4 py-3 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/10"
                  >
                    <MessageSquareMore className="size-4" />
                    Central de Comunicação
                  </Link>
                  <EventReminderButton eventId={id} available={reminderAvailable} />
                </>
              ) : null}
              {permissions.canViewReports ? (
                <a
                  href={`/api/admin/events/${id}/export`}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
                >
                  <Download className="size-4" />
                  Exportar CSV
                </a>
              ) : null}

              {permissions.canCheckin ? (
                <Link
                  href={`/admin/eventos/${id}/checkin`}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500"
                >
                  <ScanLine className="size-4" />
                  Check-in
                </Link>
              ) : null}
            </>
          ) : undefined
        }
      />

      <div className="space-y-5 p-5 sm:p-8 lg:p-10">
        {waitlistCount > 0 ? (
          <section className="flex flex-col gap-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-white">Gestão da lista de espera</p>
              <p className="mt-1 text-sm leading-6 text-amber-100/70">
                {waitlistCount} {waitlistCount === 1 ? "pessoa aguarda" : "pessoas aguardam"}. {promotionCount > 0
                  ? `${promotionCount} ${promotionCount === 1 ? "vaga está disponível" : "vagas estão disponíveis"}; a promoção respeitará a ordem de inscrição.`
                  : "Não há vagas livres. Aumente a capacidade no editor do evento e volte a esta tela."}
              </p>
            </div>
            {permissions.canManageRegistrations && promotionCount > 0 ? (
              <WaitlistPromotionButton eventId={id} promotionCount={promotionCount} />
            ) : null}
          </section>
        ) : null}

        <form className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
            <input
              name="q"
              defaultValue={q}
              placeholder="Nome, empresa, empresário, e-mail, telefone ou código"
              className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-3 text-sm text-white outline-none focus:border-red-500/60"
            />
          </div>

          <select
            name="status"
            defaultValue={status ?? ""}
            className="h-11 rounded-xl border border-white/10 bg-[#111114] px-3 text-sm text-zinc-300"
          >
            <option value="">
              Todos os status
            </option>
            <option value="confirmed">
              Confirmado
            </option>
            <option value="waitlist">
              Lista de espera
            </option>
            <option value="cancelled">
              Cancelado
            </option>
          </select>

          <select
            name="sort"
            defaultValue={sort}
            aria-label="Ordenação"
            className="h-11 rounded-xl border border-white/10 bg-[#111114] px-3 text-sm text-zinc-300"
          >
            <option value="newest">
              Mais recentes
            </option>
            <option value="oldest">
              Mais antigas
            </option>
            <option value="name_asc">
              Nome A–Z
            </option>
            <option value="name_desc">
              Nome Z–A
            </option>
          </select>

          <button className="h-11 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/15">
            Filtrar
          </button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full min-w-[1180px] text-left text-sm">
            <thead className="bg-white/[0.035] text-xs uppercase tracking-wide text-zinc-600">
              <tr>
                <th className="px-4 py-3">
                  Participante
                </th>
                <th className="px-4 py-3">
                  Contato
                </th>
                <th className="px-4 py-3">
                  Empresa e cargo
                </th>
                <th className="px-4 py-3">
                  Status
                </th>
                <th className="px-4 py-3">
                  Inscrição
                </th>
                <th className="px-4 py-3">
                  Check-in
                </th>
                <th className="px-4 py-3">
                  Ações
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/8">
              {rows.map((row) => (
                <tr
                  key={row.registration_id}
                  className="bg-white/[0.015]"
                >
                  <td className="px-4 py-4">
                    <Link
                      href={`/admin/eventos/${id}/inscritos/${row.registration_id}`}
                      className="font-medium text-white hover:text-red-400"
                    >
                      {row.full_name}
                    </Link>
                    <p className="mt-1 font-mono text-xs text-zinc-600">
                      {row.ticket_code}
                    </p>
                  </td>

                  <td className="px-4 py-4 text-zinc-400">
                    <p>{row.email}</p>
                    <p className="mt-1">
                      {formatPhone(row.phone)} ·{" "}
                      {row.city}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-medium text-zinc-300">
                      {row.company_name ??
                        "Não informado"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-xs text-zinc-600">
                        {formatJobRole(
                          row.job_role,
                          row.job_role_other,
                        )}
                      </p>
                      {isPotentialBusinessOwner(row.job_role) ? (
                        <span className="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-amber-300">
                          E1 · Potencial empresário
                        </span>
                      ) : null}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <StatusBadge
                      status={
                        row.registration_status
                      }
                    />
                  </td>

                  <td className="px-4 py-4 text-zinc-500">
                    {formatDateTime(
                      row.registered_at,
                      event.timezone,
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {row.checked_in_at ? (
                      <>
                        <p className="text-emerald-400">
                          Presente
                        </p>
                        <p className="mt-1 text-xs text-zinc-600">
                          {formatDateTime(
                            row.checked_in_at,
                            event.timezone,
                          )}{" "}
                          ·{" "}
                          {row.checked_in_by_name ??
                            "Equipe"}
                        </p>
                      </>
                    ) : (
                      <span className="text-zinc-600">
                        Pendente
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <RegistrationActions
                      eventId={id}
                      registrationId={
                        row.registration_id
                      }
                      checkedIn={Boolean(
                        row.checked_in_at,
                      )}
                      cancelled={
                        row.registration_status ===
                        "cancelled"
                      }
                      canManage={
                        permissions.canManageRegistrations
                      }
                      canAnonymize={
                        permissions.canAnonymizeRegistrations
                      }
                      canSendWhatsApp={Boolean(
                        whatsappConfigured &&
                        row.registration_status === "confirmed" &&
                        consentedRegistrationIds.has(row.registration_id),
                      )}
                    />
                  </td>
                </tr>
              ))}

              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-zinc-600"
                  >
                    Nenhuma inscrição encontrada.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between text-sm text-zinc-600">
          <span>
            Página {page} de {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={pageHref(
                  page - 1,
                  q,
                  status,
                  sort,
                )}
                className="rounded-lg border border-white/10 px-3 py-2 hover:text-white"
              >
                Anterior
              </Link>
            ) : null}

            {page < pages ? (
              <Link
                href={pageHref(
                  page + 1,
                  q,
                  status,
                  sort,
                )}
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

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const label =
    status === "confirmed"
      ? "Confirmado"
      : status === "waitlist"
        ? "Lista de espera"
        : "Cancelado";
  const tone =
    status === "confirmed"
      ? "bg-emerald-500/10 text-emerald-400"
      : status === "waitlist"
        ? "bg-amber-500/10 text-amber-400"
        : "bg-red-500/10 text-red-400";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}
    >
      {label}
    </span>
  );
}

function formatPhone(phone: string) {
  return phone.length === 11
    ? `(${phone.slice(0, 2)}) ${phone.slice(
        2,
        7,
      )}-${phone.slice(7)}`
    : phone;
}

function pageHref(
  page: number,
  q: string,
  status: string | null,
  sort: string,
) {
  const params = new URLSearchParams({
    page: String(page),
    sort,
  });
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  return `?${params}`;
}
