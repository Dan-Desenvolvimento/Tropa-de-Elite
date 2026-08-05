import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getCurrentStaff,
  hasEventPermission,
} from "@/lib/auth/dal";
import {
  getRequestIp,
  hashRequestIdentifier,
} from "@/lib/security/request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const confirmSchema = z.object({
  value: z.string().trim().min(3).max(160),
  method: z.enum(["qr", "manual"]),
  forceWaitlist: z.boolean().default(false),
  deviceInfo: z
    .record(z.string(), z.unknown())
    .default({}),
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

  const parsed = confirmSchema.safeParse(
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

  if (
    parsed.data.forceWaitlist &&
    !(await hasEventPermission(
      id,
      "manage_registrations",
    ))
  ) {
    return NextResponse.json(
      { success: false, code: "UNAUTHORIZED" },
      { status: 403 },
    );
  }

  const ipHash = hashRequestIdentifier(
    getRequestIp(request),
  );
  const admin = createAdminClient();
  const { data: rateLimit } = await admin.rpc(
    "consume_rate_limit",
    {
      rate_scope: "operator_checkin",
      rate_key_hash: `${staff.id}:${ipHash}`,
      rate_max_attempts: 120,
      rate_window_seconds: 60,
    },
  );

  if (
    !(rateLimit as {
      allowed?: boolean;
    } | null)?.allowed
  ) {
    return NextResponse.json(
      { success: false, code: "RATE_LIMITED" },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc(
    "process_event_checkin",
    {
      target_event_id: id,
      ticket_value: value,
      requested_method: parsed.data.method,
      allow_waitlist: parsed.data.forceWaitlist,
      device_metadata: parsed.data.deviceInfo,
      request_ip_hash: ipHash,
    },
  );

  if (error) {
    return NextResponse.json(
      { success: false, code: "CHECKIN_FAILED" },
      { status: 500 },
    );
  }

  const result = data as {
    success?: boolean;
    code?: string;
    registration_id?: string;
  } | null;

  if (
    parsed.data.method === "manual" &&
    result?.code === "CHECKIN_SUCCESS" &&
    result.registration_id
  ) {
    await admin.from("audit_logs").insert({
      actor_id: staff.id,
      event_id: id,
      action: "checkin_manual",
      entity_type: "registration",
      entity_id: result.registration_id,
      metadata: {},
    });
  }

  return NextResponse.json(data);
}
