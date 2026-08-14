import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { CommunicationCenter } from "@/features/whatsapp/components/communication-center";
import { getEventPermissionSet } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

type EventSummary = {
  id: string;
  name: string;
};

type TestParticipant = {
  id: string;
  full_name: string;
  ticket_code: string;
};

export default async function EventCommunicationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const permissions = await getEventPermissionSet(id);
  const canOpen =
    permissions.canEditEvent ||
    permissions.canManageRegistrations ||
    permissions.canViewReports;

  if (!canOpen) notFound();

  const supabase = createAdminClient();
  const [{ data: event }, { data: participants }] = await Promise.all([
    supabase
      .from("events")
      .select("id,name")
      .eq("id", id)
      .maybeSingle<EventSummary>(),
    permissions.canManageRegistrations
      ? supabase
          .from("registrations")
          .select("id,full_name,ticket_code")
          .eq("event_id", id)
          .eq("status", "confirmed")
          .eq("communications_consent", true)
          .order("registered_at", { ascending: false })
          .limit(250)
          .returns<TestParticipant[]>()
      : Promise.resolve({ data: [] as TestParticipant[] }),
  ]);

  if (!event) notFound();

  const whatsappApiConfigured = Boolean(
    process.env.WHATSAPP_PHONE_NUMBER_ID &&
      process.env.WHATSAPP_ACCESS_TOKEN &&
      process.env.WHATSAPP_API_VERSION &&
      process.env.NEXT_PUBLIC_APP_URL,
  );

  return (
    <main>
      <PageHeader
        eyebrow="Comunicação"
        title={event.name}
        description="Crie, teste e acompanhe mensagens do WhatsApp sem precisar alterar o sistema."
      />

      <CommunicationCenter
        eventId={event.id}
        eventName={event.name}
        canEdit={permissions.canEditEvent}
        canSend={permissions.canManageRegistrations}
        canViewReports={permissions.canViewReports}
        whatsappApiConfigured={whatsappApiConfigured}
        testParticipants={(participants ?? []).map((participant) => ({
          id: participant.id,
          name: participant.full_name,
          ticketCode: participant.ticket_code,
        }))}
      />
    </main>
  );
}
