import { notFound } from "next/navigation";
import {
  Ban,
  Download,
  MailCheck,
  MailWarning,
  TicketCheck,
  UserRoundCheck,
  UsersRound,
  MessageCircle,
  Eye,
  CheckCheck,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { getEventSummaries } from "@/features/admin/server/get-event-summaries";
import { hasEventPermission } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ReportsPage({
  params,
}: PageProps<"/admin/eventos/[id]/relatorios">) {
  const { id } = await params;

  if (!(await hasEventPermission(id, "view_reports"))) {
    notFound();
  }

  const summary = (
    await getEventSummaries()
  ).find((event) => event.event_id === id);

  if (!summary) notFound();

  const supabase = createAdminClient();
  const [
    { count: whatsappAccepted },
    { count: whatsappDelivered },
    { count: whatsappRead },
    { count: whatsappFailed },
  ] = await Promise.all([
    supabase.from("whatsapp_logs").select("id", { count: "exact", head: true }).eq("event_id", id).in("status", ["sent", "delivered", "read"]),
    supabase.from("whatsapp_logs").select("id", { count: "exact", head: true }).eq("event_id", id).in("status", ["delivered", "read"]),
    supabase.from("whatsapp_logs").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "read"),
    supabase.from("whatsapp_logs").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "failed"),
  ]);

  const confirmed = Number(summary.confirmed_count);
  const checkins = Number(summary.checkin_count);
  const attendance =
    confirmed > 0
      ? (checkins / confirmed) * 100
      : 0;
  const absent = Math.max(0, confirmed - checkins);

  return (
    <main>
      <PageHeader
        eyebrow="Relatórios"
        title={summary.event_name}
        description="Indicadores consolidados do evento."
        actions={
          <a
            href={`/api/admin/events/${id}/export`}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500"
          >
            <Download className="size-4" />
            Exportar participantes
          </a>
        }
      />

      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-8 lg:grid-cols-3 lg:p-10">
        <Metric
          icon={TicketCheck}
          label="Capacidade"
          value={summary.capacity ?? "—"}
        />
        <Metric
          icon={TicketCheck}
          label="Confirmados"
          value={confirmed}
        />
        <Metric
          icon={UsersRound}
          label="Lista de espera"
          value={Number(summary.waitlist_count)}
        />
        <Metric
          icon={Ban}
          label="Cancelados"
          value={Number(summary.cancelled_count)}
        />
        <Metric
          icon={UserRoundCheck}
          label="Presentes"
          value={checkins}
        />
        <Metric
          icon={UsersRound}
          label="Ainda não presentes"
          value={absent}
        />
        <Metric
          icon={UserRoundCheck}
          label="Comparecimento"
          value={`${attendance.toFixed(1)}%`}
        />
        <Metric
          icon={MailCheck}
          label="E-mails enviados"
          value={Number(summary.email_sent_count)}
        />
        <Metric
          icon={MailWarning}
          label="Falhas de e-mail"
          value={Number(summary.email_failed_count)}
        />
        <Metric
          icon={MessageCircle}
          label="WhatsApps aceitos pela Meta"
          value={whatsappAccepted ?? 0}
        />
        <Metric
          icon={CheckCheck}
          label="WhatsApps entregues"
          value={whatsappDelivered ?? 0}
        />
        <Metric
          icon={Eye}
          label="WhatsApps visualizados"
          value={whatsappRead ?? 0}
        />
        <Metric
          icon={MailWarning}
          label="Falhas de WhatsApp"
          value={whatsappFailed ?? 0}
        />
      </div>
    </main>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TicketCheck;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-5">
      <Icon className="size-5 text-red-500" />
      <p className="mt-6 text-3xl font-semibold text-white">
        {typeof value === "number"
          ? value.toLocaleString("pt-BR")
          : value}
      </p>
      <p className="mt-1 text-xs text-zinc-600">
        {label}
      </p>
    </div>
  );
}
