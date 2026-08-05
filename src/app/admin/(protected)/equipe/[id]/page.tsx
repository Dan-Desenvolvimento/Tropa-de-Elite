import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { TeamPermissionsForm } from "@/features/team/components/team-permissions-form";
import { requireTeamManager } from "@/lib/auth/dal";
import {
  EMPTY_EVENT_PERMISSIONS,
  type EventPermissionSet,
} from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";

type ProfileRow = {
  id: string;
  full_name: string;
  is_owner: boolean;
  can_create_events: boolean;
  can_manage_team: boolean;
};

type EventStaffRow = {
  event_id: string;
  can_edit_event: boolean;
  can_checkin: boolean;
  can_view_registrations: boolean;
  can_manage_registrations: boolean;
  can_anonymize_registrations: boolean;
  can_view_reports: boolean;
  can_view_logs: boolean;
};

export default async function TeamAccessPage({
  params,
}: PageProps<"/admin/equipe/[id]">) {
  const staff = await requireTeamManager();
  const { id } = await params;
  const supabase = createAdminClient();

  const [
    { data: profile },
    { data: eventRows },
    { data: events },
    authResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,full_name,is_owner,can_create_events,can_manage_team",
      )
      .eq("id", id)
      .maybeSingle<ProfileRow>(),
    supabase
      .from("event_staff")
      .select(
        "event_id,can_edit_event,can_checkin,can_view_registrations,can_manage_registrations,can_anonymize_registrations,can_view_reports,can_view_logs",
      )
      .eq("user_id", id),
    supabase
      .from("events")
      .select("id,name")
      .order("start_at", {
        ascending: false,
      }),
    supabase.auth.admin.getUserById(id),
  ]);

  if (!profile) notFound();

  if (profile.is_owner && !staff.isOwner) {
    notFound();
  }

  const accessByEvent = new Map<
    string,
    EventPermissionSet
  >();

  for (const row of
    (eventRows ?? []) as EventStaffRow[]) {
    accessByEvent.set(row.event_id, {
      canEditEvent: row.can_edit_event,
      canCheckin: row.can_checkin,
      canViewRegistrations:
        row.can_view_registrations,
      canManageRegistrations:
        row.can_manage_registrations,
      canAnonymizeRegistrations:
        row.can_anonymize_registrations,
      canViewReports: row.can_view_reports,
      canViewLogs: row.can_view_logs,
    });
  }

  const eventAccess = (
    (events ?? []) as Array<{
      id: string;
      name: string;
    }>
  ).map((event) => ({
    eventId: event.id,
    eventName: event.name,
    permissions:
      accessByEvent.get(event.id) ?? {
        ...EMPTY_EVENT_PERMISSIONS,
      },
  }));

  return (
    <main>
      <PageHeader
        eyebrow="Equipe"
        title="Gerenciar permissões"
        description="As permissões são verificadas no menu, nas páginas, nas APIs e no banco de dados."
      />

      <div className="p-5 sm:p-8 lg:p-10">
        <TeamPermissionsForm
          currentUserIsOwner={staff.isOwner}
          target={{
            id: profile.id,
            fullName: profile.full_name,
            email:
              authResult.data.user?.email ?? null,
            isOwner: profile.is_owner,
            canCreateEvents:
              profile.can_create_events,
            canManageTeam:
              profile.can_manage_team,
          }}
          initialEvents={eventAccess}
        />
      </div>
    </main>
  );
}
