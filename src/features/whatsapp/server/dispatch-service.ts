import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { WhatsAppMessageConfigRow } from "@/features/whatsapp/message-config";
import {
  assertEligibleRegistration,
  createConfiguredMessageComponents,
  normalizeBrazilianPhone,
  renderConfiguredButtonUrl,
  renderConfiguredPreview,
  type WhatsAppEventData,
  type WhatsAppRegistrationData,
} from "@/features/whatsapp/server/generic-message";

type DispatchScope = "bulk" | "test" | "individual";
const DISPATCH_LEASE_MS = 10 * 60 * 1000;

export type AudienceBreakdown = {
  total: number;
  eligible: number;
  withoutConsent: number;
  notConfirmed: number;
  invalidPhone: number;
};

export async function getCommunicationContext(
  eventId: string,
  messageConfigId: string,
) {
  const supabase = createAdminClient();
  const [{ data: event, error: eventError }, { data: config, error: configError }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id,name,start_at,timezone,venue_name,address,city,whatsapp_group_url")
        .eq("id", eventId)
        .single<WhatsAppEventData>(),
      supabase
        .from("event_whatsapp_messages")
        .select("id,event_id,display_name,description,template_name,template_language,preview_body,header_kind,header_media_url,body_variables,button_config,active,sort_order,created_at,updated_at")
        .eq("id", messageConfigId)
        .eq("event_id", eventId)
        .single<WhatsAppMessageConfigRow>(),
    ]);
  if (eventError || !event) throw new Error("Evento não encontrado.");
  if (configError || !config) throw new Error("Comunicação não encontrada.");
  return { event, config };
}

export async function getAudienceBreakdown(eventId: string) {
  return (await getAudienceSnapshot(eventId)).breakdown;
}

async function getAudienceSnapshot(eventId: string) {
  const { data, error } = await createAdminClient()
    .from("registrations")
    .select("id,phone,status,communications_consent")
    .eq("event_id", eventId)
    .returns<Array<Pick<WhatsAppRegistrationData, "id" | "phone" | "status" | "communications_consent">>>();
  if (error) throw error;
  const rows = data ?? [];
  let withoutConsent = 0;
  let notConfirmed = 0;
  let invalidPhone = 0;
  let eligible = 0;
  const eligibleRegistrationIds: string[] = [];
  for (const registration of rows) {
    if (registration.status !== "confirmed") {
      notConfirmed += 1;
    } else if (!registration.communications_consent) {
      withoutConsent += 1;
    } else if (!normalizeBrazilianPhone(registration.phone)) {
      invalidPhone += 1;
    } else {
      eligible += 1;
      eligibleRegistrationIds.push(registration.id);
    }
  }
  return {
    breakdown: {
      total: rows.length,
      eligible,
      withoutConsent,
      notConfirmed,
      invalidPhone,
    } satisfies AudienceBreakdown,
    eligibleRegistrationIds,
  };
}

export async function getPreviewRegistration(
  eventId: string,
  registrationId?: string,
) {
  let query = createAdminClient()
    .from("registrations")
    .select("id,full_name,phone,ticket_code,ticket_token,status,communications_consent")
    .eq("event_id", eventId)
    .eq("status", "confirmed")
    .eq("communications_consent", true)
    .order("registered_at", { ascending: false })
    .limit(1);
  if (registrationId) query = query.eq("id", registrationId);
  const { data, error } = await query.maybeSingle<WhatsAppRegistrationData>();
  if (error) throw error;
  if (!data) throw new Error("Nenhum participante elegível foi encontrado para a prévia.");
  return data;
}

export async function buildCommunicationPreview({
  eventId,
  messageConfigId,
  registrationId,
  useSampleParticipant = false,
}: {
  eventId: string;
  messageConfigId: string;
  registrationId?: string;
  useSampleParticipant?: boolean;
}) {
  const [{ event, config }, registration, audience] = await Promise.all([
    getCommunicationContext(eventId, messageConfigId),
    useSampleParticipant
      ? Promise.resolve(samplePreviewRegistration())
      : getPreviewRegistration(eventId, registrationId),
    getAudienceBreakdown(eventId),
  ]);
  return {
    participant: {
      id: registration.id,
      name: registration.full_name,
      phone: useSampleParticipant
        ? "Telefone protegido"
        : maskedPhone(registration.phone),
    },
    body: renderConfiguredPreview({ config, event, registration }),
    headerKind: config.header_kind,
    headerMediaUrl: config.header_media_url,
    buttonLabel:
      config.button_config.mode === "none"
        ? null
        : config.button_config.label,
    buttonUrl: renderConfiguredButtonUrl({ config, event, registration }),
    audience,
  };
}

export async function createDispatch({
  eventId,
  messageConfigId,
  registrationId,
  scope,
  idempotencyKey,
  requestedBy,
}: {
  eventId: string;
  messageConfigId: string;
  registrationId?: string;
  scope: DispatchScope;
  idempotencyKey: string;
  requestedBy: string;
}) {
  const [{ config }, audienceSnapshot, targetRegistration] = await Promise.all([
    getCommunicationContext(eventId, messageConfigId),
    getAudienceSnapshot(eventId),
    registrationId
      ? getPreviewRegistration(eventId, registrationId)
      : Promise.resolve(null),
  ]);
  const audience = audienceSnapshot.breakdown;
  if (scope === "bulk" && registrationId) {
    throw new Error("O envio em massa não aceita um participante individual.");
  }
  if (scope !== "bulk" && !targetRegistration) {
    throw new Error("Escolha uma pessoa elegível para este envio.");
  }
  if (targetRegistration) assertEligibleRegistration(targetRegistration);
  if (scope === "bulk" && audience.eligible === 0) {
    throw new Error("Não há participantes confirmados, com consentimento e telefone válido.");
  }
  if (!config.active) throw new Error("Ative esta comunicação antes de enviar.");
  const targetRegistrationIds = scope === "bulk"
    ? audienceSnapshot.eligibleRegistrationIds
    : [targetRegistration!.id];
  const eligibleCount = targetRegistrationIds.length;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("whatsapp_dispatches")
    .insert({
      event_id: eventId,
      message_config_id: messageConfigId,
      registration_id: registrationId ?? null,
      scope,
      status: "queued",
      idempotency_key: idempotencyKey,
      config_snapshot: snapshotConfig(config),
      target_registration_ids: targetRegistrationIds,
      eligible_count: eligibleCount,
      invalid_phone_count: scope === "bulk" ? audience.invalidPhone : 0,
      requested_by: requestedBy,
    })
    .select("id,status,eligible_count")
    .single<{ id: string; status: string; eligible_count: number }>();
  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("whatsapp_dispatches")
      .select("id,status,eligible_count,scope,registration_id")
      .eq("idempotency_key", idempotencyKey)
      .eq("event_id", eventId)
      .eq("message_config_id", messageConfigId)
      .eq("requested_by", requestedBy)
      .maybeSingle<{
        id: string;
        status: string;
        eligible_count: number;
        scope: DispatchScope;
        registration_id: string | null;
      }>();
    if (
      existing &&
      existing.scope === scope &&
      existing.registration_id === (registrationId ?? null)
    ) {
      return {
        id: existing.id,
        status: existing.status,
        eligible_count: existing.eligible_count,
        created: false as const,
      };
    }
    if (existing) {
      throw new Error("A chave desta solicitação já foi usada com outros destinatários.");
    }
    throw new Error("Já existe um envio em andamento para esta comunicação.");
  }
  if (error || !data) throw error ?? new Error("Não foi possível criar o envio.");
  return { ...data, created: true as const };
}

export async function processDispatch(dispatchId: string) {
  const supabase = createAdminClient();
  const { data: dispatch, error } = await supabase
    .from("whatsapp_dispatches")
    .select("id,event_id,message_config_id,registration_id,target_registration_ids,scope,status,invalid_phone_count,skipped_count,lease_expires_at,attempt_count,updated_at,created_at")
    .eq("id", dispatchId)
    .maybeSingle<{
      id: string;
      event_id: string;
      message_config_id: string;
      registration_id: string | null;
      target_registration_ids: string[];
      scope: DispatchScope;
      status: string;
      invalid_phone_count: number;
      skipped_count: number;
      lease_expires_at: string | null;
      attempt_count: number;
      updated_at: string;
      created_at: string;
    }>();
  if (error || !dispatch) throw error ?? new Error("Envio não encontrado.");
  if (!["queued", "processing"].includes(dispatch.status)) return;

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion = process.env.WHATSAPP_API_VERSION;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!phoneNumberId || !accessToken || !apiVersion || !appUrl) {
    throw new Error("WhatsApp Cloud API não está configurada no ambiente.");
  }

  const claimedDispatch = await claimDispatchLease(dispatch);
  if (!claimedDispatch) return;

  const { event, config } = await getCommunicationContext(
    dispatch.event_id,
    dispatch.message_config_id,
  );
  const frozenTargetIds = dispatch.target_registration_ids ?? [];
  let query = supabase
    .from("registrations")
    .select("id,full_name,phone,ticket_code,ticket_token,status,communications_consent")
    .eq("event_id", dispatch.event_id)
    .eq("status", "confirmed")
    .eq("communications_consent", true)
    .order("registered_at");
  if (dispatch.registration_id) query = query.eq("id", dispatch.registration_id);
  if (frozenTargetIds.length === 0) {
    query = query.lte("registered_at", dispatch.created_at);
  }
  const { data: registrations, error: registrationsError } = await query.returns<WhatsAppRegistrationData[]>();
  if (registrationsError) throw registrationsError;
  const frozenTargetIdSet = new Set(frozenTargetIds);
  const targets = (registrations ?? []).filter(
    (registration) =>
      (frozenTargetIds.length === 0 || frozenTargetIdSet.has(registration.id)) &&
      Boolean(normalizeBrazilianPhone(registration.phone)),
  );
  if (dispatch.scope !== "bulk" && targets.length !== 1) {
    throw new Error("O participante deste envio não está mais elegível.");
  }

  const { data: existingLogs, error: existingLogsError } = await supabase
    .from("whatsapp_logs")
    .select("id,registration_id,status")
    .eq("dispatch_id", dispatch.id)
    .returns<Array<{
      id: string;
      registration_id: string | null;
      status: "pending" | "sent" | "delivered" | "read" | "failed";
    }>>();
  if (existingLogsError) throw existingLogsError;
  const ambiguousPendingLogs = (existingLogs ?? []).filter(
    (log) => log.status === "pending",
  );
  if (ambiguousPendingLogs.length > 0) {
    const { error: ambiguousLogsError } = await supabase
      .from("whatsapp_logs")
      .update({
        status: "failed",
        error_message:
          "O processamento foi interrompido após iniciar esta mensagem. O envio não será repetido automaticamente para evitar duplicidade.",
      })
      .in(
        "id",
        ambiguousPendingLogs.map((log) => log.id),
      );
    if (ambiguousLogsError) throw ambiguousLogsError;
    for (const log of ambiguousPendingLogs) log.status = "failed";
  }
  const existingByRegistration = new Map(
    (existingLogs ?? [])
      .filter((log) => log.registration_id)
      .map((log) => [log.registration_id as string, log]),
  );

  let sent = (existingLogs ?? []).filter((log) =>
    ["sent", "delivered", "read"].includes(log.status),
  ).length;
  let failed = (existingLogs ?? []).filter((log) => log.status === "failed").length;
  let skipped = Math.max(
    dispatch.skipped_count,
    dispatch.scope === "bulk" && frozenTargetIds.length > 0
      ? frozenTargetIds.length - targets.length
      : 0,
  );
  const invalidPhone = dispatch.scope === "bulk"
    ? dispatch.invalid_phone_count
    : 0;
  let processed = sent + failed + skipped;
  for (let index = 0; index < targets.length; index += 5) {
    const batch = targets.slice(index, index + 5);
    const results = await Promise.all(
      batch.map(async (registration) => {
        const recipient = normalizeBrazilianPhone(registration.phone);
        if (!recipient) return "skipped" as const;
        const existingLog = existingByRegistration.get(registration.id);
        if (existingLog) {
          return "already_processed" as const;
        }
        const { data: log, error: logError } = await supabase
          .from("whatsapp_logs")
          .insert({
            event_id: event.id,
            registration_id: registration.id,
            dispatch_id: dispatch.id,
            message_config_id: config.id,
            message_type: `configured:${config.id}`,
            template_name: config.template_name,
            template_language: config.template_language,
            recipient,
            status: "pending",
            payload_snapshot: {
              display_name: config.display_name,
              template_name: config.template_name,
              template_language: config.template_language,
            },
          })
          .select("id")
          .single<{ id: string }>();
        if (logError?.code === "23505") return "skipped" as const;
        if (logError || !log) return "failed" as const;
        try {
          const response = await fetch(
            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: recipient,
                type: "template",
                template: {
                  name: config.template_name,
                  language: { code: config.template_language },
                  components: createConfiguredMessageComponents({
                    config,
                    event,
                    registration,
                    appUrl,
                  }),
                },
              }),
            },
          );
          const body = (await response.json().catch(() => ({}))) as {
            messages?: Array<{ id?: string }>;
            error?: { message?: string; error_data?: { details?: string } };
          };
          if (!response.ok) {
            throw new Error(
              body.error?.error_data?.details ??
                body.error?.message ??
                `WhatsApp HTTP ${response.status}`,
            );
          }
          const providerMessageId = body.messages?.[0]?.id;
          if (!providerMessageId) {
            throw new Error("O WhatsApp não confirmou o identificador da mensagem enviada.");
          }
          const { error: sentLogError } = await supabase
            .from("whatsapp_logs")
            .update({
              status: "sent",
              provider_message_id: providerMessageId,
              sent_at: new Date().toISOString(),
              error_message: null,
            })
            .eq("id", log.id);
          if (sentLogError) {
            throw new Error("A mensagem foi aceita pelo WhatsApp, mas o histórico não pôde ser atualizado.");
          }
          return "sent" as const;
        } catch (sendError) {
          const { error: failedLogError } = await supabase
            .from("whatsapp_logs")
            .update({
              status: "failed",
              error_message: (sendError instanceof Error
                ? sendError.message
                : "Falha no envio"
              ).slice(0, 1000),
            })
            .eq("id", log.id);
          if (failedLogError) {
            console.error("Falha ao registrar erro do WhatsApp", {
              dispatchId: dispatch.id,
              registrationId: registration.id,
              code: failedLogError.code,
            });
          }
          return "failed" as const;
        }
      }),
    );
    for (const result of results) {
      if (result === "already_processed") continue;
      processed += 1;
      if (result === "sent") sent += 1;
      else if (result === "failed") failed += 1;
      else skipped += 1;
    }
    const { error: progressError } = await supabase
      .from("whatsapp_dispatches")
      .update({
        processed_count: processed,
        sent_count: sent,
        failed_count: failed,
        skipped_count: skipped,
        invalid_phone_count: invalidPhone,
        lease_expires_at: nextLeaseExpiration(),
      })
      .eq("id", dispatch.id);
    if (progressError) throw progressError;
  }

  const finalStatus =
    failed === 0
      ? "completed"
      : sent > 0
        ? "partial"
        : "failed";
  const { error: finishError } = await supabase
    .from("whatsapp_dispatches")
    .update({
      status: finalStatus,
      processed_count: processed,
      sent_count: sent,
      failed_count: failed,
      skipped_count: skipped,
      invalid_phone_count: invalidPhone,
      lease_expires_at: null,
      finished_at: new Date().toISOString(),
    })
    .eq("id", dispatch.id);
  if (finishError) throw finishError;
}

export async function findRecoverableDispatchIds({
  eventId,
  messageConfigId,
}: {
  eventId: string;
  messageConfigId: string;
}) {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const staleBefore = new Date(Date.now() - DISPATCH_LEASE_MS).toISOString();
  const [queuedResult, expiredResult, legacyStaleResult] =
    await Promise.all([
      supabase
        .from("whatsapp_dispatches")
        .select("id")
        .eq("event_id", eventId)
        .eq("message_config_id", messageConfigId)
        .eq("status", "queued")
        .limit(5),
      supabase
        .from("whatsapp_dispatches")
        .select("id")
        .eq("event_id", eventId)
        .eq("message_config_id", messageConfigId)
        .eq("status", "processing")
        .lt("lease_expires_at", now)
        .limit(5),
      supabase
        .from("whatsapp_dispatches")
        .select("id")
        .eq("event_id", eventId)
        .eq("message_config_id", messageConfigId)
        .eq("status", "processing")
        .is("lease_expires_at", null)
        .lt("updated_at", staleBefore)
        .limit(5),
    ]);
  const recoveryError =
    queuedResult.error ?? expiredResult.error ?? legacyStaleResult.error;
  if (recoveryError) throw recoveryError;
  const queued = queuedResult.data;
  const expired = expiredResult.data;
  const legacyStale = legacyStaleResult.data;
  return [...new Set(
    [...(queued ?? []), ...(expired ?? []), ...(legacyStale ?? [])].map(
      (dispatch) => dispatch.id,
    ),
  )];
}

async function claimDispatchLease(dispatch: {
  id: string;
  status: string;
  lease_expires_at: string | null;
  attempt_count: number;
  updated_at: string;
}) {
  const supabase = createAdminClient();
  let mutation = supabase
    .from("whatsapp_dispatches")
    .update({
      status: "processing",
      started_at:
        dispatch.status === "queued"
          ? new Date().toISOString()
          : undefined,
      lease_expires_at: nextLeaseExpiration(),
      attempt_count: dispatch.attempt_count + 1,
      finished_at: null,
      error_message: null,
    })
    .eq("id", dispatch.id)
    .eq("status", dispatch.status);

  if (dispatch.status === "processing") {
    if (dispatch.lease_expires_at) {
      if (new Date(dispatch.lease_expires_at).getTime() >= Date.now()) return null;
      mutation = mutation.eq("lease_expires_at", dispatch.lease_expires_at);
    } else {
      if (
        new Date(dispatch.updated_at).getTime() >=
        Date.now() - DISPATCH_LEASE_MS
      ) return null;
      mutation = mutation.is("lease_expires_at", null).eq("updated_at", dispatch.updated_at);
    }
  }

  const { data, error } = await mutation
    .select("id")
    .maybeSingle<{ id: string }>();
  if (error) throw error;
  return data;
}

function nextLeaseExpiration() {
  return new Date(Date.now() + DISPATCH_LEASE_MS).toISOString();
}

function snapshotConfig(config: WhatsAppMessageConfigRow) {
  return {
    displayName: config.display_name,
    templateName: config.template_name,
    templateLanguage: config.template_language,
    previewBody: config.preview_body,
    headerKind: config.header_kind,
    headerMediaUrl: config.header_media_url,
    bodyVariables: config.body_variables,
    buttonConfig: config.button_config,
  };
}

function maskedPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `•••• ${digits.slice(-4)}` : "Telefone protegido";
}

function samplePreviewRegistration(): WhatsAppRegistrationData {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    full_name: "Participante de exemplo",
    phone: "77999990000",
    ticket_code: "TDE-EXEMPLO",
    ticket_token: "ingresso-de-exemplo",
    status: "confirmed",
    communications_consent: true,
  };
}
