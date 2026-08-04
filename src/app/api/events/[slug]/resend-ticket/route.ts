import { after, NextResponse } from "next/server";
import { z } from "zod";

import { sendTicketConfirmation } from "@/features/emails/server/send-ticket-confirmation";
import { getRequestIp, hashRequestIdentifier } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";

const requestSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
const neutralMessage =
  "Caso exista uma inscrição vinculada a este e-mail, enviaremos novamente o ingresso.";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) return neutralResponse();

    const { slug } = await params;
    const supabase = createAdminClient();
    const ipHash = hashRequestIdentifier(getRequestIp(request));
    const emailHash = hashRequestIdentifier(parsed.data.email);

    const { data: ipLimit } = await supabase.rpc("consume_rate_limit", {
      rate_scope: "ticket_resend_ip",
      rate_key_hash: ipHash,
      rate_max_attempts: 5,
      rate_window_seconds: 900,
    });
    const { data: emailLimit } = await supabase.rpc("consume_rate_limit", {
      rate_scope: "ticket_resend_email",
      rate_key_hash: emailHash,
      rate_max_attempts: 3,
      rate_window_seconds: 900,
    });

    if (!(ipLimit as { allowed?: boolean } | null)?.allowed || !(emailLimit as { allowed?: boolean } | null)?.allowed) {
      return neutralResponse();
    }

    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("slug", slug)
      .maybeSingle<{ id: string }>();

    if (!event) return neutralResponse();

    const { data: registration } = await supabase
      .from("registrations")
      .select("id")
      .eq("event_id", event.id)
      .eq("email", parsed.data.email)
      .eq("status", "confirmed")
      .maybeSingle<{ id: string }>();

    await supabase.from("audit_logs").insert({
      event_id: event.id,
      action: "public_ticket_resend_requested",
      entity_type: "registration",
      entity_id: registration?.id ?? null,
      metadata: { requester_hash: emailHash },
    });

    if (!registration) return neutralResponse();

    const oneMinuteAgo = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabase
      .from("email_logs")
      .select("id", { count: "exact", head: true })
      .eq("registration_id", registration.id)
      .eq("email_type", "ticket_confirmation")
      .gte("created_at", oneMinuteAgo);

    if ((count ?? 0) === 0) {
      after(async () => {
        await sendTicketConfirmation(registration.id);
      });
    }

    return neutralResponse();
  } catch (error) {
    console.error("Ticket resend request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return neutralResponse();
  }
}

function neutralResponse() {
  return NextResponse.json({ success: true, data: { message: neutralMessage } });
}
