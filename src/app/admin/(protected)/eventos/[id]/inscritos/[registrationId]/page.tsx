import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { RegistrationActions } from "@/features/admin/components/registration-actions";
import { hasEventRole } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/date-time";
import { createAdminClient } from "@/lib/supabase/admin";

type RegistrationDetail = {
  id: string; full_name: string; email: string; phone: string; city: string; status: "confirmed" | "waitlist" | "cancelled";
  ticket_code: string; registered_at: string; privacy_consent_at: string; privacy_policy_version: string;
  communications_consent: boolean; checked_in_at: string | null; custom_answers: Record<string, unknown>;
  cancelled_at: string | null; cancellation_reason: string | null;
};
type EmailLog = { id: string; status: string; attempt_count: number; sent_at: string | null; created_at: string; error_message: string | null };
type CheckinLog = { id: string; method: string; result: string; created_at: string };

export default async function RegistrationDetailPage({ params }: PageProps<"/admin/eventos/[id]/inscritos/[registrationId]">) {
  const { id, registrationId } = await params;
  if (!(await hasEventRole(id, ["admin"]))) notFound();
  const supabase = createAdminClient();
  const [{ data: registration }, { data: event }, { data: emails }, { data: checkins }] = await Promise.all([
    supabase.from("registrations").select("id,full_name,email,phone,city,status,ticket_code,registered_at,privacy_consent_at,privacy_policy_version,communications_consent,checked_in_at,custom_answers,cancelled_at,cancellation_reason").eq("id", registrationId).eq("event_id", id).maybeSingle<RegistrationDetail>(),
    supabase.from("events").select("name,timezone").eq("id", id).maybeSingle<{ name: string; timezone: string }>(),
    supabase.from("email_logs").select("id,status,attempt_count,sent_at,created_at,error_message").eq("registration_id", registrationId).order("created_at", { ascending: false }).limit(20),
    supabase.from("checkin_logs").select("id,method,result,created_at").eq("registration_id", registrationId).order("created_at", { ascending: false }).limit(20),
  ]);
  if (!registration || !event) notFound();

  return <main><PageHeader eyebrow={event.name} title={registration.full_name} description={registration.ticket_code} actions={<RegistrationActions eventId={id} registrationId={registration.id} checkedIn={Boolean(registration.checked_in_at)} cancelled={registration.status === "cancelled"} />} /><div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-2 lg:p-10"><Section title="Dados da inscrição"><Row label="E-mail" value={registration.email} /><Row label="Telefone" value={registration.phone} /><Row label="Cidade" value={registration.city} /><Row label="Status" value={registration.status} /><Row label="Inscrição" value={formatDateTime(registration.registered_at, event.timezone)} /><Row label="Check-in" value={registration.checked_in_at ? formatDateTime(registration.checked_in_at, event.timezone) : "Pendente"} /></Section><Section title="Consentimentos"><Row label="Política" value={`Aceita em ${formatDateTime(registration.privacy_consent_at, event.timezone)}`} /><Row label="Versão" value={registration.privacy_policy_version} /><Row label="Comunicações" value={registration.communications_consent ? "Aceito" : "Não aceito"} />{registration.cancelled_at ? <Row label="Cancelamento" value={`${formatDateTime(registration.cancelled_at, event.timezone)} · ${registration.cancellation_reason ?? "Sem motivo"}`} /> : null}</Section><Section title="Respostas personalizadas"><pre className="overflow-auto whitespace-pre-wrap text-xs leading-6 text-zinc-400">{JSON.stringify(registration.custom_answers ?? {}, null, 2)}</pre></Section><Section title="Histórico de e-mails">{((emails ?? []) as EmailLog[]).length === 0 ? <Empty /> : ((emails ?? []) as EmailLog[]).map((email) => <div key={email.id} className="border-b border-white/8 py-3 last:border-0"><div className="flex justify-between gap-3"><span className={email.status === "sent" ? "text-emerald-400" : email.status === "failed" ? "text-red-400" : "text-amber-400"}>{email.status}</span><span className="text-xs text-zinc-600">{formatDateTime(email.sent_at ?? email.created_at, event.timezone)}</span></div>{email.error_message ? <p className="mt-2 text-xs text-zinc-600">{email.error_message}</p> : null}</div>)}</Section><Section title="Histórico de check-in">{((checkins ?? []) as CheckinLog[]).length === 0 ? <Empty /> : ((checkins ?? []) as CheckinLog[]).map((log) => <div key={log.id} className="flex justify-between gap-3 border-b border-white/8 py-3 text-sm last:border-0"><span className="text-zinc-300">{log.result} · {log.method}</span><span className="text-xs text-zinc-600">{formatDateTime(log.created_at, event.timezone)}</span></div>)}</Section></div></main>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-white/8 bg-white/[0.025] p-5 sm:p-6"><h2 className="mb-4 font-semibold text-white">{title}</h2><div className="space-y-1">{children}</div></section>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex items-start justify-between gap-5 border-b border-white/8 py-3 text-sm last:border-0"><span className="text-zinc-600">{label}</span><span className="text-right text-zinc-300">{value}</span></div>; }
function Empty() { return <p className="py-3 text-sm text-zinc-600">Nenhum registro.</p>; }
