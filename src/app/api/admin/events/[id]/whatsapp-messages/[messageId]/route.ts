import { NextResponse } from "next/server";

import { whatsappMessageConfigSchema } from "@/features/whatsapp/message-config";
import {
  toMessageConfigDatabaseValues,
  toMessageConfigDto,
} from "@/features/whatsapp/server/message-config-mapper";
import { getCurrentStaff, hasEventPermission } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const selectFields = "id,event_id,display_name,description,template_name,template_language,preview_body,header_kind,header_media_url,body_variables,button_config,active,sort_order,created_at,updated_at";

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; messageId: string }>;
  },
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json(
      { success: false, message: "Não autenticado." },
      { status: 401 },
    );
  }
  const { id, messageId } = await params;
  if (!(await hasEventPermission(id, "edit_event"))) {
    return NextResponse.json(
      { success: false, message: "Sem permissão para editar comunicações." },
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
  const { data: running } = await supabase
    .from("whatsapp_dispatches")
    .select("id")
    .eq("event_id", id)
    .eq("message_config_id", messageId)
    .in("status", ["queued", "processing"])
    .limit(1);
  if (running?.length) {
    return NextResponse.json(
      { success: false, message: "Aguarde o envio em andamento antes de editar esta comunicação." },
      { status: 409 },
    );
  }
  const { data, error } = await supabase
    .from("event_whatsapp_messages")
    .update(toMessageConfigDatabaseValues(parsed.data))
    .eq("id", messageId)
    .eq("event_id", id)
    .select(selectFields)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      {
        success: false,
        message:
          error?.code === "23505"
            ? "Já existe uma comunicação com este nome ou modelo."
            : "Não foi possível atualizar a comunicação.",
      },
      { status: error?.code === "23505" ? 409 : 404 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: id,
    action: "whatsapp_message_updated",
    entity_type: "whatsapp_message",
    entity_id: messageId,
    metadata: { display_name: data.display_name },
  });

  return NextResponse.json({
    success: true,
    data: toMessageConfigDto(data),
  });
}

export async function DELETE(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; messageId: string }>;
  },
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json(
      { success: false, message: "Não autenticado." },
      { status: 401 },
    );
  }
  const { id, messageId } = await params;
  if (!(await hasEventPermission(id, "edit_event"))) {
    return NextResponse.json(
      { success: false, message: "Sem permissão para remover comunicações." },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  const { data: running } = await supabase
    .from("whatsapp_dispatches")
    .select("id")
    .eq("message_config_id", messageId)
    .in("status", ["queued", "processing"])
    .limit(1);
  if (running?.length) {
    return NextResponse.json(
      { success: false, message: "Aguarde o envio em andamento antes de remover esta comunicação." },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from("event_whatsapp_messages")
    .delete()
    .eq("id", messageId)
    .eq("event_id", id)
    .select("id,display_name")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { success: false, message: "Comunicação não encontrada." },
      { status: 404 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: id,
    action: "whatsapp_message_deleted",
    entity_type: "whatsapp_message",
    entity_id: messageId,
    metadata: { display_name: data.display_name },
  });

  return NextResponse.json({ success: true });
}
