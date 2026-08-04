import { NextResponse } from "next/server";

import { adminEventSchema } from "@/features/events/admin-schema";
import { toDatabaseValues } from "@/features/events/server/event-mapper";
import { getCurrentStaff, hasEventRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
  const { id } = await params;
  if (!(await hasEventRole(id, ["admin"]))) {
    return NextResponse.json({ success: false, message: "Sem permissão." }, { status: 403 });
  }

  const parsed = adminEventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("events").update(toDatabaseValues(parsed.data)).eq("id", id);
  if (error) {
    return NextResponse.json(
      { success: false, message: error.code === "23505" ? "Este slug já está em uso." : "Não foi possível atualizar o evento." },
      { status: error.code === "23505" ? 409 : 500 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: id,
    action: "event_updated",
    entity_type: "event",
    entity_id: id,
    metadata: {},
  });

  return NextResponse.json({ success: true, data: { id } });
}
