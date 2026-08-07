import { NextResponse } from "next/server";

import { getTrackingSettings } from "@/features/tracking/server/tracking";

export async function GET() {
  const settings = await getTrackingSettings();
  return NextResponse.json({ pixelId: settings?.meta_pixel_id ?? null });
}
