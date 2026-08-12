import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type EventRow = {
  id: string;
  name: string;
  start_at: string;
  timezone: string;
  venue_name: string;
  address: string;
  city: string;
  whatsapp_template_name: string | null;
  whatsapp_template_language: string;
  whatsapp_reminder_message: string | null;
};

type RegistrationRow = {
  id: string;
  full_name: string;
  phone: string;
  ticket_code: string;
  ticket_token: string;
};

export async function sendEventWhatsAppReminder(eventId: string) {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!phoneNumberId || !accessToken || !apiVersion || !appUrl) {
    throw new Error("WhatsApp Cloud API não está configurada no ambiente.");
  }

  const supabase = createAdminClient();
  const [{ data: event, error: eventError }, { data: registrations, error: registrationsError }] = await Promise.all([
    supabase.from("events").select("id,name,start_at,timezone,venue_name,address,city,whatsapp_template_name,whatsapp_template_language,whatsapp_reminder_message").eq("id", eventId).single<EventRow>(),
    supabase.from("registrations").select("id,full_name,phone,ticket_code,ticket_token").eq("event_id", eventId).eq("status", "confirmed").eq("communications_consent", true).order("registered_at", { ascending: true }).returns<RegistrationRow[]>(),
  ]);
  if (eventError) throw eventError;
  if (registrationsError) throw registrationsError;
  if (!event.whatsapp_template_name || !event.whatsapp_reminder_message) {
    throw new Error("Configure o modelo e a mensagem do WhatsApp no editor do evento.");
  }

  const eventDate = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: event.timezone }).format(new Date(event.start_at));
  const eventTime = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: event.timezone }).format(new Date(event.start_at));
  const baseUrl = appUrl.replace(/\/$/, "");
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let index = 0; index < (registrations ?? []).length; index += 5) {
    const batch = (registrations ?? []).slice(index, index + 5);
    await Promise.all(batch.map(async (registration) => {
      const recipient = normalizeBrazilianPhone(registration.phone);
      if (!recipient) { failed += 1; return; }

      const { data: log, error: logError } = await supabase.from("whatsapp_logs").insert({
        event_id: event.id,
        registration_id: registration.id,
        message_type: "event_reminder_qr",
        recipient,
        status: "pending",
      }).select("id").single<{ id: string }>();
      if (logError?.code === "23505") { skipped += 1; return; }
      if (logError || !log) { failed += 1; return; }

      try {
        const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: recipient,
            type: "template",
            template: {
              name: event.whatsapp_template_name,
              language: { code: event.whatsapp_template_language },
              components: [
                { type: "header", parameters: [{ type: "image", image: { link: `${baseUrl}/api/tickets/${encodeURIComponent(registration.ticket_token)}/qr` } }] },
                { type: "body", parameters: [
                  { type: "text", text: firstName(registration.full_name) },
                  { type: "text", text: event.whatsapp_reminder_message },
                  { type: "text", text: event.name },
                  { type: "text", text: eventDate },
                  { type: "text", text: eventTime },
                  { type: "text", text: `${event.venue_name} — ${event.address}, ${event.city}` },
                  { type: "text", text: registration.ticket_code },
                ] },
              ],
            },
          }),
        });
        const body = await response.json().catch(() => ({})) as { messages?: Array<{ id?: string }>; error?: { message?: string } };
        if (!response.ok) throw new Error(body.error?.message ?? `WhatsApp HTTP ${response.status}`);
        await supabase.from("whatsapp_logs").update({ status: "sent", provider_message_id: body.messages?.[0]?.id ?? null, sent_at: new Date().toISOString(), error_message: null }).eq("id", log.id);
        sent += 1;
      } catch (error) {
        failed += 1;
        await supabase.from("whatsapp_logs").update({ status: "failed", error_message: (error instanceof Error ? error.message : "Falha no envio").slice(0, 1000) }).eq("id", log.id);
      }
    }));
  }

  return { eligible: registrations?.length ?? 0, sent, failed, skipped };
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(digits)) return digits;
  if (/^\d{10,11}$/.test(digits)) return `55${digits}`;
  return null;
}
