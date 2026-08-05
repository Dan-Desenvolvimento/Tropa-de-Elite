import { PageHeader } from "@/components/admin/page-header";
import { EventForm } from "@/features/events/components/event-form";
import { requireGlobalPermission } from "@/lib/auth/dal";

export default async function NewEventPage() {
  await requireGlobalPermission("create_events");

  return (
    <main>
      <PageHeader
        eyebrow="Eventos"
        title="Novo evento"
        description="Configure inscrições, capacidade e comunicação."
      />
      <div className="max-w-5xl p-5 sm:p-8 lg:p-10">
        <EventForm />
      </div>
    </main>
  );
}
