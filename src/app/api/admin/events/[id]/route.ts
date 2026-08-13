import { NextResponse } from "next/server";

import { adminEventSchema } from "@/features/events/admin-schema";
import { toDatabaseValues } from "@/features/events/server/event-mapper";
import {
  getCurrentStaff,
  hasEventPermission,
} from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
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

  const { id } = await params;

  if (!(await hasEventPermission(id, "edit_event"))) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Sem permissão para alterar este evento.",
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
  const { error } = await supabase
    .from("events")
    .update(toDatabaseValues(parsed.data))
    .eq("id", id);

  if (error) {
    console.error("Falha ao atualizar evento", {
      eventId: id,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });

    const message =
      error.code === "23505"
        ? "Este slug já está em uso."
        : error.code === "2201B"
          ? "A validação do nome do modelo WhatsApp no banco está desatualizada. Aplique a migration mais recente e tente novamente."
          : "Não foi possível atualizar o evento. Tente novamente ou consulte o log do servidor.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: error.code === "23505" ? 409 : 500,
      },
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

  return NextResponse.json({
    success: true,
    data: { id },
  });
}
