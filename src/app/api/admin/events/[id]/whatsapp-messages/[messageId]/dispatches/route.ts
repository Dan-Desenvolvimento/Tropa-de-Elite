import { after, NextResponse } from "next/server";
import { z } from "zod";

import {
  createDispatch,
  findRecoverableDispatchIds,
  processDispatch,
} from "@/features/whatsapp/server/dispatch-service";
import {
  getCurrentStaff,
  hasAnyEventPermission,
  hasEventPermission,
} from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 300;

const dispatchSchema = z
  .object({
    scope: z.enum(["bulk", "test", "individual"]),
    registrationId: z.string().uuid().optional(),
    idempotencyKey: z.string().uuid(),
  })
  .superRefine((value, context) => {
    if (value.scope !== "bulk" && !value.registrationId) {
      context.addIssue({
        code: "custom",
        path: ["registrationId"],
        message: "Escolha uma pessoa para o envio individual.",
      });
    }
  });

export async function GET(
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
  const canManageDispatches = await hasEventPermission(id, "manage_registrations");
  if (!(await hasAnyEventPermission(id, ["edit_event", "manage_registrations", "view_reports"]))) {
    return NextResponse.json(
      { success: false, message: "Sem permissão para consultar os envios." },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  const { data: message } = await supabase
    .from("event_whatsapp_messages")
    .select("id")
    .eq("id", messageId)
    .eq("event_id", id)
    .maybeSingle<{ id: string }>();
  if (!message) {
    return NextResponse.json(
      { success: false, message: "Comunicação não encontrada." },
      { status: 404 },
    );
  }

  if (canManageDispatches) {
    const recoverableIds = await findRecoverableDispatchIds({
      eventId: id,
      messageConfigId: messageId,
    });
    if (recoverableIds.length > 0) {
      after(async () => {
        await Promise.allSettled(
          recoverableIds.map((dispatchId) => processDispatch(dispatchId)),
        );
      });
    }
  }

  const { data: dispatches, error } = await supabase
    .from("whatsapp_dispatches")
    .select("id,message_config_id,scope,status,eligible_count,processed_count,sent_count,failed_count,skipped_count,invalid_phone_count,error_message,started_at,finished_at,created_at")
    .eq("event_id", id)
    .eq("message_config_id", messageId)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) {
    return NextResponse.json(
      { success: false, message: "Não foi possível carregar o histórico de envios." },
      { status: 500 },
    );
  }

  const dispatchIds = (dispatches ?? []).map((dispatch) => dispatch.id);
  const { data: logs, error: logsError } = dispatchIds.length
    ? await supabase
        .from("whatsapp_logs")
        .select("dispatch_id,status")
        .in("dispatch_id", dispatchIds)
    : { data: [], error: null };
  if (logsError) {
    return NextResponse.json(
      { success: false, message: "Não foi possível consolidar as entregas do WhatsApp." },
      { status: 500 },
    );
  }

  const deliveryCounts = new Map<
    string,
    { sent: number; delivered: number; read: number; failed: number; pending: number }
  >();
  for (const log of logs ?? []) {
    if (!log.dispatch_id) continue;
    const counts = deliveryCounts.get(log.dispatch_id) ?? {
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      pending: 0,
    };
    if (["sent", "delivered", "read"].includes(log.status)) counts.sent += 1;
    if (log.status === "failed") counts.failed += 1;
    if (log.status === "pending") counts.pending += 1;
    if (log.status === "delivered") counts.delivered += 1;
    if (log.status === "read") {
      counts.read += 1;
      counts.delivered += 1;
    }
    deliveryCounts.set(log.dispatch_id, counts);
  }

  return NextResponse.json({
    success: true,
    data: (dispatches ?? []).map((dispatch) => ({
      id: dispatch.id,
      messageConfigId: dispatch.message_config_id,
      scope: dispatch.scope,
      status: dispatch.status,
      eligibleCount: dispatch.eligible_count,
      processedCount: Math.max(
        dispatch.processed_count,
        (deliveryCounts.get(dispatch.id)?.sent ?? 0) +
          (deliveryCounts.get(dispatch.id)?.failed ?? 0) +
          (deliveryCounts.get(dispatch.id)?.pending ?? 0),
      ),
      sentCount: deliveryCounts.get(dispatch.id)?.sent ?? dispatch.sent_count,
      failedCount: deliveryCounts.get(dispatch.id)?.failed ?? dispatch.failed_count,
      skippedCount: dispatch.skipped_count,
      invalidPhoneCount: dispatch.invalid_phone_count,
      deliveredCount: deliveryCounts.get(dispatch.id)?.delivered ?? 0,
      readCount: deliveryCounts.get(dispatch.id)?.read ?? 0,
      errorMessage: dispatch.error_message,
      startedAt: dispatch.started_at,
      finishedAt: dispatch.finished_at,
      createdAt: dispatch.created_at,
    })),
  });
}

export async function POST(
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
  if (!(await hasEventPermission(id, "manage_registrations"))) {
    return NextResponse.json(
      { success: false, message: "Sem permissão para enviar comunicações." },
      { status: 403 },
    );
  }
  if (
    !process.env.WHATSAPP_PHONE_NUMBER_ID ||
    !process.env.WHATSAPP_ACCESS_TOKEN ||
    !process.env.WHATSAPP_API_VERSION ||
    !process.env.NEXT_PUBLIC_APP_URL
  ) {
    return NextResponse.json(
      { success: false, message: "A API do WhatsApp ainda não está configurada no ambiente." },
      { status: 503 },
    );
  }

  const parsed = dispatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Solicitação inválida.",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const isBulk = parsed.data.scope === "bulk";
  const { data: rateLimit, error: rateLimitError } = await supabase.rpc(
    "consume_rate_limit",
    {
      rate_scope: isBulk ? "whatsapp_dispatch_bulk" : "whatsapp_dispatch_test",
      rate_key_hash: `${staff.id}:${id}:${messageId}`,
      rate_max_attempts: isBulk ? 5 : 30,
      rate_window_seconds: 3600,
    },
  );
  if (
    rateLimitError ||
    !(rateLimit as { allowed?: boolean } | null)?.allowed
  ) {
    return NextResponse.json(
      {
        success: false,
        message: isBulk
          ? "O limite de disparos em massa desta hora foi atingido. Aguarde antes de tentar novamente."
          : "O limite de testes desta hora foi atingido. Aguarde antes de tentar novamente.",
      },
      { status: 429 },
    );
  }

  try {
    const dispatch = await createDispatch({
      eventId: id,
      messageConfigId: messageId,
      registrationId: parsed.data.registrationId,
      scope: parsed.data.scope,
      idempotencyKey: parsed.data.idempotencyKey,
      requestedBy: staff.id,
    });
    if (dispatch.created) {
      await supabase.from("audit_logs").insert({
        actor_id: staff.id,
        event_id: id,
        action: "whatsapp_dispatch_requested",
        entity_type: "whatsapp_dispatch",
        entity_id: dispatch.id,
        metadata: {
          scope: parsed.data.scope,
          eligible: dispatch.eligible_count,
        },
      });

      after(async () => {
        try {
          await processDispatch(dispatch.id);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Falha inesperada no processamento.";
          await createAdminClient()
            .from("whatsapp_dispatches")
            .update({
              status: "failed",
              lease_expires_at: null,
              error_message: message.slice(0, 1000),
              finished_at: new Date().toISOString(),
            })
            .eq("id", dispatch.id);
          console.error("Falha no disparo configurável do WhatsApp", {
            dispatchId: dispatch.id,
            message,
          });
        }
      });
    }

    const responseDispatch = {
      id: dispatch.id,
      status: dispatch.status,
      eligible_count: dispatch.eligible_count,
    };

    return NextResponse.json(
      { success: true, data: responseDispatch },
      { status: dispatch.created ? 202 : 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Não foi possível iniciar o envio.",
      },
      { status: 409 },
    );
  }
}
