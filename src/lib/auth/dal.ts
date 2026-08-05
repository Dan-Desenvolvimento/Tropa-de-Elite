import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import type {
  EventPermission,
  EventPermissionSet,
  GlobalPermission,
} from "@/lib/auth/permissions";
import { EMPTY_EVENT_PERMISSIONS } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";

export type StaffProfile = {
  id: string;
  fullName: string;
  globalRole: "admin" | "checkin_operator";
  isOwner: boolean;
  canCreateEvents: boolean;
  canManageTeam: boolean;
};

type EventPermissionRow = {
  can_edit_event: boolean;
  can_checkin: boolean;
  can_view_registrations: boolean;
  can_manage_registrations: boolean;
  can_anonymize_registrations: boolean;
  can_view_reports: boolean;
  can_view_logs: boolean;
};

export const getCurrentStaff = cache(
  async (): Promise<StaffProfile | null> => {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } =
      await supabase.auth.getClaims();
    const userId =
      typeof claimsData?.claims?.sub === "string"
        ? claimsData.claims.sub
        : null;

    if (claimsError || !userId) return null;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select(
        "id,full_name,global_role,active,is_owner,can_create_events,can_manage_team",
      )
      .eq("id", userId)
      .maybeSingle<{
        id: string;
        full_name: string;
        global_role: StaffProfile["globalRole"];
        active: boolean;
        is_owner: boolean;
        can_create_events: boolean;
        can_manage_team: boolean;
      }>();

    if (error || !profile?.active) return null;

    return {
      id: profile.id,
      fullName: profile.full_name,
      globalRole: profile.global_role,
      isOwner: profile.is_owner,
      canCreateEvents: profile.can_create_events,
      canManageTeam: profile.can_manage_team,
    };
  },
);

export async function requireStaff() {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}

export async function hasGlobalPermission(
  permission: GlobalPermission,
) {
  const staff = await getCurrentStaff();
  if (!staff) return false;
  if (staff.isOwner) return true;

  return permission === "create_events"
    ? staff.canCreateEvents
    : staff.canManageTeam;
}

export async function requireGlobalPermission(
  permission: GlobalPermission,
) {
  const staff = await requireStaff();
  const allowed =
    staff.isOwner ||
    (permission === "create_events"
      ? staff.canCreateEvents
      : staff.canManageTeam);

  if (!allowed) redirect("/admin");
  return staff;
}

export async function requireOwner() {
  const staff = await requireStaff();
  if (!staff.isOwner) redirect("/admin");
  return staff;
}

export async function requireTeamManager() {
  return requireGlobalPermission("manage_team");
}

export async function getEventPermissionSet(
  eventId: string,
): Promise<EventPermissionSet> {
  const staff = await getCurrentStaff();
  if (!staff) return { ...EMPTY_EVENT_PERMISSIONS };

  if (staff.isOwner) {
    return {
      canEditEvent: true,
      canCheckin: true,
      canViewRegistrations: true,
      canManageRegistrations: true,
      canAnonymizeRegistrations: true,
      canViewReports: true,
      canViewLogs: true,
    };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("event_staff")
    .select(
      "can_edit_event,can_checkin,can_view_registrations,can_manage_registrations,can_anonymize_registrations,can_view_reports,can_view_logs",
    )
    .eq("event_id", eventId)
    .eq("user_id", staff.id)
    .maybeSingle<EventPermissionRow>();

  if (!data) return { ...EMPTY_EVENT_PERMISSIONS };

  return {
    canEditEvent: data.can_edit_event,
    canCheckin: data.can_checkin,
    canViewRegistrations: data.can_view_registrations,
    canManageRegistrations: data.can_manage_registrations,
    canAnonymizeRegistrations:
      data.can_anonymize_registrations,
    canViewReports: data.can_view_reports,
    canViewLogs: data.can_view_logs,
  };
}

export async function hasEventPermission(
  eventId: string,
  permission: EventPermission,
) {
  const permissions = await getEventPermissionSet(eventId);

  const map: Record<
    EventPermission,
    keyof EventPermissionSet
  > = {
    edit_event: "canEditEvent",
    checkin: "canCheckin",
    view_registrations: "canViewRegistrations",
    manage_registrations: "canManageRegistrations",
    anonymize_registrations:
      "canAnonymizeRegistrations",
    view_reports: "canViewReports",
    view_logs: "canViewLogs",
  };

  return permissions[map[permission]];
}

export async function hasAnyEventPermission(
  eventId: string,
  permissions: EventPermission[],
) {
  const access = await getEventPermissionSet(eventId);
  const map: Record<
    EventPermission,
    keyof EventPermissionSet
  > = {
    edit_event: "canEditEvent",
    checkin: "canCheckin",
    view_registrations: "canViewRegistrations",
    manage_registrations: "canManageRegistrations",
    anonymize_registrations:
      "canAnonymizeRegistrations",
    view_reports: "canViewReports",
    view_logs: "canViewLogs",
  };

  return permissions.some(
    (permission) => access[map[permission]],
  );
}

export async function requireGlobalAdmin() {
  return requireOwner();
}

export async function hasEventRole(
  eventId: string,
  allowedRoles: Array<
    "admin" | "checkin_operator"
  >,
) {
  const permissions = await getEventPermissionSet(eventId);

  if (
    allowedRoles.includes("checkin_operator") &&
    permissions.canCheckin
  ) {
    return true;
  }

  if (
    allowedRoles.includes("admin") &&
    (
      permissions.canEditEvent ||
      permissions.canViewRegistrations ||
      permissions.canManageRegistrations ||
      permissions.canAnonymizeRegistrations ||
      permissions.canViewReports ||
      permissions.canViewLogs
    )
  ) {
    return true;
  }

  return false;
}
