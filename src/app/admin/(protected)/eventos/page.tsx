import Link from "next/link";
import { CalendarDays, ScanLine, UsersRound } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { getEventSummaries } from "@/features/admin/server/get-event-summaries";
import { requireStaff } from "@/lib/auth/dal";

export default async function EventsPage() {
  const [staff, events] = await Promise.all([requireStaff(), getEventSummaries()]);
  const isAdmin = staff.globalRole === "admin";

  return (
    <main>
      <PageHeader
        eyebrow={isAdmin ? "Gestão" : "Operação"}
        title={isAdmin ? "Eventos" : "Check-in"}
        description={`${events.length} ${events.length === 1 ? "evento disponível" : "eventos disponíveis"}.`}
        actions={isAdmin ? (
          <Link href="/admin/eventos/novo" className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white hover:bg-red-500">
            Novo evento
          </Link>
        ) : undefined}
      />
      <div className="p-5 sm:p-8 lg:p-10">
        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 p-12 text-center">
            <CalendarDays className="mx-auto size-8 text-zinc-700" />
            <p className="mt-4 text-sm text-zinc-500">Crie o primeiro evento para abrir as inscrições.</p>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {events.map((event) => (
              <article key={event.event_id} className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{event.event_name}</h2>
                    <p className="mt-1 text-sm text-zinc-600">
                      {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(new Date(event.start_at))}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-zinc-400">{event.event_status}</span>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <CardStat label="Confirmados" value={event.confirmed_count} />
                  <CardStat label="Espera" value={event.waitlist_count} />
                  <CardStat label="Check-ins" value={event.checkin_count} />
                  <CardStat label="Capacidade" value={event.capacity ?? "—"} />
                </div>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-white/8 pt-5">
                  {isAdmin ? (
                    <>
                      <Action href={`/admin/eventos/${event.event_id}`} icon={CalendarDays}>Gerenciar</Action>
                      <Action href={`/admin/eventos/${event.event_id}/inscritos`} icon={UsersRound}>Inscritos</Action>
                    </>
                  ) : null}
                  <Action href={`/admin/eventos/${event.event_id}/checkin`} icon={ScanLine}>Check-in</Action>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function CardStat({ label, value }: { label: string; value: string | number }) {
  return <div><p className="text-xl font-semibold text-white">{Number.isFinite(Number(value)) ? Number(value).toLocaleString("pt-BR") : value}</p><p className="mt-1 text-xs text-zinc-600">{label}</p></div>;
}

function Action({ href, icon: Icon, children }: { href: string; icon: typeof CalendarDays; children: React.ReactNode }) {
  return <Link href={href} className="inline-flex items-center gap-2 rounded-lg border border-white/8 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10"><Icon className="size-3.5 text-red-500" />{children}</Link>;
}
