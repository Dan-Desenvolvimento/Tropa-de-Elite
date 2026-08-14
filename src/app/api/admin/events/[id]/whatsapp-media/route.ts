import { NextResponse } from "next/server";

import { getCurrentStaff, hasEventPermission } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const allowedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);

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
      { success: false, message: "Sem permissão para enviar imagens." },
      { status: 403 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { success: false, message: "Escolha uma imagem PNG ou JPG." },
      { status: 400 },
    );
  }
  const extension = allowedTypes.get(file.type);
  if (!extension || file.size <= 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { success: false, message: "Use uma imagem PNG ou JPG com até 5 MB." },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: rateLimit, error: rateLimitError } = await supabase.rpc(
    "consume_rate_limit",
    {
      rate_scope: "whatsapp_media_upload",
      rate_key_hash: `${staff.id}:${id}`,
      rate_max_attempts: 20,
      rate_window_seconds: 3600,
    },
  );
  if (
    rateLimitError ||
    !(rateLimit as { allowed?: boolean } | null)?.allowed
  ) {
    return NextResponse.json(
      { success: false, message: "Limite de imagens atingido. Aguarde antes de tentar novamente." },
      { status: 429 },
    );
  }

  const path = `${id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from("whatsapp-media")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (error) {
    return NextResponse.json(
      { success: false, message: "Não foi possível enviar a imagem. Confirme se a migration foi aplicada." },
      { status: 500 },
    );
  }
  const { data } = supabase.storage
    .from("whatsapp-media")
    .getPublicUrl(path);

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: id,
    action: "whatsapp_media_uploaded",
    entity_type: "event",
    entity_id: id,
    metadata: {
      path,
      content_type: file.type,
      size: file.size,
    },
  });

  return NextResponse.json({
    success: true,
    data: { url: data.publicUrl },
  });
}
