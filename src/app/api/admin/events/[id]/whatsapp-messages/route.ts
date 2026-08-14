import { NextResponse } from "next/server";

import { whatsappMessageConfigSchema } from "@/features/whatsapp/message-config";
import {
  toMessageConfigDatabaseValues,
  toMessageConfigDto,
} from "@/features/whatsapp/server/message-config-mapper";
import {
  getCurrentStaff,
  hasAnyEventPermission,
  hasEventPermission,
} from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const selectFields = "id,event_id,display_name,description,template_name,template_language,preview_body,header_kind,header_media_url,body_variables,button_config,active,sort_order,created_at,updated_at";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json(
      { success: false, message: "Não autenticado." },
      { status: 401 },
    );
  }
  const { id } = await params;
  if (!(await hasAnyEventPermission(id, ["edit_event", "manage_registrations", "view_reports"]))) {
    return NextResponse.json(
      { success: false, message: "Sem permissão para consultar as comunicações." },
      { status: 403 },
    );
  }

  const { data, error } = await createAdminClient()
    .from("event_whatsapp_messages")
    .select(selectFields)
    .eq("event_id", id)
    .order("sort_order")
    .order("created_at");

  if (error) {
    return NextResponse.json(
      { success: false, message: "Não foi possível carregar as comunicações. Aplique a migration mais recente." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: (data ?? []).map((row) => toMessageConfigDto(row)),
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json(
      { success: false, message: "Não autenticado." },
      { status: 401 },
    );
  }
  const { id } = await params;
  if (!(await hasEventPermission(id, "edit_event"))) {
    return NextResponse.json(
      { success: false, message: "Sem permissão para criar comunicações." },
      { status: 403 },
    );
  }

  const parsed = whatsappMessageConfigSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Configuração inválida.",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("event_whatsapp_messages")
    .insert({
      event_id: id,
      ...toMessageConfigDatabaseValues(parsed.data),
      created_by: staff.id,
    })
    .select(selectFields)
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        success: false,
        message:
          error?.code === "23505"
            ? "Já existe uma comunicação com este nome ou modelo neste evento."
            : "Não foi possível salvar a comunicação.",
      },
      { status: error?.code === "23505" ? 409 : 500 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: id,
    action: "whatsapp_message_created",
    entity_type: "whatsapp_message",
    entity_id: data.id,
    metadata: { display_name: data.display_name },
  });

  return NextResponse.json(
    { success: true, data: toMessageConfigDto(data) },
    { status: 201 },
  );
}
