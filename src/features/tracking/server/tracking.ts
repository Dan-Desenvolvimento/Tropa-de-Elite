import "server-only";

import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { TrackingEventInput } from "@/features/tracking/schema";
import { getRequestIp } from "@/lib/security/request";

type TrackingSettings = {
  meta_pixel_id: string | null;
  meta_api_access_token: string | null;
  meta_api_enabled: boolean;
};

type TrackingUserData = { email?: string; phone?: string };

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function recordTrackingEvent(
  input: TrackingEventInput,
  request: Request,
  userData: TrackingUserData = {},
) {
  const supabase = createAdminClient();
  const [{ data: dbSettings }, { error }] = await Promise.all([
    supabase
      .from("app_tracking_settings")
      .select("meta_pixel_id,meta_api_access_token,meta_api_enabled")
      .eq("id", true)
      .maybeSingle<TrackingSettings>(),
    supabase.from("tracking_events").insert({
      event_name: input.eventName,
      source: input.source,
      path: input.path,
      event_id: input.eventId ?? null,
      registration_id: input.registrationId ?? null,
      metadata: {
        ...input.metadata,
        ...(input.attribution ? { attribution: input.attribution } : {}),
      },
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    }),
  ]);

  if (error) throw error;

  const settings = dbSettings ?? {
    meta_pixel_id: process.env.META_PIXEL_ID ?? process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null,
    meta_api_access_token: process.env.META_CONVERSIONS_API_TOKEN ?? null,
    meta_api_enabled: Boolean(process.env.META_CONVERSIONS_API_TOKEN),
  };

  if (
    settings?.meta_api_enabled &&
    settings.meta_pixel_id &&
    settings.meta_api_access_token
  ) {
    await sendMetaConversion(settings, input, request, userData);
  }
}

async function sendMetaConversion(
  settings: TrackingSettings,
  input: TrackingEventInput,
  request: Request,
  userData: TrackingUserData,
) {
  const eventName =
    input.eventName === "page_view"
      ? "PageView"
      : input.eventName === "form_started"
        ? "FormStarted"
        : input.eventName === "cta_click"
          ? null
        : input.eventName === "registration_completed"
          ? "CompleteRegistration"
          : "ViewContent";

  if (!eventName) return;

  const attribution = input.attribution ?? {};
  const eventId = input.metaEventId ?? input.registrationId ?? `${input.eventName}:${input.path}`;
  const requestIp = getRequestIp(request);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : new URL(request.url).origin;

  try {
    const response = await fetch(
      `https://graph.facebook.com/${process.env.META_GRAPH_API_VERSION ?? "v21.0"}/${settings.meta_pixel_id}/events?access_token=${encodeURIComponent(settings.meta_api_access_token!)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: eventId,
              action_source: "website",
              event_source_url: new URL(input.path, origin).toString(),
              user_data: {
                em: userData.email ? [sha256(userData.email.trim().toLowerCase())] : undefined,
                ph: userData.phone ? [sha256(userData.phone.replace(/\D/g, ""))] : undefined,
                ...(requestIp !== "unknown" ? { client_ip_address: requestIp } : {}),
                client_user_agent: request.headers.get("user-agent") ?? undefined,
                fbp: attribution.fbp,
                fbc: attribution.fbc,
              },
              custom_data: input.metadata,
            },
          ],
          ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
        }),
      },
    );
    if (!response.ok) {
      console.error("Meta Conversions API rejected event", {
        eventName,
        status: response.status,
        body: await response.text(),
      });
    }
  } catch (error) {
    console.error("Meta Conversions API request failed", error);
  }
}

export async function getTrackingSettings() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("app_tracking_settings")
    .select("meta_pixel_id,meta_api_enabled,updated_at")
    .eq("id", true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTrackingSummary() {
  const supabase = createAdminClient();
  const names = ["page_view", "form_started", "cta_click", "registration_completed", "ticket_view"] as const;
  const rows = await Promise.all(names.map(async (eventName) => {
    const [{ count: site }, { count: form }] = await Promise.all([
      supabase.from("tracking_events").select("id", { count: "exact", head: true }).eq("event_name", eventName).eq("source", "site"),
      supabase.from("tracking_events").select("id", { count: "exact", head: true }).eq("event_name", eventName).eq("source", "form"),
    ]);
    return [eventName, { site: site ?? 0, form: form ?? 0 }] as const;
  }));
  return Object.fromEntries(rows) as Record<string, { site: number; form: number }>;
}
