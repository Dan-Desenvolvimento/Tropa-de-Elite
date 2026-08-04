import "server-only";

import { Resend } from "resend";

import { TicketConfirmationEmail } from "@/emails/ticket-confirmation";
import { createTicketQrBuffer } from "@/features/tickets/server/qr-code";
import { createAdminClient } from "@/lib/supabase/admin";

type RegistrationEmailRow = {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  ticket_code: string;
  ticket_token: string;
  status: "confirmed" | "waitlist" | "cancelled";
};

type EmailEventRow = {
  id: string;
  name: string;
  start_at: string;
  timezone: string;
  venue_name: string;
  address: string;
  city: string;
  whatsapp_group_url: string | null;
  support_email: string | null;
  email_subject: string | null;
};

export async function sendTicketConfirmation(registrationId: string) {
  const supabase = createAdminClient();
  const { data: registration, error: registrationError } = await supabase
    .from("registrations")
    .select("id,event_id,full_name,email,ticket_code,ticket_token,status")
    .eq("id", registrationId)
    .single<RegistrationEmailRow>();

  if (registrationError) throw registrationError;
  if (registration.status !== "confirmed") return { sent: false, reason: "NOT_CONFIRMED" } as const;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,name,start_at,timezone,venue_name,address,city,whatsapp_group_url,support_email,email_subject")
    .eq("id", registration.event_id)
    .single<EmailEventRow>();
  if (eventError) throw eventError;

  const { count } = await supabase
    .from("email_logs")
    .select("id", { count: "exact", head: true })
    .eq("registration_id", registration.id)
    .eq("email_type", "ticket_confirmation");
  const attemptCount = (count ?? 0) + 1;

  const { data: emailLog, error: logError } = await supabase
    .from("email_logs")
    .insert({
      event_id: event.id,
      registration_id: registration.id,
      email_type: "ticket_confirmation",
      recipient: registration.email,
      status: "pending",
      attempt_count: attemptCount,
    })
    .select("id")
    .single<{ id: string }>();
  if (logError) throw logError;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EVENT_FROM_EMAIL;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!apiKey || !from || !appUrl) {
    await markEmailFailed(emailLog.id, "Email provider environment is not configured.");
    return { sent: false, reason: "NOT_CONFIGURED" } as const;
  }

  const eventDate = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeZone: event.timezone,
  }).format(new Date(event.start_at));
  const eventTime = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: event.timezone,
  }).format(new Date(event.start_at));
  const ticketUrl = `${appUrl.replace(/\/$/, "")}/ingresso/${encodeURIComponent(registration.ticket_token)}`;

  try {
    const qrBuffer = await createTicketQrBuffer(registration.ticket_token);
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      {
        from,
        to: registration.email,
        replyTo: process.env.EVENT_REPLY_TO_EMAIL || undefined,
        subject: event.email_subject || `Inscrição confirmada — ${event.name}`,
        react: TicketConfirmationEmail({
          logoUrl: `${appUrl.replace(/\/$/, "")}/Tropa-de-elite-branca-para-fundo-preto.png`,
          firstName: registration.full_name.trim().split(/\s+/)[0] ?? registration.full_name,
          eventName: event.name,
          eventDate,
          eventTime,
          venueName: event.venue_name,
          address: event.address,
          city: event.city,
          ticketCode: registration.ticket_code,
          ticketUrl,
          whatsappGroupUrl: event.whatsapp_group_url,
          supportEmail: event.support_email,
        }),
        attachments: [
          {
            filename: `ingresso-${registration.ticket_code}.png`,
            content: qrBuffer,
            contentType: "image/png",
            contentId: "ticket-qr",
          },
        ],
      },
      { idempotencyKey: `ticket-confirmation/${registration.id}/${attemptCount}` },
    );

    if (error) throw new Error(error.message);

    await supabase
      .from("email_logs")
      .update({
        status: "sent",
        provider_message_id: data?.id ?? null,
        sent_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", emailLog.id);

    return { sent: true, providerMessageId: data?.id ?? null } as const;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email provider error";
    await markEmailFailed(emailLog.id, message);
    return { sent: false, reason: "PROVIDER_ERROR" } as const;
  }
}

async function markEmailFailed(emailLogId: string, message: string) {
  const supabase = createAdminClient();
  await supabase
    .from("email_logs")
    .update({ status: "failed", error_message: message.slice(0, 1000) })
    .eq("id", emailLogId);
}
