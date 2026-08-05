import { notFound } from "next/navigation";

import { PageHeader } from "@/components/admin/page-header";
import { CheckinScanner } from "@/features/checkin/components/checkin-scanner";
import { getEventPermissionSet } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CheckinPage({
  params,
}: PageProps<"/admin/eventos/[id]/checkin">) {
  const { id } = await params;
  const permissions =
    await getEventPermissionSet(id);

  if (!permissions.canCheckin) notFound();

  const supabase = createAdminClient();
  const [{ data: event }, { count }] =
    await Promise.all([
      supabase
        .from("events")
        .select("name")
        .eq("id", id)
        .maybeSingle<{ name: string }>(),
      supabase
        .from("registrations")
        .select("id", {
          count: "exact",
          head: true,
        })
        .eq("event_id", id)
        .not("checked_in_at", "is", null),
    ]);

  if (!event) notFound();

  return (
    <main>
      <PageHeader
        eyebrow="Operação de entrada"
        title={`Check-in · ${event.name}`}
        description="Valide cada ingresso e confirme a entrada do participante."
      />
      <div className="p-5 sm:p-8 lg:p-10">
        <CheckinScanner
          eventId={id}
          initialCount={count ?? 0}
          canOverrideWaitlist={
            permissions.canManageRegistrations
          }
        />
      </div>
    </main>
  );
}
