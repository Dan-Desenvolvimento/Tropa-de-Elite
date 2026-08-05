import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentStaff } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const createStaffSchema = z
  .object({
    fullName: z.string().trim().min(3).max(120),
    email: z.string().trim().toLowerCase().email().max(254),
    password: z.string().min(8).max(72),
    globalRole: z.enum(["admin", "checkin_operator"]),
    eventId: z.string().uuid().nullable(),
  })
  .superRefine((data, context) => {
    if (
      data.globalRole === "checkin_operator" &&
      data.eventId === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["eventId"],
        message:
          "Selecione o evento ao qual o operador terá acesso.",
      });
    }
  });

export async function POST(request: Request) {
  const staff = await getCurrentStaff();

  if (!staff) {
    return NextResponse.json(
      { success: false, message: "Não autenticado." },
      { status: 401 },
    );
  }

  if (staff.globalRole !== "admin") {
    return NextResponse.json(
      { success: false, message: "Sem permissão." },
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

  const supabase = createAdminClient();

  const { data, error } =
    await supabase.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
      user_metadata: {
        full_name: parsed.data.fullName,
        global_role: parsed.data.globalRole,
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
      global_role: parsed.data.globalRole,
      active: true,
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

  if (
    parsed.data.globalRole === "checkin_operator" &&
    parsed.data.eventId
  ) {
    const { error: eventStaffError } = await supabase
      .from("event_staff")
      .upsert(
        {
          event_id: parsed.data.eventId,
          user_id: userId,
          role: "checkin_operator",
        },
        { onConflict: "event_id,user_id" },
      );

    if (eventStaffError) {
      await supabase.auth.admin.deleteUser(userId);

      return NextResponse.json(
        {
          success: false,
          message:
            "Não foi possível vincular o integrante ao evento.",
        },
        { status: 500 },
      );
    }
  }

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: parsed.data.eventId,
    action: "staff_created_with_password",
    entity_type: "profile",
    entity_id: userId,
    metadata: { role: parsed.data.globalRole },
  });

  return NextResponse.json(
    {
      success: true,
      message: "Acesso criado com sucesso.",
    },
    { status: 201 },
  );
}
