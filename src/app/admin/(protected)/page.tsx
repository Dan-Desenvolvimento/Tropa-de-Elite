import Link from "next/link";
import { CalendarClock, CalendarRange, CalendarX, ScanLine, TicketCheck, UserRoundCheck } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { getEventSummaries } from "@/features/admin/server/get-event-summaries";
import { requireStaff } from "@/lib/auth/dal";

export default async function AdminDashboardPage() {
  const [staff, events] = await Promise.all([requireStaff(), getEventSummaries()]);
  const isAdmin = staff.globalRole === "admin";
  const activeEvents = events.filter((event) => ["open", "closed", "sold_out"].includes(event.event_status));
  const futureEvents = events.filter((event) => event.is_future);
  const endedEvents = events.filter((event) => ["finished", "cancelled"].includes(event.event_status));
  const totalRegistrations = events.reduce((sum, event) => sum + Number(event.confirmed_count), 0);
  const totalCheckins = events.reduce((sum, event) => sum + Number(event.checkin_count), 0);

  return (
    <main>
      <PageHeader
        eyebrow="Painel administrativo"
        title="Visão geral"
        description="Acompanhe inscrições e entradas em tempo real."
        actions={isAdmin ? (
          <Link href="/admin/eventos/novo" className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-500">
            Criar evento
          </Link>
        ) : undefined}
      />

      <div className="space-y-8 p-5 sm:p-8 lg:p-10">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon={CalendarRange} label="Eventos ativos" value={activeEvents.length} />
          <Metric icon={CalendarClock} label="Eventos futuros" value={futureEvents.length} />
          <Metric icon={CalendarX} label="Eventos encerrados" value={endedEvents.length} />
          <Metric icon={TicketCheck} label="Inscrições confirmadas" value={totalRegistrations} />
          <Metric icon={UserRoundCheck} label="Check-ins" value={totalCheckins} />
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Eventos recentes</h2>
            <Link href="/admin/eventos" className="text-sm text-red-400 hover:text-red-300">Ver todos</Link>
          </div>
          {events.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-zinc-500">
              Nenhum evento criado ainda.
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {events.slice(0, 6).map((event) => (
                <Link
                  key={event.event_id}
                  href={isAdmin ? `/admin/eventos/${event.event_id}` : `/admin/eventos/${event.event_id}/checkin`}
                  className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 transition hover:border-red-500/25 hover:bg-white/[0.04]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-white">{event.event_name}</p>
                      <p className="mt-1 text-xs text-zinc-600">
                        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(event.start_at))}
                      </p>
                    </div>
                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">{event.event_status}</span>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                    <SmallMetric label="Confirmados" value={event.confirmed_count} />
                    <SmallMetric label="Presentes" value={event.checkin_count} />
                    <SmallMetric label="Aguardando" value={Number(event.confirmed_count) - Number(event.checkin_count)} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof ScanLine; label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
      <Icon className="size-5 text-red-500" />
      <p className="mt-6 text-3xl font-semibold tracking-tight text-white">{value.toLocaleString("pt-BR")}</p>
      <p className="mt-1 text-sm text-zinc-500">{label}</p>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-semibold text-zinc-200">{Number(value).toLocaleString("pt-BR")}</p>
      <p className="mt-0.5 text-xs text-zinc-600">{label}</p>
    </div>
  );
}
