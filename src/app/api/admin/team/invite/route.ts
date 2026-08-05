import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getCurrentStaff,
  hasGlobalPermission,
} from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const eventPermissionsSchema = z.object({
  canEditEvent: z.boolean(),
  canCheckin: z.boolean(),
  canViewRegistrations: z.boolean(),
  canManageRegistrations: z.boolean(),
  canAnonymizeRegistrations: z.boolean(),
  canViewReports: z.boolean(),
  canViewLogs: z.boolean(),
});

const createStaffSchema = z
  .object({
    fullName: z.string().trim().min(3).max(120),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email()
      .max(254),
    password: z.string().min(8).max(72),
    isOwner: z.boolean(),
    canCreateEvents: z.boolean(),
    canManageTeam: z.boolean(),
    eventId: z.string().uuid().nullable(),
    eventPermissions: eventPermissionsSchema,
  })
  .superRefine((data, context) => {
    const hasEventPermission = Object.values(
      data.eventPermissions,
    ).some(Boolean);

    if (
      !data.isOwner &&
      !data.canCreateEvents &&
      !data.canManageTeam &&
      !hasEventPermission
    ) {
      context.addIssue({
        code: "custom",
        path: ["eventPermissions"],
        message:
          "Escolha ao menos uma permissão para o integrante.",
      });
    }

    if (
      !data.isOwner &&
      hasEventPermission &&
      data.eventId === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["eventId"],
        message:
          "Selecione o evento das permissões iniciais.",
      });
    }
  });

export async function POST(request: Request) {
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

  const parsed = createStaffSchema.safeParse(
    await request.json(),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message:
          parsed.error.issues[0]?.message ??
          "Revise os dados do integrante.",
      },
      { status: 400 },
    );
  }

  if (
    !staff.isOwner &&
    (
      parsed.data.isOwner ||
      parsed.data.canCreateEvents ||
      parsed.data.canManageTeam ||
      parsed.data.eventPermissions
        .canAnonymizeRegistrations
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Somente um proprietário pode conceder permissões gerais, anonimização ou acesso de proprietário.",
      },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();

  const { data, error } =
    await supabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.fullName,
      },
    });

  if (error || !data.user) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Não foi possível criar o acesso. Verifique se o e-mail já está cadastrado.",
      },
      { status: 400 },
    );
  }

  const userId = data.user.id;

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: userId,
      full_name: parsed.data.fullName,
      global_role: "checkin_operator",
      active: true,
      is_owner: false,
      can_create_events: false,
      can_manage_team: false,
    });

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);

    return NextResponse.json(
      {
        success: false,
        message:
          "Não foi possível preparar o perfil do integrante.",
      },
      { status: 500 },
    );
  }

  const eventPermissions = parsed.data.eventId
    ? [
        {
          eventId: parsed.data.eventId,
          ...parsed.data.eventPermissions,
        },
      ]
    : [];

  const { error: accessError } =
    await supabase.rpc(
      "replace_staff_permissions",
      {
        target_user_id: userId,
        owner_access: parsed.data.isOwner,
        create_events_access:
          parsed.data.canCreateEvents,
        manage_team_access:
          parsed.data.canManageTeam,
        event_permissions: eventPermissions,
      },
    );

  if (accessError) {
    await supabase.auth.admin.deleteUser(userId);

    return NextResponse.json(
      {
        success: false,
        message:
          "Não foi possível aplicar as permissões do integrante.",
      },
      { status: 500 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: parsed.data.eventId,
    action: "staff_created_with_password",
    entity_type: "profile",
    entity_id: userId,
    metadata: {
      owner: parsed.data.isOwner,
      createEvents:
        parsed.data.canCreateEvents,
      manageTeam: parsed.data.canManageTeam,
    },
  });

  return NextResponse.json(
    {
      success: true,
      message: "Acesso criado com sucesso.",
    },
    { status: 201 },
  );
}
