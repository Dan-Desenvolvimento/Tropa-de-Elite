import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentStaff } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ active: z.boolean() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await getCurrentStaff();
  if (!staff) return NextResponse.json({ success: false }, { status: 401 });
  if (staff.globalRole !== "admin") return NextResponse.json({ success: false }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ success: false }, { status: 400 });
  if (id === staff.id && !parsed.data.active) return NextResponse.json({ success: false, message: "Você não pode desativar o próprio acesso." }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("profiles").update({ active: parsed.data.active }).eq("id", id);
  if (error) return NextResponse.json({ success: false }, { status: 500 });
  await supabase.from("audit_logs").insert({ actor_id: staff.id, action: parsed.data.active ? "staff_activated" : "staff_deactivated", entity_type: "profile", entity_id: id, metadata: {} });
  return NextResponse.json({ success: true });
}
