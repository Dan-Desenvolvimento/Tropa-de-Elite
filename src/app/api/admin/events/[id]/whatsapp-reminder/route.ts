import { after, NextResponse } from "next/server";

import { sendEventWhatsAppReminder } from "@/features/whatsapp/server/send-event-whatsapp-reminder";
import { getCurrentStaff, hasEventPermission } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  if (!(await hasEventPermission(id, "manage_registrations"))) {
    return NextResponse.json({ success: false, message: "Sem permissão para enviar mensagens." }, { status: 403 });
  }

  if (!process.env.WHATSAPP_PHONE_NUMBER_ID || !process.env.WHATSAPP_ACCESS_TOKEN || !process.env.WHATSAPP_API_VERSION) {
    return NextResponse.json({ success: false, message: "Configure a WhatsApp Cloud API no ambiente de produção." }, { status: 503 });
  }

  const supabase = createAdminClient();
  const [{ data: event }, { count: eligible }] = await Promise.all([
    supabase.from("events").select("whatsapp_template_name").eq("id", id).maybeSingle<{ whatsapp_template_name: string | null }>(),
    supabase.from("registrations").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "confirmed").eq("communications_consent", true),
  ]);
  if (!event) return NextResponse.json({ success: false, message: "Evento não encontrado." }, { status: 404 });
  if (!event.whatsapp_template_name) {
    return NextResponse.json({ success: false, message: "Configure o modelo aprovado no editor do evento." }, { status: 422 });
  }
  if (!eligible) return NextResponse.json({ success: false, message: "Não há inscritos confirmados com consentimento para comunicações." }, { status: 422 });

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: id,
    action: "whatsapp_reminder_requested",
    entity_type: "event",
    entity_id: id,
    metadata: { eligible },
  });

  after(async () => {
    try {
      const result = await sendEventWhatsAppReminder(id);
      await supabase.from("audit_logs").insert({ actor_id: staff.id, event_id: id, action: "whatsapp_reminder_finished", entity_type: "event", entity_id: id, metadata: result });
    } catch (error) {
      console.error("WhatsApp reminder batch failed", error);
    }
  });

  return NextResponse.json({ success: true, data: { queued: true, eligible } });
}
