"use client";

import {
  BarChart3,
  CalendarRange,
  History,
  KeyRound,
  LayoutDashboard,
  ScanLine,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type SidebarEvent = {
  id: string;
  name: string;
  status: string;
  startAt: string;
};

type AdminSidebarNavProps = {
  globalRole: "admin" | "checkin_operator";
  events: SidebarEvent[];
};

export function AdminSidebarNav({
  globalRole,
  events,
}: AdminSidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const isAdmin = globalRole === "admin";

  const pathEventId = useMemo(
    () => pathname.match(/^\/admin\/eventos\/([^/]+)/)?.[1] ?? null,
    [pathname],
  );

  const defaultEventId =
    pathEventId && events.some((event) => event.id === pathEventId)
      ? pathEventId
      : events[0]?.id ?? "";

  const [selectedEventId, setSelectedEventId] =
    useState(defaultEventId);

  useEffect(() => {
    if (
      pathEventId &&
      events.some((event) => event.id === pathEventId)
    ) {
      setSelectedEventId(pathEventId);
      return;
    }

    if (
      selectedEventId &&
      events.some((event) => event.id === selectedEventId)
    ) {
      return;
    }

    setSelectedEventId(events[0]?.id ?? "");
  }, [events, pathEventId, selectedEventId]);

  const eventSection = getEventSection(pathname);
  const eventsAreaActive =
    pathname === "/admin/eventos" ||
    pathname === "/admin/eventos/novo" ||
    /^\/admin\/eventos\/[^/]+$/.test(pathname);

  function selectEvent(eventId: string) {
    setSelectedEventId(eventId);

    if (!isAdmin) {
      router.push(`/admin/eventos/${eventId}/checkin`);
      return;
    }

    const destination =
      eventSection === "checkin"
        ? `/admin/eventos/${eventId}/checkin`
        : eventSection === "inscritos"
          ? `/admin/eventos/${eventId}/inscritos`
          : eventSection === "relatorios"
            ? `/admin/eventos/${eventId}/relatorios`
            : eventSection === "logs"
              ? `/admin/eventos/${eventId}/logs`
              : `/admin/eventos/${eventId}`;

    router.push(destination);
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

      {events.length > 0 ? (
        <section className="min-w-[230px] rounded-2xl border border-white/8 bg-white/[0.025] p-3">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-600">
            Evento em foco
            <select
              value={selectedEventId}
              onChange={(event) => selectEvent(event.target.value)}
              className="mt-2 h-10 w-full rounded-xl border border-white/10 bg-[#111114] px-3 text-xs font-medium normal-case tracking-normal text-zinc-300 outline-none focus:border-red-500/60"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </label>

          <nav className="mt-3 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            <SidebarLink
              href={eventHref("checkin")}
              icon={ScanLine}
              active={eventSection === "checkin"}
            >
              Check-in
            </SidebarLink>

            {isAdmin ? (
              <>
                <SidebarLink
                  href={eventHref("inscritos")}
                  icon={UsersRound}
                  active={eventSection === "inscritos"}
                >
                  Inscritos
                </SidebarLink>

                <SidebarLink
                  href={eventHref("relatorios")}
                  icon={BarChart3}
                  active={eventSection === "relatorios"}
                >
                  Relatórios
                </SidebarLink>

                <SidebarLink
                  href={eventHref("logs")}
                  icon={History}
                  active={eventSection === "logs"}
                >
                  Histórico
                </SidebarLink>
              </>
            ) : null}
          </nav>
        </section>
      ) : null}

      <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {isAdmin ? (
          <SidebarLink
            href="/admin/equipe"
            icon={UsersRound}
            active={pathname === "/admin/equipe"}
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
      </nav>
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
  if (/\/checkin(?:\/|$)/.test(pathname)) return "checkin";
  if (/\/inscritos(?:\/|$)/.test(pathname)) return "inscritos";
  if (/\/relatorios(?:\/|$)/.test(pathname)) return "relatorios";
  if (/\/logs(?:\/|$)/.test(pathname)) return "logs";
  return null;
}
