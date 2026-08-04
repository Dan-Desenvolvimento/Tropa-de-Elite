import { after, NextResponse } from "next/server";

import { sendTicketConfirmation } from "@/features/emails/server/send-ticket-confirmation";
import { eventCustomFieldSchema } from "@/features/events/admin-schema";
import {
  createRegistrationSchema,
  pickCustomAnswers,
  registrationSchema,
} from "@/features/registrations/schema";
import type { ApiResult } from "@/lib/api-result";
import { getRequestIp, hashRequestIdentifier } from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";

type RegistrationResult = {
  ticketToken: string;
  ticketCode: string;
  status: "confirmed" | "waitlist";
};

type RegistrationRpcResult = {
  success: boolean;
  code?: string;
  registration_id?: string;
  status?: "confirmed" | "waitlist";
  ticket_token?: string;
  ticket_code?: string;
};

const publicMessages: Record<string, string> = {
  DUPLICATE_REGISTRATION:
    "Já existe uma inscrição vinculada a esses dados. Você pode solicitar o reenvio do ingresso.",
  EVENT_SOLD_OUT: "As vagas deste evento foram preenchidas.",
  REGISTRATION_CLOSED: "As inscrições para este evento não estão abertas.",
  PRIVACY_CONSENT_REQUIRED: "É necessário aceitar a Política de Privacidade.",
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const body: unknown = await request.json();
    const parsed = registrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResult<never>>(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: "Revise os dados informados e tente novamente.",
        },
        { status: 400 },
      );
    }

    if (parsed.data.website) {
      return NextResponse.json<ApiResult<never>>(
        { success: false, code: "INVALID_REQUEST", message: "Não foi possível processar a solicitação." },
        { status: 400 },
      );
    }

    const { slug } = await params;
    const supabase = createAdminClient();

    if (!process.env.CHECKIN_RATE_LIMIT_SECRET) {
      console.error("Public registration configuration is incomplete", {
        missingVariable: "CHECKIN_RATE_LIMIT_SECRET",
      });
      return NextResponse.json<ApiResult<never>>(
        {
          success: false,
          code: "SERVER_CONFIGURATION_ERROR",
          message:
            "O sistema de inscrições está temporariamente indisponível. A configuração do servidor precisa ser concluída.",
        },
        { status: 503 },
      );
    }

    const ipHash = hashRequestIdentifier(getRequestIp(request));
    const { data: rateLimit, error: rateLimitError } = await supabase.rpc("consume_rate_limit", {
      rate_scope: "public_registration",
      rate_key_hash: ipHash,
      rate_max_attempts: 5,
      rate_window_seconds: 900,
    });

    if (rateLimitError) {
      console.error("Public registration rate limit failed", {
        code: rateLimitError.code,
        message: rateLimitError.message,
        details: rateLimitError.details,
        hint: rateLimitError.hint,
      });
      return NextResponse.json<ApiResult<never>>(
        {
          success: false,
          code: "RATE_LIMIT_CONFIGURATION_ERROR",
          message:
            "O sistema de inscrições ainda não está totalmente configurado. Verifique as migrations do Supabase.",
        },
        { status: 503 },
      );
    }

    const rateResult = rateLimit as { allowed?: boolean; retry_after_seconds?: number } | null;
    if (!rateResult?.allowed) {
      return NextResponse.json<ApiResult<never>>(
        {
          success: false,
          code: "RATE_LIMITED",
          message: "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(rateResult?.retry_after_seconds ?? 900) },
        },
      );
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id,custom_fields")
      .eq("slug", slug)
      .maybeSingle<{ id: string; custom_fields: unknown }>();

    if (eventError) throw eventError;
    if (!event) {
      return NextResponse.json<ApiResult<never>>(
        { success: false, code: "EVENT_NOT_FOUND", message: "Evento não localizado." },
        { status: 404 },
      );
    }
    const customFieldsResult = eventCustomFieldSchema.array().safeParse(event.custom_fields);
    const customFields = customFieldsResult.success ? customFieldsResult.data : [];
    const validated = createRegistrationSchema(customFields).safeParse(body);
    if (!validated.success) {
      return NextResponse.json<ApiResult<never>>(
        {
          success: false,
          code: "VALIDATION_ERROR",
          message: validated.error.issues[0]?.message ?? "Revise os dados informados e tente novamente.",
        },
        { status: 400 },
      );
    }

    const { data, error } = await supabase.rpc("create_event_registration", {
      target_event_id: event.id,
      participant_name: validated.data.fullName,
      participant_email: validated.data.email,
      participant_phone: validated.data.phone,
      participant_city: validated.data.city,
      answers: pickCustomAnswers(customFields, validated.data.customAnswers),
      accepted_privacy: validated.data.privacyConsent,
      accepted_communications: validated.data.communicationsConsent,
    });

    if (error) throw error;
    const result = data as RegistrationRpcResult;

    if (
      !result.success ||
      !result.registration_id ||
      !result.ticket_token ||
      !result.ticket_code ||
      !result.status
    ) {
      const code = result.code ?? "REGISTRATION_FAILED";
      return NextResponse.json<ApiResult<never>>(
        {
          success: false,
          code,
          message: publicMessages[code] ?? "Não foi possível concluir a inscrição.",
        },
        { status: code === "DUPLICATE_REGISTRATION" ? 409 : 400 },
      );
    }

    if (result.status === "confirmed") {
      after(async () => {
        await sendTicketConfirmation(result.registration_id!);
      });
    }

    return NextResponse.json<ApiResult<RegistrationResult>>(
      {
        success: true,
        data: {
          ticketToken: result.ticket_token,
          ticketCode: result.ticket_code,
          status: result.status,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const errorRecord =
      error && typeof error === "object"
        ? (error as {
            code?: unknown;
            message?: unknown;
            details?: unknown;
            hint?: unknown;
          })
        : null;

    console.error("Public registration failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : errorRecord?.message,
      code: errorRecord?.code,
      details: errorRecord?.details,
      hint: errorRecord?.hint,
    });
    return NextResponse.json<ApiResult<never>>(
      {
        success: false,
        code: "INTERNAL_ERROR",
        message: "Não foi possível concluir sua inscrição agora. Tente novamente.",
      },
      { status: 500 },
    );
  }
}
