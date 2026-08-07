import { NextResponse } from "next/server";

import { recordTrackingEvent } from "@/features/tracking/server/tracking";
import { trackingEventSchema } from "@/features/tracking/schema";

export async function POST(request: Request) {
  const parsed = trackingEventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ success: false }, { status: 400 });
  }

  try {
    await recordTrackingEvent(parsed.data, request);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to record tracking event", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
