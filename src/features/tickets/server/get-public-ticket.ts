import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { PublicTicket } from "@/features/tickets/types";
import { safeHttpsUrl } from "@/lib/urls";

type RegistrationRow = {
  id: string;
  event_id: string;
  full_name: string;
  status: PublicTicket["status"];
  ticket_code: string;
  ticket_token: string;
  checked_in_at: string | null;
};

type TicketEventRow = {
  id: string;
  name: string;
  slug: string;
  start_at: string;
  timezone: string;
  venue_name: string;
  address: string;
  city: string;
  whatsapp_group_url: string | null;
  support_email: string | null;
};

export async function getPublicTicket(token: string): Promise<PublicTicket | null> {
  if (token.length < 32 || token.length > 128) return null;

  const supabase = createAdminClient();
  const { data: registration, error } = await supabase
    .from("registrations")
    .select("id,event_id,full_name,status,ticket_code,ticket_token,checked_in_at")
    .eq("ticket_token", token)
    .maybeSingle<RegistrationRow>();

  if (error) throw error;
  if (!registration) return null;

  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,name,slug,start_at,timezone,venue_name,address,city,whatsapp_group_url,support_email")
    .eq("id", registration.event_id)
    .single<TicketEventRow>();

  if (eventError) throw eventError;

  return {
    registrationId: registration.id,
    participantName: registration.full_name,
    status: registration.status,
    ticketCode: registration.ticket_code,
    ticketToken: registration.ticket_token,
    checkedInAt: registration.checked_in_at,
    event: {
      id: event.id,
      name: event.name,
      slug: event.slug,
      startAt: event.start_at,
      timezone: event.timezone,
      venueName: event.venue_name,
      address: event.address,
      city: event.city,
      whatsappGroupUrl: safeHttpsUrl(event.whatsapp_group_url),
      supportEmail: event.support_email,
    },
  };
}
