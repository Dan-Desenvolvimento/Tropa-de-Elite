import { NextResponse } from "next/server";

import { sendEventWhatsAppReminder } from "@/features/whatsapp/server/send-event-whatsapp-reminder";
import { getCurrentStaff, hasEventPermission } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; registrationId: string }> },
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
  }

  const { id, registrationId } = await params;
  if (!(await hasEventPermission(id, "manage_registrations"))) {
    return NextResponse.json({ success: false, message: "Sem permissão para enviar mensagens." }, { status: 403 });
  }

  try {
    const result = await sendEventWhatsAppReminder(id, registrationId);

    await createAdminClient().from("audit_logs").insert({
      actor_id: staff.id,
      event_id: id,
      action: "whatsapp_reminder_individual",
      entity_type: "registration",
      entity_id: registrationId,
      metadata: result,
    });

    if (result.eligible === 0) {
      return NextResponse.json(
        { success: false, message: "Este inscrito não está confirmado ou não aceitou receber comunicações." },
        { status: 422 },
      );
    }
    if (result.skipped > 0) {
      return NextResponse.json(
        { success: false, message: "Este lembrete já foi enviado para o inscrito." },
        { status: 409 },
      );
    }
    if (result.sent !== 1) {
      return NextResponse.json(
        { success: false, message: "A Meta recusou o envio. Consulte o histórico do evento para ver o motivo." },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: { sent: true } });
  } catch (error) {
    console.error("Falha no lembrete individual do WhatsApp", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Não foi possível enviar o WhatsApp." },
      { status: 500 },
    );
  }
}
