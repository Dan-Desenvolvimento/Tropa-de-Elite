import { NextResponse } from "next/server";

import { getTrackingSettings } from "@/features/tracking/server/tracking";

export async function GET() {
  try {
    const settings = await getTrackingSettings();
    return NextResponse.json({ pixelId: settings?.meta_pixel_id ?? process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null });
  } catch (error) {
    // Keep the browser pixel available while PostgREST refreshes its schema cache.
    console.error("Tracking settings unavailable:", error);
    return NextResponse.json({ pixelId: process.env.NEXT_PUBLIC_META_PIXEL_ID ?? null });
  }
}
