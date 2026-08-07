import { NextResponse } from "next/server";

import { trackingSettingsSchema } from "@/features/tracking/schema";
import { getTrackingSettings } from "@/features/tracking/server/tracking";
import { requireOwner } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  await requireOwner();
  return NextResponse.json({ success: true, data: await getTrackingSettings() });
}

export async function PATCH(request: Request) {
  const staff = await requireOwner();
  const parsed = trackingSettingsSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false, message: parsed.error.issues[0]?.message ?? "Dados inválidos." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const values: Record<string, unknown> = {
    id: true,
    meta_pixel_id: parsed.data.metaPixelId || null,
    meta_api_enabled: parsed.data.metaApiEnabled,
    updated_by: staff.id,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.metaApiAccessToken) values.meta_api_access_token = parsed.data.metaApiAccessToken;

  const { error } = await supabase.from("app_tracking_settings").upsert(values, { onConflict: "id" });
  if (error) return NextResponse.json({ success: false, message: "Não foi possível salvar as configurações." }, { status: 500 });
  return NextResponse.json({ success: true });
}
