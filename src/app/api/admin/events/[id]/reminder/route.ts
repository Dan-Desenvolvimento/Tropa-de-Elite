import { after, NextResponse } from "next/server";

import { sendEventReminder } from "@/features/emails/server/send-event-reminder";
import { getCurrentStaff, hasEventPermission } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  if (!(await hasEventPermission(id, "manage_registrations"))) return NextResponse.json({ success: false, message: "Sem permissão para enviar lembretes." }, { status: 403 });

  const supabase = createAdminClient();
  const { count: previousReminderCount } = await supabase
    .from("email_logs")
    .select("id", { count: "exact", head: true })
    .eq("event_id", id)
    .eq("email_type", "event_reminder")
    .in("status", ["pending", "sent"]);
  if ((previousReminderCount ?? 0) > 0) {
    return NextResponse.json({ success: false, message: "O lembrete já foi enviado ou está em processamento." }, { status: 409 });
  }
  const { data: event, error } = await supabase.from("events").select("name,start_at").eq("id", id).single<{ name: string; start_at: string }>();
  if (error || !event) return NextResponse.json({ success: false, message: "Evento não encontrado." }, { status: 404 });
  const remaining = new Date(event.start_at).getTime() - Date.now();
  if (remaining <= 0 || remaining > 48 * 60 * 60 * 1000) return NextResponse.json({ success: false, message: "O lembrete só pode ser enviado nas 48 horas anteriores ao evento." }, { status: 422 });

  await supabase.from("audit_logs").insert({ actor_id: staff.id, event_id: id, action: "event_reminder_requested", entity_type: "event", entity_id: id, metadata: { window: "48h" } });
  after(async () => { try { await sendEventReminder(id); } catch (sendError) { console.error("Event reminder batch failed", sendError); } });
  return NextResponse.json({ success: true, data: { queued: true, eventName: event.name } });
}
