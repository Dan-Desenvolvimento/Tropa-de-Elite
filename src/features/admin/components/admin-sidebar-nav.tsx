"use client";

import {
  BarChart3,
  CalendarRange,
  History,
  KeyRound,
  LayoutDashboard,
  MessageCircle,
  ScanLine,
  Settings,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type SidebarEvent = {
  id: string;
  name: string;
  status: string;
  startAt: string;
  canEditEvent: boolean;
  canCheckin: boolean;
  canViewRegistrations: boolean;
  canManageRegistrations: boolean;
  canAnonymizeRegistrations: boolean;
  canViewReports: boolean;
  canViewLogs: boolean;
};

type AdminSidebarNavProps = {
  isOwner: boolean;
  canCreateEvents: boolean;
  canManageTeam: boolean;
  events: SidebarEvent[];
};

export function AdminSidebarNav({
  isOwner,
  canCreateEvents,
  canManageTeam,
  events,
}: AdminSidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const pathEventId = useMemo(
    () =>
      pathname.match(
        /^\/admin\/eventos\/([^/]+)/,
      )?.[1] ?? null,
    [pathname],
  );

  const defaultEventId =
    pathEventId &&
    events.some((event) => event.id === pathEventId)
      ? pathEventId
      : events[0]?.id ?? "";

  const [manualSelectedEventId, setManualSelectedEventId] =
    useState(defaultEventId);
  const selectedEventId =
    pathEventId && events.some((event) => event.id === pathEventId)
      ? pathEventId
      : manualSelectedEventId &&
          events.some((event) => event.id === manualSelectedEventId)
        ? manualSelectedEventId
        : events[0]?.id ?? "";

  const selectedEvent =
    events.find(
      (event) => event.id === selectedEventId,
    ) ?? null;

  const eventSection = getEventSection(pathname);
  const eventsAreaActive =
    pathname === "/admin/eventos" ||
    pathname === "/admin/eventos/novo" ||
    /^\/admin\/eventos\/[^/]+$/.test(pathname);

  function destinationFor(
    event: SidebarEvent,
    preferredSection: string | null,
  ) {
    if (
      preferredSection === "checkin" &&
      event.canCheckin
    ) {
      return `/admin/eventos/${event.id}/checkin`;
    }

    if (
      preferredSection === "inscritos" &&
      (
        event.canViewRegistrations ||
        event.canManageRegistrations ||
        event.canAnonymizeRegistrations
      )
    ) {
      return `/admin/eventos/${event.id}/inscritos`;
    }

    if (
      preferredSection === "comunicacao" &&
      (
        event.canEditEvent ||
        event.canManageRegistrations ||
        event.canViewReports
      )
    ) {
      return `/admin/eventos/${event.id}/comunicacao`;
    }

    if (
      preferredSection === "relatorios" &&
      event.canViewReports
    ) {
      return `/admin/eventos/${event.id}/relatorios`;
    }

    if (
      preferredSection === "logs" &&
      event.canViewLogs
    ) {
      return `/admin/eventos/${event.id}/logs`;
    }

    if (event.canEditEvent) {
      return `/admin/eventos/${event.id}`;
    }

    if (event.canCheckin) {
      return `/admin/eventos/${event.id}/checkin`;
    }

    if (
      event.canViewRegistrations ||
      event.canManageRegistrations ||
      event.canAnonymizeRegistrations
    ) {
      return `/admin/eventos/${event.id}/inscritos`;
    }

    if (event.canViewReports) {
      return `/admin/eventos/${event.id}/relatorios`;
    }

    return `/admin/eventos/${event.id}/logs`;
  }

  function selectEvent(eventId: string) {
    setManualSelectedEventId(eventId);

    const event = events.find(
      (item) => item.id === eventId,
    );

    if (event) {
      router.push(
        destinationFor(event, eventSection),
      );
    }
  }

  const eventHref = (section: string) =>
    selectedEventId
      ? `/admin/eventos/${selectedEventId}/${section}`
      : "/admin/eventos";

  return (
    <div className="mt-4 space-y-5 lg:mt-8">
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        <SidebarLink
          href="/admin"
          icon={LayoutDashboard}
          active={pathname === "/admin"}
        >
          Visão geral
        </SidebarLink>

        <SidebarLink
          href="/admin/eventos"
          icon={CalendarRange}
          active={eventsAreaActive}
        >
          Eventos
        </SidebarLink>
      </nav>

      {events.length > 0 && selectedEvent ? (
        <section className="min-w-[230px] rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
            Evento em foco
            <select
              value={selectedEventId}
              onChange={(event) =>
                selectEvent(event.target.value)
              }
              className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-[#111114] px-3 text-xs font-medium normal-case tracking-normal text-zinc-300 outline-none focus:border-red-500/60"
            >
              {events.map((event) => (
                <option
                  key={event.id}
                  value={event.id}
                >
                  {event.name}
                </option>
              ))}
            </select>
          </label>

          <nav className="mt-3 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {selectedEvent.canCheckin ? (
              <SidebarLink
                href={eventHref("checkin")}
                icon={ScanLine}
                active={eventSection === "checkin"}
              >
                Check-in
              </SidebarLink>
            ) : null}

            {selectedEvent.canViewRegistrations ||
            selectedEvent.canManageRegistrations ||
            selectedEvent.canAnonymizeRegistrations ? (
              <SidebarLink
                href={eventHref("inscritos")}
                icon={UsersRound}
                active={eventSection === "inscritos"}
              >
                Inscritos
              </SidebarLink>
            ) : null}

            {selectedEvent.canEditEvent ||
            selectedEvent.canManageRegistrations ||
            selectedEvent.canViewReports ? (
              <SidebarLink
                href={eventHref("comunicacao")}
                icon={MessageCircle}
                active={eventSection === "comunicacao"}
              >
                Comunicação
              </SidebarLink>
            ) : null}

            {selectedEvent.canViewReports ? (
              <SidebarLink
                href={eventHref("relatorios")}
                icon={BarChart3}
                active={eventSection === "relatorios"}
              >
                Relatórios
              </SidebarLink>
            ) : null}

            {selectedEvent.canViewLogs ? (
              <SidebarLink
                href={eventHref("logs")}
                icon={History}
                active={eventSection === "logs"}
              >
                Histórico
              </SidebarLink>
            ) : null}
          </nav>
        </section>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {isOwner || canManageTeam ? (
          <SidebarLink
            href="/admin/equipe"
            icon={UsersRound}
            active={pathname.startsWith(
              "/admin/equipe",
            )}
          >
            Equipe
          </SidebarLink>
        ) : null}

        <SidebarLink
          href="/admin/minha-conta"
          icon={KeyRound}
          active={pathname === "/admin/minha-conta"}
        >
          Minha senha
        </SidebarLink>
        {isOwner ? (
          <SidebarLink
            href="/admin/configuracoes"
            icon={Settings}
            active={pathname.startsWith("/admin/configuracoes")}
          >
            Configurações
          </SidebarLink>
        ) : null}
      </nav>

      {isOwner || canCreateEvents ? (
        <p className="px-3 text-[10px] leading-4 text-zinc-700">
          Você pode criar novos eventos.
        </p>
      ) : null}
    </div>
  );
}

function SidebarLink({
  href,
  icon: Icon,
  active,
  children,
}: {
  href: string;
  icon: LucideIcon;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
        active
          ? "bg-red-500/10 text-white"
          : "text-zinc-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="size-4 text-red-500" />
      {children}
    </Link>
  );
}

function getEventSection(pathname: string) {
  if (/\/checkin(?:\/|$)/.test(pathname)) {
    return "checkin";
  }
  if (/\/inscritos(?:\/|$)/.test(pathname)) {
    return "inscritos";
  }
  if (/\/comunicacao(?:\/|$)/.test(pathname)) {
    return "comunicacao";
  }
  if (/\/relatorios(?:\/|$)/.test(pathname)) {
    return "relatorios";
  }
  if (/\/logs(?:\/|$)/.test(pathname)) {
    return "logs";
  }
  return null;
}
