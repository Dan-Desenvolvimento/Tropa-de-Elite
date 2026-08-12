import "server-only";

import { Resend } from "resend";

import { EventReminderEmail } from "@/emails/event-reminder";
import { createAdminClient } from "@/lib/supabase/admin";

type Registration = { id: string; full_name: string; email: string; ticket_token: string };
type Event = { id: string; name: string; start_at: string; timezone: string; venue_name: string; address: string; city: string; whatsapp_group_url: string | null; support_email: string | null };

export async function sendEventReminder(eventId: string) {
  const supabase = createAdminClient();
  const [{ data: event, error: eventError }, { data: registrations, error: registrationsError }] = await Promise.all([
    supabase.from("events").select("id,name,start_at,timezone,venue_name,address,city,whatsapp_group_url,support_email").eq("id", eventId).single<Event>(),
    supabase.from("registrations").select("id,full_name,email,ticket_token").eq("event_id", eventId).eq("status", "confirmed").order("registered_at", { ascending: true }).returns<Registration[]>(),
  ]);
  if (eventError) throw eventError;
  if (registrationsError) throw registrationsError;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EVENT_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!apiKey || !from || !appUrl) throw new Error("E-mail provider não está configurado.");

  const eventDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: event.timezone }).format(new Date(event.start_at));
  const eventTime = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: event.timezone }).format(new Date(event.start_at));
  const resend = new Resend(apiKey);
  let sent = 0;
  let failed = 0;

  for (const registration of registrations ?? []) {
    const { data: log, error: logError } = await supabase.from("email_logs").insert({ event_id: event.id, registration_id: registration.id, email_type: "event_reminder", recipient: registration.email, status: "pending" }).select("id").single<{ id: string }>();
    if (logError || !log) { failed += 1; continue; }
    try {
      const result = await resend.emails.send({
        from,
        to: registration.email,
        replyTo: process.env.EVENT_REPLY_TO_EMAIL || undefined,
        subject: `Faltam 2 dias para o ${event.name}`,
        react: EventReminderEmail({
          logoUrl: `${appUrl.replace(/\/$/, "")}/logo-simbolo.png`,
          firstName: registration.full_name.trim().split(/\s+/)[0] ?? registration.full_name,
          eventName: event.name,
          eventDate,
          eventTime,
          venueName: event.venue_name,
          address: event.address,
          city: event.city,
          ticketUrl: `${appUrl.replace(/\/$/, "")}/ingresso/${encodeURIComponent(registration.ticket_token)}`,
          whatsappGroupUrl: event.whatsapp_group_url,
          supportEmail: event.support_email,
        }),
      });
      if (result.error) throw new Error(result.error.message);
      await supabase.from("email_logs").update({ status: "sent", provider_message_id: result.data?.id ?? null, sent_at: new Date().toISOString(), error_message: null }).eq("id", log.id);
      sent += 1;
    } catch (error) {
      failed += 1;
      await supabase.from("email_logs").update({ status: "failed", error_message: (error instanceof Error ? error.message : "Falha no envio").slice(0, 1000) }).eq("id", log.id);
    }
  }
  return { total: registrations?.length ?? 0, sent, failed };
}
