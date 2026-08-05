import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getCurrentStaff,
  hasEventPermission,
} from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

const lookupSchema = z.object({
  value: z.string().trim().min(3).max(160),
});

export async function POST(
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
      { success: false, code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const { id } = await params;

  if (!(await hasEventPermission(id, "checkin"))) {
    return NextResponse.json(
      { success: false, code: "UNAUTHORIZED" },
      { status: 403 },
    );
  }

  const parsed = lookupSchema.safeParse(
    await request.json(),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, code: "INVALID_TOKEN" },
      { status: 400 },
    );
  }

  const value = parsed.data.value.startsWith("EVENT:")
    ? parsed.data.value.slice(6)
    : parsed.data.value;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "lookup_event_ticket",
    {
      target_event_id: id,
      ticket_value: value,
    },
  );

  if (error) {
    return NextResponse.json(
      { success: false, code: "LOOKUP_FAILED" },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
