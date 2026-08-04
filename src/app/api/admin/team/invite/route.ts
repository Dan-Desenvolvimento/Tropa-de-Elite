import { NextResponse } from "next/server";
import { z } from "zod";

import { sendStaffInvitation } from "@/features/emails/server/send-staff-invitation";
import { getCurrentStaff } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const inviteSchema = z.object({
  fullName: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email().max(254),
  globalRole: z.enum(["admin", "checkin_operator"]),
  eventId: z.string().uuid().nullable(),
  eventRole: z.enum(["admin", "checkin_operator"]),
});

export async function POST(request: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ success: false, message: "Não autenticado." }, { status: 401 });
  if (staff.globalRole !== "admin") return NextResponse.json({ success: false, message: "Sem permissão." }, { status: 403 });
  const parsed = inviteSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false, message: "Revise os dados do convite." }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return NextResponse.json({ success: false, message: "URL da aplicação não configurada." }, { status: 500 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.generateLink({
    type: "invite",
    email: parsed.data.email,
    options: {
    redirectTo: `${appUrl.replace(/\/$/, "")}/auth/confirm?next=/admin/definir-senha`,
    data: { full_name: parsed.data.fullName, global_role: parsed.data.globalRole },
    },
  });
  const tokenHash = data.properties?.hashed_token;
  if (error || !data.user || !tokenHash) return NextResponse.json({ success: false, message: "Não foi possível convidar. Verifique se o e-mail já está cadastrado." }, { status: 400 });

  const { error: profileError } = await supabase.from("profiles").upsert({ id: data.user.id, full_name: parsed.data.fullName, global_role: parsed.data.globalRole, active: true });
  if (profileError) {
    await supabase.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ success: false, message: "Não foi possível preparar o acesso do integrante." }, { status: 500 });
  }
  if (parsed.data.eventId) {
    const { error: eventStaffError } = await supabase.from("event_staff").upsert({ event_id: parsed.data.eventId, user_id: data.user.id, role: parsed.data.eventRole }, { onConflict: "event_id,user_id" });
    if (eventStaffError) {
      await supabase.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ success: false, message: "Não foi possível vincular o integrante ao evento." }, { status: 500 });
    }
  }

  const inviteUrl = new URL("/auth/confirm", appUrl);
  inviteUrl.searchParams.set("token_hash", tokenHash);
  inviteUrl.searchParams.set("type", "invite");
  inviteUrl.searchParams.set("next", "/admin/definir-senha");

  const localDebug = process.env.NODE_ENV === "development" && !process.env.RESEND_API_KEY;
  if (!localDebug) {
    const delivery = await sendStaffInvitation({
      userId: data.user.id,
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      globalRole: parsed.data.globalRole,
      inviteUrl: inviteUrl.toString(),
    });
    if (!delivery.sent) {
      await supabase.auth.admin.deleteUser(data.user.id);
      return NextResponse.json({ success: false, message: "Não foi possível enviar o e-mail de convite." }, { status: 502 });
    }
  }

  await supabase.from("audit_logs").insert({ actor_id: staff.id, event_id: parsed.data.eventId, action: "staff_invited", entity_type: "profile", entity_id: data.user.id, metadata: { role: parsed.data.globalRole } });
  return NextResponse.json({
    success: true,
    ...(localDebug ? { debugInvitePath: `${inviteUrl.pathname}${inviteUrl.search}` } : {}),
  });
}
