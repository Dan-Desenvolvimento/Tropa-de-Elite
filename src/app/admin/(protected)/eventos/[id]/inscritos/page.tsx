import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, ScanLine, Search } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { RegistrationActions } from "@/features/admin/components/registration-actions";
import { hasEventRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type RegistrationListRow = {
  registration_id: string; full_name: string; email: string; phone: string; city: string;
  registration_status: "confirmed" | "waitlist" | "cancelled"; ticket_code: string;
  registered_at: string; checked_in_at: string | null; checked_in_by_name: string | null; total_count: number;
};

export default async function RegistrationsPage({ params, searchParams }: PageProps<"/admin/eventos/[id]/inscritos">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!(await hasEventRole(id, ["admin"]))) notFound();
  const q = typeof query.q === "string" ? query.q.slice(0, 120) : "";
  const status = typeof query.status === "string" && ["confirmed", "waitlist", "cancelled"].includes(query.status) ? query.status as "confirmed" | "waitlist" | "cancelled" : null;
  const sort = typeof query.sort === "string" && ["newest", "oldest", "name_asc", "name_desc"].includes(query.sort) ? query.sort : "newest";
  const page = Math.max(1, Number(typeof query.page === "string" ? query.page : "1") || 1);
  const pageSize = 25;

  const [supabase, admin] = await Promise.all([createClient(), Promise.resolve(createAdminClient())]);
  const [{ data, error }, { data: event }] = await Promise.all([
    supabase.rpc("list_event_registrations_admin", {
      target_event_id: id, search_term: q, status_filter: status, page_offset: (page - 1) * pageSize, page_limit: pageSize, sort_order: sort,
    }),
    admin.from("events").select("name").eq("id", id).maybeSingle<{ name: string }>(),
  ]);
  if (error || !event) notFound();
  const rows = (data ?? []) as RegistrationListRow[];
  const total = Number(rows[0]?.total_count ?? 0);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main>
      <PageHeader
        eyebrow="Participantes"
        title={event.name}
        description={`${total.toLocaleString("pt-BR")} ${total === 1 ? "inscrição encontrada" : "inscrições encontradas"}.`}
        actions={<><a href={`/api/admin/events/${id}/export`} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"><Download className="size-4" />Exportar CSV</a><Link href={`/admin/eventos/${id}/checkin`} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500"><ScanLine className="size-4" />Check-in</Link></>}
      />
      <div className="space-y-5 p-5 sm:p-8 lg:p-10">
        <form className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/[0.025] p-4 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" /><input name="q" defaultValue={q} placeholder="Nome, e-mail, telefone ou código" className="h-11 w-full rounded-xl border border-white/10 bg-black/30 pl-10 pr-3 text-sm text-white outline-none focus:border-red-500/60" /></div>
          <select name="status" defaultValue={status ?? ""} className="h-11 rounded-xl border border-white/10 bg-[#111114] px-3 text-sm text-zinc-300"><option value="">Todos os status</option><option value="confirmed">Confirmado</option><option value="waitlist">Lista de espera</option><option value="cancelled">Cancelado</option></select>
          <select name="sort" defaultValue={sort} aria-label="Ordenação" className="h-11 rounded-xl border border-white/10 bg-[#111114] px-3 text-sm text-zinc-300"><option value="newest">Mais recentes</option><option value="oldest">Mais antigas</option><option value="name_asc">Nome A–Z</option><option value="name_desc">Nome Z–A</option></select>
          <button className="h-11 rounded-xl bg-white/10 px-5 text-sm font-semibold text-white hover:bg-white/15">Filtrar</button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-white/8">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-white/[0.035] text-xs uppercase tracking-wide text-zinc-600"><tr><th className="px-4 py-3">Participante</th><th className="px-4 py-3">Contato</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Inscrição</th><th className="px-4 py-3">Check-in</th><th className="px-4 py-3">Ações</th></tr></thead>
            <tbody className="divide-y divide-white/8">
              {rows.map((row) => <tr key={row.registration_id} className="bg-white/[0.015]"><td className="px-4 py-4"><Link href={`/admin/eventos/${id}/inscritos/${row.registration_id}`} className="font-medium text-white hover:text-red-400">{row.full_name}</Link><p className="mt-1 font-mono text-xs text-zinc-600">{row.ticket_code}</p></td><td className="px-4 py-4 text-zinc-400"><p>{row.email}</p><p className="mt-1">{formatPhone(row.phone)} · {row.city}</p></td><td className="px-4 py-4"><StatusBadge status={row.registration_status} /></td><td className="px-4 py-4 text-zinc-500">{new Date(row.registered_at).toLocaleString("pt-BR")}</td><td className="px-4 py-4">{row.checked_in_at ? <><p className="text-emerald-400">Presente</p><p className="mt-1 text-xs text-zinc-600">{new Date(row.checked_in_at).toLocaleString("pt-BR")} · {row.checked_in_by_name ?? "Equipe"}</p></> : <span className="text-zinc-600">Pendente</span>}</td><td className="px-4 py-4"><RegistrationActions eventId={id} registrationId={row.registration_id} checkedIn={Boolean(row.checked_in_at)} cancelled={row.registration_status === "cancelled"} /></td></tr>)}
              {rows.length === 0 ? <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-600">Nenhuma inscrição encontrada.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between text-sm text-zinc-600"><span>Página {page} de {pages}</span><div className="flex gap-2">{page > 1 ? <Link href={pageHref(page - 1, q, status, sort)} className="rounded-lg border border-white/10 px-3 py-2 hover:text-white">Anterior</Link> : null}{page < pages ? <Link href={pageHref(page + 1, q, status, sort)} className="rounded-lg border border-white/10 px-3 py-2 hover:text-white">Próxima</Link> : null}</div></div>
      </div>
    </main>
  );
}

function StatusBadge({ status }: { status: string }) { const label = status === "confirmed" ? "Confirmado" : status === "waitlist" ? "Lista de espera" : "Cancelado"; const tone = status === "confirmed" ? "bg-emerald-500/10 text-emerald-400" : status === "waitlist" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"; return <span className={`rounded-full px-3 py-1 text-xs font-medium ${tone}`}>{label}</span>; }
function formatPhone(phone: string) { return phone.length === 11 ? `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}` : phone; }
function pageHref(page: number, q: string, status: string | null, sort: string) { const params = new URLSearchParams({ page: String(page), sort }); if (q) params.set("q", q); if (status) params.set("status", status); return `?${params}`; }
