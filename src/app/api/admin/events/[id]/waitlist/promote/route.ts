import { after, NextResponse } from "next/server";

import { sendTicketConfirmation } from "@/features/emails/server/send-ticket-confirmation";
import { getCurrentStaff, hasEventPermission } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

type PromotionResult = {
  success: boolean;
  code?: string;
  promoted_ids?: string[];
  promoted_count?: number;
  available_slots?: number;
  remaining_waitlist?: number;
};

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
  }

  const { id } = await params;
  if (!(await hasEventPermission(id, "manage_registrations"))) {
    return NextResponse.json({ success: false, message: "Sem permissão para gerenciar a lista de espera." }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("promote_event_waitlist", {
    target_event_id: id,
  });

  if (error) {
    console.error("Waitlist promotion failed", { code: error.code, message: error.message });
    return NextResponse.json({ success: false, message: "Não foi possível promover a lista de espera. Verifique se a migration foi aplicada." }, { status: 500 });
  }

  const result = data as PromotionResult;
  if (!result.success) {
    const message = result.code === "EVENT_NOT_ELIGIBLE"
      ? "Este evento não permite novas confirmações."
      : "Evento não encontrado.";
    return NextResponse.json({ success: false, message }, { status: result.code === "EVENT_NOT_FOUND" ? 404 : 422 });
  }

  const promotedIds = result.promoted_ids ?? [];
  if (promotedIds.length === 0) {
    return NextResponse.json({ success: false, message: "Não há vagas disponíveis ou participantes aguardando promoção." }, { status: 422 });
  }

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: id,
    action: "waitlist_promoted",
    entity_type: "event",
    entity_id: id,
    metadata: {
      promoted_count: promotedIds.length,
      remaining_waitlist: result.remaining_waitlist ?? 0,
    },
  });

  after(async () => {
    let sent = 0;
    let failed = 0;

    for (let index = 0; index < promotedIds.length; index += 5) {
      const batch = promotedIds.slice(index, index + 5);
      const outcomes = await Promise.all(batch.map((registrationId) => sendTicketConfirmation(registrationId)));
      sent += outcomes.filter((outcome) => outcome.sent).length;
      failed += outcomes.filter((outcome) => !outcome.sent).length;
    }

    await supabase.from("audit_logs").insert({
      actor_id: staff.id,
      event_id: id,
      action: "waitlist_confirmation_emails_finished",
      entity_type: "event",
      entity_id: id,
      metadata: { promoted_count: promotedIds.length, sent, failed },
    });
  });

  return NextResponse.json({
    success: true,
    data: {
      promoted: promotedIds.length,
      remainingWaitlist: result.remaining_waitlist ?? 0,
      emailsQueued: promotedIds.length,
    },
  });
}
