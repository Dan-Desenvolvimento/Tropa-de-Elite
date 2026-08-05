import { NextResponse } from "next/server";

import { adminEventSchema } from "@/features/events/admin-schema";
import { toDatabaseValues } from "@/features/events/server/event-mapper";
import {
  getCurrentStaff,
  hasGlobalPermission,
} from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const staff = await getCurrentStaff();

  if (!staff) {
    return NextResponse.json(
      {
        success: false,
        message: "Não autenticado.",
      },
      { status: 401 },
    );
  }

  if (!(await hasGlobalPermission("create_events"))) {
    return NextResponse.json(
      {
        success: false,
        message: "Sem permissão para criar eventos.",
      },
      { status: 403 },
    );
  }

  const parsed = adminEventSchema.safeParse(
    await request.json(),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message:
          parsed.error.issues[0]?.message ??
          "Dados inválidos.",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const values = toDatabaseValues(parsed.data);

  const { data: event, error } = await supabase
    .from("events")
    .insert({
      ...values,
      created_by: staff.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    const duplicate = error.code === "23505";

    return NextResponse.json(
      {
        success: false,
        message: duplicate
          ? "Este slug já está em uso."
          : "Não foi possível criar o evento.",
      },
      { status: duplicate ? 409 : 500 },
    );
  }

  if (!staff.isOwner) {
    const { error: accessError } = await supabase
      .from("event_staff")
      .upsert(
        {
          event_id: event.id,
          user_id: staff.id,
          role: "admin",
          can_edit_event: true,
          can_checkin: true,
          can_view_registrations: true,
          can_manage_registrations: true,
          can_anonymize_registrations: false,
          can_view_reports: true,
          can_view_logs: true,
        },
        {
          onConflict: "event_id,user_id",
        },
      );

    if (accessError) {
      await supabase
        .from("events")
        .delete()
        .eq("id", event.id);

      return NextResponse.json(
        {
          success: false,
          message:
            "O evento foi criado, mas não foi possível conceder o acesso inicial.",
        },
        { status: 500 },
      );
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: event.id,
    action: "event_created",
    entity_type: "event",
    entity_id: event.id,
    metadata: {},
  });

  return NextResponse.json(
    {
      success: true,
      data: { id: event.id },
    },
    { status: 201 },
  );
}
