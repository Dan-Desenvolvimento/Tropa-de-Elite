import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicEvent } from "@/features/events/types";
import { eventCustomFieldSchema } from "@/features/events/admin-schema";
import { safeHttpsUrl } from "@/lib/urls";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  logo_image_url: string | null;
  start_at: string;
  end_at: string | null;
  timezone: string;
  venue_name: string;
  address: string;
  city: string;
  capacity: number | null;
  show_remaining_slots: boolean;
  waitlist_enabled: boolean;
  whatsapp_group_url: string | null;
  registration_status: PublicEvent["registrationStatus"];
  registration_open_at: string | null;
  registration_close_at: string | null;
  privacy_policy_url: string | null;
  privacy_policy_version: string;
  support_email: string | null;
  custom_fields: unknown;
};

export async function getPublicEvent(slug: string): Promise<PublicEvent | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id,name,slug,description,cover_image_url,logo_image_url,start_at,end_at,timezone,venue_name,address,city,capacity,show_remaining_slots,waitlist_enabled,whatsapp_group_url,registration_status,registration_open_at,registration_close_at,privacy_policy_url,privacy_policy_version,support_email,custom_fields",
    )
    .eq("slug", slug)
    .maybeSingle<EventRow>();

  if (error) throw error;
  if (!data) return null;

  let remainingSlots: number | null = null;
  if (data.show_remaining_slots && data.capacity !== null) {
    const { count, error: countError } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", data.id)
      .eq("status", "confirmed");

    if (countError) throw countError;
    remainingSlots = Math.max(0, data.capacity - (count ?? 0));
  }
  const customFields = eventCustomFieldSchema.array().safeParse(data.custom_fields);

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    description: data.description,
    coverImageUrl: safeHttpsUrl(data.cover_image_url),
    logoImageUrl: safeHttpsUrl(data.logo_image_url),
    startAt: data.start_at,
    endAt: data.end_at,
    timezone: data.timezone,
    venueName: data.venue_name,
    address: data.address,
    city: data.city,
    capacity: data.capacity,
    showRemainingSlots: data.show_remaining_slots,
    remainingSlots,
    waitlistEnabled: data.waitlist_enabled,
    whatsappGroupUrl: safeHttpsUrl(data.whatsapp_group_url),
    registrationStatus: data.registration_status,
    registrationOpenAt: data.registration_open_at,
    registrationCloseAt: data.registration_close_at,
    privacyPolicyUrl: safeHttpsUrl(data.privacy_policy_url),
    privacyPolicyVersion: data.privacy_policy_version,
    supportEmail: data.support_email,
    customFields: customFields.success ? customFields.data : [],
  };
}

export async function getFeaturedPublicEvent(): Promise<PublicEvent | null> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("events")
    .select("slug")
    .in("registration_status", ["open", "sold_out"])
    .or(`registration_open_at.is.null,registration_open_at.lte.${now}`)
    .or(`registration_close_at.is.null,registration_close_at.gte.${now}`)
    .order("start_at", { ascending: true })
    .limit(1)
    .maybeSingle<{ slug: string }>();

  if (error) throw error;
  return data ? getPublicEvent(data.slug) : null;
}
