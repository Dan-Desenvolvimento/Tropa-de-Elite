import { NextResponse } from "next/server";
import { z } from "zod";

import { buildCommunicationPreview } from "@/features/whatsapp/server/dispatch-service";
import { getCurrentStaff, hasAnyEventPermission } from "@/lib/auth/dal";

const previewSchema = z.object({
  registrationId: z.string().uuid().optional(),
});

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string; messageId: string }>;
  },
) {
  const staff = await getCurrentStaff();
  if (!staff) {
    return NextResponse.json(
      { success: false, message: "Não autenticado." },
      { status: 401 },
    );
  }
  const { id, messageId } = await params;
  if (!(await hasAnyEventPermission(id, ["edit_event", "manage_registrations", "view_reports"]))) {
    return NextResponse.json(
      { success: false, message: "Sem permissão para visualizar esta comunicação." },
      { status: 403 },
    );
  }
  const canViewParticipantData = await hasAnyEventPermission(id, [
    "view_registrations",
    "manage_registrations",
  ]);
  const parsed = previewSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Participante inválido." },
      { status: 400 },
    );
  }
  if (parsed.data.registrationId && !canViewParticipantData) {
    return NextResponse.json(
      { success: false, message: "Sem permissão para visualizar dados de participantes." },
      { status: 403 },
    );
  }
  try {
    const data = await buildCommunicationPreview({
      eventId: id,
      messageConfigId: messageId,
      registrationId: parsed.data.registrationId,
      useSampleParticipant: !canViewParticipantData,
    });
    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Não foi possível gerar a prévia.",
      },
      { status: 422 },
    );
  }
}
