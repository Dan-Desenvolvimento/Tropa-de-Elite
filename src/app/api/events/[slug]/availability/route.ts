import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

type EventCapacityRow = {
  id: string;
  capacity: number | null;
  show_remaining_slots: boolean;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data: event, error: eventError } = await supabase
    .from("events")
    .select("id,capacity,show_remaining_slots")
    .eq("slug", slug)
    .maybeSingle<EventCapacityRow>();

  if (eventError) {
    console.error("Failed to load public event capacity", {
      code: eventError.code,
      message: eventError.message,
    });
    return NextResponse.json(
      { success: false, message: "Não foi possível atualizar as vagas." },
      { status: 500 },
    );
  }

  if (!event) {
    return NextResponse.json(
      { success: false, message: "Evento não localizado." },
      { status: 404 },
    );
  }

  if (!event.show_remaining_slots || event.capacity === null) {
    return NextResponse.json(
      { success: true, data: null },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { count, error: countError } = await supabase
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", event.id)
    .eq("status", "confirmed");

  if (countError) {
    console.error("Failed to count public event registrations", {
      code: countError.code,
      message: countError.message,
    });
    return NextResponse.json(
      { success: false, message: "Não foi possível atualizar as vagas." },
      { status: 500 },
    );
  }

  const capacity = event.capacity;
  const confirmed = Math.min(capacity, Math.max(0, count ?? 0));
  const remaining = Math.max(0, capacity - confirmed);
  const percentage = Math.min(
    100,
    Math.max(0, Math.round((confirmed / capacity) * 100)),
  );

  return NextResponse.json(
    {
      success: true,
      data: { capacity, confirmed, remaining, percentage },
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
