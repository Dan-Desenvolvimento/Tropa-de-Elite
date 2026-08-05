import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getCurrentStaff,
  hasGlobalPermission,
} from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  active: z.boolean(),
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

  const { id } = await params;
  const parsed = schema.safeParse(
    await request.json(),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Dados inválidos.",
      },
      { status: 400 },
    );
  }

  if (id === staff.id && !parsed.data.active) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Você não pode desativar o próprio acesso.",
      },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id,is_owner,active")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      is_owner: boolean;
      active: boolean;
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

  if (target.is_owner && !staff.isOwner) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Somente um proprietário pode alterar outro proprietário.",
      },
      { status: 403 },
    );
  }

  if (
    target.is_owner &&
    target.active &&
    !parsed.data.active
  ) {
    const { count } = await supabase
      .from("profiles")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("is_owner", true)
      .eq("active", true);

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        {
          success: false,
          message:
            "O sistema precisa manter pelo menos um proprietário ativo.",
        },
        { status: 400 },
      );
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      active: parsed.data.active,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Não foi possível alterar o acesso.",
      },
      { status: 500 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    action: parsed.data.active
      ? "staff_activated"
      : "staff_deactivated",
    entity_type: "profile",
    entity_id: id,
    metadata: {},
  });

  return NextResponse.json({
    success: true,
  });
}
