import { NextResponse } from "next/server";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { getCurrentStaff, hasEventRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const actionSchema = z.object({ action: z.enum(["cancel", "undo_checkin", "anonymize"]), reason: z.string().trim().max(500).optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; registrationId: string }> }) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
  const { id, registrationId } = await params;
  if (!(await hasEventRole(id, ["admin"]))) return NextResponse.json({ success: false, message: "Sem permissão." }, { status: 403 });
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Ação inválida." }, { status: 400 });

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const anonymousNumber = (parseInt(createHash("sha256").update(registrationId).digest("hex").slice(0, 12), 16) % 10_000_000_000_000).toString().padStart(13, "0");
  const values = parsed.data.action === "cancel"
    ? { status: "cancelled", cancelled_at: now, cancellation_reason: parsed.data.reason ?? "Cancelado pelo administrador" }
    : parsed.data.action === "anonymize"
      ? {
          full_name: "Participante anonimizado",
          email: `${registrationId}@anon.invalid`,
          phone: anonymousNumber,
          city: "Anonimizada",
          custom_answers: {},
          status: "cancelled",
          ticket_token: randomBytes(32).toString("base64url"),
          cancelled_at: now,
          cancellation_reason: "Dados anonimizados por solicitação administrativa",
          anonymized_at: now,
        }
      : { checked_in_at: null, checked_in_by: null, checkin_method: null };
  const { error } = await supabase.from("registrations").update(values).eq("id", registrationId).eq("event_id", id);
  if (error) return NextResponse.json({ success: false, message: "Não foi possível realizar a ação." }, { status: 500 });

  await supabase.from("audit_logs").insert({
    actor_id: staff.id, event_id: id,
    action: parsed.data.action === "cancel" ? "registration_cancelled" : parsed.data.action === "anonymize" ? "registration_anonymized" : "checkin_removed",
    entity_type: "registration", entity_id: registrationId, metadata: { reason: parsed.data.reason ?? null },
  });
  return NextResponse.json({ success: true, data: { id: registrationId } });
}
