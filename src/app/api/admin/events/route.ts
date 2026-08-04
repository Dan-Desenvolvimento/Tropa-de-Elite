import { NextResponse } from "next/server";

import { adminEventSchema } from "@/features/events/admin-schema";
import { toDatabaseValues } from "@/features/events/server/event-mapper";
import { getCurrentStaff } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
  if (staff.globalRole !== "admin") return NextResponse.json({ success: false, message: "Sem permissão." }, { status: 403 });

  const parsed = adminEventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const values = toDatabaseValues(parsed.data);
  const { data: event, error } = await supabase
    .from("events")
    .insert({ ...values, created_by: staff.id })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    const duplicate = error.code === "23505";
    return NextResponse.json(
      { success: false, message: duplicate ? "Este slug já está em uso." : "Não foi possível criar o evento." },
      { status: duplicate ? 409 : 500 },
    );
  }

  await Promise.all([
    supabase.from("event_staff").insert({ event_id: event.id, user_id: staff.id, role: "admin" }),
    supabase.from("audit_logs").insert({
      actor_id: staff.id,
      event_id: event.id,
      action: "event_created",
      entity_type: "event",
      entity_id: event.id,
      metadata: {},
    }),
  ]);

  return NextResponse.json({ success: true, data: { id: event.id } }, { status: 201 });
}
