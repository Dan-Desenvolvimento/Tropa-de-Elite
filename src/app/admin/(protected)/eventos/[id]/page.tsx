import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BarChart3,
  ExternalLink,
  History,
  ScanLine,
  UsersRound,
} from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { EventForm } from "@/features/events/components/event-form";
import type { EventCustomField } from "@/features/events/types";
import { getEventPermissionSet } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

type AdminEventRow = {
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
  waitlist_enabled: boolean;
  show_remaining_slots: boolean;
  whatsapp_group_url: string | null;
  registration_status: string;
  registration_open_at: string | null;
  registration_close_at: string | null;
  email_subject: string | null;
  confirmation_message: string | null;
  support_email: string | null;
  privacy_policy_url: string | null;
  require_checkin_confirmation: boolean;
  custom_fields: EventCustomField[];
};

export default async function EventDetailPage({
  params,
}: PageProps<"/admin/eventos/[id]">) {
  const { id } = await params;
  const permissions =
    await getEventPermissionSet(id);

  if (!permissions.canEditEvent) notFound();

  const supabase = createAdminClient();
  const { data: event } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle<AdminEventRow>();

  if (!event) notFound();

  return (
    <main>
      <PageHeader
        eyebrow="Evento"
        title={event.name}
        description={`/${event.slug}`}
        actions={
          <>
            <Link
              href={`/eventos/${event.slug}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
            >
              <ExternalLink className="size-4" />
              Página pública
            </Link>

            {permissions.canViewRegistrations ||
            permissions.canManageRegistrations ||
            permissions.canAnonymizeRegistrations ? (
              <Link
                href={`/admin/eventos/${id}/inscritos`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
              >
                <UsersRound className="size-4" />
                Inscritos
              </Link>
            ) : null}

            {permissions.canViewReports ? (
              <Link
                href={`/admin/eventos/${id}/relatorios`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
              >
                <BarChart3 className="size-4" />
                Relatórios
              </Link>
            ) : null}

            {permissions.canViewLogs ? (
              <Link
                href={`/admin/eventos/${id}/logs`}
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 hover:bg-white/5"
              >
                <History className="size-4" />
                Histórico
              </Link>
            ) : null}

            {permissions.canCheckin ? (
              <Link
                href={`/admin/eventos/${id}/checkin`}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-500"
              >
                <ScanLine className="size-4" />
                Check-in
              </Link>
            ) : null}
          </>
        }
      />

      <div className="max-w-5xl p-5 sm:p-8 lg:p-10">
        <EventForm
          initial={{
            id: event.id,
            name: event.name,
            slug: event.slug,
            description: event.description,
            coverImageUrl: event.cover_image_url,
            logoImageUrl: event.logo_image_url,
            startAt: event.start_at,
            endAt: event.end_at,
            timezone: event.timezone,
            venueName: event.venue_name,
            address: event.address,
            city: event.city,
            capacity: event.capacity,
            waitlistEnabled: event.waitlist_enabled,
            showRemainingSlots:
              event.show_remaining_slots,
            whatsappGroupUrl:
              event.whatsapp_group_url,
            registrationStatus:
              event.registration_status,
            registrationOpenAt:
              event.registration_open_at,
            registrationCloseAt:
              event.registration_close_at,
            emailSubject: event.email_subject,
            confirmationMessage:
              event.confirmation_message,
            supportEmail: event.support_email,
            privacyPolicyUrl:
              event.privacy_policy_url,
            requireCheckinConfirmation:
              event.require_checkin_confirmation,
            customFields: Array.isArray(
              event.custom_fields,
            )
              ? event.custom_fields
              : [],
          }}
        />
      </div>
    </main>
  );
}
