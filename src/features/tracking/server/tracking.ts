import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { TrackingEventInput } from "@/features/tracking/schema";

type TrackingSettings = {
  meta_pixel_id: string | null;
  meta_api_access_token: string | null;
  meta_api_enabled: boolean;
};

export async function recordTrackingEvent(
  input: TrackingEventInput,
  request: Request,
) {
  const supabase = createAdminClient();
  const [{ data: settings }, { error }] = await Promise.all([
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
      metadata: input.metadata,
      referrer: request.headers.get("referer"),
      user_agent: request.headers.get("user-agent"),
    }),
  ]);

  if (error) throw error;

  if (
    settings?.meta_api_enabled &&
    settings.meta_pixel_id &&
    settings.meta_api_access_token
  ) {
    await sendMetaConversion(settings, input, request);
  }
}

async function sendMetaConversion(
  settings: TrackingSettings,
  input: TrackingEventInput,
  request: Request,
) {
  const eventName =
    input.eventName === "page_view"
      ? "PageView"
      : input.eventName === "cta_click"
        ? "Lead"
        : input.eventName === "registration_completed"
          ? "CompleteRegistration"
          : "ViewContent";

  try {
    await fetch(
      `https://graph.facebook.com/v21.0/${settings.meta_pixel_id}/events?access_token=${encodeURIComponent(settings.meta_api_access_token!)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: [
            {
              event_name: eventName,
              event_time: Math.floor(Date.now() / 1000),
              event_id: `${input.eventName}:${input.eventId ?? input.path}:${Date.now()}`,
              action_source: "website",
              event_source_url: new URL(input.path, request.url).toString(),
              user_data: {
                client_user_agent: request.headers.get("user-agent") ?? undefined,
              },
              custom_data: input.metadata,
            },
          ],
        }),
      },
    );
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
  const names = ["page_view", "cta_click", "registration_completed", "ticket_view"] as const;
  const rows = await Promise.all(names.map(async (eventName) => {
    const [{ count: site }, { count: form }] = await Promise.all([
      supabase.from("tracking_events").select("id", { count: "exact", head: true }).eq("event_name", eventName).eq("source", "site"),
      supabase.from("tracking_events").select("id", { count: "exact", head: true }).eq("event_name", eventName).eq("source", "form"),
    ]);
    return [eventName, { site: site ?? 0, form: form ?? 0 }] as const;
  }));
  return Object.fromEntries(rows) as Record<string, { site: number; form: number }>;
}
