import { after, NextResponse } from "next/server";

import { sendTicketConfirmation } from "@/features/emails/server/send-ticket-confirmation";
import {
  getCurrentStaff,
  hasEventPermission,
} from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
      registrationId: string;
    }>;
  },
) {
  const staff = await getCurrentStaff();

  if (!staff) {
    return NextResponse.json(
      {
        success: false,
        message: "Não autenticado.",
      },
      { status: 401 },
    );
  }

  const { id, registrationId } = await params;

  if (
    !(await hasEventPermission(
      id,
      "manage_registrations",
    ))
  ) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Sem permissão para reenviar ingressos.",
      },
      { status: 403 },
    );
  }

  const supabase = createAdminClient();
  const oneMinuteAgo = new Date(
    Date.now() - 60_000,
  ).toISOString();

  const { count } = await supabase
    .from("email_logs")
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq("registration_id", registrationId)
    .gte("created_at", oneMinuteAgo);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        success: false,
        message:
          "Aguarde um minuto antes de reenviar.",
      },
      { status: 429 },
    );
  }

  await supabase.from("audit_logs").insert({
    actor_id: staff.id,
    event_id: id,
    action: "ticket_resent",
    entity_type: "registration",
    entity_id: registrationId,
    metadata: {},
  });

  after(async () => {
    await sendTicketConfirmation(registrationId);
  });

  return NextResponse.json({
    success: true,
    data: { queued: true },
  });
}
