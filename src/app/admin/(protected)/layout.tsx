import Image from "next/image";
import { LogOut } from "lucide-react";

import { signOut } from "@/app/admin/actions";
import { AdminSidebarNav } from "@/features/admin/components/admin-sidebar-nav";
import { getEventSummaries } from "@/features/admin/server/get-event-summaries";
import { requireStaff } from "@/lib/auth/dal";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await requireStaff();
  const summaries = await getEventSummaries();

  const statusPriority: Record<string, number> = {
    open: 0,
    closed: 1,
    sold_out: 2,
    draft: 3,
    finished: 4,
    cancelled: 5,
  };

  const events = [...summaries]
    .sort((left, right) => {
      const statusDifference =
        (statusPriority[left.event_status] ?? 99) -
        (statusPriority[right.event_status] ?? 99);

      if (statusDifference !== 0) {
        return statusDifference;
      }

      return (
        new Date(right.start_at).getTime() -
        new Date(left.start_at).getTime()
      );
    })
    .map((event) => ({
      id: event.event_id,
      name: event.event_name,
      status: event.event_status,
      startAt: event.start_at,
      canEditEvent: event.can_edit_event,
      canCheckin: event.can_checkin,
      canViewRegistrations:
        event.can_view_registrations,
      canManageRegistrations:
        event.can_manage_registrations,
      canAnonymizeRegistrations:
        event.can_anonymize_registrations,
      canViewReports: event.can_view_reports,
      canViewLogs: event.can_view_logs,
    }));

  const roleLabel = staff.isOwner
    ? "Proprietário"
    : staff.canManageTeam
      ? "Gestor de equipe"
      : staff.canCreateEvents
        ? "Criador de eventos"
        : "Equipe";

  return (
    <div className="min-h-screen bg-[#070708] text-white lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-white/8 bg-[#0c0c0e]/95 px-5 py-4 backdrop-blur-xl lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
        <div className="relative h-16 w-48 overflow-hidden">
          <Image
            src="/Tropa-de-elite-branca-para-fundo-preto.png"
            alt="Tropa de Elite"
            fill
            sizes="192px"
            className="object-contain object-center"
          />
        </div>

        <AdminSidebarNav
          isOwner={staff.isOwner}
          canCreateEvents={staff.canCreateEvents}
          canManageTeam={staff.canManageTeam}
          events={events}
        />

        <div className="mt-5 hidden border-t border-white/8 pt-5 lg:absolute lg:bottom-6 lg:left-5 lg:right-5 lg:block">
          <p className="truncate text-sm font-medium text-zinc-300">
            {staff.fullName}
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            {roleLabel}
          </p>
          <form action={signOut} className="mt-4">
            <button className="flex items-center gap-2 text-sm text-zinc-500 transition hover:text-white">
              <LogOut className="size-4" />
              Sair
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
