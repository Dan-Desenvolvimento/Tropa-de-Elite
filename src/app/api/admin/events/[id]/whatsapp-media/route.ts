import { NextResponse } from "next/server";
import { z } from "zod";

import {
  hasExpectedWhatsAppMediaSignature,
  WHATSAPP_MEDIA_RULES,
  type WhatsAppMediaMimeType,
} from "@/features/whatsapp/media-validation";
import { getCurrentStaff, hasEventPermission } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "whatsapp-media";
const SIGNATURE_BYTES = 32;
const prepareSchema = z.object({
  action: z.literal("prepare"),
  fileName: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "video/mp4"]),
  size: z.number().int().positive().max(16 * 1024 * 1024),
});
const finalizeSchema = z.object({
  action: z.literal("finalize"),
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(?:jpg|png|mp4)$/),
});
const requestSchema = z.discriminatedUnion("action", [prepareSchema, finalizeSchema]);

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
      { success: false, message: "Sem permissão para enviar mídias." },
      { status: 403 },
    );
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Solicitação de mídia inválida." },
      { status: 400 },
    );
  }

  return parsed.data.action === "prepare"
    ? prepareUpload({ eventId: id, staffId: staff.id, input: parsed.data })
    : finalizeUpload({ eventId: id, staffId: staff.id, path: parsed.data.path });
}

async function prepareUpload({
  eventId,
  staffId,
  input,
}: {
  eventId: string;
  staffId: string;
  input: z.infer<typeof prepareSchema>;
}) {
  const mediaType = WHATSAPP_MEDIA_RULES[input.contentType];
  if (input.size > mediaType.maxSize) {
    return NextResponse.json(
      {
        success: false,
        message: mediaType.kind === "video"
          ? "Use um vídeo MP4 com até 16 MB. A Meta exige vídeo H.264 e áudio AAC."
          : "Use uma imagem PNG ou JPG com até 5 MB.",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const cleanupBefore = new Date().toISOString();
  const { data: expiredUploads } = await supabase
    .from("whatsapp_media_uploads")
    .select("id,object_path")
    .eq("event_id", eventId)
    .eq("requested_by", staffId)
    .eq("status", "prepared")
    .lt("expires_at", cleanupBefore)
    .limit(20)
    .returns<Array<{ id: string; object_path: string }>>();
  if (expiredUploads?.length) {
    await supabase.storage
      .from(BUCKET)
      .remove(expiredUploads.map((upload) => upload.object_path));
    await supabase
      .from("whatsapp_media_uploads")
      .delete()
      .in("id", expiredUploads.map((upload) => upload.id));
  }

  const { data: rateLimit, error: rateLimitError } = await supabase.rpc(
    "consume_rate_limit",
    {
      rate_scope: "whatsapp_media_upload",
      rate_key_hash: `${staffId}:${eventId}`,
      rate_max_attempts: 20,
      rate_window_seconds: 3600,
    },
  );
  if (
    rateLimitError ||
    !(rateLimit as { allowed?: boolean } | null)?.allowed
  ) {
    return NextResponse.json(
      { success: false, message: "Limite de mídias atingido. Aguarde antes de tentar novamente." },
      { status: 429 },
    );
  }

  const path = `${eventId}/${crypto.randomUUID()}.${mediaType.extension}`;
  const { error: uploadRecordError } = await supabase
    .from("whatsapp_media_uploads")
    .insert({
      event_id: eventId,
      requested_by: staffId,
      object_path: path,
      media_kind: mediaType.kind,
      expected_mime_type: input.contentType,
      expected_size: input.size,
    });
  if (uploadRecordError) {
    return migrationError();
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: false });
  if (error || !data) {
    await supabase.from("whatsapp_media_uploads").delete().eq("object_path", path);
    return NextResponse.json(
      { success: false, message: "Não foi possível preparar o envio da mídia." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      path: data.path,
      token: data.token,
      signedUrl: data.signedUrl,
      kind: mediaType.kind,
    },
  });
}

async function finalizeUpload({
  eventId,
  staffId,
  path,
}: {
  eventId: string;
  staffId: string;
  path: string;
}) {
  if (!path.startsWith(`${eventId}/`)) {
    return NextResponse.json(
      { success: false, message: "Esta mídia não pertence ao evento." },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  const { data: upload, error: uploadError } = await supabase
    .from("whatsapp_media_uploads")
    .select("id,media_kind,expected_mime_type,expected_size,status,expires_at")
    .eq("event_id", eventId)
    .eq("requested_by", staffId)
    .eq("object_path", path)
    .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .maybeSingle<{
      id: string;
      media_kind: "image" | "video";
      expected_mime_type: WhatsAppMediaMimeType;
      expected_size: number;
      status: "prepared" | "finalized";
      expires_at: string;
    }>();
  if (uploadError || !upload) {
    return NextResponse.json(
      { success: false, message: "Autorização de upload inválida ou expirada." },
      { status: 404 },
    );
  }
  if (upload.status === "prepared" && new Date(upload.expires_at).getTime() < Date.now()) {
    await supabase.storage.from(BUCKET).remove([path]);
    await supabase.from("whatsapp_media_uploads").delete().eq("id", upload.id);
    return NextResponse.json(
      { success: false, message: "A autorização de upload expirou. Envie o arquivo novamente." },
      { status: 410 },
    );
  }

  const { folder, name } = splitStoragePath(path);
  const { data: objects, error: listError } = await supabase.storage
    .from(BUCKET)
    .list(folder, { limit: 2, search: name });
  const object = objects?.find((item) => item.name === name);
  const size = Number(object?.metadata?.size ?? 0);
  const mimeType = String(object?.metadata?.mimetype ?? "").toLowerCase();
  const expected = WHATSAPP_MEDIA_RULES[upload.expected_mime_type];
  const validMetadata =
    !listError &&
    object?.id &&
    size === upload.expected_size &&
    size <= expected.maxSize &&
    mimeType === upload.expected_mime_type;
  if (!validMetadata) {
    if (!listError && object?.id) {
      await supabase.storage.from(BUCKET).remove([path]);
    }
    return NextResponse.json(
      {
        success: false,
        message: listError
          ? "Não foi possível verificar a mídia no armazenamento. Tente finalizar novamente."
          : "A mídia enviada não corresponde ao tipo ou tamanho autorizado.",
      },
      { status: listError ? 502 : 422 },
    );
  }

  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const signature = await fetchPublicSignature(publicUrl);
  if (
    !signature ||
    signature.byteLength < 12 ||
    !hasExpectedWhatsAppMediaSignature(signature, upload.expected_mime_type)
  ) {
    await supabase.storage.from(BUCKET).remove([path]);
    return NextResponse.json(
      { success: false, message: "O conteúdo do arquivo não corresponde ao formato informado." },
      { status: 422 },
    );
  }

  if (upload.status !== "finalized") {
    const finalizedAt = new Date().toISOString();
    const { data: finalizedUpload, error: finalizeError } = await supabase
      .from("whatsapp_media_uploads")
      .update({ status: "finalized", finalized_at: finalizedAt })
      .eq("id", upload.id)
      .eq("status", "prepared")
      .gt("expires_at", finalizedAt)
      .select("id")
      .maybeSingle<{ id: string }>();
    if (finalizeError) {
      return NextResponse.json(
        { success: false, message: "Não foi possível concluir o envio da mídia." },
        { status: 500 },
      );
    }
    if (finalizedUpload) {
      await supabase.from("audit_logs").insert({
        actor_id: staffId,
        event_id: eventId,
        action: "whatsapp_media_uploaded",
        entity_type: "event",
        entity_id: eventId,
        metadata: {
          path,
          content_type: upload.expected_mime_type,
          size,
          media_kind: upload.media_kind,
        },
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: { url: publicUrl, kind: upload.media_kind },
  });
}

async function fetchPublicSignature(publicUrl: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(publicUrl, {
      headers: { Range: `bytes=0-${SIGNATURE_BYTES - 1}` },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok || !response.body) return null;
    const reader = response.body.getReader();
    const signature = new Uint8Array(SIGNATURE_BYTES);
    let offset = 0;
    while (offset < SIGNATURE_BYTES) {
      const { value, done } = await reader.read();
      if (done || !value) break;
      const chunk = value.subarray(0, SIGNATURE_BYTES - offset);
      signature.set(chunk, offset);
      offset += chunk.byteLength;
    }
    await reader.cancel().catch(() => undefined);
    return signature.subarray(0, offset);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function splitStoragePath(path: string) {
  const segments = path.split("/");
  return {
    folder: segments.slice(0, -1).join("/"),
    name: segments.at(-1) ?? "",
  };
}

function migrationError() {
  return NextResponse.json(
    { success: false, message: "Aplique a migration 0025 antes de enviar mídias." },
    { status: 503 },
  );
}
