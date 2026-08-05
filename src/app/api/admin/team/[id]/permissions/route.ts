import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getCurrentStaff,
  hasGlobalPermission,
} from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const eventPermissionSchema = z.object({
  eventId: z.string().uuid(),
  canEditEvent: z.boolean(),
  canCheckin: z.boolean(),
  canViewRegistrations: z.boolean(),
  canManageRegistrations: z.boolean(),
  canAnonymizeRegistrations: z.boolean(),
  canViewReports: z.boolean(),
  canViewLogs: z.boolean(),
});

const schema = z.object({
  isOwner: z.boolean(),
  canCreateEvents: z.boolean(),
  canManageTeam: z.boolean(),
  eventPermissions: z
    .array(eventPermissionSchema)
    .max(500),
});

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const staff = await getCurrentStaff();

  if (!staff) {
    return NextResponse.json(
      {
        success: false,
        message: "Não autenticado.",
      },
      { status: 401 },
    );
  }

  if (
    !(await hasGlobalPermission("manage_team"))
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Sem permissão para gerenciar a equipe.",
      },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(
    await request.json(),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message:
          parsed.error.issues[0]?.message ??
          "Revise as permissões.",
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("profiles")
    .select(
      "id,is_owner,can_create_events,can_manage_team",
    )
    .eq("id", id)
    .maybeSingle<{
      id: string;
      is_owner: boolean;
      can_create_events: boolean;
      can_manage_team: boolean;
    }>();

  if (!target) {
    return NextResponse.json(
      {
        success: false,
        message: "Integrante não localizado.",
      },
      { status: 404 },
    );
  }

  const requestsSensitiveAccess =
    parsed.data.eventPermissions.some(
      (event) =>
        event.canAnonymizeRegistrations,
    );

  if (
    !staff.isOwner &&
    (
      target.is_owner ||
      parsed.data.isOwner ||
      parsed.data.canCreateEvents !==
        target.can_create_events ||
      parsed.data.canManageTeam !==
        target.can_manage_team ||
      requestsSensitiveAccess
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Somente um proprietário pode alterar proprietários, permissões gerais ou anonimização.",
      },
      { status: 403 },
    );
  }

  const { error } = await supabase.rpc(
    "replace_staff_permissions",
    {
      target_user_id: id,
      owner_access: parsed.data.isOwner,
      create_events_access:
        parsed.data.canCreateEvents,
      manage_team_access:
        parsed.data.canManageTeam,
      event_permissions:
        parsed.data.eventPermissions,
    },
  );

  if (error) {
    const lastOwner =
      error.message.includes("LAST_OWNER");

    return NextResponse.json(
      {
        success: false,
        message: lastOwner
          ? "O sistema precisa manter pelo menos um proprietário ativo."
          : "Não foi possível atualizar as permissões.",
      },
      { status: lastOwner ? 400 : 500 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    action: "staff_permissions_updated",
    entity_type: "profile",
    entity_id: id,
    metadata: {
      owner: parsed.data.isOwner,
      createEvents:
        parsed.data.canCreateEvents,
      manageTeam: parsed.data.canManageTeam,
      eventCount:
        parsed.data.eventPermissions.filter(
          (event) =>
            Object.entries(event).some(
              ([key, value]) =>
                key !== "eventId" &&
                value === true,
            ),
        ).length,
    },
  });

  return NextResponse.json({
    success: true,
    message:
      "Permissões atualizadas com sucesso.",
  });
}
